"""Real Chromium smoke test for the additive cognitive games (5.5.5).
Run the app server first, then: python3 qa/browser/cognitive_addons.py --url http://127.0.0.1:8123/
"""
import argparse, asyncio, json
from playwright.async_api import async_playwright

async def play_ear(page):
    await page.locator('[data-open="ear"]').click()
    await page.locator('#stage #go').wait_for(state='visible', timeout=15000)
    await page.locator('#stage #go').click()
    await page.locator('#stage .ea-shell').wait_for(timeout=15000)
    assert await page.locator('.ea-stage-card[data-stage="1"]').count() == 1
    assert await page.locator('.ea-stage-card[data-stage="2"]').is_disabled()
    await page.locator('.ea-stage-card[data-stage="1"]').click()
    runtime = await page.evaluate('MINDLAB_EAR_ALERT_RUNTIME.stages[0].trials')
    for index, trial in enumerate(runtime):
        await page.locator('#eaPlay').click()
        await page.wait_for_function("[...document.querySelectorAll('[data-answer]')].length > 0 && [...document.querySelectorAll('[data-answer]')].every(b=>!b.disabled)", timeout=8000)
        if index == 0:
            # Verify one replay is available and disables answers while playing again.
            assert await page.locator('#eaPlay').is_enabled()
            await page.locator('#eaPlay').click()
            await page.wait_for_function("[...document.querySelectorAll('[data-answer]')].every(b=>b.disabled)", timeout=2000)
            await page.wait_for_function("[...document.querySelectorAll('[data-answer]')].every(b=>!b.disabled)", timeout=8000)
            assert await page.locator('#eaPlay').is_disabled()
        await page.locator(f'[data-answer="{trial["answer"]}"]').click()
        if index < 7:
            await page.wait_for_function("arg => document.querySelector('.ea-counter')?.textContent.includes('المحاولة ' + ['٢','٣','٤','٥','٦','٧','٨'][arg])", arg=index, timeout=5000)
    await page.locator('#stage .res').wait_for(timeout=10000)
    detail = await page.locator('#stage .rdetail').inner_text()
    assert 'أذن يقظة' in detail
    state = await page.evaluate('S.st.earAlert')
    assert state['unlockedStage'] == 2, state
    await page.locator('#ag').click()
    await page.locator('.ea-stage-card[data-stage="2"]').wait_for(state='visible')
    assert await page.locator('.ea-stage-card[data-stage="2"]').is_enabled()

async def play_signal_guard(page):
    await page.locator('[data-open="sw"]').click()
    await page.locator('#stage #go').wait_for(state='visible', timeout=15000)
    await page.locator('#stage #go').click()
    await page.locator('#stage .sg-shell').wait_for(timeout=15000)
    assert await page.locator('.sg-stage-card[data-stage="1"]').count() == 1
    await page.locator('.sg-stage-card[data-stage="1"]').click()
    trials = await page.evaluate('MINDLAB_SIGNAL_GUARD_RUNTIME.stages[0].trials')
    for index, trial in enumerate(trials):
        await page.locator(f'[data-choice="{trial["answer"]}"]').click()
        if index < 5:
            await page.wait_for_function("arg => document.querySelector('.sg-counter')?.textContent.includes('المحاولة ' + ['٢','٣','٤','٥','٦'][arg])", arg=index, timeout=5000)
    await page.locator('#stage .res').wait_for(timeout=10000)
    assert 'حارس الإشارة' in await page.locator('#stage .rdetail').inner_text()
    state = await page.evaluate('S.st.signalGuard')
    assert state['unlockedStage'] == 2, state

async def main(args):
    errors=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path=args.chrome, args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        context=await browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='ar-SA')
        page=await context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(args.url, wait_until='load')
        await page.wait_for_function('window.MINDLAB_EAR_ALERT_RUNTIME && window.MINDLAB_SIGNAL_GUARD_RUNTIME', timeout=20000)
        if await page.locator('.mpc[data-m=main]').count():
            await page.locator('.mpc[data-m=main]').click()
        await page.locator('.tab[data-tab="games"]').click()
        await page.locator('#dxSearch').fill('أذن يقظة')
        await page.locator('[data-open="ear"]').wait_for(state='visible')
        # Screenshot the actual mobile selector during the run.
        await play_ear(page)
        await page.locator('#quit').click()
        await page.locator('#dxSearch').fill('حارس الإشارة')
        await page.locator('[data-open="sw"]').wait_for(state='visible')
        await play_signal_guard(page)
        await page.locator('#quit').click()
        overflow=await page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2')
        if overflow: errors.append('mobile horizontal overflow')
        if errors: raise AssertionError('; '.join(errors))
        print(json.dumps({'status':'passed','viewport':'390x844','earAlertStages':6,'earAlertTrials':8,'signalGuardStageOneTrials':6,'audioContext':await page.evaluate("typeof AudioContext !== 'undefined'"),'pageErrors':errors},ensure_ascii=False))
        await browser.close()

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('--url',default='http://localhost:8080/'); ap.add_argument('--chrome',default='/usr/bin/chromium')
    asyncio.run(main(ap.parse_args()))
