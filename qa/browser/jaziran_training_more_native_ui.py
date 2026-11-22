"""Extra training native-player proof: logic grids, tents and Arabic riddles.

All wins require user-visible Playwright clicks. Read-only witness data is used
to plan control inputs, never to set current answer, score, or win status.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from jaziran_sea_six_native_ui import open_board,tap
from player_openings import dismiss_opening

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8799/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
OUT=Path(sys.argv[3]) if len(sys.argv)>3 else Path('/tmp/mindlab-training-extra')
assert ENGINE in ('chromium','webkit')
OUT.mkdir(parents=True,exist_ok=True)

async def solve_grid(page):
    P=await page.evaluate("()=>__test.pz.P")
    for ci,row in enumerate(P['sol']):
        for p,v in enumerate(row):
            for _ in range(v+1):
                await tap(page,f'#lgt .lgc[data-c="{ci}"][data-p="{p}"]')
    await tap(page,'#lgok')
    return sum(sum(v+1 for v in row) for row in P['sol'])+1

async def solve_tents(page):
    points=await page.evaluate("()=>__test.pz.P.sol")
    for p in points:
        await tap(page,f'#tng .tnc2[data-i="{p}"]')
        await tap(page,f'#tng .tnc2[data-i="{p}"]')
    return len(points)*2

async def check_stored(page,gid,before):
    await page.wait_for_function("([id,n])=>(pzState().n[id]||0)>n",
        arg=[gid,before],timeout=13000)
    await page.wait_for_function("""([id,n])=>{
      const s=JSON.parse(localStorage.getItem('miran:v2')||'{}')
      return (s.puz?.n?.[id]||0)>n
    }""",arg=[gid,before],timeout=13000)
    after=await page.evaluate("id=>pzState().n[id]||0",gid)
    assert after==before+1,(gid,before,after)

async def main():
    rows=[];errors=[]
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox']))
        ctx=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,
            locale='ar-SA',reduced_motion='reduce')
        await ctx.add_init_script('window.__test={}')
        page=await ctx.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            await page.goto(URL,wait_until='load',timeout=50000)
            profile=page.locator('.mpc[data-m=main]')
            if await profile.count() and await profile.is_visible():await profile.click()
            await page.evaluate("()=>tab('puz')")
            await page.evaluate("async()=>await mindlabPlayLayers.start()")
            await page.wait_for_function("()=>mindlabPlayLayers?.ready===true",timeout=45000)
            await page.evaluate("()=>{S.st.mute=true}")
            for gid,solver in [('pz_grid',solve_grid),('pz_tent',solve_tents)]:
                for level in range(1,9):
                    row={'id':gid,'level':level};prior=len(errors)
                    try:
                        await open_board(page,gid,level)
                        assert await page.evaluate("()=>RUN.last?.lv")==level
                        before=await page.evaluate('id=>pzState().n[id]||0',gid)
                        if gid=='pz_grid':
                            await tap(page,'#lgok')
                            assert not await page.evaluate("()=>!!document.querySelector('#pzb.solved')"),\
                              'incomplete grid won before solution'
                        row['actions']=await solver(page)
                        await page.wait_for_function("()=>!!document.querySelector('#pzb.solved')",timeout=10000)
                        await check_stored(page,gid,before)
                        row['win']=True
                        await page.wait_for_timeout(900)
                    except Exception as ex:
                        row['error']=str(ex)[:420]
                        try:await page.screenshot(path=str(OUT/f'{ENGINE}-{gid}-{level}.png'),timeout=5000)
                        except Exception:pass
                    if len(errors)>prior:row['jsErrors']=errors[prior:][:4]
                    rows.append(row);print('TRAIN_EXTRA_CASE='+json.dumps(row,ensure_ascii=True),flush=True)
            count=await page.evaluate("()=>RIDDLES.length")
            assert count>=16,'RIDDLES unexpectedly small'
            # Exactly one genuine correct user click per riddle; never set RIDDLES progress.
            for i in range(count):
                row={'id':'pz_rid','riddle':i};prior=len(errors)
                try:
                    await page.evaluate("(i)=>{startRun(['pz_rid']);RUN.rid=i}",i)
                    starter=page.locator('#stage #go')
                    if await starter.count() and await starter.is_visible():await starter.click()
                    await dismiss_opening(page,wait=700)
                    await page.locator('#stage .ridopt').first.wait_for(state='visible',timeout=18000)
                    answer=await page.evaluate("(i)=>RIDDLES[i][1]",i)
                    correct=page.locator('#stage .ridopt').filter(has_text=answer)
                    assert await correct.count()==1,(i,answer)
                    initial=await page.evaluate("i=>!!pzState().rid[i]",i)
                    assert not initial,'riddle already marked completed before native answer'
                    wrong=page.locator('#stage .ridopt').filter(has_not_text=answer).first
                    if await wrong.count():
                        await wrong.click()
                        assert not await page.evaluate("()=>!!document.querySelector('#pzb.solved')"),\
                          'wrong riddle choice granted a win'
                    await correct.click()
                    await page.wait_for_function("i=>!!pzState().rid[i]",arg=i,timeout=12000)
                    await page.wait_for_function("()=>!!document.querySelector('#pzb.solved')",timeout=9000)
                    row['win']=True
                    row['actions']=2
                    await page.wait_for_timeout(1650)
                except Exception as ex:
                    row['error']=str(ex)[:420]
                    try:await page.screenshot(path=str(OUT/f'{ENGINE}-riddle-{i}.png'),timeout=5000)
                    except Exception:pass
                if len(errors)>prior:row['jsErrors']=errors[prior:][:4]
                rows.append(row);print('TRAIN_EXTRA_CASE='+json.dumps(row,ensure_ascii=True),flush=True)
            await page.reload(wait_until='load',timeout=50000)
            stored=await page.evaluate("()=>JSON.parse(localStorage.getItem('miran:v2')||'{}')")
            assert (stored.get('puz',{}).get('n',{}).get('pz_grid') or 0)>0
            assert (stored.get('puz',{}).get('n',{}).get('pz_tent') or 0)>0
            assert not errors,errors[:5]
        finally:
            summary={'engine':ENGINE,'tested':len(rows),
                'wins':sum(x.get('win') and not x.get('error') and not x.get('jsErrors') for x in rows),
                'deficits':[x for x in rows if x.get('error') or x.get('jsErrors')],
                'pageErrors':errors,'results':rows}
            (OUT/f'training-native-{ENGINE}.json').write_text(json.dumps(summary,ensure_ascii=True,indent=2))
            print('TRAIN_EXTRA_SUMMARY='+json.dumps({k:v for k,v in summary.items() if k!='results'},ensure_ascii=True),flush=True)
            await browser.close()
        assert not summary['deficits'] and summary['tested']>=32

if __name__=='__main__':asyncio.run(main())
