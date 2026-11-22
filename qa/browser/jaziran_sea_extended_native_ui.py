"""Seven Seas additional real-control puzzle acceptance: native Playwright taps only.

Read generated puzzle solution for action planning; every change to gameplay comes
from clicking/swiping visible controls, NEVER engine hooks or localStorage mutation.
Each level is independent, and failure is recorded without masking further cases.

python qa/browser/jaziran_sea_extended_native_ui.py URL ENGINE GROUP OUTDIR
GROUP: island | voyage
"""
import asyncio,json,os,sys,traceback
from pathlib import Path
from playwright.async_api import async_playwright
from jaziran_sea_six_native_ui import tap,open_board

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8798/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
GROUP=sys.argv[3] if len(sys.argv)>3 else 'island'
OUT=Path(sys.argv[4]) if len(sys.argv)>4 else Path('/tmp/jaziran-sea-extended')
GROUPS={
 'island':['pz_xloot','pz_xlock','pz_tmap','pz_tdig','pz_zcomp','pz_znim'],
 'voyage':['pz_yhold','pz_ytide','pz_ydoor','pz_ybell','pz_zroute']
}
assert ENGINE in ('chromium','webkit') and GROUP in GROUPS
OUT.mkdir(parents=True,exist_ok=True)

async def solved(page):
    return await page.evaluate("""()=>{
      const a=document.querySelector('#play #ag'),b=document.querySelector('#pzb');
      return !!b?.classList.contains('solved')||!!(a&&!a.hidden&&a.offsetParent!==null)
    }""")

async def solve(page,gid):
    if gid=='pz_xloot':
        own=await page.evaluate("()=>__test.pz.P.own")
        for i,p in enumerate(own):
            await tap(page,f'#xltray .xlbag[data-b="{i}"]')
            await tap(page,f'.loot-recipient[data-p="{p}"]')
        return len(own)*2
    if gid=='pz_xlock':
        P=await page.evaluate("()=>({code:__test.pz.P.code})")
        for symbol in P['code']:
            await tap(page,f'#pzb .xkpal [data-s="{symbol}"]')
        await tap(page,'#xkgo')
        return len(P['code'])+1
    if gid=='pz_tmap':
        target=await page.evaluate("()=>__test.pz.P.T")
        assert target is not None
        await tap(page,f'#xb .xc[data-i="{target}"]')
        return 1
    if gid=='pz_tdig':
        P=await page.evaluate("()=>({target:__test.pz.P.T,dig:__test.pz.P.dig,digs:__test.pz.P.digs})")
        wrong=next((k for k in P['dig'] if k!=P['target']),None)
        actions=0
        if wrong is not None and P['digs']>=2:
            await tap(page,f'#xb .xc[data-i="{wrong}"]')
            await page.wait_for_timeout(1450)
            assert not await solved(page),'wrong dig unexpectedly wins'
            actions+=1
        await tap(page,f'#xb .xc[data-i="{P["target"]}"]')
        return actions+1
    if gid=='pz_zcomp':
        P=await page.evaluate("()=>{let p=__test.pz.P;return {T:p.T,clues:p.clues,marks:p.marks}}")
        actions=0
        for clue in P['clues']:
            mark=P['marks'][clue['L']]['cell']
            await tap(page,f'#xb .xc[data-i="{mark}"]')
            actions+=1
            d=int(clue['d'])
            sel='#zr' if d<=4 else '#zl'
            for _ in range(min(d,8-d)):
                await tap(page,sel)
                actions+=1
        await tap(page,'#pzb button[data-tool="dig"]')
        await tap(page,f'#xb .xc[data-i="{P["T"]}"]')
        return actions+2
    if gid=='pz_znim':
        actions=0
        for _ in range(40):
            if await solved(page):return actions
            move=await page.evaluate("()=>__test.pz.best()")
            if not move:break
            i,c=move
            await tap(page,f'#znp button.znpile[data-i="{i}"]')
            for j in range(c-1):await tap(page,'#znpl')
            await tap(page,'#zngo')
            actions+=c+1
            await page.wait_for_timeout(1040)
        assert await solved(page),'optimal turn sequence did not finish'
        return actions
    if gid=='pz_yhold':
        moves=await page.evaluate("()=>__test.pz.P.sol")
        assert moves
        for d in moves:await tap(page,f'#pzb .xpad button[data-d="{d}"]')
        return len(moves)
    if gid=='pz_ytide':
        moves=await page.evaluate("()=>__test.pz.P.sol")
        assert moves
        for d in moves:await tap(page,f'#pzb .ytpad button[data-a="{d}"]')
        return len(moves)
    if gid=='pz_ydoor':
        moves=await page.evaluate("()=>__test.pz.P.sol")
        assert moves
        for d in moves:await tap(page,f'#pzb .ydlev button[data-j="{d}"]')
        return len(moves)
    if gid=='pz_ybell':
        actions=0
        for _ in range(12):
            await page.wait_for_function("""()=>document.querySelector('#pzb.solved')||
                  (__test?.pz?.busy&&__test.pz.busy()===false)""",timeout=28000)
            if await solved(page):return actions
            moves=await page.evaluate("()=>__test.pz.want()")
            for b in moves:
                await tap(page,f'#pzb .ybb[data-b="{b}"]')
                actions+=1
            await page.wait_for_timeout(210)
        return actions
    if gid=='pz_zroute':
        P=await page.evaluate("()=>{const p=__test.pz.P;return {start:p.start,sol:p.sol,w:p.w,h:p.h,D4}}")
        pos=int(P['start'])
        actions=0
        for d in P['sol']:
            if d==4:
                await tap(page,'#zrw8')
            else:
                dx,dy=P['D4'][d]
                x=pos%P['w']+dx
                y=pos//P['w']+dy
                assert 0<=x<P['w'] and 0<=y<P['h']
                board=page.locator('#zrw')
                await board.scroll_into_view_if_needed()
                box=await board.bounding_box()
                assert box and box['width']>50 and box['height']>50
                await page.mouse.click(box['x']+(x+0.5)*box['width']/P['w'],
                    box['y']+(y+0.5)*box['height']/P['h'])
                await page.wait_for_timeout(75)
                pos=y*P['w']+x
            actions+=1
        assert await page.evaluate("()=>__test.pz.plan().length")==len(P['sol']),\
            'visible path editor dropped route actions'
        await tap(page,'#zrgo')
        return actions+1
    raise AssertionError('missing native controls for '+gid)

async def main():
    rows=[];errors=[]
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox']))
        ctx=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,
                has_touch=True,locale='ar-SA',reduced_motion='reduce')
        await ctx.add_init_script('window.__test={}')
        page=await ctx.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            await page.goto(URL,wait_until='load',timeout=55000)
            profile=page.locator('.mpc[data-m=main]')
            if await profile.count() and await profile.first.is_visible():await profile.first.click()
            await page.evaluate("()=>tab('puz')")
            await page.evaluate("async()=>await mindlabPlayLayers.start()")
            await page.wait_for_function("()=>mindlabPlayLayers?.ready===true",timeout=45000)
            await page.evaluate("()=>{S.st.mute=true}")
            for gid in GROUPS[GROUP]:
                for level in range(1,9):
                    row={'id':gid,'level':level}
                    prior=len(errors)
                    try:
                        await open_board(page,gid,level)
                        live=await page.evaluate("()=>RUN.last?.lv")
                        assert live==level,f'wrong actual level {level}!={live}'
                        before=await page.evaluate("id=>pzState().n[id]||0",gid)
                        row['actions']=await solve(page,gid)
                        await page.wait_for_function("""()=>!!document.querySelector('#pzb.solved')||
                          !!document.querySelector('#play #ag:not([hidden])')""",timeout=34000)
                        await page.wait_for_function("([id,n])=>(pzState().n[id]||0)>n",
                            arg=[gid,before],timeout=12000)
                        await page.wait_for_function("""([id,n])=>{
                          const s=JSON.parse(localStorage.getItem('miran:v2')||'{}')
                          return (s.puz?.n?.[id]||0)>n}""",arg=[gid,before],timeout=12000)
                        now=await page.evaluate("id=>pzState().n[id]||0",gid)
                        assert now==before+1,f'win awarded more than once {before} -> {now}'
                        row['nativeWin']=True
                        row['saved']=True
                        await page.wait_for_timeout(900)
                    except Exception as e:
                        row['error']=str(e)[:400]
                        try:await page.screenshot(path=str(OUT/f'{ENGINE}-{gid}-lv{level}.png'),timeout=9000)
                        except Exception:pass
                    if len(errors)>prior:row['jsErrors']=errors[prior:][:4]
                    rows.append(row)
                    print('SEA_EXTRA_CASE='+json.dumps(row,ensure_ascii=True),flush=True)
            await page.reload(wait_until='load',timeout=55000)
            saved=await page.evaluate("()=>JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n||{}")
            for row in rows:
                if row.get('nativeWin') and saved.get(row['id'],0)<1:row['error']='native win lost on reload'
        finally:
            summary={'engine':ENGINE,'group':GROUP,'wins':sum(r.get('nativeWin') and not r.get('error') and not r.get('jsErrors') for r in rows),
              'total':len(rows),'deficits':[r for r in rows if r.get('error') or r.get('jsErrors')],
              'pageErrors':errors,'results':rows}
            (OUT/f'sea-extended-{ENGINE}-{GROUP}.json').write_text(json.dumps(summary,indent=2,ensure_ascii=True))
            print('SEA_EXTRA_SUMMARY='+json.dumps({k:v for k,v in summary.items() if k!='results'},ensure_ascii=True),flush=True)
            await browser.close()
        assert not summary['deficits'] and len(rows)==len(GROUPS[GROUP])*8

if __name__=='__main__':asyncio.run(main())
