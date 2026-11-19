import argparse
import asyncio
import json
from playwright.async_api import async_playwright

ASSET = "ui/designs_art/work_review/pz_river/river-base--light.webp"
READY = "() => !!window.mindlabJourneyHub && !!window.fitOpenings"

async def probe(browser, url, offline_expected):
    context = await browser.new_context(viewport={"width":390,"height":844},has_touch=True)
    page = await context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    await page.goto(url, wait_until="load")
    await page.wait_for_function(READY)
    pick = page.locator(".mpc[data-m=main]")
    if await pick.count() and await pick.is_visible():
        await pick.click()
    timings = await page.evaluate("""()=>{const nav=performance.getEntriesByType('navigation')[0];return {htmlBytes:nav.decodedBodySize, dclMs:Math.round(nav.domContentLoadedEventEnd),readyMs:Math.round(performance.now())}}""")
    await page.wait_for_function("() => !!navigator.serviceWorker?.controller", timeout=60000)
    await page.evaluate("() => window.mindlabOffline?.warmPuzzle('pz_river')")
    await page.wait_for_function("""async asset => !!await caches.match(new URL(asset,location.href))""",arg=ASSET,timeout=25000)
    if offline_expected:
        await context.set_offline(True)
        response = await page.reload(wait_until="load",timeout=45000)
        assert response and response.from_service_worker
        await page.wait_for_function(READY, timeout=12000)
        assert await page.evaluate("async asset => (await fetch(asset)).ok",ASSET)
        assert await page.evaluate("() => JSON.parse(localStorage.getItem('miran:v2')||'{}') !== null")
    timings.update({"offline": offline_expected, "cachedRiver": True, "errors": errors})
    assert not errors, errors
    await context.close()
    return timings

async def main():
    cli=argparse.ArgumentParser()
    cli.add_argument("url")
    args=cli.parse_args()
    async with async_playwright() as p:
        browser=await p.chromium.launch(args=["--no-sandbox"])
        runs=[await probe(browser,args.url,True) for _ in range(3)]
        print(json.dumps(runs,ensure_ascii=False),flush=True)
        await browser.close()

asyncio.run(main())
