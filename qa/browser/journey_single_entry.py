"""Map-free journey acceptance: four chapters, eighty-five station cards, real launch gating.
Chromium and WebKit, 320px phones through landscape. No direct writes to player progress.
"""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
from player_openings import close_transition,dismiss_opening

URL=os.getenv("MINDLAB_URL","http://127.0.0.1:8765/index.html")
ENGINE=os.getenv("ENGINE","chromium")
OUT=Path(os.getenv("OUT","qa/browser/journey-stage1-shots"))
OUT.mkdir(parents=True,exist_ok=True)
SIZES=[(320,640),(390,844),(430,932),(844,390)]
results=[]
def check(ok,label):
    assert ok,label
    results.append(label)
    print("PASS",label,flush=True)

async def fresh(browser,w,h):
    kwargs=dict(viewport={"width":w,"height":h},locale="ar-SA",has_touch=True)
    if ENGINE=="chromium":kwargs.update(is_mobile=True,device_scale_factor=1)
    ctx=await browser.new_context(**kwargs)
    page=await ctx.new_page()
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    await page.goto(URL,wait_until="load")
    await page.wait_for_function("()=>!!window.mindlabJourneyHub&&!!window.T7&&!!window.__MINDLAB_JOURNEY_MAP")
    pick=page.locator(".mpc[data-m=main]")
    if await pick.count() and await pick.is_visible():await pick.click()
    await page.locator(".tab[data-tab=puz]").click()
    await page.locator("#mlj-journey-entry").wait_for(state="visible")
    return ctx,page,errors

async def run(browser,w,h):
    tag=f"{ENGINE}-{w}x{h}"
    ctx,page,errors=await fresh(browser,w,h)
    entry=page.locator("#mlj-journey-entry")
    panel=page.locator("#mlj-unified-hub")
    check(await entry.count()==1,tag+" one chapter gateway")
    check(await page.locator("#v-puz .v5-hublib").count()==1,tag+" puzzle library retained")
    check(await panel.is_hidden(),tag+" folder dialog starts closed")
    for sel in (".v5-hubcard",".ah-launch",".ex10-launch",".ah-side-head"):
        match=page.locator("#v-puz "+sel)
        if await match.count():check(await match.first.is_hidden(),tag+" duplicate entry hidden: "+sel)
    await entry.click()
    check(await panel.is_visible() and await panel.get_attribute("role")=="dialog",tag+" accessible chapter dialog")
    check(await panel.locator(".ml-folder-chapter").count()==4,tag+" three official chapters and one side chapter")
    check(await panel.locator(".ml-folder-side-categories .ml-folder-chapter").count()==1,tag+" side adventure separated below campaign")
    check(await panel.locator(".ml-folder-journey-categories:not(.ml-folder-side-categories) .ml-folder-chapter").count()==3,tag+" official chapter order retained")
    check(await panel.locator(".mlj-map-img,.mlj-v3-map,.mlj-v3-pin,.ml-folder-original-map").count()==0,tag+" no visual map or fallback button")
    await panel.locator('.ml-folder-chapter[data-chapter="atheran"]').click()
    check(await panel.locator(".ml-folder-station").count()==21,tag+" Atheran 21 stations")
    check(await panel.locator('[data-station-id="pz_aarch"]').is_disabled(),tag+" fresh Atheran gate cannot be bypassed")
    await panel.locator(".ml-folder-back").click()
    await panel.locator('.ml-folder-chapter[data-chapter="palace"]').click()
    check(await panel.locator(".ml-folder-station").count()==19,tag+" Palace 19 stations")
    check(not await panel.locator('[data-station-id="pz_plock"]').is_disabled(),tag+" first Palace stage follows original native gate")
    check(await panel.locator('[data-station-id="pz_pliar"]').is_disabled(),tag+" second Palace stage remains locked")
    await panel.locator(".ml-folder-back").click()
    await panel.locator('.ml-folder-chapter[data-chapter="seven_seas"]').click()
    check(await panel.locator(".ml-folder-station").count()==21,tag+" seven seas 21 stations")
    check(not await panel.locator('[data-station-id="sea7_0"]').is_disabled(),tag+" first sea playable")
    check(await panel.locator('[data-station-id="sea7_1"]').is_disabled(),tag+" second sea locked until first solved")
    check(await page.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+2"),tag+" no horizontal overflow")
    await page.screenshot(path=str(OUT/f"{tag}-folder-stations.png"))
    await panel.locator('[data-station-id="sea7_0"]').click()
    await close_transition(page)
    await page.locator("#fit-opening-overlay #fit-op-start").wait_for(state="visible")
    check(await page.locator("#fit-opening-overlay .mlj-station-crew-person").count()==3,tag+" sea opening shows all three drawn heroines")
    check(await page.locator("#fit-opening-overlay .mlj-station-story-lines p").count()>1,tag+" complete sea scene remains available under the folded story")
    await page.locator("#fit-opening-overlay #fit-op-start").click()
    check(await page.locator('[data-station-id="sea7_0"].t7-puzzle-layout').is_visible(),tag+" real sea puzzle opens")
    await page.locator('.t7-tool-icon[aria-label="المحطات"]').click()
    await panel.wait_for(state="visible")
    await panel.locator(".ml-folder-back").click()
    await panel.locator('.ml-folder-chapter[data-chapter="side"]').click()
    await page.wait_for_function("()=>!!window.ML10")
    await page.wait_for_function("()=>{const b=document.querySelector('#mlj-unified-hub [data-station-id=ml10_01]');return !!b&&!b.disabled}")
    check(await panel.locator(".ml-folder-station").count()==24,tag+" independent journey 24 stations")
    check(await panel.locator(".ml-folder-station.locked").count()==23,tag+" native side gate keeps 23 future stations locked")
    await panel.locator('[data-station-id="ml10_01"]').click()
    await page.locator("#fit-opening-overlay #fit-op-start").wait_for(state="visible")
    check(await page.locator("#fit-opening-overlay .mlj-station-crew-person").count()==3,tag+" independent journey opening shows all three drawn heroines")
    check(await page.locator("#fit-opening-overlay .mlj-station-story-lines p").count()==1,tag+" side scene is retained in the folded story")
    await page.locator("#fit-opening-overlay #fit-op-start").click()
    check(await page.locator('.ex10-game-shell[data-stage-id="ml10_01"]').is_visible(),tag+" native side puzzle opens")
    check(not errors,tag+" no page exceptions: "+";".join(errors[:2]))
    await ctx.close()

async def main():
    async with async_playwright() as pw:
        browser=await (pw.webkit if ENGINE=="webkit" else pw.chromium).launch(**({"args":["--no-sandbox"]} if ENGINE=="chromium" else {}))
        try:
            for w,h in SIZES:await run(browser,w,h)
        finally:await browser.close()
    (OUT/(ENGINE+"-results.json")).write_text(json.dumps({"engine":ENGINE,"checks":results},ensure_ascii=False,indent=2),encoding="utf-8")
    print("ALL PASS",len(results),ENGINE,flush=True)
if __name__=="__main__":asyncio.run(main())
