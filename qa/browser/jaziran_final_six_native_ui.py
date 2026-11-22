"""Last six library engines: actual eight-level UI acceptance on both browsers.

Read-only hook exposes generated witness; no hook setters, no calling win/check,
no storage injection. Every move must be performed by a visible Playwright tap
or genuine mouse drag, then the actual game awards and retains one completion.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from jaziran_sea_six_native_ui import tap,open_board

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8805/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
GROUP=sys.argv[3] if len(sys.argv)>3 else 'athran'
OUT=Path(sys.argv[4]) if len(sys.argv)>4 else Path('/tmp/mindlab-final-six')
GROUPS={
 'athran':['pz_aarch','pz_alayer','pz_acity','pz_arelic'],
 'palace':['pz_pobs','pz_pliar']
}
assert ENGINE in ('chromium','webkit') and GROUP in GROUPS
OUT.mkdir(parents=True,exist_ok=True)

async def pair(page,source,target):
    await tap(page,source)
    await tap(page,target)

async def drag(page,source,target):
    first=page.locator(source).first
    await first.scroll_into_view_if_needed()
    a=await first.bounding_box()
    assert a and a['width']>=8 and a['height']>=8,(source,a)
    x=a['x']+a['width']/2;y=a['y']+a['height']/2
    await page.mouse.move(x,y)
    await page.mouse.down()
    await page.mouse.move(x+7,y+7,steps=3)
    dst=page.locator(target).first
    await dst.scroll_into_view_if_needed()
    b=await dst.bounding_box()
    assert b and b['width']>5 and b['height']>5,(target,b)
    await page.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2,steps=10)
    await page.mouse.up()
    await page.wait_for_timeout(140)

async def turn_statue(page,index,want,n):
    for _ in range(n+3):
        cur=await page.evaluate("(i)=>__test.pz.state().dir[i]",index)
        if cur==want:return
        await tap(page,f'.pl-st[data-st="{index}"] .pl-turn')
        nxt=await page.evaluate("(i)=>__test.pz.state().dir[i]",index)
        assert nxt==(0 if cur<0 else (cur+1)%(n+1)),(index,cur,nxt,n)
    raise AssertionError('statue cannot be turned to correct direction')

async def solve(page,gid):
    if gid=='pz_aarch':
        P=await page.evaluate("()=>({cap:__test.pz.P.cap,fat:__test.pz.P.fat})")
        for row,v in enumerate(P['cap']):
            await pair(page,f'[data-tray="c"] [data-tok="c{v}"]',f'[data-slot="c{row}"]')
        for row,v in enumerate(P['fat']):
            await pair(page,f'[data-tray="f"] [data-tok="f{v}"]',f'[data-slot="f{row}"]')
        await tap(page,'#aargo')
        return 2*(len(P['cap'])+len(P['fat']))+1
    if gid=='pz_alayer':
        order=await page.evaluate("()=>{let p=__test.pz.P;return p.ev.map(e=>p.items.indexOf(e))}")
        for i,j in enumerate(order):
            await pair(page,f'[data-tray="t"] [data-tok="{j}"]',
                       f'.mk-slot.tl[data-slot="{i}"]')
        await tap(page,'#alygo')
        return len(order)*2+1
    if gid=='pz_acity':
        gone=await page.evaluate("()=>__test.pz.P.gone")
        await tap(page,f'#actweb [data-sp="{gone}"]')
        await page.wait_for_function("()=>document.querySelector('#actsim')?.classList.contains('good')",timeout=12000)
        await tap(page,'#actgo')
        return 2
    if gid=='pz_arelic':
        target=await page.evaluate("()=>__test.pz.P.tr")
        await pair(page,f'[data-tray="s"] [data-tok="{target}"]',
                   '[data-slot="cmp"]')
        assert await page.evaluate("()=>document.querySelector('#arlcmp')?.classList.contains('good')"),'real source not recognized'
        await pair(page,f'[data-slot="cmp"] [data-tok="{target}"]',
                   '[data-slot="truth"]')
        await tap(page,'#arlgo')
        return 5
    if gid=='pz_pobs':
        P=await page.evaluate("()=>({n:__test.pz.P.n,R:__test.pz.P.R,ans:__test.pz.P.ans})")
        actions=0
        for _ in range(P['R']):
            await tap(page,'.po-pad [data-m="t"]')
            actions+=1
        state=await page.evaluate("()=>__test.pz.state()")
        dx,dy=state['dx'],state['dy']
        tx,ty=P['ans']
        for d,count in [('r',max(0,tx-dx)),('l',max(0,dx-tx)),
                        ('d',max(0,ty-dy)),('u',max(0,dy-ty))]:
            for _ in range(count):
                await tap(page,f'.po-pad [data-m="{d}"]')
                actions+=1
        assert actions<=24,'solution required more than the original move budget'
        return actions
    if gid=='pz_pliar':
        I=await page.evaluate("()=>{let p=__test.pz.I;return {n:p.n,t:p.t,values:drVals(p,p.t)}}")
        await drag(page,'.pl-tray [data-tok="key"]',f'.pl-door[data-door="{I["t"]}"]')
        for i,is_true in enumerate(I['values']):
            await turn_statue(page,i,I['t'] if is_true else I['n'],I['n'])
        await tap(page,'#plgo')
        await page.wait_for_function("()=>__test.pz.round()===1",timeout=12000)
        P=await page.evaluate("()=>{let p=__test.pz.P;return {D:p.D,tr:p.sol.tr,door:p.sol.door}}")
        for i,is_true in enumerate(P['tr']):
            await turn_statue(page,i,P['door'] if is_true else P['D'],P['D'])
        await tap(page,'#plgo')
        return 2+len(I['values'])+len(P['tr'])
    raise AssertionError(gid)

async def main():
    rows=[];errors=[]
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox']))
        ctx=await browser.new_context(viewport={'width':390,'height':844},has_touch=True,
            is_mobile=True,locale='ar-SA',reduced_motion='reduce')
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
                max_level=await page.evaluate("id=>pzMax(id)",gid)
                assert isinstance(max_level,int) and 1<=max_level<=20,(gid,max_level)
                for level in range(1,max_level+1):
                    row={'id':gid,'level':level}
                    before_errors=len(errors)
                    try:
                        await open_board(page,gid,level)
                        actual=await page.evaluate("()=>RUN.last?.lv")
                        assert actual==level,(gid,level,actual)
                        assert not await page.evaluate("()=>!!document.querySelector('#pzb.solved')"),'auto win'
                        previous=await page.evaluate("id=>pzState().n[id]||0",gid)
                        row['actions']=await solve(page,gid)
                        await page.wait_for_function("()=>!!document.querySelector('#pzb.solved')",timeout=40000)
                        await page.wait_for_function("([id,n])=>(pzState().n[id]||0)>n",
                            arg=[gid,previous],timeout=14000)
                        await page.wait_for_function("""([id,n])=>
                            (JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n?.[id]||0)>n
                        """,arg=[gid,previous],timeout=14000)
                        now=await page.evaluate("id=>pzState().n[id]||0",gid)
                        assert now==previous+1,(gid,level,previous,now)
                        row['win']=True
                        await page.wait_for_timeout(720)
                    except Exception as ex:
                        row['error']=str(ex)[:580]
                        try:await page.screenshot(path=str(OUT/f'{ENGINE}-{gid}-{level}.png'),timeout=7000)
                        except Exception:pass
                    if len(errors)>before_errors:row['pageErrors']=errors[before_errors:][:4]
                    rows.append(row)
                    print('FINAL_SIX_CASE='+json.dumps(row,ensure_ascii=True),flush=True)
            await page.reload(wait_until='load',timeout=50000)
            saves=await page.evaluate("()=>JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n||{}")
            for row in rows:
                if row.get('win') and saves.get(row['id'],0)<1:row['error']='saved win missing after reload'
        finally:
            gaps=[row for row in rows if row.get('error') or row.get('pageErrors')]
            summary={'engine':ENGINE,'group':GROUP,'wins':sum(1 for r in rows if r.get('win') and not r.get('error') and not r.get('pageErrors')),
                'total':len(rows),'gaps':gaps,'pageErrors':errors,'cases':rows}
            (OUT/f'final-six-{ENGINE}-{GROUP}.json').write_text(json.dumps(summary,ensure_ascii=True,indent=2))
            print('FINAL_SIX_SUMMARY='+json.dumps({k:v for k,v in summary.items() if k!='cases'},ensure_ascii=True),flush=True)
            await browser.close()
        assert len(rows)==8*len(GROUPS[GROUP]) and not gaps and not errors

if __name__=='__main__':asyncio.run(main())
