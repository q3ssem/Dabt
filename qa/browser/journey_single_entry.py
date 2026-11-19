"""Stage 1: one treasure-journey gateway, ordered atlas and preserved chapter engines.
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
    for ch in ("seven_seas", "palace", "atheran", "side"):
        check(await atlas.locator(f'.mlj-ch-card[data-mlj-ch="{ch}"]').count() == 1, tag + " chapter " + ch)
    names = await atlas.locator(".mlj-ch-card .mlj-ch-name").all_text_contents()
    check(names == ["حكايات البحار السبعة", "قصر المرايا", "أَثْرَان · أطلس المجهول", "رحلة أسرار أَثْرَان"], tag + " chapter order")
    check(await atlas.locator(".mlj-pin").count() == 4, tag + " four atlas markers")
    check(await atlas.locator(".mlj-pin").evaluate_all("(els)=>els.every(e=>Math.min(e.getBoundingClientRect().width,e.getBoundingClientRect().height)>=43.5)"), tag + " 44px marker targets")
    check(await atlas.locator(".mlj-map-img").evaluate("(img)=>img.complete&&img.naturalWidth>0"), tag + " map image loaded")
    dim = await page.evaluate("""()=>{const r=document.querySelector('#mlj-unified-hub .mlj-atlas-content').getBoundingClientRect();
      return {left:r.left,right:r.right,ww:innerWidth,scroll:document.querySelector('#mlj-unified-hub .mlj-atlas-content').scrollWidth,
      client:document.querySelector('#mlj-unified-hub .mlj-atlas-content').clientWidth}}""")
    check(dim["left"] >= -1 and dim["right"] <= dim["ww"] + 1 and dim["scroll"] <= dim["client"] + 2, tag + " atlas fits width")
    await page.screenshot(path=str(OUT / f"{tag}-atlas.png"))
    await page.keyboard.press("Escape")
    check(await atlas.is_hidden(), tag + " escape closes atlas")
    check(await page.locator("#mlj-journey-entry").get_attribute("aria-expanded") == "false", tag + " focus state reset")
    # Locked Atheran stays locked: atlas must not fake completion or expose secrets.
    check(await page.evaluate("()=>!window.ATHERAN_CAMPAIGN.summary().open"), tag + " fresh Atheran locked")
    await page.locator("#mlj-journey-entry").click()
    check(await atlas.locator('.mlj-ch-card[data-mlj-ch="atheran"]').get_attribute("data-locked") == "true", tag + " Atheran lock shown")
    await atlas.locator('.mlj-ch-card[data-mlj-ch="atheran"]').click()
    check(await page.locator(".ah-lock").count() == 1, tag + " original Atheran gate enforced")
    await page.evaluate("()=>T7.hub()")
    await page.locator("#mlj-journey-entry").wait_for(state="visible")
    await page.locator("#mlj-journey-entry").click()
    await atlas.locator('.mlj-ch-card[data-mlj-ch="palace"]').click()
    check(await page.locator("#mlj-palace-map .mlj-palace-station").count() == 19, tag + " 19 Palace stations")
    await page.locator("#mlj-palace-map .mlj-palace-close").click()
    await page.locator("#mlj-journey-entry").click()
    await atlas.locator('.mlj-ch-card[data-mlj-ch="side"]').click()
    check(await page.locator(".ex10-map").count() == 1, tag + " independent side map")
    await page.evaluate("()=>T7.hub()")
    await page.locator("#mlj-journey-entry").wait_for(state="visible")
    await page.locator("#mlj-journey-entry").click()
    await atlas.locator('.mlj-ch-card[data-mlj-ch="seven_seas"]').click()
    # On first entry the existing departure scene may appear before the sea map.
    tr = page.locator("#mlj-tr-modal")
    if await tr.count():
        await tr.locator("#mlj-tr-close").click()
    check(await page.locator(".t7-atlas").count() > 0, tag + " official sea map")
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
