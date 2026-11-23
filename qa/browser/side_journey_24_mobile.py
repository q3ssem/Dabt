"""Mobile presentation acceptance for all 24 independent side-journey stages.

Starts each engine directly in a *throwaway browser profile* to inspect every
board without manufacturing completion flags or exposing locked nodes through
normal navigation. This checks rendering, touch access, hints, images and save
isolation, NOT successful puzzle solutions.
Usage: python qa/browser/side_journey_24_mobile.py URL chromium|webkit OUTDIR
"""
import asyncio
import json
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright

URL=sys.argv[1] if len(sys.argv)>1 else "http://127.0.0.1:8791/"
ENGINE=sys.argv[2] if len(sys.argv)>2 else "chromium"
OUT=Path(sys.argv[3]) if len(sys.argv)>3 else Path("/tmp/mindlab-side-24")
assert ENGINE in ("chromium","webkit")
OUT.mkdir(parents=True,exist_ok=True)
VIEWPORTS=[(320,640,"light"),(390,844,"light"),(430,932,"dark")]

MEASURE=r"""() => {
  const root=document.querySelector('#v-puz .ex10-game-shell');
  if(!root)return {missing:true};
  const box=e=>{const r=e.getBoundingClientRect();
    return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),
      h:+r.height.toFixed(1),bottom:+r.bottom.toFixed(1)}};
  const imgs=[...root.querySelectorAll('.ex10-heroine img')];
  const objective=root.querySelector('.ex10-objective');
  const main=root.querySelector('.ex10-game-content');
  const hint=root.querySelector('[data-ex10="hint"]');
  const stations=root.querySelector('[data-ex10="stations2"]');
  return {id:root.dataset.stageId,state:root.querySelector('.ex10-game-scene')?.dataset.state,
    sceneBadge:root.querySelector('.ex10-game-scene .ex10-state-badge')?.getAttribute('aria-label'),
    skin:document.documentElement.dataset.skin, viewport:[innerWidth,innerHeight],
    board:box(root),objective:objective?.textContent.trim().slice(0,130)||'',
    gameContent:!!main&&main.children.length>2,
    heroNames:[...root.querySelectorAll('.ex10-heroine')].map(e=>e.dataset.character),
    heroImageState:imgs.map(i=>({src:i.getAttribute('src'),ready:i.complete&&i.naturalWidth>0,
      alternative:!!i.getAttribute('alt')?.trim()})),
    controls:root.querySelectorAll('button:not([disabled])').length,
    hintSize:hint?box(hint):null,stationsSize:stations?box(stations):null,
    overflow:document.documentElement.scrollWidth>innerWidth+3,
    contentText:(main?.textContent||'').trim().slice(0,160)};
}"""

async def main():
  async with async_playwright() as pw:
    browser=await (pw.webkit.launch() if ENGINE=="webkit" else
                   pw.chromium.launch(executable_path=os.getenv("CHROME","/usr/bin/google-chrome"),
                                      args=["--no-sandbox"]))
    context=await browser.new_context(viewport={"width":390,"height":844},
        is_mobile=True,has_touch=True,locale="ar-SA",reduced_motion="reduce")
    page=await context.new_page()
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    await page.goto(URL,wait_until="load",timeout=45000)
    picker=page.locator(".mpc[data-m=main]")
    if await picker.count() and await picker.is_visible():await picker.click()
    await page.evaluate("()=>tab('puz')")
    await page.wait_for_function("()=>window.mindlabPlayLayers?.ready===true",timeout=45000)
    await page.evaluate("async()=>await window.mindlabSide.start()")
    await page.wait_for_function("()=>typeof window.ML10?.startStage==='function'",timeout=25000)
    # The lazy puzzle tab may finish one final renderPuz() after side JS loads;
    # let that initial tab paint settle before previewing the first side stage.
    await page.wait_for_timeout(1000)

    catalog=await page.evaluate("()=>ML10.stages.map((s,i)=>({index:i,id:s.id,name:s.name}))")
    assert len(catalog)==24, "Side journey must have 24 distinct playable stages"
    assert len(set(s["id"] for s in catalog))==24, "Side stage IDs overlap"
    assert await page.evaluate("()=>ML10.unlocked(0) && !ML10.unlocked(1)"),(
      "Fresh side journey must expose only the first stage as playable")

    # No old or official progress is created by the inspection.
    before=await page.evaluate("""()=>{
      return JSON.stringify({side:ML10.state(),sea:T7.state().done,
        palace:typeof pState==='function'?pState().done:{},
        atheran:typeof ATHERAN_CAMPAIGN!=='undefined'
          ?ATHERAN_CAMPAIGN.summary().a?.done||{}:{}});
    }""")
    reports=[]
    for item in catalog:
      first_error=len(errors)
      row={"id":item["id"],"name":item["name"],"cases":[],"issues":[]}
      try:
        # Controlled direct preview is test-only. Never use this path to
        # mutate unlocks, create stars, or announce a gameplay win.
        await page.evaluate("(i)=>ML10.startStage(i)",item["index"])
        await page.locator('#v-puz .ex10-game-shell').wait_for(state="visible",timeout=9000)
        await page.wait_for_function("""()=>[...document.querySelectorAll(
          '#v-puz .ex10-game-shell .ex10-heroine img'
        )].length===3 && [...document.querySelectorAll(
          '#v-puz .ex10-game-shell .ex10-heroine img'
        )].every(i=>i.complete)""",timeout=9000)
        for width,height,skin in VIEWPORTS:
          await page.set_viewport_size({"width":width,"height":height})
          await page.evaluate("""s=>{
            S.st.skin=s;document.documentElement.dataset.skin=s;
          }""",skin)
          await page.wait_for_timeout(100)
          info=await page.evaluate(MEASURE)
          row["cases"].append(info)
          if info.get("id")!=item["id"]:row["issues"].append(f"{width}:wrong_stage")
          if info.get("state")!="open" or info.get("sceneBadge")!="مفتوحة":
            row["issues"].append(f"{width}:active_stage_falsely_locked")
          if info.get("overflow"):row["issues"].append(f"{width}:horizontal_page_overflow")
          if not info.get("gameContent") or len(info.get("objective",""))<20:
            row["issues"].append(f"{width}:missing_instructions")
          if info.get("heroNames")!=["roaa","noha","ward"]:
            row["issues"].append(f"{width}:missing_three_heroines")
          if any(not x["ready"] or not x["alternative"] for x in info.get("heroImageState",[])):
            row["issues"].append(f"{width}:hero_image_missing")
          if info.get("controls",0)<3:row["issues"].append(f"{width}:too_few_controls")
          for key in ("hintSize","stationsSize"):
            b=info.get(key)
            if not b or min(b["w"],b["h"])<40:
              row["issues"].append(f"{width}:{key}_touch_target_too_small")
          # Verify that the last navigation control is visible and actually
          # tappable after scrolling, not just present below a clipped panel.
          action=page.locator('#v-puz .ex10-game-shell [data-ex10="stations2"]')
          try:
            await action.scroll_into_view_if_needed(timeout=3500)
            reachable=await action.evaluate("""e=>{
              const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
              const hit=document.elementFromPoint(x,y);
              return r.top>=-2&&r.bottom<=innerHeight+2 &&
                (hit===e||e.contains(hit));
            }""")
            if not reachable:row["issues"].append(f"{width}:last_action_unreachable")
          except Exception:
            row["issues"].append(f"{width}:last_action_unreachable")

        # Hints must disclose an actual clue, never silently write a win.
        await page.set_viewport_size({"width":390,"height":844})
        await page.locator('#v-puz .ex10-game-shell [data-ex10="hint"]').click(timeout=4500)
        hint=await page.evaluate("""()=>{
          const e=document.querySelector('#v-puz #ex10-hint');
          return e && !e.hidden ? e.textContent.trim() : '';
        }""")
        if len(hint)<8:row["issues"].append("hint_did_not_open")
        if item["index"] in (0,5,11,17,23) or row["issues"]:
          await page.screenshot(path=str(OUT/f"{ENGINE}-{item['id']}.png"),timeout=9000)
      except Exception as err:
        row["issues"].append("exception")
        row["error"]=str(err)[:450]
      row["pageErrors"]=errors[first_error:]
      if row["pageErrors"]:row["issues"].append("javascript_error")
      reports.append(row)
      print("SIDE24_CASE="+json.dumps({"id":row["id"],"issues":row["issues"],
        "viewports":len(row["cases"])},ensure_ascii=True),flush=True)

    after=await page.evaluate("""()=>{
      return JSON.stringify({side:ML10.state(),sea:T7.state().done,
        palace:typeof pState==='function'?pState().done:{},
        atheran:typeof ATHERAN_CAMPAIGN!=='undefined'
          ?ATHERAN_CAMPAIGN.summary().a?.done||{}:{}});
    }""")
    assert before==after, "Side stage previews or hints changed native campaign/side saves"
    out={"engine":ENGINE,"stages":len(catalog),"viewportCases":VIEWPORTS,
      "reports":reports,"saveIntact":True,
      "failures":[{"id":r["id"],"issues":r["issues"],"error":r.get("error")}
       for r in reports if r["issues"]]}
    (OUT/f"side24-{ENGINE}.json").write_text(
      json.dumps(out,ensure_ascii=True,indent=2),encoding="utf-8")
    print("SIDE24_SUMMARY="+json.dumps({k:v for k,v in out.items() if k!="reports"},
      ensure_ascii=True),flush=True)
    await browser.close()
    assert not out["failures"], f"{len(out['failures'])}/24 side stages need review"
asyncio.run(main())
