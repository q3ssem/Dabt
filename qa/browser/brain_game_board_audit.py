"""Playwright acceptance of the *live* brain-game catalog.

Opens each publicly accessible, non-puzzle brain game and measures its real
board after its own start/countdown. This is an opening, geometry and basic
interaction audit, NOT a proof that every round can be won.
Usage: python qa/browser/brain_game_board_audit.py URL chromium|webkit OUTDIR
"""
import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright
from smoke import open_game

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8789/"
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
OUT = Path(sys.argv[3]) if len(sys.argv) > 3 else Path("/tmp/mindlab-brain-audit")
assert ENGINE in ("chromium", "webkit")
OUT.mkdir(parents=True, exist_ok=True)

SIZES = [(320, 640, "light"), (390, 844, "light"),
         (390, 844, "dark"), (430, 932, "dark")]
ILLUSTRATIVE = {"dual", "juggle", "mot", "piano", "xw", "cards", "racer"}

MEASURE = r"""() => {
  const play=document.querySelector('#play');
  const stage=document.querySelector('#stage');
  if(!play||!stage)return {invalid:'play/stage missing'};
  const box=e=>{const r=e.getBoundingClientRect();
    return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),
      h:+r.height.toFixed(1),bottom:+r.bottom.toFixed(1)};};
  const shown=e=>e.getClientRects().length>0 &&
    getComputedStyle(e).visibility!=='hidden' &&
    getComputedStyle(e).display!=='none';
  const interactive=[...stage.querySelectorAll(
    'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[role="button"],[tabindex]:not([tabindex="-1"])'
  )].filter(shown);
  const targets=interactive.map(e=>({el:e,box:box(e)}));
  const small=targets.filter(t=>Math.min(t.box.w,t.box.h)<40 && t.box.w>0 && t.box.h>0)
    .slice(0,12).map(t=>({id:t.el.id||'',className:typeof t.el.className==='string'?t.el.className.slice(0,75):'',
      label:(t.el.getAttribute('aria-label')||t.el.textContent||'').trim().slice(0,70),
      size:[t.box.w,t.box.h]}));
  const broken=[...stage.querySelectorAll('img')].filter(
    i=>shown(i)&&i.complete&&i.naturalWidth===0
  ).map(i=>i.getAttribute('src')).slice(0,8);
  const stretched=[...stage.querySelectorAll('img')].filter(i=>shown(i)&&i.naturalWidth&&i.naturalHeight)
    .map(i=>({el:i,r:box(i),fit:getComputedStyle(i).objectFit}))
    .filter(x=>x.r.w>8&&x.r.h>8&&x.fit==='fill'&&
      Math.abs(x.r.w/x.r.h-x.el.naturalWidth/x.el.naturalHeight)>0.23)
    .slice(0,8).map(x=>({src:x.el.getAttribute('src'),box:x.r}));
  const quit=play.querySelector('.pbar .x,#quit');
  const q=quit&&box(quit);
  const board=box(stage);
  const duo=stage.querySelector('.duo');
  const matches=duo?[...duo.querySelectorAll('.match')].map(box):[];
  return {skin:document.documentElement.dataset.skin,
    width:innerWidth,height:innerHeight,board,
    visible:getComputedStyle(play).display!=='none'&&board.w>60&&board.h>40,
    elements:stage.querySelectorAll('*').length,controls:interactive.length,
    smallTouchCount:small.length,smallExamples:small,
    brokenImages:broken,stretchedImages:stretched,
    pageOverflowsX:document.documentElement.scrollWidth>innerWidth+3,
    quit:q,dualMatches:matches,stageText:stage.textContent.trim().slice(0,100),
    stageScroll:stage.scrollHeight>stage.clientHeight+3};
}"""

async def run():
    async with async_playwright() as pw:
        browser = await (pw.webkit.launch() if ENGINE == "webkit" else
                         pw.chromium.launch(executable_path=os.getenv("CHROME", "/usr/bin/google-chrome"),
                                            args=["--no-sandbox"]))
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True, has_touch=True, locale="ar-SA",
            reduced_motion="reduce")
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(URL, wait_until="load", timeout=45000)
        profile = page.locator(".mpc[data-m=main]")
        if await profile.count() and await profile.is_visible():
            await profile.click(timeout=8000)
        await page.evaluate("()=>tab('games')")
        await page.wait_for_function("()=>typeof G!=='undefined'&&typeof startRun==='function'",
                                     timeout=30000)
        catalog = await page.evaluate("""()=>G.filter(
          g=>!g.hidden&&!g.puz&&!g.kid&&g.id!=='delay'
        ).map(g=>({id:g.id,name:g.name,cat:g.cat}))""")
        ids = [row["id"] for row in catalog]
        assert len(ids) >= 30, f"Brain catalog unexpectedly truncated: {catalog}"
        assert len(ids) == len(set(ids)), "Duplicate brain game id"
        assert "dual" in ids, "N-Back missing from playable catalog"
        await page.evaluate("""()=>localStorage.setItem(
          'mindlab:brain-audit:sentinel','preserve-this-test-value')""")
        reports = []
        for entry in catalog:
            gid = entry["id"]
            before = len(errors)
            row = {"id": gid, "name": entry["name"], "cat": entry["cat"],
                   "viewportCases": [], "issues": []}
            try:
                await page.set_viewport_size({"width":390,"height":844})
                await page.evaluate("""()=>{
                  S.st.skin='light';document.documentElement.dataset.skin='light';
                }""")
                await open_game(page, gid)
                for width,height,skin in SIZES:
                    await page.set_viewport_size({"width":width,"height":height})
                    await page.evaluate("""s=>{
                      S.st.skin=s;document.documentElement.dataset.skin=s;
                    }""", skin)
                    await page.wait_for_timeout(160)
                    data = await page.evaluate(MEASURE)
                    data["requested"] = [width,height,skin]
                    row["viewportCases"].append(data)
                    if not data.get("visible") or data.get("elements", 0) < 4:
                        row["issues"].append(f"{width}/{skin}:empty_board")
                    if data.get("pageOverflowsX"):
                        row["issues"].append(f"{width}/{skin}:page_horizontal_overflow")
                    if data.get("brokenImages"):
                        row["issues"].append(f"{width}/{skin}:broken_image")
                    if data.get("stretchedImages"):
                        row["issues"].append(f"{width}/{skin}:stretched_artwork")
                    if not data.get("quit") or min(data["quit"]["w"],data["quit"]["h"]) < 40:
                        row["issues"].append(f"{width}/{skin}:close_target_small")
                    if gid=="dual":
                        matches=data.get("dualMatches",[])
                        if len(matches)!=2 or any(x["w"]<40 or x["h"]<40 for x in matches):
                            row["issues"].append(f"{width}/{skin}:nback_controls_too_small")
                if gid == "dual":
                    await page.set_viewport_size({"width":844,"height":390})
                    await page.wait_for_timeout(300)
                    data=await page.evaluate(MEASURE)
                    row["landscape"] = data
                    if data.get("pageOverflowsX"):
                        row["issues"].append("landscape:horizontal_overflow")
                    for b in data.get("dualMatches",[]):
                        if b["w"]<40:
                            row["issues"].append("landscape:nback_match_too_small")
                    # Reaching the second N-Back control by scrolling matters
                    # more than its existence beneath a fixed bottom bar.
                    match=page.locator("#stage > .duo .match").last
                    if await match.count():
                        await match.scroll_into_view_if_needed(timeout=6000)
                        accessible=await match.evaluate("""el=>{
                          const r=el.getBoundingClientRect();
                          const x=r.x+r.width/2,y=r.y+r.height/2;
                          const hit=document.elementFromPoint(x,y);
                          return r.top>=0&&r.bottom<=innerHeight+2&&
                            (hit===el||el.contains(hit));
                        }""")
                        if not accessible:
                            row["issues"].append("landscape:nback_match_unreachable")
                if gid in ILLUSTRATIVE or row["issues"]:
                    await page.set_viewport_size({"width":390,"height":844})
                    await page.screenshot(path=str(OUT/f"{ENGINE}-brain-{gid}.png"),timeout=12000)
                row["pageErrors"] = errors[before:]
                if row["pageErrors"]:
                    row["issues"].append("javascript_error")
            except Exception as exc:
                row["issues"].append("exception")
                row["error"] = str(exc)[:500]
                row["pageErrors"] = errors[before:]
                try:
                    await page.screenshot(path=str(OUT/f"{ENGINE}-brain-{gid}-fail.png"),timeout=5000)
                except Exception:
                    pass
            finally:
                try:
                    await page.evaluate("""()=>{if(typeof closePlay==='function')closePlay()}""")
                except Exception:
                    pass
                await page.wait_for_timeout(90)
            reports.append(row)
            print("BRAIN_BOARD_CASE="+json.dumps(
                {"id":gid,"issues":row["issues"],"cases":len(row["viewportCases"]),
                 "smallAt320":next((c.get("smallTouchCount") for c in row["viewportCases"]
                                    if c.get("width")==320),None)},
                ensure_ascii=False),flush=True)
        kept = await page.evaluate("""()=>localStorage.getItem('mindlab:brain-audit:sentinel')""")
        assert kept == "preserve-this-test-value", "Unrelated local storage lost during game audit"
        summary = {"engine":ENGINE,"brainGames":len(catalog),
                   "viewports":[list(x) for x in SIZES],"catalog":catalog,
                   "failures":[{"id":r["id"],"issues":r["issues"],"error":r.get("error")}
                               for r in reports if r["issues"]],
                   "results":reports,"saveSentinelPreserved":True}
        (OUT/f"brain-board-{ENGINE}.json").write_text(
            json.dumps(summary,ensure_ascii=True,indent=2),encoding="utf-8")
        print("BRAIN_BOARD_SUMMARY="+json.dumps(
            {k:v for k,v in summary.items() if k not in ("results","catalog")},
            ensure_ascii=False),flush=True)
        await browser.close()
        assert not summary["failures"],f"{len(summary['failures'])}/{len(catalog)} brain games need review; see JSON artifacts"

asyncio.run(run())
