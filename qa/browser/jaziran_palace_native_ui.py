"""Native player-controlled acceptance for simple Palace puzzle engines.

Game hooks are read as witness only. Solutions entered through buttons, never
by calling hook methods or editing win counters/storage. Per-level JSON and
screenshots prevent false green where the game cannot be solved.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from jaziran_sea_six_native_ui import tap,open_board

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8801/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
GROUP=sys.argv[3] if len(sys.argv)>3 else 'wings'
OUT=Path(sys.argv[4]) if len(sys.argv)>4 else Path('/tmp/mindlab-palace-native')
GROUPS={
 'wings':['pz_plock','pz_pclock','pz_pmirror','pz_pgarden','pz_pmaze'],
 'chambers':['pz_pcrypt','pz_pvalve','pz_pdragon','pz_plib']
}
assert GROUP in GROUPS and ENGINE in ('chromium','webkit')
OUT.mkdir(parents=True,exist_ok=True)

async def solve(page,gid):
    if gid=='pz_plock':
        P=await page.evaluate("()=>({target:__test.pz.P.v})")
        for i,x in enumerate(P['target']):
            for _ in range(x):await tap(page,f'#pld [data-u="{i}"]')
        await tap(page,'#plgo')
        return sum(P['target'])+1
    if gid=='pz_pclock':
        t=await page.evaluate("()=>__test.pz.P.T")
        assert 0<t<=200
        for _ in range(t//10):await tap(page,'#pzb [data-clock-step="10"]')
        for _ in range(t%10):await tap(page,'#pzb [data-clock-step="1"]')
        await tap(page,'#pcgo')
        return t//10+t%10+1
    if gid=='pz_pmirror':
        P=await page.evaluate("()=>({start:__test.pz.P.s0,sol:__test.pz.P.sol})")
        n=0
        for i,(v,w) in enumerate(zip(P['start'],P['sol'])):
            if v!=w:
                await tap(page,f'#pmb button[data-m="{i}"]')
                n+=1
        return n
    if gid=='pz_pgarden':
        P=await page.evaluate("()=>({start:__test.pz.P.s0,sol:__test.pz.P.sol})")
        n=0
        for i,(v,w) in enumerate(zip(P['start'],P['sol'])):
            if v!=w:
                await tap(page,f'#pgw .garden-gate[data-g="{i}"]')
                n+=1
        return n
    if gid=='pz_pmaze':
        path=await page.evaluate("()=>__test.pz.P.sol")
        assert path
        for direction in path:
            await tap(page,f'#pzb .xpad button[data-d="{direction}"]')
        return len(path)
    if gid=='pz_pcrypt':
        cells=await page.evaluate("()=>__test.pz.P.a")
        for i,v in enumerate(cells):
            if v:await tap(page,f'#pcrg button[data-i="{i}"]')
        await tap(page,'#pcrgo')
        return sum(cells)+1
    if gid=='pz_pvalve':
        route=await page.evaluate("()=>pvRoute(__test.pz.P.start,__test.pz.P.goal)")
        assert route and isinstance(route,list),'no reachable target'
        for i in route:await tap(page,f'#pvw .valve-wheel[data-i="{i}"]')
        return len(route)
    if gid=='pz_pdragon':
        rows=await page.evaluate("()=>__test.pz.P.dr")
        n=0
        for j,r in enumerate(rows):
            if r['bad']>=0:
                await tap(page,f'#pzb .pdr[data-j="{j}"][data-i="{r["bad"]}"]')
                n+=1
            await tap(page,f'#pzb .pdnx[data-j="{j}"]')
            await tap(page,f'#pdp button[data-r="{r["next"]}"]')
            n+=2
        await tap(page,'#pdgo')
        return n+1
    if gid=='pz_plib':
        order=await page.evaluate("()=>__test.pz.order()")
        n=0
        for i in range(len(order)):
            if order[i]==i:continue
            j=order.index(i)
            await tap(page,f'#plbp button.diary-page[data-slot="{i}"]')
            await tap(page,f'#plbp button.diary-page[data-slot="{j}"]')
            n+=2
            order[i],order[j]=order[j],order[i]
        return n
    raise AssertionError(gid)

async def main():
    rows=[];errors=[]
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox']))
        context=await browser.new_context(viewport={'width':390,'height':844},
            is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        await context.add_init_script('window.__test={}')
        page=await context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            await page.goto(URL,wait_until='load',timeout=50000)
            profile=page.locator('.mpc[data-m=main]')
            if await profile.count() and await profile.first.is_visible():await profile.first.click()
            await page.evaluate("()=>tab('puz')")
            await page.evaluate("async()=>await mindlabPlayLayers.start()")
            await page.wait_for_function("()=>mindlabPlayLayers?.ready===true",timeout=45000)
            await page.evaluate("()=>{S.st.mute=true}")
            for gid in GROUPS[GROUP]:
                for level in range(1,9):
                    row={'id':gid,'level':level};prior=len(errors)
                    try:
                        await open_board(page,gid,level)
                        assert await page.evaluate("()=>RUN.last?.lv")==level
                        assert not await page.evaluate("()=>!!document.querySelector('#pzb.solved')"),\
                            'game won on initial render'
                        before=await page.evaluate('id=>pzState().n[id]||0',gid)
                        row['actions']=await solve(page,gid)
                        await page.wait_for_function("()=>!!document.querySelector('#pzb.solved')",timeout=25000)
                        await page.wait_for_function("([id,n])=>(pzState().n[id]||0)>n",
                            arg=[gid,before],timeout=12000)
                        await page.wait_for_function("""([id,n])=>
                          (JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n?.[id]||0)>n
                        """,arg=[gid,before],timeout=12000)
                        after=await page.evaluate('id=>pzState().n[id]||0',gid)
                        assert after==before+1,'nonunique win or missing award'
                        row['nativeWin']=True
                        await page.wait_for_timeout(850)
                    except Exception as ex:
                        row['error']=str(ex)[:430]
                        try:await page.screenshot(path=str(OUT/f'{ENGINE}-{gid}-{level}.png'),timeout=8500)
                        except Exception:pass
                    if len(errors)>prior:row['jsErrors']=errors[prior:][:4]
                    rows.append(row);print('PALACE_NATIVE_CASE='+json.dumps(row,ensure_ascii=True),flush=True)
            await page.reload(wait_until='load',timeout=50000)
            stored=await page.evaluate("()=>JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n||{}")
            for row in rows:
                if row.get('nativeWin') and stored.get(row['id'],0)<1:
                    row['error']='saved wins lost on reload'
        finally:
            summary={'engine':ENGINE,'group':GROUP,'wins':sum(r.get('nativeWin') and not r.get('error') and not r.get('jsErrors') for r in rows),
              'total':len(rows),'deficits':[r for r in rows if r.get('error') or r.get('jsErrors')],
              'pageErrors':errors,'cases':rows}
            (OUT/f'palace-native-{ENGINE}-{GROUP}.json').write_text(json.dumps(summary,indent=2,ensure_ascii=True))
            print('PALACE_NATIVE_SUMMARY='+json.dumps({k:v for k,v in summary.items() if k!='cases'},ensure_ascii=True),flush=True)
            await browser.close()
        assert not summary['deficits'] and len(rows)==8*len(GROUPS[GROUP])

if __name__=='__main__':asyncio.run(main())
