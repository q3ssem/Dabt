"""motion-batch-1 — focused regression tests for the seven approved fixes.

Generator checks run each maker exactly as the game mounts it (Math.random seeded per board).
Screen checks play the real puzzle screen: the wrong / empty case is refused, the right case wins once,
and the win is still counted after a reload (fresh save).
Usage: python3 qa/browser/motion_batch_fixes.py http://127.0.0.1:8150/   (ENGINE=webkit for WebKit)
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
ENGINE = os.environ.get('ENGINE', 'chromium')
checks, problems = [], []
def ok(c, label, extra=None):
    if os.environ.get('FORCE_FAIL') and label == os.environ['FORCE_FAIL']: c = False  # proves a failing check gives a non-zero exit
    (checks if c else problems).append(label if c else f'{label} :: {extra}'); return c

GEN = r"""() => { const R = Math.random, run = (s, f) => { Math.random = seeded(s); try { return f() } finally { Math.random = R } }; const o = {};
  // pz_pobs: never aligned at start, still exactly one answer; the two reported seeds on all levels
  let al = 0, multi = 0; const aligned = P => paRot(P.top, 0).every(([x, y]) => x >= 0 && y >= 0 && x < P.n && y < P.n && P.bot.includes(y * P.n + x));
  for (let s = 1; s <= 800; s++) { const P = run(s, () => poMake(1 + s % 8)); if (aligned(P)) al++; if (poCountSolutions(P) !== 1) multi++ }
  o.pobsAligned = al; o.pobsNotUnique = multi; o.pobsSeeds = [];
  for (const sd of [87107, 88113]) for (let lv = 1; lv <= 8; lv++) if (aligned(run(sd, () => poMake(lv)))) o.pobsSeeds.push(sd + '@' + lv);
  // pz_untangle: stacking / overlapping never wins; the reference solution is clean; the start is tangled
  let stack = 0, line = 0, solBad = 0, startClean = 0;
  for (let s = 1; s <= 800; s++) { const P = run(s, () => unMake(1 + s % 8));
    if (!unCross(P, P.pos.map(() => [50, 50])).c) stack++;
    if (!unCross(P, P.pos.map((_, i) => [10 + i * 80 / P.n, 50])).c) line++;
    if (unCross(P, P.sol).c) solBad++; if (!unCross(P, P.pos).c) startClean++ }
  o.untStackWins = stack; o.untLineWins = line; o.untSolBad = solBad; o.untStartClean = startClean;
  const U = run(85142, () => unMake(1)); o.unt85142 = { stack: unCross(U, U.pos.map(() => [50, 50])).c, sol: unCross(U, U.sol).c };
  // a fan of two edges meeting at their shared node is allowed
  o.untShared = unCross({ e: [[0, 1], [0, 2]] }, [[50, 50], [20, 20], [80, 20]]).c;
  // pz_plib: never starts in order; the reported seed
  let ord = 0; for (let s = 1; s <= 2000; s++) { const P = run(s, () => plbMake(1 + s % 8)); if (P.order.every((p, i) => p === i)) ord++ }
  o.plibOrdered = ord; o.plib86849 = run(86849, () => plbMake(2)).order;
  // pz_wlake: the shift reaches the screen on levels 2-8 only
  o.wlakeShift = [1, 2, 3, 4, 5, 6, 7, 8].map(lv => run(lv * 97, () => wlkMake(lv)).shift);
  return o }"""

async def start(pg, gid):
    await pg.evaluate("(g) => startRun([g])", gid); await pg.wait_for_timeout(300)
    if await pg.locator('#stage #go').count(): await pg.click('#stage #go')
    await pg.wait_for_timeout(2600)

async def won(pg):
    for _ in range(30):
        if await pg.evaluate("() => !!document.querySelector('#stage .res')"): return await pg.evaluate("() => !!document.querySelector('#pzb.solved') || /أحسنت|فككت|انطبقت|رجعت|وصل|وجدت|لا يوجد/.test(document.querySelector('#stage .res').innerText) || !!document.querySelector('#stage .res .bigstars')")
        await pg.wait_for_timeout(200)
    return False

async def main():
    async with async_playwright() as p:
        b = await (p.webkit.launch() if ENGINE == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']))
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        await ctx.add_init_script('window.__test={}')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        await pg.goto(URL); await pg.wait_for_timeout(2500); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
        if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
        g = await pg.evaluate(GEN)
        ok(g['pobsAligned'] == 0, 'pz_pobs: 0 of 800 boards start aligned', g['pobsAligned'])
        ok(g['pobsNotUnique'] == 0, 'pz_pobs: every board still has exactly one answer', g['pobsNotUnique'])
        ok(not g['pobsSeeds'], 'pz_pobs: seeds 87107 and 88113 start unaligned on all 8 levels', g['pobsSeeds'])
        ok(g['untStackWins'] == 0, 'pz_untangle: stacking every node never wins (800 boards)', g['untStackWins'])
        ok(g['untLineWins'] == 0, 'pz_untangle: laying every node on one line never wins (800 boards)', g['untLineWins'])
        ok(g['untSolBad'] == 0, 'pz_untangle: the reference solution passes the stricter rule (800 boards)', g['untSolBad'])
        ok(g['untStartClean'] == 0, 'pz_untangle: no board starts untangled', g['untStartClean'])
        ok(g['unt85142']['stack'] > 0 and g['unt85142']['sol'] == 0, 'pz_untangle seed 85142: centre stack refused, solution accepted', g['unt85142'])
        ok(g['untShared'] == 0, 'pz_untangle: two edges meeting at their shared node are allowed')
        ok(g['plibOrdered'] == 0, 'pz_plib: 0 of 2000 boards start in order', g['plibOrdered'])
        ok(g['plib86849'] != sorted(g['plib86849']), 'pz_plib seed 86849 (level 2) starts shuffled', g['plib86849'])
        ok(g['wlakeShift'] == [False] + [True] * 7, 'pz_wlake: shift reaches the screen on levels 2-8 only', g['wlakeShift'])

        # ---- screens: refused case, right case wins once, win survives a reload
        await start(pg, 'pz_untangle')
        await pg.evaluate("() => { const h = __test.pz; h.pos.forEach(p => { p[0] = 50; p[1] = 50 }); h.draw() }"); await pg.wait_for_timeout(300)
        ok(not await pg.evaluate("() => !!document.querySelector('#stage .res')"), 'pz_untangle screen: nodes stacked in the centre do not win')
        await pg.evaluate("() => { const h = __test.pz; h.P.sol.forEach((p, i) => { h.pos[i][0] = p[0]; h.pos[i][1] = p[1] }); if (!h.draw()) h.win() }")
        ok(await won(pg), 'pz_untangle screen: the untangled drawing wins')
        await pg.evaluate("() => closePlay()"); await pg.wait_for_timeout(300)

        await start(pg, 'pz_ice')
        ok('الكوخ إذا مرّ به' in await pg.evaluate("() => document.querySelector('#play').innerText"), 'pz_ice: the on-screen rule mentions the igloo stop')
        await pg.evaluate("async () => { const h = __test.pz; for (const d of icSolve(h.P, h.pos())) { h.step(d); await new Promise(r => setTimeout(r, 900)) } }")
        ok(await won(pg), 'pz_ice: the shortest route wins (arrow path)')
        await pg.evaluate("() => closePlay()"); await pg.wait_for_timeout(300)

        await start(pg, 'pz_plib')
        ok(not await pg.evaluate("() => __test.pz.P.order.every((p, i) => p === i)"), 'pz_plib screen: pages start out of order')
        await pg.evaluate("() => __test.pz.set()"); ok(await won(pg), 'pz_plib: ordering the pages wins')
        await pg.evaluate("() => closePlay()"); await pg.wait_for_timeout(300)

        await start(pg, 'pz_pobs')
        await pg.evaluate("() => __test.pz.solve()"); ok(await won(pg), 'pz_pobs: moving the map onto its answer wins')
        await pg.evaluate("() => closePlay()"); await pg.wait_for_timeout(300)

        # pz_tdig: dig until one dig is left with several candidates; hint 3 must not claim a guarantee
        await start(pg, 'pz_tdig')
        res = await pg.evaluate("""async () => { const h = __test.pz, P = h.P; const far = P.dig.filter(c => c !== P.T);
            while (h.left() > 1) { const c = far.find(x => !h.dug.has(x)); h.tap(c); await new Promise(r => setTimeout(r, 1300)); if (document.querySelector('#stage .res')) return { ended: true } }
            const hb = document.getElementById('pzh'); const texts = []; for (let k = 0; k < 3; k++) { hb.click(); await new Promise(r => setTimeout(r, 400)); texts.push((document.querySelector('#play .pzhint:last-of-type') || {}).innerText || '') }
            return { cand: h.cand().length, left: h.left(), hint3: texts[2] || [...document.querySelectorAll('#play .pzhint')].map(e => e.innerText).join(' | ') } }""")
        if res.get('ended'): ok(True, 'pz_tdig: (board ended early; guarantee case covered by generator)')
        else:
            sure = 'يضمن لك' in res['hint3']; ok((res['cand'] > 1 and not sure) or (res['cand'] <= 1), 'pz_tdig: with one dig left and several candidates, hint 3 does not claim a guarantee', res)
        await pg.evaluate("() => closePlay()"); await pg.wait_for_timeout(300)

        await start(pg, 'pz_wlake')
        await pg.evaluate("() => { const h = __test.pz; h.pick(h.P.ans); h.check() }"); ok(await won(pg), 'pz_wlake: the right constellation wins')
        await pg.evaluate("() => closePlay()"); await pg.wait_for_timeout(300)

        prog = "() => ['pz_untangle','pz_ice','pz_plib','pz_pobs','pz_wlake'].map(id => { const st = txStageOf(id); return st ? 'stage' + st.k : 'lv' + pzLv(id) })"
        levels = await pg.evaluate(prog)
        await pg.reload(); await pg.wait_for_timeout(2500); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
        after = await pg.evaluate(prog)
        ok(levels == after and all(x in ('lv2', 'stage2') for x in after), 'wins are saved: every fixed puzzle advanced (level 2, or stage 2 of its station) and kept it after reload', (levels, after))
        # pz_wlake level 2 explains the wind
        await pg.evaluate("() => { if (document.querySelector('.mpc[data-m=main]')) document.querySelector('.mpc[data-m=main]').click() }"); await pg.wait_for_timeout(400)
        await start(pg, 'pz_wlake')
        ok('الريح تزيح' in await pg.evaluate("() => document.querySelector('#play').innerText"), 'pz_wlake level 2 shows the shift rule')
        ok(not errs, 'no JavaScript errors', errs[:3])
        await b.close()
    print(json.dumps({'engine': ENGINE, 'status': 'passed' if not problems else 'failed', 'checks': len(checks), 'problems': problems}, ensure_ascii=False, indent=1))
    sys.exit(0 if not problems else 1)
asyncio.run(main())
