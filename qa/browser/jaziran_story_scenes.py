"""Batch 2: source-grounded interactive prologue and palace witness scene acceptance.
Use fixture completion only to verify gate disclosure, never to claim the real puzzles are solved.
Usage: python qa/browser/jaziran_story_scenes.py URL [chromium|webkit] [shots_dir]
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
SHOTS=Path(sys.argv[3]) if len(sys.argv)>3 else None
if SHOTS: SHOTS.mkdir(parents=True,exist_ok=True)

async def open_journal(page):
    await page.evaluate("()=>tab('puz')")
    await page.wait_for_function("()=>window.mindlabPlayLayers?.ready===true && !!window.mindlabJourneyHub",timeout=45000)
    await page.locator('#mlj-journey-entry').wait_for(state='visible',timeout=20000)
    await page.locator('#mlj-journey-entry').click()
    extras=page.locator('.mlj-v3-extras')
    if not await extras.evaluate('(el)=>el.open'):
        await extras.locator('summary').click()

async def run():
    assert ENGINE in ('chromium','webkit')
    async with async_playwright() as p:
        browser=await (p.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),
                   args=['--no-sandbox']) if ENGINE=='chromium' else p.webkit.launch())
        context=await browser.new_context(viewport={'width':390,'height':844},
                                          is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        page=await context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(URL,wait_until='load',timeout=45000)
        profile=page.locator('.mpc[data-m=main]')
        if await profile.count() and await profile.is_visible(): await profile.click()
        await open_journal(page)
        assert await page.get_by_role('button',name='ساعة القصر',exact=True).count()==0
        assert await page.evaluate("()=>mindlabJourneyHub.openJaziranScene('palace_clock')") is False
        before=await page.evaluate("""()=>JSON.stringify({sea:T7.state().done,
            palace:pState().done,atheran:window.ATHERAN_CAMPAIGN?.summary()?.a?.done||{},
            seal:localStorage.getItem('mindlab:journey:evidence-ledger:v1')})""")
        await page.get_by_role('button',name='قصة الصندوق',exact=True).click()
        modal=page.locator('#mlj-jaziran-modal')
        await modal.wait_for(state='visible')
        assert await page.locator('.mlj-jaziran-heroines img').count()==3
        assert 'نوفل' in await page.locator('.mlj-jaziran-dialogue').inner_text()
        assert await page.locator('#mlj-jaziran-choices').is_hidden()
        assert await page.locator('#mlj-jaziran-final').is_hidden()
        await page.locator('#mlj-jaziran-inspect').click()
        assert 'بقعة الماء' in await page.locator('#mlj-jaziran-result').inner_text()
        await page.locator('.mlj-jaziran-options button').nth(0).click()
        assert await page.locator('#mlj-jaziran-final').is_hidden(),'wrong answer must not reveal observation'
        await page.locator('.mlj-jaziran-options button').nth(1).click()
        assert 'قِس من حجر البداية' in await page.locator('#mlj-jaziran-reveal').inner_text()
        assert await page.evaluate("()=>!localStorage.getItem('mindlab:journey:evidence-ledger:v1')"),'scene must not grant evidence'
        await page.locator('#mlj-jaziran-save').click()
        note=await page.evaluate("""()=>JSON.parse(localStorage.getItem('mindlab:journey:evidence-notes:v1')).measurement""")
        assert note.startswith('ملاحظة الافتتاح'),note
        await page.locator('#mlj-jaziran-save').click()
        assert await page.evaluate("""()=>JSON.parse(localStorage.getItem('mindlab:journey:evidence-notes:v1')).measurement""")==note
        for width in (320,390,430):
            await page.set_viewport_size({'width':width,'height':844})
            await page.wait_for_timeout(70)
            assert await page.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+5"),f'prologue overflow at {width}'
            if SHOTS and width in (320,390):
                await page.screenshot(path=str(SHOTS/f'jaziran-prologue-{ENGINE}-{width}.png'))
        await page.evaluate("()=>{S.st.skin='dark';document.documentElement.dataset.skin='dark'}")
        await page.wait_for_function("()=>document.documentElement.dataset.skin==='dark'")
        if SHOTS: await page.screenshot(path=str(SHOTS/f'jaziran-prologue-{ENGINE}-dark.png'))
        await page.locator('#mlj-jaziran-book').click()
        await page.locator('#mlj-evidence-modal').wait_for(state='visible')
        assert await page.locator('#mlj-evidence-note').input_value()==note
        await page.locator('#mlj-evidence-close').click()
        after=await page.evaluate("""()=>JSON.stringify({sea:T7.state().done,
            palace:pState().done,atheran:window.ATHERAN_CAMPAIGN?.summary()?.a?.done||{},
            seal:localStorage.getItem('mindlab:journey:evidence-ledger:v1')})""")
        assert before==after,'prologue altered native progression or proof ledger'
        # Controlled fixture unlock only for UI discovery, with native palace game still authoritative.
        await page.evaluate("()=>{const x=pState();x.done.pz_pobs=1;S.save();}")
        await page.evaluate("()=>document.querySelector('#mlj-close-atlas')?.click()")
        await open_journal(page)
        assert await page.get_by_role('button',name='ساعة القصر',exact=True).count()==1
        await page.get_by_role('button',name='ساعة القصر',exact=True).click()
        await page.locator('#mlj-jaziran-inspect').click()
        assert 'الكلمة المشطوبة' in await page.locator('#mlj-jaziran-result').inner_text()
        await page.locator('.mlj-jaziran-options button').nth(1).click()
        assert 'شاهد رأى القارب' in await page.locator('#mlj-jaziran-reveal').inner_text()
        await page.locator('#mlj-jaziran-save').click()
        assert (await page.evaluate("""()=>JSON.parse(localStorage.getItem('mindlab:journey:evidence-notes:v1')).testimony""")).startswith('ملاحظة القصر')
        await page.locator('#mlj-jaziran-close').click()
        assert not errors,errors[:4]
        print('JAZIRAN_STORY_SCENES='+json.dumps({'engine':ENGINE,'scenes':2,'palace_gate':'pz_pobs',
              'no_reward_mutations':True,'notes_saved':2,'viewport_widths':[320,390,430],
              'light_dark':True,'js_errors':errors},ensure_ascii=False),flush=True)
        await browser.close()
asyncio.run(run())
