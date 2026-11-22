"""priority-7 R4 — real play of the redesigned boards pz_acity, pz_pobs, pz_aarch, pz_alayer, pz_arelic at 320/390/430.
Mouse drags and taps only for the moves (the hook is read to know the answer, never to move pieces), a wrong answer
refused, the right one wins, hint works, the stage is kept after reload, no horizontal overflow, no clipped text, no page
errors. Exit code is non-zero when any check fails.
Usage: python3 qa/browser/priority7_play.py http://127.0.0.1:8150/   (ENGINE=webkit; SHOTS=dir for 390 screenshots)"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from player_openings import dismiss_opening
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
ENGINE = os.environ.get('ENGINE', 'chromium'); SHOTS = os.environ.get('SHOTS')
checks, problems = [], []
def ok(c, label, extra=None):
    if os.environ.get('FORCE_FAIL') and label == os.environ['FORCE_FAIL']: c = False
    (checks if c else problems).append(label if c else f'{label} :: {extra}'); return c

async def start(pg, gid, lv, seed):
    await pg.goto(URL); await pg.wait_for_timeout(1500); await pg.evaluate("async()=>{const p=document.querySelector('.mpc[data-m=main]');if(p&&p.getClientRects().length)p.click();tab('puz');await mindlabPlayLayers.start()}"); await pg.wait_for_function("()=>window.mindlabPlayLayers?.ready===true", timeout=45000)
    # with a level: a replay (fixed level + seed, records no progress); without: the player's own next stage (records progress)
    await pg.evaluate("([g, lv, s]) => { startRun([g]); if (lv) RUN.replay = { id: g, lv, seed: s } }", [gid, lv, seed]); await pg.wait_for_timeout(300)
    if await pg.locator('#stage #go').count() and await pg.locator('#stage #go').first.is_visible(): await pg.click('#stage #go')
    await dismiss_opening(pg, 1500)
    await pg.wait_for_timeout(2300)
async def result(pg, t=6000):
    for _ in range(t // 200):
        if await pg.evaluate("() => !!document.querySelector('#stage .res')"): return await pg.evaluate("() => !!document.querySelector('#stage .res .bigstars') || /أحسنت|عرفت|عاد الأرشيف|قرأت|الحقيقة عند|انطبقتا/.test(document.querySelector('#stage .res').innerText)")
        await pg.wait_for_timeout(200)
    return None
async def center(pg, sel):
    e = pg.locator(sel).first; await e.evaluate("e => { const b = e.getBoundingClientRect(); if (b.top < 40 || b.bottom > innerHeight - 110) e.scrollIntoView({block: 'center'}) }"); await pg.wait_for_timeout(60); return await e.bounding_box()
async def drag(pg, src, dst):
    a = await center(pg, src); x0, y0 = a['x'] + a['width'] / 2, a['y'] + a['height'] / 2; H = pg.viewport_size['height']
    await pg.mouse.move(x0, y0); await pg.mouse.down(); await pg.mouse.move(x0 + 7, y0 + 7, steps=3)
    for _ in range(80):
        b = await pg.locator(dst).first.bounding_box()
        if b['y'] >= 150 and b['y'] + b['height'] <= H - 130: break  # out of the edge auto-scroll zones
        await pg.mouse.move(x0, 10 if b['y'] < 150 else H - 10, steps=2); await pg.wait_for_timeout(60)
    b = await pg.locator(dst).first.bounding_box(); await pg.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2, steps=9); await pg.mouse.up(); await pg.wait_for_timeout(90)
async def tap(pg, sel):
    await center(pg, sel); await pg.locator(sel).first.click(); await pg.wait_for_timeout(70)
async def tapmove(pg, src, dst): await tap(pg, src); await tap(pg, dst)
async def overflow(pg):
    return await pg.evaluate("() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('#stage *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > W + 1 || b.left < -1) && getComputedStyle(e).position !== 'fixed' && !e.closest('.mk-ghost') }).map(e => e.className.baseVal ?? e.className).slice(0, 4) }")
async def clipped(pg, sel):
    return await pg.evaluate("(s) => [...document.querySelectorAll(s)].filter(e => e.scrollWidth > e.clientWidth + 2).map(e => e.textContent.slice(0, 20)).slice(0, 3)", sel)
async def stage(pg, gid): return await pg.evaluate("(g) => JSON.stringify([typeof txStageOf === 'function' ? txStageOf(g) : null, pzLv(g)])", gid)
async def kept(pg, gid, before, lab):
    await pg.wait_for_timeout(700); after = await stage(pg, gid); ok(after != before, f'{lab}: win recorded', [before, after])
    await pg.reload(); await pg.wait_for_timeout(1900); await pg.evaluate("async()=>{const p=document.querySelector('.mpc[data-m=main]');if(p&&p.getClientRects().length)p.click();tab('puz');await mindlabPlayLayers.start()}"); await pg.wait_for_function("()=>window.mindlabPlayLayers?.ready===true", timeout=45000); ok(await stage(pg, gid) == after, f'{lab}: kept after reload')
async def finish(pg, lab, go, gid, persist):
    ov = await overflow(pg); ok(not ov, f'{lab}: no horizontal overflow', ov)
    if SHOTS and ' 390' in lab and 'drag' in lab: await pg.screenshot(path=f'{SHOTS}/{gid}_after_390.png', full_page=True)
    before = await stage(pg, gid); await tap(pg, go); ok(await result(pg) is True, f'{lab}: solved by hand → win')
    if persist: await kept(pg, gid, before, lab)

async def acity(pg, w, lv, mode):
    persist = lv is None
    lab = f'pz_acity {w} lv{lv or "-own"} {mode}'; await start(pg, 'pz_acity', lv, 70 + (lv or 0))
    P = await pg.evaluate("() => { const P = window.__test.pz.P; return { n: P.n, gone: P.gone, al: P.al, any: P.req.some(r => r.or) } }")
    ok(await pg.evaluate("(n) => document.querySelectorAll('#actweb .mk-sp').length === n", P['n']), f'{lab}: {P["n"]} species drawn from actMake')
    ok(await pg.evaluate("() => [...document.querySelectorAll('#actweb .mk-sp image')].filter(e => /motion[/]art[/]|designs_art[/]priority7[/]/.test(e.getAttribute('href') || '')).length === document.querySelectorAll('#actweb .mk-sp').length"), f'{lab}: every species is its picture')
    if P['any']: ok(await pg.evaluate("() => document.querySelectorAll('#actweb .ae.any').length > 0 && document.querySelectorAll('#actweb .ae.all').length > 0"), f'{lab}: «all» and «any one» lines both drawn')
    lit = P['al'].index(True); await tap(pg, f'#actweb [data-sp="{lit}"]')
    ok(await pg.evaluate("() => window.__test.pz.state().sel") == -1, f'{lab}: a lit species cannot be the first to vanish')
    wrong = next((i for i, a in enumerate(P['al']) if not a and i != P['gone']), None)
    if wrong is not None:
        await tap(pg, f'#actweb [data-sp="{wrong}"]'); await pg.wait_for_timeout(250)
        ok(await pg.evaluate("() => !!document.querySelector('#actweb .mk-sp.pulse')"), f'{lab}: the dimming spreads on simulation')
        ok(await pg.evaluate("() => document.querySelector('#actsim').classList.contains('bad') && !!document.querySelector('#actweb .mk-sp.mis')"), f'{lab}: a wrong hypothesis rings the species that disagree')
        await tap(pg, '#acmode'); ok(await pg.evaluate("() => window.__test.pz.state().view") == 'scene', f'{lab}: the mode button switches to the scene')
        await tap(pg, '#actgo'); ok(await result(pg, 800) is None, f'{lab}: wrong first species refused')
    await tap(pg, f'#actweb [data-sp="{P["gone"]}"]'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("() => document.querySelector('#actsim').classList.contains('good')"), f'{lab}: the right hypothesis matches the scene')
    await finish(pg, lab, '#actgo', 'pz_acity', persist)

async def pobs(pg, w, lv, mode):
    lab = f'pz_pobs {w} lv{lv or "-own"} {mode}'; await start(pg, 'pz_pobs', lv, 460 + (lv or 0))
    P = await pg.evaluate("() => { const P = window.__test.pz.P; return { n: P.n, R: P.R, ans: P.ans, k: P.top.length } }")
    ok(not await pg.evaluate("() => /تطابق كامل/.test(document.querySelector('#pom').innerText)"), f'{lab}: does not start aligned')
    ok(await pg.evaluate("() => document.querySelectorAll('#pobot .po-b').length > 0 && document.querySelectorAll('#potop .po-t').length > 0"), f'{lab}: blue map and gold sheet drawn as two layers')
    if P['n'] == 9:
        bw = await pg.evaluate("() => document.querySelector('#pos').getBoundingClientRect().width"); ok(bw / 9 >= 28, f'{lab}: 9×9 cells at least 28 px wide', bw / 9)
    for _ in range(P['R']): await tap(pg, '.po-pad [data-m="t"]')
    s = await pg.evaluate("() => window.__test.pz.state()")
    # finger drag of the sheet to the answer
    box = await center(pg, '#pos'); cell = box['width'] / P['n']
    x0 = box['x'] + (s['dx'] + .5) * cell; y0 = box['y'] + (s['dy'] + .5) * cell
    tx, ty = P['ans']; await pg.mouse.move(x0, y0); await pg.mouse.down()
    await pg.mouse.move(x0 + (tx - s['dx']) * cell, y0 + (ty - s['dy']) * cell, steps=12); await pg.mouse.up(); await pg.wait_for_timeout(300)
    s2 = await pg.evaluate("() => window.__test.pz.state()")
    ok([s2['dx'], s2['dy']] == P['ans'], f'{lab}: the sheet follows the finger to the answer', [s2, P['ans']])
    ok(s2['moves'] == P['R'] + abs(tx - s['dx']) + abs(ty - s['dy']), f'{lab}: a drag costs one move per cell', s2)
    ok(await pg.evaluate("(k) => document.querySelectorAll('#potop .po-t.on').length === k && document.querySelectorAll('#pobot .po-b').length > 0", P['k']), f'{lab}: on the match both marks stay visible')
    ov = await overflow(pg); ok(not ov, f'{lab}: no horizontal overflow', ov)
    if SHOTS and w == 390 and mode == 'drag': await pg.screenshot(path=f'{SHOTS}/pz_pobs_after_390.png', full_page=True)
    before = await stage(pg, 'pz_pobs'); ok(await result(pg) is True, f'{lab}: matching wins')
    if lv is None: await kept(pg, 'pz_pobs', before, lab)
    if lv is None or w != 390: return
    # move budget in the browser: 23 moves spent, then a long drag to the answer must not win and must stop at 24
    await start(pg, 'pz_pobs', lv, 460 + lv); P = await pg.evaluate("() => { const P = window.__test.pz.P; return { n: P.n, R: P.R, ans: P.ans } }")
    k = P['R']
    while k + 4 <= 23: k += 4
    for _ in range(k): await tap(pg, '.po-pad [data-m="t"]')
    for i in range(23 - k): await tap(pg, '.po-pad [data-m="%s"]' % ('d' if i % 2 == 0 else 'u'))
    s = await pg.evaluate("() => window.__test.pz.state()")
    if s['moves'] == 23 and abs(P['ans'][0] - s['dx']) + abs(P['ans'][1] - s['dy']) >= 2:
        box = await center(pg, '#pos'); cell = box['width'] / P['n']; x0 = box['x'] + (s['dx'] + .5) * cell; y0 = box['y'] + (s['dy'] + .5) * cell
        await pg.mouse.move(x0, y0); await pg.mouse.down(); await pg.mouse.move(x0 + (P['ans'][0] - s['dx']) * cell, y0 + (P['ans'][1] - s['dy']) * cell, steps=12); await pg.mouse.up(); await pg.wait_for_timeout(400)
        s2 = await pg.evaluate("() => window.__test.pz.state()")
        ok(s2['moves'] == 24 and abs(s2['dx'] - s['dx']) + abs(s2['dy'] - s['dy']) == 1, f'pz_pobs {w}: with one move left a long drag travels one cell, counter 24', s2)
        await pg.wait_for_timeout(2500); txt = await pg.evaluate("() => document.querySelector('#stage').innerText")
        ok('خلصت الحركات' in txt and 'محلول' not in txt, f'pz_pobs {w}: no win past the 24-move budget (the board ends as out of moves)', txt[:160])
    else: ok(False, f'pz_pobs {w}: budget scenario set up', s)
    return

FULL = r"""(want) => { const R = Math.random; for (let s = 1; s < 60000; s++) { Math.random = seeded(s); const P = poMake(8); Math.random = R;
    const sh = paRot(P.top, P.R), w = Math.max(...sh.map(a => a[0])) + 1, h = Math.max(...sh.map(a => a[1])) + 1;
    if (want === 'h' && h === P.n && w < P.n && P.ans[0] + P.ans[1] > 0) return s; if (want === 'w' && w === P.n && h < P.n && P.ans[0] + P.ans[1] > 0) return s; } return -1 }"""
async def pobs_hint(pg, w, want):
    """hint 3 through the screen's hint button on a sheet as tall (h) or as wide (w) as the board"""
    lab = f'pz_pobs {w} hint3 full-{"height" if want == "h" else "width"}'
    await pg.goto(URL); await pg.wait_for_timeout(1500); await pg.evaluate("async()=>{const p=document.querySelector('.mpc[data-m=main]');if(p&&p.getClientRects().length)p.click();tab('puz');await mindlabPlayLayers.start()}"); await pg.wait_for_function("()=>window.mindlabPlayLayers?.ready===true", timeout=45000)
    s = await pg.evaluate(FULL, want)
    if not ok(s > 0, f'{lab}: such a board exists in poMake(8)', s): return
    await start(pg, 'pz_pobs', 8, s)
    hb = pg.locator('#stage button:has-text("تلميح")').first
    for k in range(3):
        await hb.scroll_into_view_if_needed(); await hb.click(); await pg.wait_for_timeout(500)
        for sel in ('button:has-text("نعم")', 'button:has-text("اكشف")', 'button:has-text("تلميح بـ")'):
            if await pg.locator(sel).count() and await pg.locator(sel).first.is_visible(): await pg.locator(sel).first.click(); await pg.wait_for_timeout(400); break
    txt = await pg.evaluate("() => document.querySelector('#stage').innerText")
    st = await pg.evaluate("() => window.__test.pz.state()"); P = await pg.evaluate("() => { const P = window.__test.pz.P; return { ans: P.ans, R: P.R } }")
    ok('باقي خطوة واحدة' in txt, f'{lab}: the third hint says one move is left', txt[-200:])
    ok(not await pg.evaluate("() => /تطابق كامل/.test(document.querySelector('#pom').innerText)") and abs(st['dx'] - P['ans'][0]) + abs(st['dy'] - P['ans'][1]) == 1 and st['r'] == P['R'], f'{lab}: after the hint the map is not yet matched and is one cell away', st)
    m = 'r' if P['ans'][0] > st['dx'] else 'l' if P['ans'][0] < st['dx'] else 'd' if P['ans'][1] > st['dy'] else 'u'
    await tap(pg, f'.po-pad [data-m="{m}"]')
    ok(await result(pg) is True and (await pg.evaluate("() => window.__test.pz.state()"))['moves'] == st['moves'] + 1, f'{lab}: the next move wins once')
    ok(await pg.evaluate("() => document.querySelectorAll('#stage .res').length") == 1, f'{lab}: a single result screen')

async def aarch(pg, w, lv, mode):
    persist = lv is None
    lab = f'pz_aarch {w} lv{lv or "-own"} {mode}'; await start(pg, 'pz_aarch', lv, 550 + (lv or 0)); mv = drag if mode == 'drag' else tapmove
    P = await pg.evaluate("() => { const P = window.__test.pz.P; return { cap: P.cap, fat: P.fat, n: P.n } }")
    ok(await pg.evaluate("() => document.querySelectorAll('#aarboard .aa-ship img').length === window.__test.pz.P.n"), f'{lab}: every ship row shows its ship picture')
    n = P['n']
    # wrong: captains shifted by one row
    for r in range(n): await mv(pg, f'[data-tray="c"] [data-tok="c{P["cap"][(r + 1) % n]}"], [data-slot] [data-tok="c{P["cap"][(r + 1) % n]}"]', f'[data-slot="c{r}"]')
    for r in range(n): await mv(pg, f'[data-tray="f"] [data-tok="f{P["fat"][r]}"]', f'[data-slot="f{r}"]')
    st = await pg.evaluate("() => window.__test.pz.state()")
    ok(st['uc'] == [P['cap'][(r + 1) % n] for r in range(n)] and st['uf'] == P['fat'], f'{lab}: all pieces placed by hand', st)
    ok(await pg.evaluate("() => document.querySelectorAll('#aarcl .mk-clue.ok, #aarcl .mk-clue.bad').length > 0"), f'{lab}: clues light up live')
    await tap(pg, '#aargo'); ok(await result(pg, 800) is None, f'{lab}: a wrong archive is refused')
    for r in range(n): await mv(pg, f'[data-slot] [data-tok="c{P["cap"][r]}"], [data-tray="c"] [data-tok="c{P["cap"][r]}"]', f'[data-slot="c{r}"]')
    ok((await pg.evaluate("() => window.__test.pz.state()"))['uc'] == P['cap'], f'{lab}: seals swapped into place by hand')
    await finish(pg, lab, '#aargo', 'pz_aarch', persist)

async def alayer(pg, w, lv, mode):
    persist = lv is None
    lab = f'pz_alayer {w} lv{lv or "-own"} {mode}'; await start(pg, 'pz_alayer', lv, 700 + (lv or 0)); mv = drag if mode == 'drag' else tapmove
    order = await pg.evaluate("() => { const P = window.__test.pz.P; return P.ev.map(e => P.items.indexOf(e)) }"); N = len(order)
    ok(await pg.evaluate("() => /ناقص/.test(document.querySelector('#alystat').textContent)"), f'{lab}: time line starts incomplete')
    wrong = order[:]; wrong[0], wrong[1] = wrong[1], wrong[0]
    for q, j in enumerate(wrong):
        await mv(pg, f'[data-tray="t"] [data-tok="{j}"]', f'.mk-slot.tl[data-slot="{q}"]')
        if q == 1: ok(await pg.evaluate("() => document.querySelectorAll('#alynums .aly-num').length === 2"), f'{lab}: the section numbers the placed cards as you go')
    ok(await pg.evaluate("() => /مكتمل/.test(document.querySelector('#alystat').textContent)"), f'{lab}: complete when every card is placed')
    await tap(pg, '#alygo'); ok(await result(pg, 800) is None and await pg.evaluate("() => !!document.querySelector('.mk-slot.tl.mk-wrong')"), f'{lab}: wrong order refused, first error marked')
    await mv(pg, f'.mk-slot.tl[data-slot="1"] [data-tok="{order[0]}"]', '.mk-slot.tl[data-slot="0"]')
    ok(await pg.evaluate("() => window.__test.pz.state()") == order, f'{lab}: two cards swapped by hand')
    await finish(pg, lab, '#alygo', 'pz_alayer', persist)

async def arelic(pg, w, lv, mode):
    persist = lv is None
    lab = f'pz_arelic {w} lv{lv or "-own"} {mode}'; await start(pg, 'pz_arelic', lv, 740 + (lv or 0)); mv = drag if mode == 'drag' else tapmove
    P = await pg.evaluate("() => { const P = window.__test.pz.P; return { tr: P.tr, ns: P.ns } }")
    wrong = next(i for i in range(P['ns']) if i != P['tr'])
    await mv(pg, f'[data-tray="s"] [data-tok="{wrong}"]', '[data-slot="cmp"]')
    ok(await pg.evaluate("() => document.querySelectorAll('[data-slot=\"cmp\"] .mk-pic').length > 0 && document.querySelectorAll('[data-tray=\"s\"] .mk-pic.diff .arl-x').length > 0"), f'{lab}: the added source shows its pieces; contradictions are marked inside the others')
    await mv(pg, f'[data-slot="cmp"] [data-tok="{wrong}"]', '[data-slot="truth"]')
    await tap(pg, '#arlgo'); ok(await result(pg, 800) is None, f'{lab}: a false source is refused')
    await mv(pg, f'[data-tray="s"] [data-tok="{P["tr"]}"]', '[data-slot="cmp"]')
    ok(await pg.evaluate("() => document.querySelector('#arlcmp').classList.contains('good')"), f'{lab}: the true source is consistent on the stone')
    await mv(pg, f'[data-slot="cmp"] [data-tok="{P["tr"]}"]', '[data-slot="truth"]')
    ok(await pg.evaluate("() => /ثبّت الاستنتاج/.test(document.querySelector('#arlstat').textContent)"), f'{lab}: the conclusion is ready to lock')
    await finish(pg, lab, '#arlgo', 'pz_arelic', persist)

async def main():
    async with async_playwright() as p:
        b = await (p.webkit.launch() if ENGINE == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']))
        ONLY = os.environ.get('ONLY'); run = lambda g: not ONLY or g in ONLY
        async def fresh(w):
            # one browser context per board family: a long single-page session is not what a player does, and WebKit
            # headless here crashes intermittently in very long sessions (see the report)
            ctx = await b.new_context(viewport={'width': w, 'height': 820}, has_touch=True); await ctx.add_init_script('window.__test={}')
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            await pg.goto(URL); await pg.wait_for_timeout(2000); await pg.evaluate("async()=>{const p=document.querySelector('.mpc[data-m=main]');if(p&&p.getClientRects().length)p.click();tab('puz');await mindlabPlayLayers.start()}"); await pg.wait_for_function("()=>window.mindlabPlayLayers?.ready===true", timeout=45000); return ctx, pg, errs
        groups = [('pobshint', lambda pg, w: [pobs_hint(pg, w, 'h'), pobs_hint(pg, w, 'w')]),
                  ('acity', lambda pg, w: [acity(pg, w, 1, 'tap'), acity(pg, w, 8, 'tap'), acity(pg, w, None, 'tap')]),
                  ('pobs', lambda pg, w: [pobs(pg, w, 8, 'drag'), pobs(pg, w, None, 'drag')]),
                  ('aarch', lambda pg, w: [aarch(pg, w, 6, 'drag'), aarch(pg, w, None, 'tap')]),
                  ('alayer', lambda pg, w: [alayer(pg, w, 7, 'drag'), alayer(pg, w, None, 'tap')]),
                  ('arelic', lambda pg, w: [arelic(pg, w, 6, 'drag'), arelic(pg, w, None, 'tap')])]
        for w in [int(x) for x in os.environ.get('WIDTHS', '320,390,430').split(',')]:
            for name, fn in groups:
                if not run(name): continue
                ctx, pg, errs = await fresh(w)
                for co in fn(pg, w): await co
                # hint works on the board
                if name == 'pobshint': ok(not errs, f'pz_pobs@{w} hint: no page errors', errs); await ctx.close(); continue
                await start(pg, 'pz_' + name, 4, 900); hb = pg.locator('#stage button:has-text("تلميح")').first
                if await hb.count(): await hb.click(); await pg.wait_for_timeout(500); ok(not errs, f'pz_{name}@{w}: hint opens without errors', errs)
                ok(not errs, f'pz_{name}@{w}: no page errors', errs); await ctx.close()
        await b.close()
    print(f'{ENGINE}: {len(checks)} passed, {len(problems)} failed'); [print('  FAIL', x) for x in problems]
    return 1 if problems or not checks else 0
sys.exit(asyncio.run(main()))
