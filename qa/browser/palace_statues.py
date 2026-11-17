"""motion-batch-1 — doors & statues rotation puzzles (pz_door, pz_pliar).
Generator: every hall has exactly one set of statue directions. Screen: real taps turn statues, a wrong set is refused,
the right set opens (pz_pliar: door hall then the talking statues), the win survives reload. Widths 320/390/430.
Usage: python3 qa/browser/palace_statues.py http://127.0.0.1:8150/   (ENGINE=webkit for WebKit)"""
import asyncio, os, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
ENGINE = os.environ.get('ENGINE', 'chromium'); SHOTS = os.environ.get('SHOTS')
checks, problems = [], []
def ok(c, label, extra=None):
    if os.environ.get('FORCE_FAIL') and label == os.environ['FORCE_FAIL']: c = False  # proves a failing check gives a non-zero exit
    (checks if c else problems).append(label if c else f'{label} :: {extra}'); return c
GEN = r"""() => { const R = Math.random, o = {notUnique: 0, allTruth: 0, n: 0};
  for (let s = 1; s <= 1500; s++) { Math.random = seeded(s); const lv = 1 + s % 8; const P = PALACE_MOTION.dsMake(lv); Math.random = R; o.n++;
    let c = 0; for (let d = 0; d < P.D; d++) for (let m = 0; m < 1 << P.k; m++) { const l = [...Array(P.k)].map((_, i) => !!(m >> i & 1)); if (l.filter(Boolean).length !== P.L) continue; if (P.ins.every((x, i) => (x.yes ? d === x.d : d !== x.d) === !l[i])) c++ }
    if (c !== 1) o.notUnique++; }
  return o }"""
async def taps_to(pg, i, want, D):
    for _ in range(D + 1):
        cur = await pg.evaluate(f"() => document.querySelectorAll('.pm-st')[{i}].classList.contains('away') ? {D} : +(document.querySelectorAll('.pm-st')[{i}].querySelector('.pm-face').textContent.replace(/[^٠-٩]/g,'').charCodeAt(0)-0x0661)")
        if cur == want: return True
        await pg.locator('.pm-turn').nth(i).click(); await pg.wait_for_timeout(40)
    return False
async def target(pg):
    return await pg.evaluate("""() => { const h = window.__test.pz, P = h.P; if (h.round && h.round() === 0) { const I = h.I; return I.sol.liars.map(l => l ? I.D : I.sol.door).concat([I.D]) }
      if (P.sol.liars) return P.sol.liars.map(l => l ? P.D : P.sol.door).concat([P.D]); return P.sol.tr.map(t => t ? P.sol.door : P.D).concat([P.D]) }""")
async def play(pg, gid, w):
    await pg.evaluate("(g) => startRun([g])", gid); await pg.wait_for_timeout(300)
    if await pg.locator('#stage #go').count(): await pg.click('#stage #go')
    await pg.wait_for_timeout(2400)
    rounds = 2 if gid == 'pz_pliar' else 1
    for r in range(rounds):
        t = await target(pg); D = t.pop()
        if r == 0:  # wrong attempt first: all statues facing door 0 is never the answer (always ≥1 liar)
            for i in range(len(t)): await taps_to(pg, i, 0, D)
            await pg.click('#pmgo'); await pg.wait_for_timeout(300)
            ok(not await pg.evaluate("() => !!document.querySelector('#stage .res')"), f'{gid}@{w} wrong refused')
        for i, v in enumerate(t): ok(await taps_to(pg, i, v, D), f'{gid}@{w} r{r} statue {i} turned by tap')
        ov = await pg.evaluate("() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('.pm-hall, .pm-hall *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > W + 1 || b.left < -1) }).length }")
        ok(ov == 0, f'{gid}@{w} r{r} no overflow', ov)
        if SHOTS and w == 390: await pg.screenshot(path=f'{SHOTS}/{gid}_r{r}_after.png', full_page=True)
        await pg.click('#pmgo'); await pg.wait_for_timeout(1300 if r < rounds - 1 else 300)
        if r < rounds - 1: ok(await pg.evaluate("() => window.__test.pz.round() === 1"), f'{gid}@{w} doors intro opens the statues hall')
    for _ in range(30):
        if await pg.evaluate("() => !!document.querySelector('#stage .res')"): break
        await pg.wait_for_timeout(200)
    ok(await pg.evaluate("() => !!document.querySelector('#stage .res .bigstars') || /أحسنت|انفتح|عرفت/.test(document.querySelector('#stage .res')?.innerText||'')"), f'{gid}@{w} solved wins')
async def main():
    async with async_playwright() as p:
        b = await (p.webkit.launch() if ENGINE == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']))
        for w in (320, 390, 430):
            ctx = await b.new_context(viewport={'width': w, 'height': 800}, is_mobile=ENGINE != 'webkit' or True, has_touch=True)
            await ctx.add_init_script('window.__test={}')
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
            await pg.goto(URL); await pg.wait_for_timeout(2500)
            if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
            if w == 320:
                g = await pg.evaluate(GEN); ok(g['notUnique'] == 0, f'dsMake unique ({g["n"]} halls)', g)
            for gid in ('pz_door', 'pz_pliar'):
                before = await pg.evaluate("(g) => [pzLv(g), typeof txStageOf=='function'?txStageOf(g):0, JSON.stringify(pState().prog)]", gid)
                await play(pg, gid, w)
                await pg.reload(); await pg.wait_for_timeout(2000)
                after = await pg.evaluate("(g) => [pzLv(g), typeof txStageOf=='function'?txStageOf(g):0, JSON.stringify(pState().prog)]", gid)
                ok(after != before, f'{gid}@{w} win kept after reload', [before, after])
                if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
            ok(not errs, f'@{w} no page errors', errs); await ctx.close()
        await b.close()
    print(f'{ENGINE}: {len(checks)} passed, {len(problems)} failed'); [print('  FAIL', x) for x in problems]
    return 1 if problems or not checks else 0
sys.exit(asyncio.run(main()))
