"""design-01-10 — real play of puzzles 02–10 on the new boards, at 320/390/430.
For every puzzle:
  · the pack's reference boards (boards/*.json of MindLab_Design_01-10_Reviewed_AR, 18 boards) are injected as the
    generator's output, and the screen must draw exactly that board (items, cars, statues, masks, clues, givens, ends,
    pieces, trees and sums);
  · a wrong move or answer is refused with the error state; the right one is played with real input (mouse drag or
    tap — the hook is read only to know the answer) and wins once;
  · a hint opens from the board's own «تلميح» button;
  · the player's own stage (no replay) is won and kept after reload; no horizontal overflow, no page errors.
Exit code is non-zero when any check fails.
Usage: python3 qa/browser/design10_play.py URL PACK_DIR   (ENGINE=webkit · WIDTHS=320,390,430 · ONLY=river,rush,…)"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
PACK = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/in/d10'
ENGINE = os.environ.get('ENGINE', 'chromium'); ONLY = os.environ.get('ONLY'); SHOTS = os.environ.get('SHOTS')
checks, problems = [], []
def ok(c, label, extra=None):
    if os.environ.get('FORCE_FAIL') and label == os.environ['FORCE_FAIL']: c = False
    (checks if c else problems).append(label if c else f'{label} :: {extra}'); return c
B = {k: json.load(open(f'{PACK}/boards/{f}.json')) for k, f in [('river', '02_pz_river'), ('rush', '03_pz_rush'), ('stat', '04_pz_stat'), ('pipe', '05_pz_pipe'), ('grid', '06_pz_grid'), ('sudo', '07_pz_sudo'), ('flow', '08_pz_flow'), ('tan', '09_pz_tan'), ('tent', '10_pz_tent')]}
REPLAY = json.load(open(f'{PACK}/evidence/replay_paths.json'))
GEN = {'river': 'rvMake', 'rush': 'rhMake', 'stat': 'stMake', 'pipe': 'ppMake', 'grid': 'lgMake', 'sudo': 'sdMake', 'flow': 'flMake', 'tan': 'tgMake', 'tent': 'tnMake'}

async def start(pg, gid, lv=None, seed=1, inject=None):
    await pg.goto(URL); await pg.wait_for_timeout(1500)
    if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
    if inject:  # the generator returns the reference board once (stat: the real stMake for R's distance tables)
        name, data = inject
        await pg.evaluate("""([name, d]) => { const real = window[name]; window[name] = function (lv) { window[name] = real;
            if (name === 'stMake') { const P = real(lv); return Object.assign(P, { s: d.s.slice(), tgt: d.tgt.slice(), min: d.min }); }
            return JSON.parse(JSON.stringify(d)); } }""", [name, data])
    await pg.evaluate("([g, lv, s]) => { startRun([g]); if (lv) RUN.replay = { id: g, lv, seed: s } }", [gid, lv, seed]); await pg.wait_for_timeout(300)
    if await pg.locator('#stage #go').count(): await pg.click('#stage #go')
    for _ in range(30):
        if await pg.evaluate("() => !!(window.__test.pz && window.__test.pz.P)"): break
        await pg.wait_for_timeout(150)
    await pg.wait_for_timeout(300)
async def P(pg): return await pg.evaluate("() => JSON.parse(JSON.stringify(window.__test.pz.P, (k, v) => typeof v === 'function' || v instanceof Int16Array || v instanceof Int8Array ? undefined : v))")
async def result(pg, t=6000):
    for _ in range(t // 200):
        if await pg.evaluate("() => !!document.querySelector('#stage .res')"): return await pg.evaluate("() => !!document.querySelector('#stage .res .bigstars') || /عبرت|أخرجت|طابقت|وصل الماء|تطابق|أكملت|وصّلت|ركّبت|نصبت|اكتمل/.test(document.querySelector('#stage .res').innerText)")
        await pg.wait_for_timeout(200)
    return None
async def vis(pg, sel):
    e = pg.locator(sel).first; await e.evaluate("e => { const b = e.getBoundingClientRect(); if (b.top < 60 || b.bottom > innerHeight - 120) e.scrollIntoView({block: 'center'}) }"); await pg.wait_for_timeout(50); return await e.bounding_box()
async def tap(pg, sel): await vis(pg, sel); await pg.locator(sel).first.click(); await pg.wait_for_timeout(60)
async def drag(pg, src, dst):
    a = await vis(pg, src); x0, y0 = a['x'] + a['width'] / 2, a['y'] + a['height'] / 2; H = pg.viewport_size['height']
    await pg.mouse.move(x0, y0); await pg.mouse.down(); await pg.mouse.move(x0 + 6, y0 + 6, steps=3)
    for _ in range(60):
        b = await pg.locator(dst).first.bounding_box()
        if b['y'] >= 150 and b['y'] + b['height'] <= H - 130: break
        await pg.mouse.move(x0, 10 if b['y'] < 150 else H - 10, steps=2); await pg.wait_for_timeout(60)
    b = await pg.locator(dst).first.bounding_box(); await pg.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2, steps=9); await pg.mouse.up(); await pg.wait_for_timeout(100)
async def overflow(pg):
    return await pg.evaluate("() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('#stage *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > W + 1 || b.left < -1) && getComputedStyle(e).position !== 'fixed' && !e.closest('.mk-ghost') }).map(e => (e.className.baseVal ?? e.className) + '').slice(0, 4) }")
async def hint(pg, lab):
    await tap(pg, '.lb-hint'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("() => { const t = document.querySelector('#pzt'); return !!t && !t.hidden && t.innerText.length > 5 }"), f'{lab}: the board\'s «تلميح» opens a hint')
async def stage(pg, gid): return await pg.evaluate("(g) => JSON.stringify([pzLv(g), pzState()])", gid)

# ---------------------------------------------------------------- puzzle drivers: wrong first, then the right play
async def river(pg, lab, P, mode):
    n = len(P['it']); F = 1 << n
    ok(await pg.evaluate("(n) => document.querySelectorAll('.rv10 [data-tok]').length === n", n), f'{lab}: {n} items from rvMake.it')
    ok(await pg.evaluate("(it) => it.every((k, i) => document.querySelector(`.rv10 [data-tok=\"${i}\"] img`).src.includes('river_' + k))", P['it']), f'{lab}: every item is its own picture')
    # wrong: a first trip that leaves an eater with its prey on the start bank (found from the rule, not from the answer)
    bad = await pg.evaluate("""() => { const P = window.__test.pz.P, n = P.it.length, F = 1 << n;
        for (let m = 0; m < F; m++) { let c = 0; for (let x = m; x; x &= x - 1) c++; if (c > P.cap) continue; const t = F ^ m;
          if (P.conf.some(([a, b]) => (t >> a & 1) === (t >> b & 1) && (t >> a & 1) !== 1)) return m; } return -1 }""")
    if bad >= 0:
        for i in range(n):
            if bad >> i & 1: await tap(pg, f'.rv10-bank [data-tok="{i}"]')
        await tap(pg, '#lbgo'); await pg.wait_for_timeout(900)
        ok(await pg.evaluate("() => document.querySelectorAll('.rv10 .eat').length === 2"), f'{lab}: a trip that leaves a pair alone is refused — both are marked')
        await pg.wait_for_timeout(1900); ok(await pg.evaluate("() => window.__test.pz.s()") == 0, f'{lab}: the banks are reset after the mistake')
    path = await pg.evaluate("() => { const h = window.__test.pz, P = h.P; return rvPath(P.it.length, P.cap, P.conf, 0) }")
    for q in range(len(path) - 1):
        m = (path[q] ^ path[q + 1]) & (F - 1)
        for i in range(n):
            if m >> i & 1:
                if mode == 'drag' and q == 0: await drag(pg, f'.rv10-bank [data-tok="{i}"]', '.rv10-boat')
                else: await tap(pg, f'.rv10-bank [data-tok="{i}"]')
        ok(await pg.evaluate("() => window.__test.pz.boat().length") == bin(m).count('1'), f'{lab}: trip {q + 1} loaded by {"drag" if mode == "drag" and q == 0 else "tap"}')
        await tap(pg, '#lbgo'); await pg.wait_for_timeout(800)
    return True

async def rush(pg, lab, P, mode, moves=None):
    ok(await pg.evaluate("(n) => document.querySelectorAll('.rhcar').length === n && document.querySelectorAll('.rhcar img').length === n", len(P['vs'])), f'{lab}: {len(P["vs"])} vehicles drawn as pictures')
    ok(await pg.evaluate("() => document.querySelector('.rhcar.red img').src.includes('rush_car_red')"), f'{lab}: the target car is the red car')
    if moves is None: moves = await pg.evaluate("() => rhSolve(window.__test.pz.vs, 200000)")
    async def slide(i, np):
        v = (await pg.evaluate("() => window.__test.pz.vs"))[i]; cur = v['c'] if v['h'] else v['r']
        box = await vis(pg, f'.rhcar[data-i="{i}"]'); cell = (await pg.locator('#rhb').bounding_box())['width'] / 6
        x0, y0 = box['x'] + min(box['width'], cell) / 2, box['y'] + min(box['height'], cell) / 2
        await pg.mouse.move(x0, y0); await pg.mouse.down()
        dx, dy = ((np - cur) * cell, 0) if v['h'] else (0, (np - cur) * cell)
        await pg.mouse.move(x0 + dx, y0 + dy, steps=10); await pg.mouse.up(); await pg.wait_for_timeout(120)
    # wrong: push the red car right past what blocks it — it stops short and the board does not win
    v0 = (await pg.evaluate("() => window.__test.pz.vs"))[0]; await slide(0, 4)
    after = (await pg.evaluate("() => window.__test.pz.vs"))[0]['c']
    ok(after < 4 and await result(pg, 600) is None, f'{lab}: a blocked car stops before the vehicle in its way (collision)', [v0['c'], after])
    if after != v0['c']: await slide(0, v0['c'])
    moves = await pg.evaluate("() => rhSolve(window.__test.pz.vs, 200000)")
    for i, np in moves: await slide(i, np)
    vs = await pg.evaluate("() => window.__test.pz.vs"); ok(vs[0]['c'] == 4, f'{lab}: the red car reaches the gate by mouse drags', vs[0])
    return True

async def stat(pg, lab, P, mode):
    ok(await pg.evaluate("(n) => document.querySelectorAll('.st10-s').length === n && document.querySelectorAll('.st10-s .st10-g').length === n", P['n']), f'{lab}: {P["n"]} statues on pedestals')
    ok(await pg.evaluate("(t) => [...document.querySelectorAll('.st10-tgt')].every((e, i) => e.style.getPropertyValue('--a') === (t[i] * 90) + 'deg')", P['tgt']), f'{lab}: each gold diamond is the statue\'s target (stMake.tgt)')
    # wrong: a press off the shortest path leaves the statues unmatched and the board unsolved
    i0 = await pg.evaluate("() => { const h = window.__test.pz; return h.P.nxt[h.P.enc(h.s())] }")
    await tap(pg, f'.st10-s[data-i="{(i0 + 1) % P["n"]}"]')
    ok(await result(pg, 400) is None and not all(d == 0 for d in await pg.evaluate("() => window.__test.pz.s()")), f'{lab}: a press off the shortest path does not solve it')
    for _ in range(80):
        s = await pg.evaluate("() => window.__test.pz.s()")
        if all(d == 0 for d in s): break
        i = await pg.evaluate("() => { const h = window.__test.pz; return h.P.nxt[h.P.enc(h.s())] }")
        await tap(pg, f'.st10-s[data-i="{i}"]')
    return True

async def pipe(pg, lab, P, mode):
    ok(await pg.evaluate("(n) => document.querySelectorAll('.pp10-c').length === n", P['w'] * P['h']), f'{lab}: {P["w"]}×{P["h"]} tiles from ppMake')
    ok(await pg.evaluate("() => document.querySelectorAll('.pp10-c.src .pp10-spring').length === 1 && document.querySelectorAll('.pp10-c.house .pp10-house').length > 0"), f'{lab}: one spring and the houses drawn')
    # every tile's drawn pipe matches its mask: (drawn kind rotated k) == cur mask
    ok(await pg.evaluate("""() => { const P = window.__test.pz.P, base = {pipe_straight: 10, pipe_elbow: 6, pipe_tee: 14, pipe_cross: 15, pipe_end: 8};
        return [...document.querySelectorAll('.pp10-c')].every((b, i) => { const art = b.querySelector('.pp10-pipe').src.split('/').pop().replace('.webp', ''), k = +b.querySelector('.pp10-rot').style.getPropertyValue('--k'); let m = base[art]; for (let j = 0; j < k; j++) m = ppRot(m); return m === P.cur[i] }) }"""), f'{lab}: each picture, turned, is exactly the cell\'s pipe mask')
    for i in range(P['w'] * P['h']):
        for _ in range(4):
            if await pg.evaluate("(i) => { const P = window.__test.pz.P; return P.cur[i] === P.sol[i] }", i): break
            if await pg.evaluate("() => !!document.querySelector('#stage .res')"): break
            await tap(pg, f'.pp10-c[data-i="{i}"]')
        if i == 0: ok(await result(pg, 300) is None, f'{lab}: the board is not solved after the first tile (open ends left)')
    return True

async def grid(pg, lab, P, mode):
    ok(await pg.evaluate("(c) => [...document.querySelectorAll('#lgcl li span')].map(e => e.textContent).join('|') === c.map(x => lgText(x, window.__test.pz.P)).join('|')", P['clues']), f'{lab}: all {len(P["clues"])} clues from lgText, in order')
    ok(await pg.evaluate("(n) => document.querySelectorAll('.lg10-c').length === n", P['n'] * P['a']), f'{lab}: {P["n"]}×{P["a"]} answer cells')
    async def setv(ci, p, v):
        for _ in range(P['n'] + 1):
            if (await pg.evaluate("() => window.__test.pz.ans"))[ci][p] == v: return
            await tap(pg, f'.lg10-c[data-c="{ci}"][data-p="{p}"]')
    # wrong: every row correct except one swapped pair in the first category
    wrong = [r[:] for r in P['sol']]; wrong[0][0], wrong[0][1] = wrong[0][1], wrong[0][0]
    for ci in range(P['a']):
        for p in range(P['n']): await setv(ci, p, wrong[ci][p])
    await tap(pg, '#lbgo'); await pg.wait_for_timeout(300)
    ok(await result(pg, 500) is None and await pg.evaluate("() => !!document.querySelector('#lgcl li.bad') && !!document.querySelector('.lg10-c.lb-badc')"), f'{lab}: a complete but wrong table is refused; the broken clue and its cell are marked')
    for p in range(2): await setv(0, p, P['sol'][0][p])
    await tap(pg, '#lbgo'); return True

async def sudo(pg, lab, P, mode):
    n = P['n']; giv = [i for i, v in enumerate(P['puz']) if v >= 0]
    ok(await pg.evaluate("(puz) => [...document.querySelectorAll('.sd10-c')].every((b, i) => puz[i] < 0 ? !b.classList.contains('giv') && !b.querySelector('img') : b.classList.contains('giv') && !!b.querySelector('img'))", P['puz']), f'{lab}: the {len(giv)} givens of sdMake are fixed pictures')
    empty = [i for i in range(n * n) if P['puz'][i] < 0]; e0 = empty[0]
    # wrong: put the shape of a given in the same row
    r = e0 // n; clash = next(P['puz'][r * n + c] for c in range(n) if P['puz'][r * n + c] >= 0) if any(P['puz'][r * n + c] >= 0 for c in range(n)) else P['sol'][e0 + 1 if e0 + 1 < n * n else e0 - 1]
    await drag(pg, f'.sd10-p[data-tok="{clash}"]', f'.sd10-c[data-i="{e0}"]')
    ok(await pg.evaluate("(i) => document.querySelector(`.sd10-c[data-i=\"${i}\"]`).classList.contains('bad')", e0), f'{lab}: a repeated shape (dragged in) is marked in red')
    for k, i in enumerate(empty):
        v = P['sol'][i]
        if mode == 'drag' and k < 2: await drag(pg, f'.sd10-p[data-tok="{v}"]', f'.sd10-c[data-i="{i}"]')
        else: await tap(pg, f'.sd10-p[data-tok="{v}"]'); await tap(pg, f'.sd10-c[data-i="{i}"]')
    return True

async def flow(pg, lab, P, mode):
    n = P['n']
    ok(await pg.evaluate("(ends) => ends.every(([a, b], k) => [a, b].every(c => document.querySelector(`.fl10-c[data-i=\"${c}\"] img`).src.includes('flow_node_' + k + '_')))", P['ends']), f'{lab}: every pair\'s two ends carry its own colour and symbol')
    async def cell(c):
        b = await pg.locator(f'.fl10-c[data-i="{c}"]').bounding_box(); return b['x'] + b['width'] / 2, b['y'] + b['height'] / 2
    await vis(pg, '#fl10')
    # wrong: drag the first colour straight into another colour's end — refused
    a = P['ends'][0][0]; ax, ay = a % n, a // n
    nb = [ (ay + dy) * n + ax + dx for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= ax + dx < n and 0 <= ay + dy < n ]
    other = next((c for c in nb if any(c in e for k, e in enumerate(P['ends']) if k != 0)), None)
    if other is not None:
        x, y = await cell(a); await pg.mouse.move(x, y); await pg.mouse.down(); x2, y2 = await cell(other); await pg.mouse.move(x2, y2, steps=6); await pg.mouse.up()
        ok(await pg.evaluate("() => window.__test.pz.paths[0].length") <= 1 and await pg.evaluate("() => /لا تتقاطع/.test(document.querySelector('#stage').innerText)"), f'{lab}: a line cannot run into another colour\'s end')
    for k, seg in enumerate(P['segs']):
        x, y = await cell(seg[0]); await pg.mouse.move(x, y); await pg.mouse.down()
        for c in seg[1:]: x, y = await cell(c); await pg.mouse.move(x, y, steps=4)
        await pg.mouse.up(); await pg.wait_for_timeout(40)
    return True

async def tan(pg, lab, P, mode):
    n = P['n']
    ok(await pg.evaluate("(reg) => [...document.querySelectorAll('.tg10-c')].every((b, i) => b.classList.contains('reg') === reg.includes(i))", P['reg']), f'{lab}: the dotted outline is tgMake.reg')
    ok(await pg.evaluate("(k) => document.querySelectorAll('.tg10-p').length === k", len(P['pieces'])), f'{lab}: {len(P["pieces"])} pieces in the tray, each with its own tile')
    # wrong: drop the first piece where it sticks out of the outline
    outside = next(i for i in range(n * n) if i not in P['reg'])
    await drag(pg, '.tg10-p[data-tok="0"]', f'.tg10-c[data-i="{outside}"]')
    ok(await pg.evaluate("() => /لا تدخل هنا/.test(document.querySelector('#stage').innerText)") and await pg.evaluate("() => window.__test.pz.pcs[0].at === null"), f'{lab}: a piece outside the outline is refused')
    for k in range(len(P['pieces'])):
        want = await pg.evaluate("(k) => { const P = window.__test.pz.P, sol = P.pieces[k].sol.map(c => [c % P.n, c / P.n | 0]); return tgNorm(sol) }", k)
        await tap(pg, f'.tg10-p[data-tok="{k}"]')
        for t in range(8):
            if await pg.evaluate("([k, w]) => JSON.stringify(window.__test.pz.pcs[k].shape) === JSON.stringify(w)", [k, want]): break
            await tap(pg, '#tgr' if t != 3 else '#tgf')
        anchor = await pg.evaluate("(k) => { const P = window.__test.pz.P, p = window.__test.pz.pcs[k], sol = P.pieces[k].sol.map(c => [c % P.n, c / P.n | 0]), mx = Math.min(...sol.map(c => c[0])), my = Math.min(...sol.map(c => c[1])); return (p.shape[0][1] + my) * P.n + p.shape[0][0] + mx }", k)
        if mode == 'drag' and k < 2: await drag(pg, f'.tg10-p[data-tok="{k}"]', f'.tg10-c[data-i="{anchor}"]')
        else: await tap(pg, f'.tg10-c[data-i="{anchor}"]')
    return True

async def tent(pg, lab, P, mode):
    n = P['n']
    ok(await pg.evaluate("(t) => document.querySelectorAll('.tn10-c.tree').length === t.length", P['trees']), f'{lab}: {len(P["trees"])} trees from tnMake')
    ok(await pg.evaluate("([r, c]) => [...document.querySelectorAll('.tn10-h.row')].map(e => +e.textContent).join() === r.join() && [...document.querySelectorAll('.tn10-h.col')].map(e => +e.textContent).join() === c.join()", [P['rows'], P['cols']]), f'{lab}: row and column sums from tnMake')
    # wrong: two touching tents
    free = [i for i in range(n * n) if i not in P['trees']]
    pair = next(((a, b) for a in free for b in free if b == a + 1 and a % n < n - 1), None)
    for c in pair: await tap(pg, f'.tn10-c[data-i="{c}"]'); await tap(pg, f'.tn10-c[data-i="{c}"]')
    ok(await pg.evaluate("() => document.querySelectorAll('.tn10-c.bad').length >= 2"), f'{lab}: touching tents are marked')
    for c in pair: await tap(pg, f'.tn10-c[data-i="{c}"]')
    for c in P['sol']:
        for _ in range(3):
            if (await pg.evaluate("(c) => window.__test.pz.st[c]", c)) == 2: break
            await tap(pg, f'.tn10-c[data-i="{c}"]')
    return True

DRIVERS = {'river': river, 'rush': rush, 'stat': stat, 'pipe': pipe, 'grid': grid, 'sudo': sudo, 'flow': flow, 'tan': tan, 'tent': tent}
LV = {'river': ['lv1', 'lv7'], 'rush': ['lv3', 'lv8'], 'stat': ['lv2', 'lv6'], 'pipe': ['lv1', 'lv8'], 'grid': ['lv2', 'lv7'], 'sudo': ['lv1', 'lv8'], 'flow': ['lv1', 'lv8'], 'tan': ['lv2', 'lv8'], 'tent': ['lv1', 'lv8']}

async def main():
    async with async_playwright() as p:
        b = await (p.webkit.launch() if ENGINE == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']))
        for w in [int(x) for x in os.environ.get('WIDTHS', '320,390,430').split(',')]:
            for key, fn in DRIVERS.items():
                if ONLY and key not in ONLY.split(','): continue
                gid = 'pz_' + key
                ctx = await b.new_context(viewport={'width': w, 'height': 820}, has_touch=True); await ctx.add_init_script('window.__test={}')
                pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
                # 1) reference boards of the pack (replays: they record nothing)
                for lvk in LV[key]:
                    d = B[key][lvk]; lab = f'{gid}@{w} {lvk} seed {d["seed"]}'
                    await start(pg, gid, d['level'], d['seed'], (GEN[key], d))
                    if lvk == LV[key][0]: ok(await pg.evaluate("() => !!document.querySelector('.lb-trio img[src*=intro_trio]')"), f'{lab}: the trio card opens the board')
                    Pd = await P(pg); mode = 'drag' if w != 430 else 'tap'
                    if lvk == LV[key][0] or key in ('river', 'rush', 'sudo', 'tent', 'tan', 'flow', 'grid', 'pipe', 'stat'):
                        await fn(pg, lab, Pd, mode)
                        ov = await overflow(pg); ok(not ov, f'{lab}: no horizontal overflow', ov)
                        if SHOTS and w == 390: await pg.screenshot(path=f'{SHOTS}/{gid}_{lvk}_390.png', full_page=True)
                        r = await result(pg, 8000); ok(r is True, f'{lab}: solved by real input → win')
                        ok(await pg.evaluate("() => document.querySelectorAll('#stage .res').length") == 1, f'{lab}: one result screen')
                # 2) hint from the board button
                await start(pg, gid, 4, 77); await hint(pg, f'{gid}@{w}')
                # 3) the player's own stage: real play, win recorded, kept after reload
                await start(pg, gid); before = await stage(pg, gid); Pd = await P(pg)
                await fn(pg, f'{gid}@{w} own stage', Pd, 'tap'); r = await result(pg, 8000); ok(r is True, f'{gid}@{w} own stage: win')
                await pg.wait_for_timeout(800); after = await stage(pg, gid); ok(after != before, f'{gid}@{w}: win recorded', [before, after])
                await pg.reload(); await pg.wait_for_timeout(1800); ok(await stage(pg, gid) == after, f'{gid}@{w}: kept after reload')
                ok(not errs, f'{gid}@{w}: no page errors', errs); await ctx.close()
        await b.close()
    print(f'{ENGINE}: {len(checks)} passed, {len(problems)} failed'); [print('  FAIL', x) for x in problems]
    return 1 if problems or not checks else 0
sys.exit(asyncio.run(main()))
