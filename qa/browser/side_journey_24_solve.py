"""End-to-end side journey: 24 *real UI* wins on a fresh profile.

Playwright drives buttons, map choices and drag/drop just as a player would.
ML10Logic's read-only solution data may choose moves; no direct win method,
ML10.startStage, gameState.solve, manual completion-save fixtures, or
injected puzzle state is used to advance the real campaign.

Includes one real loss/retry, hint/star penalties, all next buttons, in-game
undo/restart, a mid-journey reload, and the final epilogue.
Usage: python qa/browser/side_journey_24_solve.py URL chromium|webkit OUTPUT_DIR
"""
import asyncio
import json
import os
import sys
from collections import deque
from pathlib import Path
from playwright.async_api import async_playwright
from player_openings import dismiss_opening,close_transition

URL=sys.argv[1] if len(sys.argv)>1 else "http://127.0.0.1:8792/"
ENGINE=sys.argv[2] if len(sys.argv)>2 else "chromium"
OUT=Path(sys.argv[3]) if len(sys.argv)>3 else Path("/tmp/mindlab-side-solutions")
assert ENGINE in ("chromium","webkit")
OUT.mkdir(parents=True,exist_ok=True)

async def check(ok,label):
    if not ok:raise AssertionError(label)
    print("SIDE24_SOLVE_CHECK="+label,flush=True)

async def click(page,selector):
    await page.locator(selector).first.click(timeout=8500)

async def js(page,src,arg=None):
    if arg is None:return await page.evaluate(src)
    return await page.evaluate(src,arg)

async def boot(page):
    await page.goto(URL,wait_until="load",timeout=45000)
    pick=page.locator(".mpc[data-m=main]")
    if await pick.count() and await pick.is_visible():await pick.click()
    await page.evaluate("()=>tab('puz')")
    await page.wait_for_function("()=>window.mindlabPlayLayers?.ready===true",timeout=45000)
    await page.evaluate("async()=>await window.mindlabSide.start()")
    await page.wait_for_function("()=>!!window.ML10?.renderMap && !!window.ML10Logic",timeout=30000)

async def clear_opening(page):
    for _ in range(18):
        await close_transition(page)
        await dismiss_opening(page,wait=130)
        if await page.locator("#v-puz .ex10-game-shell").count():return
        start=page.locator('#v-puz [data-ex10="start"]')
        if await start.count() and await start.is_visible():
            await start.click(timeout=6000)
            continue
        await page.wait_for_timeout(120)
    raise AssertionError("Stage did not open after interactive introduction")

async def enter_stage(page,stage,from_previous=False):
    if from_previous:
        await click(page,'#v-puz .ex10-outcome [data-ex10="next"]')
    else:
        if not await page.locator('#v-puz .ex10-map').count():
            await page.evaluate("()=>ML10.renderMap()")
        button=page.locator(f'#v-puz .ex10-level-card[data-ex10-node="{stage}"]')
        await check(await button.get_attribute('aria-disabled') is None,
                    f"stage {stage+1} actually unlocked through prior wins")
        await button.click(timeout=8500)
    await clear_opening(page)
    sid=await page.locator('#v-puz .ex10-game-shell').get_attribute('data-stage-id')
    expected=await js(page,"i=>ML10.stages[i].id",stage)
    await check(sid==expected,f"stage {stage+1} opens its intended engine")

async def drag_order(page,host,items):
    for slot,item in enumerate(items):
        src=page.locator(f'{host} [data-tray] [data-tok="{item}"]')
        dst=page.locator(f'{host} [data-slot="{slot}"]')
        await src.drag_to(dst,timeout=9000)
        await check(await dst.locator(f'[data-tok="{item}"]').count()==1,
                    f"dragged {item} into position {slot+1} via pointer")
        
async def dial(page,position,value):
    for _ in range(value):
        await click(page,f'#v-puz [data-dial="{position}"][data-dir="up"]')

async def solve(page,index):
    L="ML10Logic"
    if index==0:
        digits=await js(page,"()=>ML10Logic.TARGET_CODE")
        for k,c in enumerate(digits):await dial(page,k,int(c))
        await click(page,'[data-ex10="check-code"]')
    elif index==1:
        path=await js(page,"()=>ML10Logic.audit().river.path")
        # Undo and reset are actual user actions; neither may unlock a stage.
        await click(page,'[data-route-node="A"]')
        await click(page,'[data-ex10="undo-route"]')
        await check(not await page.locator('[data-route-node="A"]').evaluate(
            "el=>el.classList.contains('visited')"),"river undo really clears selected route")
        await click(page,'[data-route-node="A"]')
        await click(page,'[data-ex10="reset-route"]')
        for node in path[1:]:await click(page,f'[data-route-node="{node}"]')
    elif index==2:
        # Determine the real map's current slots and swap two physical cards.
        for pos in range(4):
            original=await js(page,"()=>[...document.querySelectorAll('[data-tile-pos]')].map(x=>x.querySelector('b').textContent)")
            labels=["المنارة","البوصلة","النهر","المفتاح"]
            if original[pos]==labels[pos]:continue
            other=original.index(labels[pos])
            await click(page,f'[data-tile-pos="{pos}"]')
            await click(page,f'[data-tile-pos="{other}"]')
    elif index==3:
        for n in [0,1,2,3,4,5]:await click(page,f'[data-coin="{n}"]')
        await click(page,'[data-ex10="weigh"]')
        for n in [6,7]:await click(page,f'[data-coin="{n}"]')
        await click(page,'[data-ex10="weigh"]')
        await click(page,'[data-coin="7"]')
        await click(page,'[data-ex10="guess"]')
    elif index==4:
        await page.locator('[data-rune="0"]:not([disabled])').wait_for(timeout=7500)
        for k in range(5):await click(page,f'[data-rune="{k}"]')
    elif index==5:
        target=await js(page,"()=>ML10Logic.audit().acceptedMirrorState")
        for k,n in enumerate(target):
            for _ in range(n):await click(page,f'[data-mirror="{k}"]')
    elif index==6:
        order=await js(page,"()=>ML10Logic.timedItems")
        await drag_order(page,'#ex10-shelf',order)
    elif index==7:
        links=await js(page,"()=>ML10Logic.islandLinks")
        selection=await js(page,"()=>ML10Logic.audit().islandNetworks[0].chosen")
        for link in selection:
            index_of=next(k for k,l in enumerate(links) if l==link)
            await click(page,f'[data-island-link="{index_of}"]')
        await click(page,'[data-ex10="check-links"]')
    elif index==8:
        grid=await js(page,"()=>ML10Logic.nonogramTarget")
        for r,row in enumerate(grid):
            for c,v in enumerate(row):
                if v:await click(page,f'[data-cell="{r}-{c}"]')
        await click(page,'[data-ex10="check-grid"]')
    elif index==9:
        path=await js(page,"()=>ML10Logic.audit().starRoute.path")
        for star in path[1:]:await click(page,f'[data-star="{star}"]')
    elif index==10:
        pipe=await js(page,"()=>ML10Logic.pipeTiles.map(t=>({initial:t.initial,type:t.type}))")
        target=await js(page,"()=>ML10Logic.audit().pipeSolutions[0]")
        for k,t in enumerate(target):
            mod=4 if pipe[k]["type"]=="corner" else 2
            moves=(t-pipe[k]["initial"])%mod
            for _ in range(moves):await click(page,f'[data-pipe="{k}"]')
        if await page.locator('[data-ex10="check-pipes"]').count():
            await click(page,'[data-ex10="check-pipes"]')
    elif index==11:
        path=await js(page,"()=>ML10Logic.audit().ice.path")
        for direction in path:await click(page,f'[data-ice-move="{direction}"]')
    elif index==12:
        # Read heaps from the actual rendered game each turn, not hidden state.
        for _ in range(12):
            if await page.locator('#v-puz .ex10-outcome').count():break
            heaps=await js(page,"()=>[...document.querySelectorAll('.ex10-nim-heap')].map(el=>el.querySelectorAll('.ex10-nim-stones span').length)")
            move=await js(page,"heaps=>ML10Logic.nimWinningMoves(heaps)[0]||ML10Logic.nimBestMove(heaps)",heaps)
            if not move:raise AssertionError("Nim game offered no legal winning continuation")
            await click(page,f'[data-nim-pile="{move["pile"]}"][data-nim-take="{move["take"]}"]')
            if await page.locator('#v-puz .ex10-outcome').count():break
            await page.wait_for_function(
                "()=>!!document.querySelector('.ex10-outcome') || "+
                "!!document.querySelector('.ex10-nim-takes button:not([disabled])')",
                timeout=4500)
    elif index==13:
        target=await js(page,"()=>ML10Logic.shadowTarget")
        for k,n in enumerate(target):
            for _ in range(n):await click(page,f'[data-shadow="{k}"]')
        if await page.locator('[data-ex10="check-shadows"]').count():
            await click(page,'[data-ex10="check-shadows"]')
    elif index==14:
        order=await js(page,"()=>ML10Logic.audit().manifestSolutions[0]")
        await drag_order(page,'#ex10-docks',order)
        await click(page,'[data-ex10="check-manifest"]')
    elif index==15:
        targets=await js(page,"()=>ML10Logic.tideTargets")
        for t in targets:
            async def matches():
                return await js(page,"v=>document.querySelector('#ex10-tide-current')?.textContent===String(v).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[+d])",t)
            for _ in range(250):
                if await page.locator('#v-puz .ex10-outcome').count():raise AssertionError("Tide expired before three correct stops")
                if await matches():break
                await page.wait_for_timeout(28)
            else:raise AssertionError("Tide sector target not observed")
            await click(page,'[data-ex10="stop-tide"]')
    elif index==16:
        path=await js(page,"()=>ML10Logic.audit().relic.path")
        state=await js(page,"()=>ML10Logic.relicStart.slice()")
        delta={"up":(-1,0),"down":(1,0),"left":(0,-1),"right":(0,1)}
        for direction in path:
            z=state.index(0);r,c=divmod(z,3);dr,dc=delta[direction]
            at=(r+dr)*3+(c+dc)
            assert 0<=r+dr<3 and 0<=c+dc<3,"unreachable relic move"
            await click(page,f'[data-relic="{at}"]')
            state[z],state[at]=state[at],state[z]
    elif index==17:
        # BFS for *walking* between certified crate pushes. Only arrow
        # buttons move the avatar; no direct mutation of game state.
        pushes=await js(page,"()=>ML10Logic.audit().crate.path")
        cells=await js(page,"()=>ML10Logic.crateOpen")
        start_player=await js(page,"()=>ML10Logic.crateStartPlayer")
        box=await js(page,"()=>ML10Logic.crateStartBox")
        open_cells={tuple(x) for x in cells}
        player=tuple(start_player);box=tuple(box)
        delta={"up":(-1,0),"down":(1,0),"left":(0,-1),"right":(0,1)}
        for direction in pushes:
            dr,dc=delta[direction]
            behind=(box[0]-dr,box[1]-dc)
            q=deque([(player,[])])
            seen={player};walk=None
            while q:
                position,steps=q.popleft()
                if position==behind:walk=steps;break
                for key,(vr,vc) in delta.items():
                    nxt=(position[0]+vr,position[1]+vc)
                    if nxt not in open_cells or nxt==box or nxt in seen:continue
                    seen.add(nxt);q.append((nxt,steps+[key]))
            if walk is None:raise AssertionError(f"Crate push {direction} has no legal walking approach")
            for step in walk:await click(page,f'[data-crate-move="{step}"]')
            await click(page,f'[data-crate-move="{direction}"]')
            player=box;box=(box[0]+dr,box[1]+dc)
    elif index==18:
        route=await js(page,"()=>ML10Logic.knightRoute")
        for k in range(1,len(route)):await click(page,f'[data-knight="{k}"]')
    elif index==19:
        path=await js(page,"()=>ML10Logic.audit().maze.path")
        for r,c in path[1:]:await click(page,f'[data-maze="{r},{c}"]')
    elif index==20:
        path=await js(page,"()=>ML10Logic.audit().jug.path")
        for action in path:await click(page,f'[data-jug="{action}"]')
    elif index==21:
        clicks=await js(page,"()=>ML10Logic.signalSolution")
        for k in clicks:await click(page,f'[data-signal="{k}"]')
    elif index==22:
        moves=await js(page,"()=>ML10Logic.audit().hanoi.path")
        for move in moves:
            await click(page,f'[data-hanoi-peg="{move["from"]}"]')
            await click(page,f'[data-hanoi-peg="{move["to"]}"]')
    elif index==23:
        order=await js(page,"()=>ML10Logic.audit().seal[0]")
        await drag_order(page,'#ex10-seal',order)
        await click(page,'[data-ex10="check-seal"]')
    else:
        raise AssertionError(f"Unimplemented side stage UI solver {index}")

async def run():
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=="webkit" else
            pw.chromium.launch(executable_path=os.getenv("CHROME","/usr/bin/google-chrome"),
                args=["--no-sandbox"]))
        context=await browser.new_context(viewport={"width":390,"height":844},
            is_mobile=True,has_touch=True,locale="ar-SA",reduced_motion="reduce")
        page=await context.new_page()
        errors=[]
        page.on("pageerror",lambda exc:errors.append(str(exc)))
        catalog=[]
        reports=[]
        try:
            await boot(page)
            catalog=await js(page,"()=>ML10.stages.map(s=>({id:s.id,name:s.name}))")
            await check(len(catalog)==24,"24 unique stations exist")
            await check(len(set(x["id"] for x in catalog))==24,"all station IDs unique")
            await js(page,"()=>ML10.renderMap()")
            await check(await page.locator('#v-puz .ex10-level-card.locked').count()==23,
                "fresh player sees 23 locked future stages")
            official=await js(page,"()=>JSON.stringify({sea:T7.state().done,palace:pState().done,atheran:ATHERAN_CAMPAIGN.summary().a.done})")
            await enter_stage(page,0)

            # Lose by actually submitting five wrong guesses. This must not
            # unlock stage two or write a success reward.
            for _ in range(5):await click(page,'[data-ex10="check-code"]')
            await check(await page.locator('.ex10-outcome h2').inner_text()=="تعثر مؤقت",
                "five wrong lighthouse guesses really fail")
            await check(not (await js(page,"()=>ML10.state().done")).get(catalog[0]["id"]),
                "failure never writes stage completion")
            await click(page,'[data-ex10="retry"]')
            await clear_opening(page)

            for i,entry in enumerate(catalog):
                if i>0 and i!=12:
                    await enter_stage(page,i,from_previous=True)
                elif i==12:
                    await page.reload(wait_until="load")
                    await boot_after_reload(page)
                    saved=await js(page,"()=>ML10.state()")
                    await check(len(saved["done"])==12,"first twelve real wins survive reload")
                    await enter_stage(page,i)
                if i==1:
                    await click(page,'[data-ex10="hint"]')
                    first=await page.locator('#ex10-hint').inner_text()
                    await click(page,'[data-ex10="hint"]')
                    second=await page.locator('#ex10-hint').inner_text()
                    await check(first!=second and len(second)>8,
                        "progressive hints display distinct information")
                if i==0:
                    # First win has one wrong guess to verify two-star scoring.
                    await click(page,'[data-ex10="check-code"]')
                before=await js(page,"()=>ML10.state()")
                await solve(page,i)
                await page.locator('.ex10-outcome h2').wait_for(timeout=13000)
                result=await page.locator('.ex10-outcome h2').inner_text()
                await check(result=="نجاح!",f"{entry['id']}: actual UI moves reach win")
                state=await js(page,"()=>ML10.state()")
                expect=2 if i==0 else (1 if i==1 else 3)
                await check(state["done"].get(entry["id"]) is True,
                    f"{entry['id']}: native completion saved")
                await check(state["stars"].get(entry["id"])==expect,
                    f"{entry['id']}: stars reflect hints and mistakes")
                await check(len([x for x in catalog if state["done"].get(x["id"])])==i+1,
                    f"{entry['id']}: no future stage auto-unlocked")
                await check(state["totalStars"]==sum(state["stars"].values()),
                    f"{entry['id']}: total stars not double-counted")
                if i<23:
                    await check(await page.locator('.ex10-outcome [data-ex10="next"]').count()==1,
                        f"{entry['id']}: next station accessible")
                    await check(await js(page,"i=>ML10.unlocked(i+1)",i),
                        f"{entry['id']}: exactly next station unlocked")
                else:
                    await check(await page.locator('.ex10-outcome [data-ex10="epilogue"]').count()==1,
                        "last station opens side-only epilogue")
                if i in (0,5,11,17,23):
                    await page.screenshot(path=str(OUT/f"{ENGINE}-{i+1:02d}-win.png"),timeout=12000)
                reports.append({"id":entry["id"],"name":entry["name"],"stars":expect,
                    "source":"real user DOM click/drag","win":True,"saved":True})
                print("SIDE24_REAL_WIN="+json.dumps(reports[-1],ensure_ascii=True),flush=True)
            
            state=await js(page,"()=>ML10.state()")
            await check(len(state["done"])==24 and state["totalStars"]==69,
                "all 24 side puzzles won; 69 stars with two deliberate penalties")
            await check(await js(page,"()=>JSON.stringify({sea:T7.state().done,palace:pState().done,atheran:ATHERAN_CAMPAIGN.summary().a.done})")==official,
                "side journey does not mutate official campaign saves")
            await click(page,'[data-ex10="epilogue"]')
            await check("عاد قلب أَثْران إلى النبض" in await page.locator('.ex10-outcome').inner_text(),
                "side-only finale follows stage 24, without hijacking main campaign")

            # Replay stages: first improves 2 -> 3, second improves 1 -> 3.
            # 24 wins must stay 24; earned stars, not total replay counts,
            # are retained as each stage's maximum.
            await click(page,'[data-ex10="map"]')
            for i in (0,1):
                await enter_stage(page,i)
                await solve(page,i)
                await check(await page.locator('.ex10-outcome h2').inner_text()=="نجاح!",
                    "replayed stage has a real win")
                state=await js(page,"()=>ML10.state()")
                expected=70 if i==0 else 72
                await check(state["totalStars"]==expected and state["stars"][catalog[i]["id"]]==3,
                    f"replay {i+1} upgrades best to three stars without duplicate rewards")
                await click(page,'[data-ex10="map"]')
            await page.reload(wait_until="load")
            await boot_after_reload(page)
            final=await js(page,"()=>ML10.state()")
            await check(len(final["done"])==24 and final["totalStars"]==72,
                "perfect 72 stars survive a complete browser reload")
            await check(await js(page,"()=>JSON.stringify({sea:T7.state().done,palace:pState().done,atheran:ATHERAN_CAMPAIGN.summary().a.done})")==official,
                "campaign saves are unchanged even after reload")
            await check(not errors,"no uncaught JS errors through whole 24-stage journey")
            output={"engine":ENGINE,"stages":len(catalog),"solved":len(reports),
                "starsAfterPenaltyWins":69,"starsAfterReplays":72,"savedAfterReload":True,
                "officialSaveUnchanged":True,"errors":errors,"results":reports}
            (OUT/f"side24-real-solve-{ENGINE}.json").write_text(
                json.dumps(output,ensure_ascii=True,indent=2),encoding="utf-8")
            print("SIDE24_REAL_SUMMARY="+json.dumps({k:v for k,v in output.items() if k!="results"},ensure_ascii=True),flush=True)
        except Exception as e:
            snapshot={"engine":ENGINE,"solved":len(reports),"failedStage":catalog[len(reports)]["id"] if len(reports)<len(catalog) else "final",
                "error":str(e),"reports":reports,"pageErrors":errors}
            (OUT/f"side24-real-solve-{ENGINE}-failure.json").write_text(
                json.dumps(snapshot,ensure_ascii=True,indent=2),encoding="utf-8")
            try:await page.screenshot(path=str(OUT/f"{ENGINE}-failed-{len(reports)+1:02d}.png"),timeout=10000)
            except Exception:pass
            raise
        finally:
            await browser.close()

async def boot_after_reload(page):
    await page.wait_for_function("()=>window.mindlabPlayLayers?.ready===true",timeout=45000)
    await page.evaluate("async()=>await window.mindlabSide.start()")
    await page.wait_for_function("()=>!!window.ML10?.renderMap",timeout=30000)
    await page.evaluate("()=>ML10.renderMap()")

asyncio.run(run())
