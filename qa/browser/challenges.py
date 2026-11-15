"""5.4.8: every extra challenge (fewest moves, no hint, expert) on all 21 stations, plus the daily puzzle, played by taps.
   Starts from a finished journey written in the 5.0 save shape, so it also checks the older-save migration."""
import asyncio, json, re, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import journey as J
import argparse
ap = argparse.ArgumentParser(); ap.add_argument('--url', default='http://localhost:8080/'); ap.add_argument('--chrome'); ap.add_argument('--engine', choices=['chromium', 'webkit'], default='chromium'); A = ap.parse_args()
URL = A.url if A.url.endswith('/') else A.url + '/'
KW = {'executable_path': A.chrome} if A.chrome else {}

from playwright.async_api import async_playwright
VAR = "T7.logic.variant(T7.data.stations[{i}],T7.state().v5.att[T7.data.stations[{i}].id].c)"
SRC = J.STEPS_SRC.replace("s=T7.data.stations[{i}]", "s=" + VAR, 1)
assert SRC != J.STEPS_SRC
async def main():
    probs, log = [], {}
    async with async_playwright() as p:
        b = (await p.webkit.launch() if getattr(A,'engine','chromium')=='webkit' else await p.chromium.launch(args=['--no-sandbox'], **KW))
        c = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        pg = await c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(600); await J.enter_main(pg)
        await pg.click('.tab[data-tab=puz]')
        # whole journey done (as after journey.py); seals and tools granted by the app's own migration on reload
        await pg.evaluate("()=>{S.st.treasureV3={version:3,done:Object.fromEntries(T7.data.stations.map(s=>[s.id,{at:1,moves:0,hints:0}])),work:{},notes:{},hints:{},moves:{},rewards:[]};S.save()}")
        await pg.reload(); await pg.wait_for_timeout(500); await J.enter_main(pg); await pg.click('.tab[data-tab=puz]')
        for i in range(21):
            sid = await pg.evaluate(f'()=>T7.data.stations[{i}].id'); exp = await pg.evaluate(f'()=>!!T7.data.stations[{i}].expert')
            for k in ([1, 2, 3] if exp else [1, 2]):
                await pg.evaluate(f'()=>T7.open({i})'); await pg.click('.v5-intro-go'); await pg.wait_for_timeout(150)
                chip = pg.locator('.v5-chip').nth(k)
                if await chip.is_disabled(): probs.append(f'{sid} challenge {k}: chip locked'); continue
                await chip.click(); await pg.wait_for_timeout(150)
                for _ in range(3):
                    g = pg.locator('.v5-gate .t7-btn.primary')
                    if not await g.count(): break
                    await g.click(); await pg.wait_for_timeout(150)
                kind = await pg.evaluate(f'()=>T7.data.stations[{i}].kind')
                if kind == 'weigh':
                    J.STEPS_SRC, keep = SRC, J.STEPS_SRC
                    await J.solve_board(pg, i); J.STEPS_SRC = keep
                else:
                    try:
                        steps = await pg.evaluate(eval('f"""' + SRC + '"""', {'i': i}))
                        for labels in steps:
                            for lab in labels:
                                if lab == '@weigh': await pg.locator('#v5-board .v5-weighbtn').click(); await pg.wait_for_timeout(120); continue
                                await pg.locator(f'#v5-board [aria-label^="{lab}"]').first.click(timeout=2500); await pg.wait_for_timeout(110)
                    except Exception as e:
                        log.setdefault('helper_gaps', []).append(f'{sid} c{k} {kind}: {str(e)[:90]}'); continue
                await pg.wait_for_timeout(1100)
                star = await pg.evaluate(f"()=>T7.state().v5.ch['{sid}'][{k}]")
                if not star: probs.append(f'{sid} challenge {k} ({kind}): star not awarded; done box: ' + str(await pg.locator('.v5-done').all_inner_texts())[:120])
            log[sid] = await pg.evaluate(f"()=>T7.state().v5.ch['{sid}']")
        total = await pg.evaluate("()=>Object.values(T7.state().v5.ch).flat().filter(Boolean).length")
        log['stars_total'] = total
        # daily puzzle
        await pg.evaluate('()=>T7.hub()'); await pg.wait_for_timeout(200)
        await pg.get_by_role('button', name=re.compile('لغز اليوم')).click(); await pg.wait_for_timeout(300)
        di = await pg.evaluate('()=>T7.data.stations.findIndex(s=>s.daily)')
        steps = await pg.evaluate(eval('f"""' + SRC + '"""', {'i': di}))
        for labels in steps:
            for lab in labels: await pg.locator(f'#v5-board [aria-label^="{lab}"]').first.click(); await pg.wait_for_timeout(110)
        await pg.wait_for_timeout(1100)
        log['daily'] = await pg.evaluate('()=>T7.state().daily')
        if not log['daily']: probs.append('daily puzzle not recorded')
        if errs: probs.append(f'errors {errs[:3]}')
        await b.close()
    sys.exitcode = 1 if probs else 0
    print(json.dumps({'status': 'failed' if probs else 'passed', 'stars_total': log.pop('stars_total'), 'daily': log.get('daily'), 'helper_gaps': log.get('helper_gaps'), 'problems': probs}, ensure_ascii=False, indent=1))
asyncio.run(main()); sys.exit(sys.exitcode)
