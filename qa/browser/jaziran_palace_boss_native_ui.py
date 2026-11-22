"""Four final Palace composite challenges completed using player-visible controls.

Read-only generated state comes through witness snapshots in the existing
test-only hook. No test invokes hook.answer/solve/set/check or mutates scores.
Every stage is completed through ordinary Playwright clicks, and the 7-throne
challenge must earn the original saved victory only after all seven thrones.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from jaziran_sea_six_native_ui import tap,open_board
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8804/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
OUT=Path(sys.argv[3]) if len(sys.argv)>3 else Path('/tmp/mindlab-palace-boss')
assert ENGINE in ('chromium','webkit')
OUT.mkdir(parents=True,exist_ok=True)
GAMES=['pz_pqueen','pz_peng','pz_plast','pz_phall']

async def next_stage(page,n):
    await page.wait_for_function("(n)=>__test?.pz?.st?.()>=n",arg=n,timeout=12000)
    await page.wait_for_timeout(110)

async def queen(page):
    W=await page.evaluate("()=>__test.pz.witness()")
    await tap(page,f'#pqb [data-o="{W["correctOption"]}"]')
    await next_stage(page,1)
    assert len(W['mirrorStart'])==len(W['mirrorGoal'])
    for i,(a,b) in enumerate(zip(W['mirrorStart'],W['mirrorGoal'])):
        if a!=b:await tap(page,f'#pqb .pmm[data-m="{i}"]')
    await next_stage(page,2)
    await tap(page,f'#pqb .pqd[data-d="{W["door"]}"]')
    return 3+sum(a!=b for a,b in zip(W['mirrorStart'],W['mirrorGoal']))

async def engineer(page):
    W=await page.evaluate("()=>__test.pz.witness()")
    await tap(page,f'#peb .pqd[data-i="{W["liar"]}"]')
    await next_stage(page,1)
    n=0
    for _ in range(W['ticks']//10):await tap(page,'#eu10');n+=1
    for _ in range(W['ticks']%10):await tap(page,'#eu');n+=1
    await tap(page,'#ego')
    await next_stage(page,2)
    assert W['rotations'],'the generated chart has no fitting 90-degree rotation'
    await tap(page,f'#peb .pqd[data-k="{W["rotations"][0]}"]')
    return n+3

async def prisoner(page):
    W=await page.evaluate("()=>__test.pz.witness()")
    await tap(page,f'#plb .pqd[data-i="{W["liar"]}"]')
    await next_stage(page,1)
    await tap(page,f'#plb .pqd[data-o="{W["minimum"]}"]')
    await next_stage(page,2)
    n=0
    for i,v in enumerate(W['etching']):
        if v:
            await tap(page,f'#plb .pcrg button[data-i="{i}"]')
            n+=1
    await tap(page,'#plgo')
    return n+3

async def hall(page):
    stages=await page.evaluate("()=>__test.pz.witness()")
    assert len(stages)==7
    P=stages[0];actions=0
    for i,n in enumerate(P['v']):
        for _ in range(n):
            await tap(page,f'#phb [data-u="{i}"]')
            actions+=1
    await tap(page,'#phgo');await next_stage(page,1);actions+=1
    await tap(page,f'#phb [data-d="{stages[1]["sol"]["door"]}"]')
    await next_stage(page,2);actions+=1
    ticks=stages[2]['T']
    assert 0<ticks<1000
    for i,n in enumerate([ticks//100,(ticks//10)%10,ticks%10]):
        for _ in range(n):
            await tap(page,f'#phb [data-u="{i}"]')
            actions+=1
    await tap(page,'#phgo');await next_stage(page,3);actions+=1
    for _ in range(40):
        if await page.evaluate("()=>__test.pz.st()")>3:break
        move=await page.evaluate("""()=>{
            const h=[...document.querySelectorAll('#phb .hall-scales')].map(
                e=>e.querySelectorAll('img').length);
            return znBest(h,__test.pz.witness()[3].m);
        }""")
        assert move and 1<=move[1]<=stages[3]['m'],'no legal Nim move'
        await tap(page,f'#phb .phtk[data-i="{move[0]}"][data-c="{move[1]}"]')
        actions+=1
        await page.wait_for_timeout(200)
    await next_stage(page,4)
    cipher=stages[4]
    for letter in cipher['letters']:
        if letter in cipher['known']:continue
        await tap(page,f'#phcipher button[data-code="{cipher["key"][letter]}"]:not([disabled])')
        await tap(page,f'#phletters [data-letter="{letter}"]')
        actions+=2
    await page.locator('#phplace:not([hidden])').wait_for(state='visible',timeout=13000)
    await tap(page,f'#phplace [data-place="{cipher["place"]}"]')
    await next_stage(page,5);actions+=1
    await tap(page,f'#phb [data-r="{stages[5]["dr"][0]["next"]}"]')
    await next_stage(page,6);actions+=1
    for s,k in enumerate(stages[6]['ord']):
        await tap(page,f'#phb .zotool[data-t="{k}"]')
        await tap(page,f'#phb .zoslot[data-s="{s}"]')
        actions+=2
    await tap(page,'#phgo')
    return actions+1

async def solve(page,gid):
    return await {'pz_pqueen':queen,'pz_peng':engineer,
                  'pz_plast':prisoner,'pz_phall':hall}[gid](page)

async def main():
    rows=[];errors=[]
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox']))
        ctx=await browser.new_context(viewport={'width':390,'height':844},
          is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        await ctx.add_init_script('window.__test={}')
        page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            await page.goto(URL,wait_until='load',timeout=52000)
            profile=page.locator('.mpc[data-m=main]')
            if await profile.count() and await profile.is_visible():await profile.click()
            await page.evaluate("()=>tab('puz')")
            await page.evaluate("async()=>await mindlabPlayLayers.start()")
            await page.wait_for_function("()=>mindlabPlayLayers?.ready===true",timeout=45000)
            await page.evaluate("()=>{S.st.mute=true}")
            for gid in GAMES:
                mx=await page.evaluate("id=>pzMax(id)",gid)
                assert 1<=mx<=10
                for lv in range(1,mx+1):
                    row={'id':gid,'level':lv};prior=len(errors)
                    try:
                        await open_board(page,gid,lv)
                        assert await page.evaluate("()=>RUN.last?.lv")==lv
                        assert not await page.evaluate("()=>!!document.querySelector('#pzb.solved')")
                        assert await page.evaluate("()=>typeof __test?.pz?.witness==='function'")
                        before=await page.evaluate("id=>pzState().n[id]||0",gid)
                        row['actions']=await solve(page,gid)
                        await page.wait_for_function("()=>!!document.querySelector('#pzb.solved')",
                            timeout=45000)
                        await page.wait_for_function("([id,n])=>(pzState().n[id]||0)>n",
                            arg=[gid,before],timeout=16000)
                        await page.wait_for_function("""([id,n])=>
                           (JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n?.[id]||0)>n
                        """,arg=[gid,before],timeout=16000)
                        after=await page.evaluate("id=>pzState().n[id]||0",gid)
                        assert after==before+1,(gid,lv,before,after)
                        row['win']=True
                        await page.wait_for_timeout(850)
                    except Exception as ex:
                        row['error']=str(ex)[:580]
                        try:await page.screenshot(path=str(OUT/f'{ENGINE}-{gid}-lv{lv}.png'),timeout=7000)
                        except Exception:pass
                    if len(errors)>prior:row['jsErrors']=errors[prior:][:5]
                    rows.append(row)
                    print('PALACE_BOSS_CASE='+json.dumps(row,ensure_ascii=True),flush=True)
            await page.reload(wait_until='load',timeout=52000)
            stored=await page.evaluate("()=>JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n||{}")
            for row in rows:
                if row.get('win') and stored.get(row['id'],0)<1:row['error']='win not saved after reload'
        finally:
            gaps=[r for r in rows if r.get('error') or r.get('jsErrors')]
            summary={'engine':ENGINE,'wins':sum(1 for r in rows if r.get('win') and not r.get('error') and not r.get('jsErrors')),
              'total':len(rows),'gaps':gaps,'pageErrors':errors,'cases':rows}
            (OUT/f'palace-boss-{ENGINE}.json').write_text(json.dumps(summary,ensure_ascii=True,indent=2))
            print('PALACE_BOSS_SUMMARY='+json.dumps({k:v for k,v in summary.items() if k!='cases'},ensure_ascii=True),flush=True)
            await browser.close()
        assert not gaps and not errors and len(rows)==32

if __name__=='__main__':asyncio.run(main())
