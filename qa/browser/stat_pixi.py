"""Exercise the new statue view, the original moves and progress, and offline warming."""
import asyncio
import io
from PIL import Image
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright
from smoke import open_game

URL = sys.argv[1]
ENGINE = os.environ.get("ENGINE", "chromium")
SCENE = ".st10[data-scene=pixi]"
PREWARM = ["ui/engines/scenes/pz_stat.json", "ui/engines/renderers/pz_stat.pixi.js",
           "vendor/pixi/pixi.min.js?v=8.23.0", "ui/designs_art/work/pz_stat/scene.webp",
           "ui/designs_art/work/pz_stat/guardians.json", "ui/designs_art/work/pz_stat/guardians.webp"]


async def boot(context):
    await context.add_init_script("window.__test = {}")
    page = await context.new_page()
    await page.goto(URL)
    profile = page.locator(".mpc[data-m=main]")
    if await profile.is_visible():
        await profile.click()
    return page


async def play(browser, width, height):
    context = await browser.new_context(viewport={"width": width, "height": height},
                                        has_touch=True, is_mobile=ENGINE == "chromium",
                                        reduced_motion="reduce" if width == 320 else "no-preference")
    page = await boot(context)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    await open_game(page, "pz_stat")
    await page.locator(SCENE).wait_for(timeout=15000)
    assert await page.locator(f"{SCENE} > canvas").count() == 1
    for skin in ("light", "dark"):
        await page.evaluate("skin => { S.st.skin = skin; document.documentElement.dataset.skin = skin }", skin)
        await page.wait_for_timeout(350)
        assert await page.locator(".st10-s").evaluate_all("""buttons => buttons.every(b => {
          const r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
          return r.width >= 44 && r.height >= 44 && b.contains(hit);
        })""")
        await page.screenshot(path=f"/tmp/stat-qa/{ENGINE}-{width}-{skin}.png")
        preview = Image.open(io.BytesIO(await page.locator(SCENE).screenshot())).convert("RGB")
        # Idle rendering still needs to show the painted hall, even after screenshot compositing.
        preview.thumbnail((120, 120))
        painted = sum(1 for red, green, blue in preview.getdata() if red+green+blue > 100 and max(red,green,blue)-min(red,green,blue)>16)
        assert painted > preview.width * preview.height * .22, (ENGINE, width, skin, painted)
    await page.locator("#pzh").click()
    assert await page.locator("#pzt").is_visible()
    before = await page.evaluate("() => JSON.stringify(pzState())")
    for _ in range(50):
        move = await page.evaluate("() => { const h=window.__test.pz; return h.P.nxt[h.P.enc(h.s())] }")
        if move < 0:
            break
        await page.locator(f".st10-s[data-i='{move}']").tap()
        if await page.evaluate("() => window.__test.pz.s().every(d => d === 0)"):
            break
    await page.locator("#stage .res").wait_for(timeout=12000)
    await page.wait_for_function("before => JSON.stringify(pzState()) !== before", arg=before)
    saved = await page.evaluate("() => JSON.stringify(pzState())")
    await page.reload()
    assert await page.evaluate("() => JSON.stringify(pzState())") == saved
    assert not errors, errors
    print(f"{ENGINE} {width}×{height}: rendered, touched, solved and preserved progress", flush=True)
    await context.close()


async def fallback(browser):
    context = await browser.new_context(service_workers="block")
    await context.route("**/pz_stat.pixi.js", lambda route: route.abort())
    page = await boot(context)
    await open_game(page, "pz_stat")
    await page.locator(".st10[data-scene=off]").wait_for()
    before = await page.evaluate("() => window.__test.pz.presses()")
    await page.locator(".st10-s").first.click()
    assert await page.evaluate("() => window.__test.pz.presses()") == before + 1
    assert await page.locator(".st10-g").first.is_visible()
    await context.close()


async def warming(browser):
    context = await browser.new_context()
    page = await boot(context)
    await page.wait_for_function("() => !!navigator.serviceWorker.controller", timeout=30000)
    assert not await page.evaluate("() => !!window.PIXI")
    assert not await page.evaluate("async files => !!await caches.match(new URL(files[2], location.href))", PREWARM)
    await page.evaluate("() => localStorage.setItem('mindlab:recent-puzzle-scene', 'pz_stat')")
    await page.reload()
    await page.wait_for_function("""async files => (await Promise.all(
        files.map(file => caches.match(new URL(file, location.href))))).every(Boolean)
    """, arg=PREWARM, timeout=35000)
    assert not await page.evaluate("() => !!window.PIXI")
    await context.set_offline(True)
    profile = page.locator(".mpc[data-m=main]")
    if await profile.is_visible():
        await profile.click()
    await open_game(page, "pz_stat")
    await page.locator(SCENE).wait_for(timeout=15000)
    print("Chromium: six scene resources prefetched without executing Pixi, then played offline", flush=True)
    await context.close()


async def main():
    Path("/tmp/stat-qa").mkdir(exist_ok=True)
    async with async_playwright() as p:
        options = {"args": ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]} if ENGINE == "chromium" else {}
        browser = await getattr(p, ENGINE).launch(**options)
        for size in [(320, 640), (390, 844), (430, 932), (844, 390)]:
            await play(browser, *size)
        await fallback(browser)
        if ENGINE == "chromium":
            await warming(browser)
        await browser.close()


asyncio.run(main())
