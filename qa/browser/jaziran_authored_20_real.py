"""Player-driven acceptance of all 20 levels of an authored library track.

Supported: pz_river, pz_pipe, pz_ice. Path/solution data is read only.
Winning is obtained solely through native touch buttons, never engine APIs
or direct completion writes. After each win the *player's* next button starts
the next board. Progress is checked against mindlab:authored-stages:v1.

python qa/browser/jaziran_authored_20_real.py URL chromium|webkit TRACK OUT
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from player_openings import dismiss_opening

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8791/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
TRACK=sys.argv[3] if len(sys.argv)>3 else 'pz_river'
OUT=Path(sys.argv[4]) if len(sys.argv)>4 else Path('/tmp/jaziran-authored')
assert ENGINE in ('chromium','webkit') and TRACK in ('pz_river','pz_pipe','pz_ice')
OUT.mkdir(parents=True,exist_ok=True)

async def get(page,js,arg=None):
    return await page.evaluate(js,arg) if arg is not None else await page.evaluate(js)

async def click(page,selector):
    await page.locator(selector).first.click(timeout=8500)
    await page.wait_for_timeout(70)

async def ready(page):
    await dismiss_opening(page,wait=650)
    try:await page.wait_for_function("()=>!document.querySelector('#stage .cd')",timeout=9500)
    except Exception:pass
    await page.wait_for_timeout(160)

async def first_level(page):
    await get(page,"g=>startRun([g])",TRACK)
    await page.locator('#stage .ml-authored-picker .go-btn[data-level]').first.wait_for(
        state='visible',timeout=21000)
    await click(page,'#stage .ml-authored-picker .go-btn[data-level]')
    await ready(page)

async def winner(page):
    return await get(page,"""()=>{
      const next=document.querySelector('#play #ag');
      return !!(next&&!next.hidden&&next.offsetParent!==null);
    }""")

async def solve_river(page,number):
    state=await get(page,"()=>mlAuthoredStages.riverRules(RUN.authoredStage.board).initial")
    steps=0
    while True:
        info=await get(page,"state=>{const r=mlAuthoredStages.riverRules(RUN.authoredStage.board);return {won:r.won(state),next:r.best(state)?.first||null}}",state)
        if info['won']:break
        a=info['next']
        assert a and steps<65,f'river {number} has no solvable next move'
        if a.get('edge'):
            for item in a['cargo']:
                name=item['name']
                await click(page,f'#pzb [data-river-item="{name}"]:not([disabled])')
            await click(page,f'#pzb [data-river-to="{a["edge"][1]}"]')
        else:
            label=a['label']
            button=page.locator('#pzb .ml-river-actions button').filter(has_text=label)
            assert await button.count()==1,f'{number} missing operation '+label
            await button.click(timeout=8500)
        state=a['state']
        steps+=1
        await page.wait_for_timeout(110)
    return {'actions':steps,'minimum':await get(page,
        "()=>mlAuthoredStages.riverRules(RUN.authoredStage.board).best(mlAuthoredStages.riverRules(RUN.authoredStage.board).initial).crossings")}

async def solve_pipe(page,number):
    P=await get(page,"()=>__test.pz.P")
    count=0
    for k,target in enumerate(P['sol']):
        if k in P['fixed']:continue
        for _ in range(4):
            if await winner(page):break
            cur=await get(page,"i=>__test.pz.P.cur[i]",k)
            if cur==target:break
            await click(page,f'#pzb .pp10-c[data-i="{k}"]:not(.lock)')
            count+=1
        else:raise AssertionError(f'pipe level {number} piece {k} cannot align')
        if await winner(page):break
    return {'actions':count,'min':P['min']}

async def solve_ice(page,number):
    ds=await get(page,"()=>icSolve(__test.pz.P,__test.pz.P.start)")
    assert isinstance(ds,list) and ds,f'ice level {number} no path'
    names=['ArrowLeft','ArrowDown','ArrowRight','ArrowUp']
    for d in ds:
        assert isinstance(d,int) and 0<=d<4,f'invalid ice direction {d}'
        await click(page,f'#pzb [data-d="{names[d]}"]')
        if await winner(page):break
    return {'actions':len(ds),'directions':ds}

async def run():
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),
                               args=['--no-sandbox']))
        context=await browser.new_context(viewport={'width':390,'height':844},
            is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        page=await context.new_page()
        await page.add_init_script('window.__test={}')
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(URL,wait_until='load',timeout=50000)
        pick=page.locator('.mpc[data-m=main]')
        if await pick.count() and await pick.is_visible():await pick.click()
        await get(page,"()=>tab('puz')")
        await get(page,"async()=>await mindlabPlayLayers.start()")
        await page.wait_for_function("()=>mindlabPlayLayers.ready===true",timeout=45000)
        await get(page,"()=>{S.st.mute=true}")
        await page.wait_for_timeout(800)
        rows=[]
        try:
            await first_level(page)
            for number in range(1,21):
                live=await get(page,"()=>({id:RUN.authoredStage?.id,number:RUN.authoredStage?.number})")
                assert live=={'id':TRACK,'number':number},f'wrong board opened {live}'
                if TRACK=='pz_river':move=await solve_river(page,number)
                elif TRACK=='pz_pipe':move=await solve_pipe(page,number)
                else:move=await solve_ice(page,number)
                await page.wait_for_function("""()=>{
                  const n=document.querySelector('#play #ag');
                  return !!(n&&!n.hidden&&n.offsetParent!==null);
                }""",timeout=13000)
                progress=await get(page,"k=>JSON.parse(localStorage.getItem('mindlab:authored-stages:v1')||'{}')[k]||null",TRACK)
                assert progress and progress['cleared']==number,f'{TRACK} stage {number} did not advance native save: {progress}'
                row={'id':TRACK,'stage':number,'win':True,'nativeSaved':True,'progress':progress['cleared'],**move}
                rows.append(row)
                print('JAZIRAN_AUTHORED_REAL_WIN='+json.dumps(row,ensure_ascii=True),flush=True)
                if number<20:
                    await click(page,'#play #ag')
                    await ready(page)
            assert not errors,f'uncaught page errors: {errors[:4]}'
            final=await get(page,"k=>JSON.parse(localStorage.getItem('mindlab:authored-stages:v1')||'{}')[k]||null",TRACK)
            assert final['cleared']==20
            await page.reload(wait_until='load')
            persisted=await get(page,"k=>JSON.parse(localStorage.getItem('mindlab:authored-stages:v1')||'{}')[k]||null",TRACK)
            assert persisted['cleared']==20,'authored progress lost on reload'
            summary={'engine':ENGINE,'track':TRACK,'wins':20,'savedAfterReload':True,
                     'pageErrors':errors,'results':rows}
            print('JAZIRAN_AUTHORED_REAL_SUMMARY='+json.dumps({k:v for k,v in summary.items() if k!='results'},ensure_ascii=True),flush=True)
        except Exception as e:
            summary={'engine':ENGINE,'track':TRACK,'wins':len(rows),'error':str(e),
                     'pageErrors':errors,'results':rows}
            try:await page.screenshot(path=str(OUT/f'{ENGINE}-{TRACK}-failed-{len(rows)+1:02d}.png'),timeout=12000)
            except Exception:pass
            raise
        finally:
            (OUT/f'jaziran-authored-{TRACK}-{ENGINE}.json').write_text(
                json.dumps(summary,ensure_ascii=True,indent=2),encoding='utf8')
            await browser.close()

if __name__=='__main__':asyncio.run(run())
