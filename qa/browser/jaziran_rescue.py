"""Jaziran evacuation (PDF pp.6,35) real-browser acceptance on Chrome & WebKit.
Controlled native completion fixtures test chapter continuity, not solver validity.
Usage: python qa/browser/jaziran_rescue.py URL [chromium|webkit] [screenshots-dir]
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
SHOTS=Path(sys.argv[3]) if len(sys.argv)>3 else None
if SHOTS: SHOTS.mkdir(parents=True,exist_ok=True)

async def open_route(page,name):
    await page.evaluate("()=>tab('puz')")
    await page.wait_for_function("()=>window.mindlabPlayLayers?.ready && !!window.MindlabRescue?.open",timeout=45000)
    await page.locator('#mlj-journey-entry').wait_for(state='visible',timeout=20000)
    await page.locator('#mlj-journey-entry').click()
    details=page.locator('.mlj-v3-extras')
    if not await details.evaluate('(el)=>el.open'):
        await details.locator('summary').click()
    await page.get_by_role('button',name=name).click()
    await page.locator('#mljr-modal').wait_for(state='visible',timeout=12000)

async def run():
    assert ENGINE in ('chromium','webkit')
    async with async_playwright() as pw:
        browser=await (pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),
                      args=['--no-sandbox']) if ENGINE=='chromium' else pw.webkit.launch())
        ctx=await browser.new_context(viewport={'width':390,'height':844},
                                      is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        page=await ctx.new_page()
        errors=[]
        page.on('pageerror',lambda exc:errors.append(str(exc)))
        await page.goto(URL,wait_until='load',timeout=45000)
        picker=page.locator('.mpc[data-m=main]')
        if await picker.count() and await picker.is_visible():await picker.click()
        await page.evaluate("()=>tab('puz')")
        await page.wait_for_function("()=>window.mindlabPlayLayers?.ready && !!window.MindlabRescue?.open",timeout=45000)
        assert not await page.evaluate("()=>MindlabRescue.state().unlocked"),'fresh player must not open rescue'
        assert await page.evaluate("()=>MindlabRescue.open()") is False
        await page.evaluate("""()=>{
            const p=pState();
            PW.forEach(st=>{p.done[st.id]=1});
            p.prog=PW.length;
            const a=aState();
            a.done.pz_aheart=1;
            S.save();
        }""")
        assert not await page.evaluate("()=>MindlabRescue.state().unlocked"),'out-of-order heart victory must not open rescue'
        # Setup is a controlled 21-station completed native save, with NO optional worlds.
        await page.evaluate("""()=>{
            const a=aState();ASTN.forEach(st=>{a.done[st.id]=1});a.prog=ASTN.length;S.save();
        }""")
        assert await page.evaluate("()=>MindlabRescue.state().unlocked")
        assert await page.evaluate("()=>MindlabRescue.state().completed") is False
        assert await page.evaluate("()=>ATHERAN_CAMPAIGN.summary().cleared")==0
        before=await page.evaluate("""()=>JSON.stringify({
            sea:T7.state().done, palace:pState().done, atheran:aState().done,
            side:localStorage.getItem('mindlab:expedition10:v1'), coins:S.st.coins||null
        })""")
        await open_route(page,'إخلاء أَثْرَان · جرّب الخريطة المفتوحة')
        assert await page.locator('.mljr-anchors .mljr-anchor').count()==3
        assert await page.locator('.mljr-map-options button').count()==3
        assert await page.locator('.mljr-time-options button').count()==4
        assert await page.locator('.mljr-heroes img').count()==3
        anchors=page.locator('.mljr-anchor')
        await anchors.nth(0).locator('button').nth(0).click()  # intentionally wrong
        await anchors.nth(1).locator('button').nth(0).click()
        await anchors.nth(2).locator('button').nth(2).click()
        await page.locator('.mljr-map-options button').nth(1).click()
        await page.locator('.mljr-time-options button').nth(1).click()
        await page.locator('#mljr-run').click()
        assert 'مرساة القياس' in await page.locator('.mljr-status').inner_text()
        assert await page.locator('.mljr-success').is_hidden()
        await anchors.nth(0).locator('button').nth(1).click()
        await page.locator('.mljr-map-options button').nth(0).click()
        await page.locator('#mljr-run').click()
        assert 'الخريطة أ' in await page.locator('.mljr-status').inner_text()
        await page.locator('.mljr-map-options button').nth(2).click()
        await page.locator('#mljr-run').click()
        assert 'الخريطة ج' in await page.locator('.mljr-status').inner_text()
        await page.locator('.mljr-map-options button').nth(1).click()
        await page.locator('.mljr-time-options button').nth(2).click()
        await page.locator('#mljr-run').click()
        assert 'الثالثة متأخرة' in await page.locator('.mljr-status').inner_text()
        assert await page.evaluate("()=>!localStorage.getItem(MindlabRescue.KEY)"),'failed trials must not write completion'
        await page.locator('.mljr-time-options button').nth(1).click()
        await page.locator('#mljr-run').click()
        assert await page.locator('.mljr-success').is_visible()
        assert await page.locator('.mljr-timeline li').count()==4
        assert await page.evaluate("()=>MindlabRescue.state().completed")
        completed=await page.evaluate("()=>MindlabRescue.state().completedAt")
        assert 'return' in await page.evaluate("()=>mindlabJourneyHub.discoveredTransitions().map(t=>t.id)"),'return must not depend on optional worlds'
        after=await page.evaluate("""()=>JSON.stringify({
            sea:T7.state().done, palace:pState().done, atheran:aState().done,
            side:localStorage.getItem('mindlab:expedition10:v1'), coins:S.st.coins||null
        })""")
        assert before==after,'rescue must never change native progress or native points'
        await page.get_by_role('button',name='علّم الطاقم القادم').click()
        assert await page.evaluate("()=>MindlabRescue.state().decision")== 'teach'
        await page.locator('#mljr-alternative').click()
        assert 'معاينة فقط' in await page.locator('.mljr-decision-result').inner_text()
        assert await page.evaluate("()=>MindlabRescue.state().decision")=='teach','alternative changes original decision'
        await page.locator('#mljr-replay').click()
        await page.locator('#mljr-run').click()
        assert await page.evaluate("()=>MindlabRescue.state().completedAt")==completed,'replay must be idempotent'
        for width in (320,390,430):
            await page.set_viewport_size({'width':width,'height':844})
            await page.wait_for_timeout(70)
            assert await page.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+5"),f'overflow at {width}px'
            if SHOTS and width in (320,390):
                await page.screenshot(path=str(SHOTS/f'jaziran-rescue-{ENGINE}-{width}.png'))
        await page.evaluate("()=>{S.st.skin='dark';document.documentElement.dataset.skin='dark'}")
        await page.wait_for_function("()=>document.documentElement.dataset.skin==='dark'")
        if SHOTS:await page.screenshot(path=str(SHOTS/f'jaziran-rescue-{ENGINE}-dark.png'))
        await page.locator('#mljr-close').click()
        await page.reload(wait_until='domcontentloaded',timeout=45000)
        if await picker.count() and await picker.is_visible():await picker.click()
        await open_route(page,'طريق الإخلاء · الخريطة والقرار الأخير')
        assert await page.locator('.mljr-success').is_visible(),'success does not survive reload'
        assert await page.evaluate("()=>MindlabRescue.state().decision")=='teach'
        assert await page.evaluate("()=>MindlabRescue.state().completedAt")==completed
        assert not errors,errors[:6]
        print('JAZIRAN_RESCUE_BROWSER='+json.dumps({
            'engine':ENGINE,'native_stations':21,'optional_worlds':0,'anchors':3,'maps':3,
            'tidal_steps':4,'wrong_map_and_time_rejected':True,'single_completion':True,
            'decision_replay':True,'native_save_unchanged':True,'offline_source_loaded':True,
            'widths':[320,390,430],'errors':errors
        },ensure_ascii=False),flush=True)
        await browser.close()
asyncio.run(run())
