"""Regression for pz_zshadow: a final corrected lamp from a guided hint must finish
the puzzle with no perfect award. Native game logic is used for the win.
Usage: python qa/browser/zshadow_hint_completion.py URL chromium|webkit
"""
import asyncio,json,os,sys
from playwright.async_api import async_playwright
from player_openings import dismiss_opening

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
assert ENGINE in ('chromium','webkit')

async def main():
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),
                               args=['--no-sandbox']))
        context=await browser.new_context(viewport={'width':390,'height':844},
                                          is_mobile=True,has_touch=True,
                                          reduced_motion='reduce',locale='ar-SA')
        await context.add_init_script("window.__test={}")
        page=await context.new_page()
        errors=[]
        page.on('pageerror',lambda ex:errors.append(str(ex)))
        await page.goto(URL,wait_until='domcontentloaded',timeout=45000)
        profile=page.locator('.mpc[data-m=main]')
        if await profile.count() and await profile.is_visible():
            await profile.click()
        await page.evaluate("()=>tab('puz')")
        await page.wait_for_function("()=>!!window.mindlabPlayLayers?.ready",timeout=45000)
        await page.evaluate("()=>{S.st.mute=true;startRun(['pz_zshadow'])}")
        await dismiss_opening(page,wait=1200)
        await page.wait_for_function("()=>!!window.__test?.pz?.P?.sol && !!document.querySelector('#pzh')",timeout=20000)
        fixture=await page.evaluate("""()=>{
           const h=window.__test.pz,sol=h.P.sol,pos=h.pos();
           if(!sol.length || !Array.isArray(pos)||pos.length!==sol.length)return null;
           for(let i=0;i<pos.length;i++)pos[i]=sol[i];
           // Leave exactly the first lamp incorrect, so hint two truly completes.
           pos[0]=(sol[0]+1)%h.P.offs.length;
           return {lamps:pos.length,wrong:pos.filter((p,i)=>p!==sol[i]).length};
        }""")
        assert fixture and fixture['wrong']==1,fixture
        await page.locator('#pzh').click()
        await page.wait_for_timeout(130)
        assert await page.locator('#pzhn').inner_text()=='2'
        await page.locator('#pzh').click()
        await page.wait_for_function("""()=>{
          const b=document.querySelector('#pzb'),st=document.querySelector('#stage');
          return !!b?.classList.contains('solved')||st?.dataset.expState==='solved';
        }""",timeout=12000)
        assert await page.locator('#pzb.solved').count()==1,'guided final correction did not trigger real win'
        assert await page.evaluate("()=>Number(pzState().n.pz_zshadow||0)")>=1,'game win did not persist'
        state=await page.evaluate("""()=>{
            const done=zState().done.pz_zshadow;
            const z=zState(),tx=txState();
            return {perfect:!!done?.p,solved:!!done,progress:Number(pzState().n.pz_zshadow||0),
              listIndex:Z3.findIndex(q=>q.id==='pz_zshadow'),currentStation:z.prog,
              stationCount:Object.keys(z.done||{}).length,
              currentFound:tx.found?.length,hasEntry:!!tx.a3,
              txSame:tx.a3===z,
              sceneStatus:document.querySelector('#m')?.textContent?.slice(0,110)||''};
        }""")
        print('ZSHADOW_ENGINE_STATE='+json.dumps(state,ensure_ascii=False),flush=True)
        # The exercise is launched from the *library* with startRun(), not
        # through Z3.openStation(). Native library completion is recorded in
        # pzState().n; it must NEVER silently unlock a story station in zState().
        assert state['progress']>=1 and not state['solved'] and not state['perfect'],state
        initial=state['progress']
        await page.wait_for_timeout(550)
        assert await page.evaluate("()=>Number(pzState().n.pz_zshadow||0)")==initial,\
            'guided final hint duplicated a reward'
        assert not errors,errors[:5]
        print('JAZIRAN_ZSHADOW_HINT='+json.dumps({'engine':ENGINE,'lamps':fixture['lamps'],
            'guided_win':True,'perfect_undelivered':True,'campaign_gate_preserved':True,'no_duplicate':True,
            'persisted_count':initial,'errors':errors},ensure_ascii=False),flush=True)
        await browser.close()

asyncio.run(main())
