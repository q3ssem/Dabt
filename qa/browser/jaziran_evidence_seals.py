"""Jaziran playable proof-flow browser test. Controlled completion fixtures are for UI wiring,
not a substitute for proving that puzzle solvers can finish all games independently.
Usage: python qa/browser/jaziran_evidence_seals.py URL [chromium|webkit] [screenshots_directory]
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765/'
ENGINE = sys.argv[2] if len(sys.argv)>2 else 'chromium'
SHOTS = Path(sys.argv[3]) if len(sys.argv)>3 else None
if SHOTS: SHOTS.mkdir(parents=True,exist_ok=True)

async def open_book(page):
    await page.evaluate("()=>tab('puz')")
    await page.wait_for_function("()=>window.mindlabPlayLayers?.ready && !!window.MindlabEvidence",timeout=45000)
    await page.locator('#mlj-journey-entry').wait_for(state='visible',timeout=15000)
    await page.locator('#mlj-journey-entry').click()
    await page.locator('.mlj-v3-extras summary').click()
    await page.get_by_role('button',name='ملفات الأدلة والملاحظات').click()
    await page.locator('#mlj-evidence-modal').wait_for(state='visible',timeout=10000)

async def prove_source(page,index,answer):
    item=page.locator('.mlj-evidence-sources li').nth(index)
    await item.get_by_role('button',name='تحقق من القرينة').click()
    await page.locator('.mlj-evidence-review .mlj-evidence-options button').nth(answer).click()
    assert await item.get_attribute('data-evidence-state')=='verified','source not verified by native completion and story check'

async def main():
    assert ENGINE in ('chromium','webkit')
    async with async_playwright() as pw:
        browser=await (pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),
                   args=['--no-sandbox']) if ENGINE=='chromium' else pw.webkit.launch())
        context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        page=await context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(URL,wait_until='load',timeout=45000)
        profile=page.locator('.mpc[data-m=main]')
        if await profile.count() and await profile.is_visible(): await profile.click()
        await page.evaluate("()=>tab('puz')")
        await page.wait_for_function("()=>window.mindlabPlayLayers?.ready && !!window.MindlabEvidence",timeout=45000)
        # Controlled existing-engine completion fixtures. No direct edits to notebook ledger.
        await page.evaluate("""()=>{
            const p=pState();p.done.pz_pclock=1;p.done.pz_pobs=1;p.done.pz_pjail=1;
            const n=pzState().n;n.pz_xlock=1;n.pz_zstars=1;
            S.save();
        }""")
        native=await page.evaluate("""()=>JSON.stringify({
            palace:pState().done,
            library:pzState().n,
            sea:T7.state().done,
            atheran:window.ATHERAN_CAMPAIGN?.summary()?.a?.done||{}
        })""")
        await open_book(page)
        assert await page.locator('.mlj-evidence-tabs button').count()==3
        # Two guard copies are shown as proofs but must not independently earn the testimony seal.
        await page.locator('[data-file=testimony]').click()
        await prove_source(page,0,1)  # palace clock
        await prove_source(page,2,1)  # duplicate guard record from two transparent maps
        msg=await page.locator('.mlj-evidence-inference').inner_text()
        assert 'صفحة واحدة' in msg and 'شاهد' in msg,'duplicate witness not rejected'
        assert 'اختبر الاستنتاج' not in msg
        await page.get_by_role('button',name='عرض الأدلة الناقصة').click()
        assert await page.evaluate("()=>document.activeElement?.textContent==='تحقق من القرينة'"),'incomplete seal should focus its first missing evidence'
        await prove_source(page,1,0)  # independent witness from the shore
        assert 'اختبر الاستنتاج' in await page.locator('.mlj-evidence-inference').inner_text()
        await page.locator('.mlj-evidence-inference .mlj-evidence-options button').nth(2).click()
        assert 'ختم الملف · ثبت مرة واحدة' in await page.locator('.mlj-evidence-inference').inner_text()
        # Measurement uses native puzzle win counters, never sea7 stage flags.
        await page.locator('[data-file=measurement]').click()
        await prove_source(page,0,1)
        await prove_source(page,1,2)
        await page.locator('.mlj-evidence-inference .mlj-evidence-options button').nth(1).click()
        assert 'ختم الملف · ثبت مرة واحدة' in await page.locator('.mlj-evidence-inference').inner_text()
        ledger=await page.evaluate("""()=>JSON.parse(localStorage.getItem('mindlab:journey:evidence-ledger:v1'))""")
        assert ledger['version']==1 and len(ledger['files'])==2,ledger
        assert await page.evaluate("""()=>JSON.stringify({
            palace:pState().done,
            library:pzState().n,
            sea:T7.state().done,
            atheran:window.ATHERAN_CAMPAIGN?.summary()?.a?.done||{}
        })""")==native,'notebook must not modify game save'
        for width in (320,390,430):
            await page.set_viewport_size({'width':width,'height':844})
            await page.wait_for_timeout(90)
            assert await page.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+5"),f'proof UI horizontal overflow at {width}px'
            if SHOTS and width in (320,390):
                await page.screenshot(path=str(SHOTS/f'jaziran-proofs-{ENGINE}-light-{width}.png'))
        await page.locator('#mlj-evidence-close').click()
        await page.reload(wait_until='domcontentloaded',timeout=45000)
        if await profile.count() and await profile.is_visible(): await profile.click()
        await open_book(page)
        await page.locator('[data-file=testimony]').click()
        assert 'ختم الملف · ثبت مرة واحدة' in await page.locator('.mlj-evidence-inference').inner_text(),'seal missing after reload'
        assert await page.locator('.mlj-evidence-sources li[data-evidence-state=verified]').count()==3
        await page.evaluate("()=>{S.st.skin='dark';document.documentElement.dataset.skin='dark'}")
        await page.wait_for_function("()=>document.documentElement.dataset.skin==='dark'")
        if SHOTS: await page.screenshot(path=str(SHOTS/f'jaziran-proofs-{ENGINE}-dark-430.png'))
        assert not errors,errors[:5]
        print('JAZIRAN_PROOF_BROWSER='+json.dumps({
            'engine':ENGINE,'native_sources':5,'independent_witness_rejection':True,
            'notebook_seals':2,'seal_idempotence':True,'old_progress_unchanged':True,
            'reload':True,'theme':'dark','widths':[320,390,430],'errors':errors
        },ensure_ascii=False),flush=True)
        await browser.close()

asyncio.run(main())
