"""Journey V3: one atlas, touch targets and guarded launches.
Runs against real Chromium and WebKit. It never writes player progress.
"""
import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

URL = os.getenv("MINDLAB_URL", "http://127.0.0.1:8765/index.html")
ENGINE = os.getenv("ENGINE", "chromium")
OUT = Path(os.getenv("OUT", "qa/browser/journey-stage1-shots"))
OUT.mkdir(parents=True, exist_ok=True)
SIZES = [(320, 640), (390, 844), (430, 932), (844, 390)]
results = []

def check(value, label):
    assert value, label
    results.append(label)
    print("PASS", label, flush=True)

async def fresh(browser, width, height):
    kwargs = dict(viewport={"width": width, "height": height}, locale="ar-SA", has_touch=True)
    if ENGINE == "chromium":
        kwargs.update(is_mobile=True, device_scale_factor=1)
    context = await browser.new_context(**kwargs)
    page = await context.new_page()
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    await page.goto(URL, wait_until="load")
    await page.wait_for_function("()=>!!window.mindlabJourneyHub&&!!window.T7")
    profile = page.locator(".mpc[data-m=main]")
    if await profile.count() and await profile.is_visible():
        await profile.click()
    await page.locator(".tab[data-tab=puz]").click()
    await page.locator("#mlj-journey-entry").wait_for(state="visible")
    return context, page, errors

async def run(browser, width, height):
    tag = f"{ENGINE}-{width}x{height}"
    context, page, errors = await fresh(browser, width, height)
    check(await page.locator("#mlj-journey-entry").count() == 1, tag + " single gateway")
    await page.screenshot(path=str(OUT / f"{tag}-library-gateway.png"))
    check(await page.locator("#v-puz .v5-hublib").count() == 1, tag + " library retained")
    for name in (".v5-hubcard", ".ah-launch", ".ex10-launch", ".ah-side-head"):
        matches = page.locator("#v-puz " + name)
        if await matches.count():
            check(await matches.first.is_hidden(), tag + " obsolete card hidden " + name)
    check(await page.locator("#mlj-unified-hub").is_hidden(), tag + " atlas initially hidden")
    await page.locator("#mlj-journey-entry").click()
    atlas = page.locator("#mlj-unified-hub")
    check(await atlas.is_visible(), tag + " atlas opens directly")
    check(await atlas.get_attribute("role") == "dialog", tag + " accessible dialog")
    check(await atlas.locator(".mlj-v3-chapters button").count() == 3, tag + " three chapter shortcuts")
    clusters = atlas.locator(".mlj-v3-cluster")
    check(await clusters.count() == 13, tag + " thirteen overview clusters")
    check(not any(any(ch.isdigit() for ch in text) for text in await clusters.all_text_contents()), tag + " overview labels have no numbers")
    await atlas.locator("#mlj-v3-overview").click()
    pins = atlas.locator(".mlj-v3-pin")
    check(await pins.count() == 86, tag + " eighty-six stations on one map")
    for chapter, count in (("seven_seas", 21), ("palace", 19), ("atheran", 21), ("side", 25)):
        check(await atlas.locator(f'.mlj-v3-pin[data-chapter="{chapter}"]').count() == count,
              tag + " station count " + chapter)
    check(await pins.evaluate_all("""els=>els.every(e=>Math.min(e.getBoundingClientRect().width,e.getBoundingClientRect().height)>=44)"""),
          tag + " 44px station targets")
    check(await atlas.locator(".mlj-map-img").evaluate("img=>img.complete&&img.naturalWidth>0"), tag + " map image loaded")
    check(await atlas.locator(".mlj-v3-content").evaluate("el=>el.getBoundingClientRect().width<=innerWidth"), tag + " atlas fits viewport")
    await page.screenshot(path=str(OUT / f"{tag}-atlas.png"))
    check(await page.evaluate("()=>!window.ATHERAN_CAMPAIGN.summary().open"), tag + " fresh Atheran locked")
    await atlas.locator('[data-station-id="pz_aarch"]').click()
    check(await atlas.locator(".mlj-v3-start").is_hidden(), tag + " locked Atheran station offers no start")
    await page.keyboard.press("Escape")
    await atlas.locator('[data-station-id="ml10_02"]').click()
    check(await atlas.locator(".mlj-v3-start").is_hidden(), tag + " next side station stays locked")
    await page.keyboard.press("Escape")

    await atlas.locator('[data-station-id="pz_pobs"]').click()
    await atlas.locator(".mlj-v3-start").click()
    await page.locator("#stage .mlj-v3-opening").wait_for()
    check(await page.evaluate("()=>curGame().id === 'pz_pobs'"), tag + " Palace opens the original library entry")
    await page.locator("#quit").click()
    await atlas.wait_for(state="visible")
    await page.keyboard.press("Escape")
    check(await atlas.is_hidden(), tag + " escape closes atlas")
    check(await page.locator("#mlj-journey-entry").get_attribute("aria-expanded") == "false", tag + " focus state reset")

    await page.locator("#mlj-journey-entry").click()
    await atlas.locator('[data-station-id="sea7_0"]').click()
    await atlas.locator(".mlj-v3-start").click()
    departure = page.locator("#mlj-tr-close")
    if await departure.is_visible():
        await departure.click()
    opening = page.locator(".mlj-v3-opening-overlay")
    await opening.wait_for()
    check(await opening.locator(".mlj-v3-opening-person").count() == 1, tag + " one heroine in the station opening")
    await opening.locator("#fit-op-start").click()
    check(await page.locator('[data-station-id="sea7_0"].t7-puzzle-layout').is_visible(), tag + " Sea launches the original board")
    await page.locator('.t7-tool-icon[aria-label="الخريطة"]').click()
    await atlas.wait_for(state="visible")
    await atlas.locator('[data-station-id="ml10_01"]').click()
    await atlas.locator(".mlj-v3-start").click()
    await opening.locator("#fit-op-start").click()
    check(await page.locator('.ex10-game-shell[data-stage-id="ml10_01"]').is_visible(), tag + " side opens the original board")
    check(not errors, tag + " no page exceptions " + ";".join(errors[:2]))
    await context.close()

async def main():
    async with async_playwright() as playwright:
        engine = playwright.webkit if ENGINE == "webkit" else playwright.chromium
        browser = await engine.launch(**({"args":["--no-sandbox"]} if ENGINE == "chromium" else {}))
        try:
            for w,h in SIZES:
                await run(browser,w,h)
        finally:
            await browser.close()
    (OUT / (ENGINE + "-results.json")).write_text(json.dumps({"engine": ENGINE, "checks": results}, ensure_ascii=False, indent=2), encoding="utf-8")
    print("ALL PASS", len(results), ENGINE, flush=True)

if __name__ == "__main__":
    asyncio.run(main())
