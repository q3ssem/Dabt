import argparse
import asyncio
import json
from playwright.async_api import async_playwright

ASSET = "ui/designs_art/work_review/pz_river/river-base--light.webp"
READY = "() => !!window.mindlabJourneyHub && !!window.fitOpenings"

async def measure_start(page, url):
    await page.goto(url, wait_until="load")
    await page.wait_for_function(READY)
    pick = page.locator(".mpc[data-m=main]")
    if await pick.count() and await pick.is_visible():
        await pick.click()
    return await page.evaluate("""()=>{const nav=performance.getEntriesByType('navigation')[0];return {htmlBytes:nav.decodedBodySize, dclMs:Math.round(nav.domContentLoadedEventEnd),readyMs:Math.round(performance.now())}}""")


async def probe(browser, url, offline_expected):
    context = await browser.new_context(viewport={"width":390,"height":844},has_touch=True)
    page = await context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    timings = await measure_start(page, url)
    if offline_expected:
        await page.wait_for_function("() => !!navigator.serviceWorker?.controller", timeout=60000)
        await page.evaluate("() => window.mindlabOffline.warmPuzzle('pz_river')")
        await page.wait_for_function("""async asset => !!await caches.match(new URL(asset,location.href))""",arg=ASSET,timeout=25000)
        saved = await page.evaluate("() => localStorage.getItem('miran:v2')")
        await context.set_offline(True)
        response = await page.reload(wait_until="load",timeout=45000)
        assert response and response.from_service_worker
        await page.wait_for_function(READY, timeout=12000)
        assert await page.evaluate("async asset => (await fetch(asset)).ok",ASSET)
        assert await page.evaluate("() => localStorage.getItem('miran:v2')") == saved
    timings.update({"offline": offline_expected, "cachedRiver": offline_expected, "errors": errors})
    assert not errors, errors
    await context.close()
    return timings


async def check_parking(browser, url):
    context = await browser.new_context(viewport={"width":844,"height":390},has_touch=True,service_workers="block",reduced_motion="reduce")
    page = await context.new_page()
    await measure_start(page, url)
    await page.evaluate("()=>{startRun(['pz_rush']);RUN.replay={id:'pz_rush',lv:1,seed:8127};}")
    await page.locator("#stage #go").click()
    opening = page.locator("#fit-op-start")
    board = page.locator("#rhb")
    await opening.or_(board).first.wait_for(state="visible")
    if await opening.is_visible():
        await opening.click()
    await board.wait_for(state="visible")
    for theme in ("light","dark"):
        await page.evaluate("(theme)=>document.documentElement.dataset.skin=theme",theme)
        await page.wait_for_function("()=>!!document.querySelector('#pzb')?.dataset.fitZoom")
        result = await board.evaluate("""node => {
          const r=node.getBoundingClientRect();
          return {w:r.width,h:r.height,clipped:[...node.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().bottom>innerHeight+1).length};
        }""")
        print(json.dumps({"parkingTheme":theme, **result}),flush=True)
        assert abs(result["w"]-result["h"]) < 2
        assert result["clipped"] == 0
    await context.close()

async def main():
    cli=argparse.ArgumentParser()
    cli.add_argument("url")
    cli.add_argument("--baseline")
    cli.add_argument("--engine", choices=("chromium","webkit"), default="chromium")
    args=cli.parse_args()
    async with async_playwright() as p:
        browser=await (p.webkit.launch() if args.engine=="webkit" else p.chromium.launch(args=["--no-sandbox"]))
        if args.baseline:
            baseline=[await probe(browser,args.baseline,False) for _ in range(3)]
            print(json.dumps({"engine":args.engine,"baseline":baseline},ensure_ascii=False),flush=True)
        runs=[await probe(browser,args.url,args.engine=="chromium") for _ in range(3)]
        print(json.dumps({"engine":args.engine,"candidate":runs},ensure_ascii=False),flush=True)
        await check_parking(browser,args.url)
        await browser.close()

asyncio.run(main())
