"""Isolated *real-input* mechanical audit of all 24 side-stage engines.

Unlike the sequential campaign acceptance, this intentionally opens each
engine directly in an ephemeral test profile to find mechanical defects
independently. It never calls a win method or writes completion fixtures.
Every action after setup is a real UI button or drag-to-slot.
"""
import asyncio
import json
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright
from side_journey_24_solve import boot,solve,js,click,ENGINE,OUT

async def main():
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=="webkit" else
            pw.chromium.launch(executable_path=os.getenv("CHROME","/usr/bin/google-chrome"),
                               args=["--no-sandbox"]))
        context=await browser.new_context(viewport={"width":390,"height":844},
            is_mobile=True,has_touch=True,locale="ar-SA",reduced_motion="reduce")
        page=await context.new_page()
        errors=[]
        page.on("pageerror",lambda exc:errors.append(str(exc)))
        await boot(page)
        catalog=await js(page,"()=>ML10.stages.map(s=>({id:s.id,name:s.name}))")
        assert len(catalog)==24
        official=await js(page,
            "()=>JSON.stringify({sea:T7.state().done,palace:pState().done,atheran:ATHERAN_CAMPAIGN.summary().a.done})")
        results=[]
        for i,stage in enumerate(catalog):
            row={"id":stage["id"],"index":i+1,"openedDirectlyForQA":True,"errors":[]}
            before=len(errors)
            try:
                await js(page,"i=>ML10.startStage(i)",i)
                await page.locator('.ex10-game-shell').wait_for(timeout=6000)
                # All three progressive clues must be distinct and visible.
                hints=[]
                for _ in range(3):
                    await click(page,'[data-ex10="hint"]')
                    hints.append(await page.locator('#ex10-hint').inner_text())
                if len(set(hints))!=3 or any(len(x)<8 for x in hints):
                    row["errors"].append("three_hints_not_progressive")
                await click(page,'[data-ex10="restart"]')
                if not await page.locator('#ex10-hint').is_hidden():
                    row["errors"].append("restart_kept_hint_penalty")
                await solve(page,i)
                outcome=page.locator('.ex10-outcome h2')
                await outcome.wait_for(timeout=12000)
                row["win"]=await outcome.inner_text()=="نجاح!"
                if not row["win"]:row["errors"].append("not_a_successful_UI_solution")
                save=await js(page,"()=>ML10.state()")
                row["stars"]=save["stars"].get(stage["id"])
                if row["stars"]!=3:row["errors"].append("perfect_run_did_not_earn_three_stars")
                if save["done"].get(stage["id"]) is not True:
                    row["errors"].append("successful_stage_not_saved")
                if i in (0,4,9,14,19,23) or row["errors"]:
                    await page.screenshot(path=str(OUT/f"{ENGINE}-direct-{i+1:02d}.png"),timeout=12000)
            except Exception as e:
                row["win"]=False
                row["errors"].append("exception:"+str(e)[:500])
                try:
                    await page.screenshot(path=str(OUT/f"{ENGINE}-direct-error-{i+1:02d}.png"),timeout=9000)
                except Exception:pass
            row["pageErrors"]=errors[before:]
            if row["pageErrors"]:row["errors"].append("javascript_page_error")
            results.append(row)
            print("SIDE24_MECH_CASE="+json.dumps(row,ensure_ascii=True),flush=True)
        saved=await js(page,"()=>ML10.state()")
        official_after=await js(page,
            "()=>JSON.stringify({sea:T7.state().done,palace:pState().done,atheran:ATHERAN_CAMPAIGN.summary().a.done})")
        summary={"browser":ENGINE,"mechanics":24,"wins":sum(bool(r.get("win")) for r in results),
            "doneCount":len(saved["done"]),"stars":saved["totalStars"],
            "officialSaveIntact":official==official_after,
            "failures":[r for r in results if r["errors"]],"results":results}
        (OUT/f"side24-mechanics-{ENGINE}.json").write_text(
            json.dumps(summary,ensure_ascii=True,indent=2),encoding="utf-8")
        print("SIDE24_MECH_SUMMARY="+json.dumps({k:v for k,v in summary.items() if k!="results"},
          ensure_ascii=True),flush=True)
        await browser.close()
        assert not summary["failures"] and summary["wins"]==24 and summary["stars"]==72 and summary["officialSaveIntact"],(
          f"{summary['wins']}/24 direct real-input wins; see report for precise defects")

if __name__=='__main__':
    asyncio.run(main())
