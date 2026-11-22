"""Phase 3 mobile browser acceptance. WebKit on Linux is not physical iOS Safari.
Usage: python qa/browser/phase3_acceptance.py URL [chromium|webkit] [quick|full]
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

URL = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765/'
ENGINE = sys.argv[2] if len(sys.argv)>2 else 'chromium'
MODE = sys.argv[3] if len(sys.argv)>3 else 'quick'

async def profile(page):
    item = page.locator('.mpc[data-m=main]')
    if await item.count() and await item.is_visible():
        await item.click()
        await page.wait_for_timeout(150)

async def main():
    assert ENGINE in ('chromium','webkit')
    async with async_playwright() as playwright:
        if ENGINE == 'chromium':
            browser = await playwright.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
        else:
            browser = await playwright.webkit.launch()
        context = await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        page = await context.new_page()
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        await page.goto(URL,wait_until='load',timeout=45000)
        await profile(page)
        await page.evaluate("()=>localStorage.setItem('mindlab:phase3:sentinel','PHASE3_SAVE_MUST_SURVIVE')")
        await page.evaluate("()=>tab('puz')")
        await page.wait_for_function("()=>window.mindlabPlayLayers?.ready===true",timeout=45000)
        assert not await page.evaluate("()=>!!window.ML10"),'Side journey eagerly loaded'
        await page.evaluate("async()=>await window.mindlabSide.start()")
        await page.wait_for_function("()=>!!window.ML10",timeout=20000)
        assert not errors,errors[:5]
        assert await page.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+3"),'Horizontal overflow'
        await page.evaluate("()=>startRun(['pz_river'])")
        await page.locator('#stage').wait_for(state='visible',timeout=20000)
        await page.wait_for_timeout(200)
        assert not errors,errors[:5]
        await page.evaluate("()=>closePlay()")
        await page.evaluate("()=>tab('home')")
        saved=await page.evaluate("()=>localStorage.getItem('mindlab:phase3:sentinel')")
        assert saved=='PHASE3_SAVE_MUST_SURVIVE'
        await page.wait_for_function("()=>!!navigator.serviceWorker?.controller",timeout=30000)
        await page.evaluate("()=>window.mindlabOffline.prepareAll()")
        # Fast cache completion can remove the overlay between "button visible"
        # and click(). This is not a cancel-control defect; an absent completed
        # download must not become a 30-second flaky test failure.
        await page.wait_for_function("""()=>{
          const overlay=document.querySelector('#ml-preload');
          const button=document.querySelector('#ml-load-skip');
          return !overlay || !!(button && button.getClientRects().length);
        }""",timeout=30000)
        cancelled=False
        if await page.locator('#ml-preload').count() and await page.locator('#ml-load-skip').is_visible():
            try:
                await page.locator('#ml-load-skip').click(timeout=5000)
                cancelled=True
            except PlaywrightTimeout:
                if await page.locator('#ml-preload').is_visible():
                    raise
        await page.locator('#ml-preload').wait_for(state='detached',timeout=10000)
        assert await page.evaluate("()=>localStorage.getItem('mindlab:phase3:sentinel')")==saved
        await page.wait_for_timeout(800)
        report={'engine':ENGINE,'save_preserved':True,
                'cancel_control':cancelled,'download_completed_before_cancel':not cancelled,
                'loaded_puzzle':True,'loaded_side':True}
        if MODE=='full':
            await page.evaluate("()=>window.mindlabOffline.prepareAll()")
            await page.locator('#ml-preload').wait_for(state='visible',timeout=10000)
            await page.wait_for_function("()=>!document.querySelector('#ml-preload') || !document.querySelector('#ml-load-retry').hidden",timeout=180000)
            failed=bool(await page.locator('#ml-load-retry').count() and await page.locator('#ml-load-retry').is_visible())
            if failed:
                raise AssertionError('Offline pack failed: '+await page.locator('#ml-load-status').inner_text())
            counts=await page.evaluate("""async()=>{
              const counts={};
              for(const key of await caches.keys()) if(key.startsWith('mindlab-'))
                counts[key]=(await (await caches.open(key)).keys()).length;
              return counts;
            }""")
            report['cached_files']=counts
            assert sum(counts.values())>800,'Offline pack appears incomplete'
            await context.set_offline(True)
            response=await page.reload(wait_until='domcontentloaded',timeout=30000)
            assert response and response.ok,'Offline navigation failed after full pack'
            await page.wait_for_function("()=>typeof window.startRun==='function'",timeout=30000)
            await profile(page)
            await page.evaluate("()=>tab('puz')")
            await page.wait_for_function("()=>window.mindlabPlayLayers?.ready===true",timeout=45000)
            assert await page.evaluate("()=>localStorage.getItem('mindlab:phase3:sentinel')")==saved
            report['offline_navigation']=True
            # Image-cache cleanup must not wipe the app shell or player progress.
            await context.set_offline(False)
            removed=await page.evaluate("async()=>await window.mindlabOffline.clearOptionalCaches()")
            assert removed>=1,'Image cache did not exist before cleanup'
            remaining=await page.evaluate("""async()=>{
              const names=await caches.keys();
              return names.filter(name=>name.endsWith('-core'));
            }""")
            assert remaining,'Image cleanup deleted the app shell'
            assert await page.evaluate("()=>localStorage.getItem('mindlab:phase3:sentinel')")==saved
            response=await page.evaluate("""async()=>{
              const res=await fetch(new URL('ui/art/games/dual.webp',document.baseURI),{cache:'reload'});
              return res.status;
            }""")
            assert response==200,'On-demand images cannot be restored after cleanup'
            report['image_cache_cleanup_preserves_save']=True
            report['image_cache_rehydrates']=True
        assert not errors,errors[:5]
        report['errors']=errors
        print('PHASE3_ACCEPTANCE='+json.dumps(report,ensure_ascii=False),flush=True)
        await browser.close()

asyncio.run(main())
