"""Native-only UI playthrough for the five remaining Seven Seas puzzle engines.

Read-only generated puzzle metadata instructs player clicks; victory must be
observed from the real engine and persisted, never mutated through test hooks.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from jaziran_sea_six_native_ui import tap,open_board

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8802/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
OUT=Path(sys.argv[3]) if len(sys.argv)>3 else Path('/tmp/mindlab-five-seas')
assert ENGINE in ('chromium','webkit')
OUT.mkdir(parents=True,exist_ok=True)
TRACKS=['pz_tpath','pz_xreef','pz_xbridge','pz_xcave','pz_ymap']

async def solve(page,gid):
    if gid=='pz_tpath':
        target=await page.evaluate("()=>__test.pz.P.E")
        await page.wait_for_function("()=>__test.pz.active()===true",timeout=25000)
        await tap(page,f'#xb .xc[data-i="{target}"]')
        return 1
    if gid=='pz_xreef':
        steps=await page.evaluate("()=>__test.pz.P.sol")
        assert steps
        for d in steps:
            old=await page.evaluate("()=>__test.pz.pos()")
            await tap(page,f'#pzb .xpad button[data-d="{d}"]')
            await page.wait_for_function("(old)=>__test.pz.pos()!==old||document.querySelector('#pzb.solved')",
                arg=old,timeout=20000)
        return len(steps)
    if gid=='pz_xbridge':
        P=await page.evaluate("()=>({lengths:__test.pz.P.planks,solution:__test.pz.P.sol})")
        used=set()
        for length in P['solution']:
            pos=next((i for i,v in enumerate(P['lengths']) if v==length and i not in used),None)
            assert pos is not None,'missing physical plank with required length'
            await tap(page,f'#xgtray .xgplank[data-i="{pos}"]')
            used.add(pos)
        return len(P['solution'])
    if gid=='pz_xcave':
        order=await page.evaluate("()=>__test.pz.P.ord")
        for i in order:await tap(page,f'#xcw .xct[data-i="{i}"]')
        return len(order)
    if gid=='pz_ymap':
        P=await page.evaluate("()=>{const p=__test.pz.P;return {cur:p.cur,rot:p.rot,n:p.n}}")
        state=[dict(x) for x in P['cur']]
        actions=0
        # Sort-and-orient each tile in a single swap; otherwise selecting a new
        # piece after rotating adds two gratuitous swaps per tile and can exceed
        # the game's original, intentionally limited move budget.
        for i in range(len(state)):
            if state[i]['t']!=i:
                j=next(j for j in range(i+1,len(state)) if state[j]['t']==i)
                await tap(page,f'#ymg button[data-i="{j}"]')
                for _ in range((-state[j]['r'])%4):
                    assert P['rot'],'rotation requested on non-rotating level'
                    await tap(page,f'#ymg button[data-i="{j}"]')
                    actions+=1
                await tap(page,f'#ymg button[data-i="{i}"]')
                actions+=1
                state[i],state[j]=state[j],state[i]
                state[i]['r']=0
            elif state[i]['r']!=0:
                assert P['rot']
                await tap(page,f'#ymg button[data-i="{i}"]')
                for _ in range((-state[i]['r'])%4):
                    await tap(page,f'#ymg button[data-i="{i}"]')
                    actions+=1
                state[i]['r']=0
                # Two reversible physical swaps clear the selected tile while
                # leaving the layout and orientation unchanged.
                if i!=len(state)-1:
                    j=i+1
                    await tap(page,f'#ymg button[data-i="{j}"]')
                    await tap(page,f'#ymg button[data-i="{i}"]')
                    await tap(page,f'#ymg button[data-i="{j}"]')
                    actions+=2
        assert all(x['t']==i and x['r']==0 for i,x in enumerate(state))
        # If the final tile had to be rotated, the rotation itself already wins.
        assert actions<=P['n']**2*(4 if P['rot'] else 2)+6,\
            f'player action plan exceeds existing budget: {actions}'
        return actions
    raise AssertionError(gid)

async def main():
    rows=[];errors=[]
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox']))
        ctx=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,
          locale='ar-SA',reduced_motion='reduce')
        await ctx.add_init_script('window.__test={}')
        page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            await page.goto(URL,wait_until='load',timeout=50000)
            profile=page.locator('.mpc[data-m=main]')
            if await profile.count() and await profile.is_visible():await profile.click()
            await page.evaluate("()=>tab('puz')")
            await page.evaluate("async()=>await mindlabPlayLayers.start()")
            await page.wait_for_function("()=>mindlabPlayLayers?.ready===true",timeout=45000)
            await page.evaluate("()=>{S.st.mute=true}")
            for gid in TRACKS:
                for level in range(1,9):
                    row={'id':gid,'level':level};prior=len(errors)
                    try:
                        await open_board(page,gid,level)
                        assert await page.evaluate("()=>RUN.last?.lv")==level
                        assert not await page.evaluate("()=>!!document.querySelector('#pzb.solved')"),'auto win'
                        before=await page.evaluate("id=>pzState().n[id]||0",gid)
                        row['actions']=await solve(page,gid)
                        await page.wait_for_function("()=>!!document.querySelector('#pzb.solved')",timeout=35000)
                        await page.wait_for_function("([id,n])=>(pzState().n[id]||0)>n",
                            arg=[gid,before],timeout=12000)
                        await page.wait_for_function("""([id,n])=>
                          (JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n?.[id]||0)>n
                        """,arg=[gid,before],timeout=12000)
                        now=await page.evaluate("id=>pzState().n[id]||0",gid)
                        assert now==before+1
                        row['win']=True
                        await page.wait_for_timeout(850)
                    except Exception as ex:
                        row['error']=str(ex)[:440]
                        try:await page.screenshot(path=str(OUT/f'{ENGINE}-{gid}-{level}.png'),timeout=7000)
                        except Exception:pass
                    if len(errors)>prior:row['jsErrors']=errors[prior:][:4]
                    rows.append(row);print('SEA_LAST_CASE='+json.dumps(row,ensure_ascii=True),flush=True)
            await page.reload(wait_until='load',timeout=50000)
            stored=await page.evaluate("()=>JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n||{}")
            for row in rows:
                if row.get('win') and stored.get(row['id'],0)<1:row['error']='win lost on reload'
        finally:
            summary={'engine':ENGINE,'wins':sum(r.get('win') and not r.get('error') and not r.get('jsErrors') for r in rows),
                'total':len(rows),'deficits':[r for r in rows if r.get('error') or r.get('jsErrors')],
                'pageErrors':errors,'results':rows}
            (OUT/f'sea-last-{ENGINE}.json').write_text(json.dumps(summary,indent=2,ensure_ascii=True))
            print('SEA_LAST_SUMMARY='+json.dumps({k:v for k,v in summary.items() if k!='results'},ensure_ascii=True),flush=True)
            await browser.close()
        assert len(rows)==40 and not summary['deficits']

if __name__=='__main__':asyncio.run(main())
