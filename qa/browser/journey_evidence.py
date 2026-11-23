"""Mobile browser acceptance for Jaziran draft evidence notebook (Chromium and WebKit).
Usage: python qa/browser/journey_evidence.py URL [chromium|webkit] [optional screenshots dir].
"""
import asyncio
import json
import os
from pathlib import Path
import sys
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/'
ENGINE = sys.argv[2] if len(sys.argv) > 2 else 'chromium'
SHOTS = Path(sys.argv[3]) if len(sys.argv) > 3 else None
if SHOTS:
    SHOTS.mkdir(parents=True, exist_ok=True)

async def open_notebook(page):
    await page.evaluate("()=>tab('puz')")
    await page.wait_for_function("()=>window.mindlabPlayLayers?.ready===true",timeout=45000)
    await page.locator('#mlj-journey-entry').wait_for(state='visible',timeout=20000)
    await page.locator('#mlj-journey-entry').click()
    await page.locator('#mlj-unified-hub').wait_for(state='visible',timeout=8000)
    await page.locator('.mlj-v3-extras summary').click()
    await page.get_by_role('button',name='ملفات الأدلة والملاحظات').click()
    await page.locator('#mlj-evidence-modal').wait_for(state='visible',timeout=8000)

async def run():
    assert ENGINE in ('chromium','webkit')
    async with async_playwright() as p:
        browser = await (p.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),
                          args=['--no-sandbox']) if ENGINE=='chromium' else p.webkit.launch())
        context = await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        page = await context.new_page()
        errors=[]
        page.on('pageerror',lambda exc:errors.append(str(exc)))
        await page.goto(URL,wait_until='load',timeout=45000)
        profile=page.locator('.mpc[data-m=main]')
        if await profile.count() and await profile.is_visible():
            await profile.click()
            await page.wait_for_timeout(120)
        await open_notebook(page)
        assert await page.locator('#mlj-evidence-modal[role=dialog][aria-modal=true]').count()==1
        assert await page.locator('.mlj-evidence-tabs button').count()==3
        initial=await page.evaluate("()=>({sea:window.T7?.state().done,atlas:window.ATHERAN_CAMPAIGN?.summary()?.a?.done||{}})")
        await page.locator('.mlj-evidence-tabs button[data-file=testimony]').click()
        note='شاهد من الورشة — وقت النسخة لا يطابق ساعة القصر'
        await page.locator('#mlj-evidence-note').fill(note)
        await page.locator('#mlj-evidence-save').click()
        assert await page.locator('#mlj-evidence-status').inner_text()=='حُفظت ملاحظتك على هذا الجهاز'
        await page.locator('.mlj-evidence-tabs button[data-file=traces]').click()
        assert await page.locator('#mlj-evidence-note').input_value()==''
        await page.locator('.mlj-evidence-tabs button[data-file=testimony]').click()
        assert await page.locator('#mlj-evidence-note').input_value()==note
        assert await page.evaluate("()=>JSON.parse(localStorage.getItem('mindlab:journey:evidence-notes:v1')).testimony") == note
        for width in (320,390,430):
            await page.set_viewport_size({'width':width,'height':844})
            await page.wait_for_timeout(90)
            assert await page.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+5"),f'horizontal overflow at {width}'
            if SHOTS and width==320: await page.screenshot(path=str(SHOTS/f'evidence-{ENGINE}-light-320.png'))
        # The app's theme observer re-applies S.st.skin; change the preference and DOM together.
        await page.evaluate("()=>{S.st.skin='dark';document.documentElement.dataset.skin='dark'}")
        await page.wait_for_function("()=>document.documentElement.dataset.skin==='dark'")
        dark_colors=await page.evaluate("""()=>{
            const area=document.querySelector('#mlj-evidence-note'),x=getComputedStyle(area);
            return {background:x.backgroundColor,color:x.color,theme:document.documentElement.dataset.skin};
        }""")
        print('EVIDENCE_DARK_COLORS='+json.dumps(dark_colors,ensure_ascii=False),flush=True)
        assert dark_colors['background']!='rgb(255, 255, 255)' and dark_colors['color']!='rgb(32, 50, 46)',f"dark notebook colors not applied: {dark_colors}"
        if SHOTS: await page.screenshot(path=str(SHOTS/f'evidence-{ENGINE}-dark-430.png'))
        await page.keyboard.press('Escape')
        await page.locator('#mlj-evidence-modal').wait_for(state='detached',timeout=4000)
        assert await page.evaluate("()=>document.activeElement?.id==='mlj-journey-entry'"),'focus not restored to visible journey entry'
        after=await page.evaluate("()=>({sea:window.T7?.state().done,atlas:window.ATHERAN_CAMPAIGN?.summary()?.a?.done||{}})")
        assert initial==after,'notebook changed campaign progress'
        await page.reload(wait_until='domcontentloaded',timeout=30000)
        if await profile.count() and await profile.is_visible():
            await profile.click()
            await page.wait_for_timeout(100)
        await open_notebook(page)
        await page.locator('.mlj-evidence-tabs button[data-file=testimony]').click()
        assert await page.locator('#mlj-evidence-note').input_value()==note,'draft not preserved after reload'
        assert not errors,errors[:4]
        print('JAZIRAN_EVIDENCE_BROWSER='+json.dumps({'engine':ENGINE,'tabs':3,'widths':[320,390,430],
                'save_isolated':True,'persisted_reload':True,'keyboard':True,'themes':['light','dark'],
                'errors':errors},ensure_ascii=False),flush=True)
        await browser.close()

asyncio.run(run())
