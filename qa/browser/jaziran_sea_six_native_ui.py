"""Player-control wins for six Seven Seas puzzles, levels 1-8 per puzzle.

Generated solution is read only for planning. All moves are real Playwright
button clicks. Never call engine set/check/solve/win, never mutate save.
Usage: python qa/browser/jaziran_sea_six_native_ui.py URL chromium|webkit OUT
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from player_openings import dismiss_opening

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8796/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
OUT=Path(sys.argv[3]) if len(sys.argv)>3 else Path('/tmp/jaziran-sea-six')
assert ENGINE in ('chromium','webkit')
OUT.mkdir(parents=True,exist_ok=True)
TRACKS=('pz_zcode','pz_zharp','pz_zshadow','pz_zcur','pz_zstars','pz_zthrone')

async def tap(page,sel):
    await page.locator(sel).first.click(timeout=9000)
    await page.wait_for_timeout(65)

async def open_board(page,gid,level):
    await page.evaluate('([id,lv])=>{startRun([id]);RUN.replay={id,lv,seed:4000+lv}}',[gid,level])
    await page.wait_for_timeout(180)
    starter=page.locator('#stage #go')
    if await starter.count() and await starter.first.is_visible():
        await tap(page,'#stage #go')
    await dismiss_opening(page,wait=900)
    try: await page.wait_for_function("()=>!document.querySelector('#stage .cd')",timeout=12000)
    except Exception: pass
    await page.locator('#pzb').wait_for(state='visible',timeout=18000)
    await page.wait_for_function("id=>document.querySelector('#play')?.dataset.laGame===id",arg=gid,timeout=10000)

async def solve(page,gid):
    if gid=='pz_zcode':
        P=await page.evaluate("()=>{const p=__test.pz.P;return {letters:p.letters,known:p.known,key:p.key,place:p.place}}")
        n=0
        for letter in P['letters']:
            if letter in P['known']:continue
            await tap(page,f'#zkm .zkc[data-s="{P["key"][letter]}"]:not([disabled])')
            await tap(page,f'#zkb button[data-c="{letter}"]')
            n+=2
        await page.locator('#zkq .xbo2').first.wait_for(state='visible',timeout=10000)
        choice=page.locator('#zkq .xbo2').filter(has_text=P['place'])
        assert await choice.count()==1,'destination not unique'
        await choice.click()
        return n+1
    if gid=='pz_zharp':
        await page.wait_for_function("()=>__test?.pz?.busy?.()===false",timeout=22000)
        want=await page.evaluate("()=>__test.pz.want")
        assert want and all(isinstance(k,int) for k in want)
        for note in want:await tap(page,f'#zhh button[data-s="{note}"]')
        return len(want)
    if gid=='pz_zshadow':
        P=await page.evaluate("()=>({start:__test.pz.P.start,sol:__test.pz.P.sol,cycle:__test.pz.P.offs.length,budget:__test.pz.P.st.length*3+4})")
        n=0
        for i,(a,b) in enumerate(zip(P['start'],P['sol'])):
            for _ in range((b-a)%P['cycle']):
                await tap(page,f'#pzb .zss button[data-i="{i}"]')
                n+=1
        assert n<=P['budget'],'exceeds generated move budget'
        return n
    if gid=='pz_zcur':
        P=await page.evaluate("()=>{const p=__test.pz.P;return {rot:p.rot0,gates:p.cell.map((c,i)=>c.t==='gate'?{i,g:c.g}:null).filter(Boolean)}}")
        n=0
        for group,initial in enumerate(P['rot']):
            gate=next((x['i'] for x in P['gates'] if x['g']==group),None)
            assert gate is not None,'no gate for group'
            for _ in range((-initial)%4):
                await tap(page,f'#zgw .zgate[data-i="{gate}"]')
                n+=1
        await tap(page,'#zggo')
        return n+1
    if gid=='pz_zstars':
        edges=await page.evaluate("()=>__test.pz.P.edges")
        assert edges
        for edge in edges:
            a,b=map(int,edge.split('-'))
            await tap(page,f'#zts .ztst[data-i="{a}"]')
            await tap(page,f'#zts .ztst[data-i="{b}"]')
        await tap(page,'#ztgo')
        return 2*len(edges)+1
    if gid=='pz_zthrone':
        order=await page.evaluate("()=>__test.pz.P.ord")
        assert len(order)==6 and sorted(order)==list(range(6))
        for slot,tool in enumerate(order):
            await tap(page,f'#zot .zotool[data-t="{tool}"]')
            await tap(page,f'#zow .zoslot[data-s="{slot}"]')
        await tap(page,'#zogo')
        return 13
    raise AssertionError('missing native solver '+gid)

async def main():
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox']))
        ctx=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,
            has_touch=True,locale='ar-SA',reduced_motion='reduce')
        await ctx.add_init_script('window.__test={}')
        page=await ctx.new_page()
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        rows=[]
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
                    await open_board(page,gid,level)
                    before=await page.evaluate("""id=>({
                        lv:pzLv(id),n:pzState().n[id]||0,
                        stored:JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n?.[id]||0})""",gid)
                    assert before['lv']==level and before['n']==before['stored'],(gid,level,before)
                    active=await page.evaluate("()=>({id:RUN.last?.id,lv:RUN.last?.lv})")
                    assert active=={'id':gid,'lv':level},f'wrong actual stage: {gid} {level} {active}'
                    actions=await solve(page,gid)
                    await page.wait_for_function("""()=>{
                        const b=document.querySelector('#pzb'),a=document.querySelector('#play #ag');
                        return !!b?.classList.contains('solved')||!!(a&&!a.hidden&&a.offsetParent!==null)}""",timeout=24000)
                    await page.wait_for_function("([id,n])=>(pzState().n[id]||0)>n",
                        arg=[gid,before['n']],timeout=12000)
                    await page.wait_for_function("""([id,n])=>{
                        try{return (JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n?.[id]||0)>n}
                        catch(e){return false}}""",arg=[gid,before['n']],timeout=12000)
                    after=await page.evaluate("""id=>({lv:pzLv(id),n:pzState().n[id]||0,
                      stored:JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n?.[id]||0})""",gid)
                    assert after['n']==before['n']+1 and after['stored']==after['n'],(gid,level,after)
                    assert after['lv']==min(8,level+1),(gid,level,after)
                    row={'id':gid,'level':level,'nativeWin':True,'saved':True,'actions':actions}
                    rows.append(row)
                    print('JAZIRAN_SEA_NATIVE='+json.dumps(row,ensure_ascii=True),flush=True)
                    await page.wait_for_timeout(900)
            await page.reload(wait_until='load',timeout=50000)
            saved=await page.evaluate("()=>JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n||{}")
            assert all(saved.get(gid)==8 for gid in TRACKS),saved
            assert not errors,errors[:5]
            outcome={'engine':ENGINE,'uniquePuzzles':len(TRACKS),'nativeWins':len(rows),
                'savedAfterReload':True,'jsErrors':errors,'rows':rows}
            print('JAZIRAN_SEA_NATIVE_SUMMARY='+json.dumps({k:v for k,v in outcome.items() if k!='rows'},ensure_ascii=True),flush=True)
        except Exception as exc:
            outcome={'engine':ENGINE,'nativeWins':len(rows),'error':str(exc),'jsErrors':errors,'rows':rows}
            try:await page.screenshot(path=str(OUT/f'{ENGINE}-failed-after-{len(rows)}.png'),timeout=12000)
            except Exception:pass
            raise
        finally:
            (OUT/f'jaziran-sea-native-{ENGINE}.json').write_text(
                json.dumps(outcome,ensure_ascii=True,indent=2),encoding='utf8')
            await browser.close()

if __name__=='__main__':asyncio.run(main())
