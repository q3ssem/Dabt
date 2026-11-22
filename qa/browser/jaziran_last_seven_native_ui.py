"""Complete native-UI proofs for seven remaining puzzle generators.

Solution witnesses are READ-ONLY. All moves use Playwright controls: token/
slot taps, instrument notes, rotations, and button presses. Never invoke a
test-hook win/check/solve/set or write player progress directly.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from jaziran_sea_six_native_ui import tap,open_board

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8803/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
GROUP=sys.argv[3] if len(sys.argv)>3 else 'athran'
OUT=Path(sys.argv[4]) if len(sys.argv)>4 else Path('/tmp/mindlab-last-seven')
GROUPS={'athran':['pz_acur','pz_ashell','pz_avsong'],
        'palace':['pz_pjail','pz_pheart','pz_parm','pz_pboss1']}
assert ENGINE in ('chromium','webkit') and GROUP in GROUPS
OUT.mkdir(parents=True,exist_ok=True)

async def solve(page,gid):
    if gid=='pz_acur':
        ans=await page.evaluate("()=>__test.pz.P.ans")
        assert ans and isinstance(ans,list)
        for slot,part in enumerate(ans):
            await tap(page,f'#pzb .cargo-piece[data-tok="{part}"]')
            await tap(page,f'#pzb .acuw [data-slot="{slot}"]')
        await tap(page,'#acugo')
        return len(ans)*2+1
    if gid=='pz_ashell':
        P=await page.evaluate("()=>{let p=__test.pz.P;return {F:p.F,mi:p.mi,mel:p.mel}}")
        n=0
        for slot in range(P['F']):
            if slot==P['mi']:continue
            await tap(page,f'#asht [data-f="{slot}"]')
            await tap(page,f'#ashs [data-sl="{slot}"]')
            n+=2
        if P['mi']>=0:
            await tap(page,f'#pzb .ashn [data-n="{P["mel"][2*P["mi"]+1]}"]')
            n+=1
        await tap(page,'#ashgo')
        return n+1
    if gid=='pz_avsong':
        song=await page.evaluate("()=>__test.pz.P.m")
        assert song and all(isinstance(n,int) and 0<=n<10 for n in song)
        for n in song:await tap(page,f'#pzb .avsk [data-v="{n}"]')
        await tap(page,'#avsgo')
        return len(song)+1
    if gid=='pz_pjail':
        P=await page.evaluate("()=>({liar:__test.pz.P.liar,ord:__test.pz.P.ord})")
        await tap(page,f'#pzb [data-liar="{P["liar"]}"]')
        for i,v in enumerate(P['ord']):
            await tap(page,f'#pjtray [data-tok="{v}"]')
            await tap(page,f'#pzb .jail-timeline [data-slot="{i}"]')
        await tap(page,'#pjgo')
        return 2*len(P['ord'])+2
    if gid=='pz_pheart':
        positions=await page.evaluate("()=>__test.pz.P.sol")
        for i,pos in enumerate(positions):
            await tap(page,f'#phtr [data-tok="{i}"]')
            await tap(page,f'#phbm [data-slot="{pos}"]')
        await tap(page,'#phgo')
        return len(positions)*2+1
    if gid=='pz_parm':
        P=await page.evaluate("()=>{let p=__test.pz.P;return {n:p.n,pcs:p.pcs.map(x=>({r:x.r,sol:x.sol}))}}")
        n=0
        for i,p in enumerate(P['pcs']):
            await tap(page,f'#pat .pap[data-p="{i}"]');n+=1
            for _ in range((4-int(p['r'] or 0))%4):
                await tap(page,'#parot');n+=1
            x,y=p['sol']
            await tap(page,f'#pab .pac[data-i="{y*P["n"]+x}"]');n+=1
        return n
    if gid=='pz_pboss1':
        P=await page.evaluate("()=>{let p=__test.pz;return {v:p.A.v,door:p.Bq.sol.door,time:p.C.T}}")
        n=0
        for i,steps in enumerate(P['v']):
            for _ in range(steps):
                await tap(page,f'#pbb [data-u="{i}"]');n+=1
        await tap(page,'#bgo')
        await page.wait_for_function("()=>__test.pz.stage()===1",timeout=10000)
        await tap(page,f'#pbb .pqd[data-d="{P["door"]}"]')
        await page.wait_for_function("()=>__test.pz.stage()===2",timeout=10000)
        for _ in range(P['time']//10):
            await tap(page,'#bu10');n+=1
        for _ in range(P['time']%10):
            await tap(page,'#bu');n+=1
        await tap(page,'#bgo')
        return n+3
    raise AssertionError('unsupported engine '+gid)

async def main():
    rows=[];errors=[]
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox']))
        ctx=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,
            has_touch=True,locale='ar-SA',reduced_motion='reduce')
        await ctx.add_init_script("window.__test={}")
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
            for gid in GROUPS[GROUP]:
                mx=await page.evaluate("id=>pzMax(id)",gid)
                assert isinstance(mx,int) and 1<=mx<=20,(gid,mx)
                for level in range(1,mx+1):
                    row={'id':gid,'level':level};prior=len(errors)
                    try:
                        await open_board(page,gid,level)
                        assert await page.evaluate("()=>RUN.last?.lv")==level
                        assert not await page.evaluate("()=>!!document.querySelector('#pzb.solved')"),'auto win'
                        before=await page.evaluate("id=>pzState().n[id]||0",gid)
                        row['actions']=await solve(page,gid)
                        await page.wait_for_function("()=>!!document.querySelector('#pzb.solved')",
                            timeout=42000)
                        await page.wait_for_function("([id,n])=>(pzState().n[id]||0)>n",
                            arg=[gid,before],timeout=14000)
                        await page.wait_for_function("""([id,n])=>
                            (JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n?.[id]||0)>n
                        """,arg=[gid,before],timeout=14000)
                        after=await page.evaluate("id=>pzState().n[id]||0",gid)
                        assert after==before+1,(gid,level,before,after)
                        row['win']=True
                        await page.wait_for_timeout(650)
                    except Exception as ex:
                        row['error']=str(ex)[:520]
                        try:await page.screenshot(path=str(OUT/f'{ENGINE}-{gid}-{level}.png'),timeout=8500)
                        except Exception:pass
                    if len(errors)>prior:row['jsErrors']=errors[prior:][:4]
                    rows.append(row)
                    print('LAST_SEVEN_CASE='+json.dumps(row,ensure_ascii=True),flush=True)
            await page.reload(wait_until='load',timeout=50000)
            stored=await page.evaluate("()=>JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n||{}")
            for row in rows:
                if row.get('win') and stored.get(row['id'],0)<1:row['error']='win not retained after reload'
        finally:
            gaps=[r for r in rows if r.get('error') or r.get('jsErrors')]
            summary={'engine':ENGINE,'group':GROUP,'wins':sum(1 for r in rows if r.get('win') and not r.get('error') and not r.get('jsErrors')),
                     'total':len(rows),'gaps':gaps,'pageErrors':errors,'cases':rows}
            (OUT/f'last-seven-{ENGINE}-{GROUP}.json').write_text(json.dumps(summary,ensure_ascii=True,indent=2))
            print('LAST_SEVEN_SUMMARY='+json.dumps(
                {k:v for k,v in summary.items() if k!='cases'},ensure_ascii=True),flush=True)
            await browser.close()
        assert not gaps and not errors and len(rows)>=len(GROUPS[GROUP])*7

if __name__=='__main__':asyncio.run(main())
