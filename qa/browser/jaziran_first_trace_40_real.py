"""Phase 2: five optional First Trace engines, eight levels each, real UI wins.

Forty independently generated stages are solved by physical DOM buttons or
pointer drag/drop. Reference P may be *read* to plan moves; no hook set/check,
direct win API, localStorage completion injection or simulated event dispatch.
This exercises game engines, not the narrative gates which reveal secret worlds.

python qa/browser/jaziran_first_trace_40_real.py URL chromium|webkit OUT
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from player_openings import dismiss_opening

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8791/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
OUT=Path(sys.argv[3]) if len(sys.argv)>3 else Path('/tmp/jaziran-first-trace')
assert ENGINE in ('chromium','webkit')
OUT.mkdir(parents=True,exist_ok=True)
TRACKS=[
    ('pz_wbone','bones'),('pz_wspore','spores'),('pz_wlog','ship'),
    ('pz_wlake','lake'),('pz_wfirst','first')
]

async def ev(page,code,arg=None):
    if arg is None:return await page.evaluate(code)
    return await page.evaluate(code,arg)

async def click(page,selector):
    await page.locator(selector).first.click(timeout=8500)
    await page.wait_for_timeout(55)

async def open_game(page,gid):
    await ev(page,"id=>startRun([id])",gid)
    # Optional first-trace puzzles may open their actual board immediately,
    # unlike regular games with a separate #go introduction.
    await page.wait_for_timeout(180)
    starter=page.locator('#stage #go')
    if await starter.count() and await starter.first.is_visible():
        await click(page,'#stage #go')
    await dismiss_opening(page,wait=800)
    try:await page.wait_for_function("()=>!document.querySelector('#stage .cd')",timeout=12000)
    except Exception:pass
    await page.locator('#pzb').wait_for(state='visible',timeout=15000)
    await page.wait_for_timeout(140)

def bone_solution(P):
    edges=P['all'];n=P['nb'];goal=P['J'][n];start=P['J'][0]
    def dfs(j,seq,used):
        if len(seq)==n:return list(seq) if j==goal else None
        for k,(a,b) in enumerate(edges):
            if k in used or j not in (a,b):continue
            ans=dfs(b if j==a else a,seq+[k],used|{k})
            if ans is not None:return ans
        return None
    solution=dfs(start,[],set())
    assert solution is not None and len(solution)==n,'Bone generator has no Euler chain'
    return solution

async def solve(page,gid,P):
    if gid=='pz_wbone':
        moves=bone_solution(P)
        for k in moves:await click(page,f'#pzb .wbt button[data-i="{k}"]')
        await click(page,'#pzb #wbgo')
        return {'actions':len(moves)+1}
    if gid=='pz_wspore':
        n=0
        for k,v in enumerate(P['a0']):
            if v:await click(page,f'#pzb .wspr.in button[data-i="{k}"]');n+=1
        await click(page,'#pzb #wspgo')
        return {'actions':n+1}
    if gid=='pz_wlog':
        k=P['k']
        for n in range(k):
            source=page.locator(f'#pzb .wlgp [data-tok="{n}"]')
            destination=page.locator(f'#pzb #wlgTimeline [data-slot="{n}"]')
            await source.drag_to(destination,timeout=9000)
            # The timeline must reflect a real placement before checking.
            slot=await destination.inner_text()
            assert slot.strip(),f'page {n} drag did not reach its slot'
        await click(page,'#pzb #wlggo')
        return {'actions':k+1}
    if gid=='pz_wlake':
        await click(page,f'#pzb .wlkc button[data-i="{P["ans"]}"]')
        await click(page,'#pzb #wlkgo')
        return {'actions':2}
    if gid=='pz_wfirst':
        n=0
        for r,rot in enumerate(P['rot']):
            for _ in range(rot):
                await click(page,f'#pzb .wfib [data-r="{r}"][data-d="1"]')
                n+=1
        await click(page,'#pzb #wfigo')
        return {'actions':n+1}
    raise AssertionError(gid+' missing real UI solution')

async def execute():
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),
                args=['--no-sandbox']))
        ctx=await browser.new_context(viewport={'width':390,'height':844},
            is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        page=await ctx.new_page()
        await page.add_init_script('window.__test={}')
        js_errors=[]
        page.on('pageerror',lambda e:js_errors.append(str(e)))
        rows=[]
        try:
            await page.goto(URL,wait_until='load',timeout=50000)
            p=page.locator('.mpc[data-m=main]')
            if await p.count() and await p.is_visible():await p.click()
            await ev(page,"()=>tab('puz')")
            await ev(page,"async()=>await mindlabPlayLayers.start()")
            await page.wait_for_function("()=>mindlabPlayLayers?.ready===true",timeout=45000)
            await ev(page,"()=>{S.st.mute=true}")
            await page.wait_for_timeout(750)
            for gid,secret in TRACKS:
                for level in range(1,9):
                    await open_game(page,gid)
                    initial=await ev(page,"id=>({lv:pzLv(id),n:pzState().n[id]||0})",gid)
                    assert initial['lv']==level,f'{gid}: level {level} opened as {initial}'
                    P=await ev(page,"()=>window.__test?.pz?.P")
                    assert P is not None,f'{gid} missing read-only board'
                    acts=await solve(page,gid,P)
                    await page.wait_for_function(
                        "()=>!!document.querySelector('#pzb.solved')",timeout=10000)
                    await page.wait_for_function(
                        "([id,n])=>(pzState().n[id]||0)>n",
                        arg=[gid,initial['n']],timeout=9000)
                    await page.wait_for_function("""([id,n])=>{
                        try{return (JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n?.[id]||0)>n;}
                        catch(e){return false}
                    }""",arg=[gid,initial['n']],timeout=10000)
                    stored=await ev(page,"id=>JSON.parse(localStorage.getItem('miran:v2')).puz.n[id]||0",gid)
                    assert stored==initial['n']+1,f'{gid} level {level} score duplicated'
                    native=await ev(page,"id=>({n:pzState().n[id]||0,lv:pzLv(id),secret:aSwState().swd})",gid)
                    assert native['secret'].get(secret) in (True,1),f'{gid} secret badge not earned'
                    assert native['lv']==min(level+1,8),f'{gid}: level did not advance'
                    row={'id':gid,'level':level,'uiWin':True,'nativeSaved':True,
                        'secretAwarded':True,'counter':stored,**acts}
                    rows.append(row)
                    print('JAZIRAN_FIRST_TRACE_REAL='+json.dumps(row,ensure_ascii=True),flush=True)
                    await page.wait_for_timeout(1600)
            # Verify a new document restores every win count, and never
            # counts a replay as a fresh secret world badge.
            await page.reload(wait_until='load')
            persisted=await ev(page,"()=>JSON.parse(localStorage.getItem('miran:v2')||'{}')")
            for gid,secret in TRACKS:
                assert persisted['puz']['n'][gid]==8,f'{gid} not persisted after reload'
            assert not js_errors,'uncaught JavaScript error in first-trace puzzles'
            out={'engine':ENGINE,'results':rows,'uiWins':len(rows),
                'levelsPerEngine':8,'uniqueEngines':len(TRACKS),'reloadSaved':True,
                'jsErrors':js_errors}
            print('JAZIRAN_FIRST_TRACE_SUMMARY='+json.dumps(
                {k:v for k,v in out.items() if k!='results'},ensure_ascii=True),flush=True)
        except Exception as exc:
            out={'engine':ENGINE,'uiWins':len(rows),'error':str(exc),
                'jsErrors':js_errors,'results':rows}
            try:await page.screenshot(path=str(OUT/f'{ENGINE}-failed-after-{len(rows)}.png'),
                                      timeout=9000)
            except Exception:pass
            raise
        finally:
            (OUT/f'jaziran-first-trace-{ENGINE}.json').write_text(
                json.dumps(out,ensure_ascii=True,indent=2),encoding='utf8')
            await browser.close()

if __name__=='__main__':asyncio.run(execute())
