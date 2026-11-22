"""priority-7 R4 — أبواب القصر (pz_door) and التماثيل المتكلمة (pz_pliar) on the original generators.
Generator: drMake/drVals over 8 levels — six rules, eight inscription kinds, a unique treasure door — and the board draws
exactly drMake.n doors / statues with each inscription kind and the rule. Screen, at 320/390/430 with real input:
  · the regression board from the hand-off (drMake(8), rule none, door ٢): key on ١ + all backs refused, key on ٢ + one
    statue facing refused, key on ٢ + all backs wins once;
  · a board with truthful and lying statues: key dragged with the mouse, statues turned by taps, ↺, and a swipe;
    a wrong door is refused; the right directions win; nothing opens before «ثبّت»;
  · a «mix» board (the treasure sign true, at least one trap sign false);
  · pz_pliar: neutral start, the door entrance records no win, the pqMake hall records one stage, kept after reload.
Exit code is non-zero when any check fails.
Usage: python3 qa/browser/palace_statues.py http://127.0.0.1:8150/   (ENGINE=webkit)"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from player_openings import dismiss_opening
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
ENGINE = os.environ.get('ENGINE', 'chromium'); SHOTS = os.environ.get('SHOTS')
checks, problems = [], []
def ok(c, label, extra=None):
    if os.environ.get('FORCE_FAIL') and label == os.environ['FORCE_FAIL']: c = False  # proves a failing check gives a non-zero exit
    (checks if c else problems).append(label if c else f'{label} :: {extra}'); return c

GEN = r"""() => { const R = Math.random, o = { rules: {}, kinds: {}, notUnique: 0, n: {}, total: 0 };
  for (let lv = 1; lv <= 8; lv++) for (let s = 1; s <= 120; s++) { Math.random = seeded(lv * 1000 + s); const P = drMake(lv); Math.random = R; o.total++;
    o.rules[P.rule.id] = 1; P.st.forEach(x => o.kinds[x.k] = 1); o.n[lv] = P.n;
    const okd = [...Array(P.n).keys()].filter(t => P.rule.ok(drVals(P, t), t)); if (okd.length !== 1 || okd[0] !== P.t) o.notUnique++; }
  return o }"""
# find a seed whose first drMake(lv) call is a board with the wanted property (pzPlay seeds Math.random with RUN.replay.seed)
FIND = r"""([lv, want]) => { const R = Math.random; for (let s = 1; s < 40000; s++) { Math.random = seeded(s); const P = drMake(lv); Math.random = R;
    const v = drVals(P, P.t), tr = v.filter(Boolean).length;
    if (want === 'mixed' && tr > 0 && tr < P.n && P.n === 5) return s; if (want === 'mix' && P.rule.id === 'mix') return s; if (want === 'none' && P.rule.id === 'none' && P.n === 5) return s; } return -1 }"""
# the exact regression board of the hand-off: drMake(8), rule none, door ٢ (index 1)
REG = r"""() => { const real = window.drMake; window.__realDr = real; window.drMake = function (lv) { window.drMake = real;
    return { n: 5, rule: DR_RULES.find(r => r.id === 'none'), t: 1, st: [{ k: 'at', d: 0, x: 2 }, { k: 'nothere', d: 1 }, { k: 'here', d: 2 }, { k: 'side', d: 3, x: 4 }, { k: 'notat', d: 4, x: 1 }] } } }"""

async def boot(ctx):
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    await pg.goto(URL); await pg.wait_for_timeout(2200); await pg.evaluate("async()=>{const p=document.querySelector('.mpc[data-m=main]');if(p&&p.getClientRects().length)p.click();tab('puz');await mindlabPlayLayers.start()}"); await pg.wait_for_function("()=>window.mindlabPlayLayers?.ready===true", timeout=45000)
    if await pg.locator('.mpc[data-m=main]').count() and await pg.locator('.mpc[data-m=main]').is_visible(): await pg.click('.mpc[data-m=main]')
    return pg, errs
async def start(pg, gid, lv=None, seed=None, pre=None):
    await pg.goto(URL); await pg.wait_for_timeout(1600); await pg.evaluate("async()=>{const p=document.querySelector('.mpc[data-m=main]');if(p&&p.getClientRects().length)p.click();tab('puz');await mindlabPlayLayers.start()}"); await pg.wait_for_function("()=>window.mindlabPlayLayers?.ready===true", timeout=45000)
    if await pg.locator('.mpc[data-m=main]').count() and await pg.locator('.mpc[data-m=main]').is_visible(): await pg.click('.mpc[data-m=main]')
    if pre: await pg.evaluate(pre)
    await pg.evaluate("([g, lv, s]) => { startRun([g]); if (lv) RUN.replay = { id: g, lv, seed: s } }", [gid, lv, seed]); await pg.wait_for_timeout(300)
    if await pg.locator('#stage #go').count(): await pg.click('#stage #go')
    await dismiss_opening(pg, 1500)
    await pg.wait_for_timeout(2200)
async def result(pg, t=6000):
    for _ in range(t // 200):
        if await pg.evaluate("() => !!document.querySelector('#stage .res')"): return await pg.evaluate("() => !!document.querySelector('#stage .res .bigstars') || /أحسنت|الكنز خلف|عرفت|انفتح/.test(document.querySelector('#stage .res').innerText)")
        await pg.wait_for_timeout(200)
    return None
async def state(pg): return await pg.evaluate("() => window.__test.pz.state()")
async def drag(pg, src, dst):
    s = pg.locator(src).first; await s.evaluate("e => e.scrollIntoView({block: 'center'})"); await pg.wait_for_timeout(80)
    a = await s.bounding_box(); x0, y0 = a['x'] + a['width'] / 2, a['y'] + a['height'] / 2
    await pg.mouse.move(x0, y0); await pg.mouse.down(); await pg.mouse.move(x0 + 6, y0 + 6, steps=3)
    H = pg.viewport_size['height']
    for _ in range(60):
        b = await pg.locator(dst).first.bounding_box()
        if b['y'] >= 150 and b['y'] + b['height'] <= H - 130: break  # out of the edge auto-scroll zones
        await pg.mouse.move(x0, 10 if b['y'] < 150 else H - 10, steps=2); await pg.wait_for_timeout(60)
    b = await pg.locator(dst).first.bounding_box(); await pg.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(120)
async def tap(pg, sel):
    e = pg.locator(sel).first; await e.evaluate("e => e.scrollIntoView({block: 'center'})"); await pg.wait_for_timeout(40); await e.click(); await pg.wait_for_timeout(60)
async def turn_to(pg, i, want, D, label):
    """taps on the statue only; checks that one tap moves exactly one step"""
    for _ in range(D + 3):
        cur = (await state(pg))['dir'][i]
        if cur == want: return True
        await tap(pg, f'.pl-st[data-st="{i}"] .pl-turn')
        nxt = (await state(pg))['dir'][i]; exp = 0 if cur < 0 else (cur + 1) % (D + 1)
        if nxt != exp: ok(False, f'{label}: one tap = one step', [cur, nxt]); return False
    return (await state(pg))['dir'][i] == want
async def nothing_open(pg):
    return await pg.evaluate("() => !document.querySelector('.pl-door.open') && [...document.querySelectorAll('.pl-dimg')].every(i => /door_closed/.test(i.src))")
async def overflow(pg):
    return await pg.evaluate("() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('#stage *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > W + 1 || b.left < -1) && getComputedStyle(e).position !== 'fixed' }).map(e => e.className.baseVal ?? e.className).slice(0, 4) }")
async def clipped(pg):
    return await pg.evaluate("() => [...document.querySelectorAll('.pl-sthead b, .pl-face, .pl-rule small, .pl-lead')].filter(e => e.scrollWidth > e.clientWidth + 2).length")

async def door_case(pg, w, kind):
    lab = f'pz_door@{w} {kind}'
    if kind == 'regression':
        await start(pg, 'pz_door', 8, 5, REG)
    else:
        lv = 8 if kind != 'mix' else 6; s = await pg.evaluate(FIND, [lv, 'mixed' if kind == 'mixed' else 'mix'])
        if not ok(s > 0, f'{lab}: a board of this kind exists in the generator', s): return
        await start(pg, 'pz_door', lv, s)
    P = await pg.evaluate("() => { const P = window.__test.pz.P; return { n: P.n, t: P.t, rule: P.rule.id, kinds: P.st.map(s => s.k), vals: drVals(P, P.t) } }")
    n, t, D = P['n'], P['t'], P['n']
    ok(await pg.evaluate("(n) => document.querySelectorAll('.pl-door').length === n && document.querySelectorAll('.pl-st').length === n", n), f'{lab}: {n} doors and {n} statues drawn from drMake.n')
    ok(await pg.evaluate("(r) => document.querySelector('.pl-rule').dataset.rule === r", P['rule']), f'{lab}: rule strip shows drMake.rule ({P["rule"]})')
    ok(await pg.evaluate("(k) => [...document.querySelectorAll('.pl-plaque')].map(e => e.dataset.k).join() === k.join()", P['kinds']), f'{lab}: every inscription drawn from drMake.st')
    ok(all(s['dir'] == -1 for s in [{'dir': d} for d in (await state(pg))['dir']]) and (await state(pg))['keyAt'] == -1, f'{lab}: starts neutral with the key in the tray')
    ok(await nothing_open(pg), f'{lab}: no door is open before «ثبّت»')
    tgt = lambda door: pg.evaluate("(d) => window.__test.pz.target(d)", door)
    if kind == 'regression':
        await drag(pg, '.pl-tray [data-tok="key"]', '.pl-door[data-door="0"]'); ok((await state(pg))['keyAt'] == 0, f'{lab}: key dragged to door ١')
        for i in range(n): await turn_to(pg, i, D, D, lab)
        ok(await nothing_open(pg), f'{lab}: still nothing open after placing the key and turning')
        await tap(pg, '#plgo'); ok(await result(pg, 800) is None and await pg.evaluate("() => /الكنز خلف الباب ١.*لا يطابق/.test(document.querySelector('#stage').innerText)"), f'{lab}: key on ١ + all backs refused')
        await drag(pg, '.pl-door[data-door="0"] [data-tok="key"]', '.pl-door[data-door="1"]'); ok((await state(pg))['keyAt'] == 1, f'{lab}: key moved to door ٢')
        await tap(pg, '.pl-st[data-st="2"] .pl-rot[data-by="1"]'); await tap(pg, '.pl-st[data-st="2"] .pl-rot[data-by="1"]')  # back → ١ → ٢
        ok((await state(pg))['dir'][2] == 1, f'{lab}: ↻ twice turns statue ٣ from its back to door ٢')
        await tap(pg, '#plgo'); ok(await result(pg, 800) is None, f'{lab}: key on ٢ + one statue facing refused')
        await tap(pg, '.pl-st[data-st="2"] .pl-rot[data-by="-1"]'); await tap(pg, '.pl-st[data-st="2"] .pl-rot[data-by="-1"]')
        ok((await state(pg))['dir'] == [D] * n, f'{lab}: ↺ twice returns it to its back')
        ok(await nothing_open(pg), f'{lab}: the right door is still closed before the last «ثبّت»')
        await tap(pg, '#plgo'); ok(await result(pg) is True, f'{lab}: key on ٢ + all backs wins')
        ok(await pg.evaluate("() => document.querySelectorAll('#stage .res').length === 1"), f'{lab}: one win screen')
        return
    # a wrong door first: key there and directions that match ITS truth values → refused by the rule
    wrong = next(d for d in range(n) if d != t)
    await drag(pg, '.pl-tray [data-tok="key"]', f'.pl-door[data-door="{wrong}"]')
    tw = await tgt(wrong)
    for i, v in enumerate(tw): await turn_to(pg, i, v, D, lab)
    await tap(pg, '#plgo'); ok(await result(pg, 800) is None, f'{lab}: a wrong door with consistent directions is refused')
    ok(await nothing_open(pg), f'{lab}: refusal opens no door')
    # tap alternative for the key: tap the key on its door, then the right door
    await tap(pg, f'.pl-door[data-door="{wrong}"] [data-tok="key"]'); await tap(pg, f'.pl-door[data-door="{t}"]')
    ok((await state(pg))['keyAt'] == t, f'{lab}: key moved by tap, then tap on a door')
    tt = await tgt(t)
    # one statue by swipe (horizontal drag on the statue), the rest by taps
    before = (await state(pg))['dir'][0]
    tb = await pg.locator('.pl-st[data-st="0"] .pl-turn').bounding_box(); await pg.locator('.pl-st[data-st="0"] .pl-turn').evaluate("e => e.scrollIntoView({block: 'center'})"); tb = await pg.locator('.pl-st[data-st="0"] .pl-turn').bounding_box()
    await pg.mouse.move(tb['x'] + tb['width'] * .8, tb['y'] + tb['height'] / 2); await pg.mouse.down(); await pg.mouse.move(tb['x'] + tb['width'] * .1, tb['y'] + tb['height'] / 2, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(150)
    ok((await state(pg))['dir'][0] == (before + 1) % (D + 1), f'{lab}: a left swipe turns the statue one step', [before, (await state(pg))['dir'][0]])
    for i, v in enumerate(tt): await turn_to(pg, i, v, D, lab)
    if kind == 'mixed': ok(0 < sum(1 for v in tt if v != D) < n, f'{lab}: the board mixes truthful and lying statues', tt)
    if kind == 'mix':
        ok(await pg.evaluate("() => { const P = window.__test.pz.P, v = drVals(P, P.t); return v[P.t] === true && v.some((x, i) => i !== P.t && !x) && P.rule.ok(v, P.t) }"), f'{lab}: mix = the treasure sign is true and at least one trap sign is false')
        ok(await pg.evaluate("() => /١ على الأقل/.test(document.querySelector('.pl-rule').innerText)"), f'{lab}: the mix strip shows «١ على الأقل» on the traps')
    poses = await pg.evaluate("() => [...document.querySelectorAll('.pl-pose')].map(i => i.src.split('/').pop())")
    ok(all(('statue_back' in p) == (v == D) for p, v in zip(poses, tt)), f'{lab}: liars show the back pose, truthful statues face a door', poses)
    ov = await overflow(pg); ok(not ov, f'{lab}: no horizontal overflow', ov); ok(await clipped(pg) == 0, f'{lab}: no clipped text')
    if SHOTS and w == 390: await pg.screenshot(path=f'{SHOTS}/pz_door_{kind}_390.png', full_page=True)
    ok(await nothing_open(pg), f'{lab}: nothing open before the winning «ثبّت»')
    await tap(pg, '#plgo'); ok(await result(pg) is True, f'{lab}: right key + all directions wins')

async def pliar(pg, w, lv):
    lab = f'pz_pliar@{w}'
    st0 = await pg.evaluate("() => JSON.stringify([txStageOf('pz_pliar'), pState().done.pz_pliar || 0])")
    await start(pg, 'pz_pliar')  # the player's own stage, so the win is recorded (replays record nothing)
    ok(await pg.evaluate("() => window.__test.pz.round() === 0"), f'{lab}: opens on the door entrance')
    s = await state(pg); ok(all(d == -1 for d in s['dir']) and s['keyAt'] == -1, f'{lab}: entrance starts neutral')
    I = await pg.evaluate("() => { const I = window.__test.pz.I; return { n: I.n, t: I.t } }")
    await drag(pg, '.pl-tray [data-tok="key"]', f'.pl-door[data-door="{I["t"]}"]')
    tt = await pg.evaluate("(t) => drVals(window.__test.pz.I, t).map(v => v ? t : window.__test.pz.I.n)", I['t'])
    for i, v in enumerate(tt): await turn_to(pg, i, v, I['n'], lab)
    await tap(pg, '#plgo'); await pg.wait_for_timeout(1300)
    ok(await pg.evaluate("() => window.__test.pz.round() === 1") and not await pg.evaluate("() => !!document.querySelector('#stage .res')"), f'{lab}: entrance opens the hall without a result screen')
    ok(await pg.evaluate("() => JSON.stringify([txStageOf('pz_pliar'), pState().done.pz_pliar || 0])") == st0, f'{lab}: the entrance records no win')
    s = await state(pg); ok(all(d == -1 for d in s['dir']), f'{lab}: the hall starts neutral')
    P = await pg.evaluate("() => { const P = window.__test.pz.P; return { D: P.D, k: P.k, tg: P.sol.tr.map(t => t ? P.sol.door : P.D), kinds: P.sts.map(s => s.t) } }")
    ok(await pg.evaluate("(k) => [...document.querySelectorAll('.pl-plaque')].map(e => e.dataset.k).join() === k.join()", P['kinds']), f'{lab}: hall inscriptions drawn from pqMake.sts')
    ok(await pg.evaluate("(D) => document.querySelectorAll('.pl-door').length === D", P['D']), f'{lab}: {P["D"]} doors from pqMake.D')
    # a wrong set first: everybody faces the solution door (pqMake never makes every statue truthful)
    for i in range(P['k']): await turn_to(pg, i, P['tg'][0] if P['tg'][0] < P['D'] else 0, P['D'], lab)
    await tap(pg, '#plgo'); ok(await result(pg, 800) is None, f'{lab}: a wrong set of directions is refused')
    for i, v in enumerate(P['tg']): await turn_to(pg, i, v, P['D'], lab)
    face = await pg.evaluate("() => [...document.querySelectorAll('.pl-face')].map(e => e.textContent)")
    ok(all(('ظهره' in f) == (v == P['D']) for f, v in zip(face, P['tg'])), f'{lab}: each statue shows the door it faces or its back', face)
    ov = await overflow(pg); ok(not ov, f'{lab}: no horizontal overflow', ov); ok(await clipped(pg) == 0, f'{lab}: no clipped text')
    if SHOTS and w == 390: await pg.screenshot(path=f'{SHOTS}/pz_pliar_hall_390.png', full_page=True)
    await tap(pg, '#plgo'); ok(await result(pg) is True, f'{lab}: the hall wins')
    await pg.wait_for_timeout(700); st1 = await pg.evaluate("() => JSON.stringify([txStageOf('pz_pliar'), pState().done.pz_pliar || 0])")
    ok(st1 != st0, f'{lab}: one palace stage recorded', [st0, st1])
    await pg.reload(); await pg.wait_for_timeout(2000); await pg.evaluate("async()=>{const p=document.querySelector('.mpc[data-m=main]');if(p&&p.getClientRects().length)p.click();tab('puz');await mindlabPlayLayers.start()}"); await pg.wait_for_function("()=>window.mindlabPlayLayers?.ready===true", timeout=45000)
    ok(await pg.evaluate("() => JSON.stringify([txStageOf('pz_pliar'), pState().done.pz_pliar || 0])") == st1, f'{lab}: kept after reload')

async def main():
    async with async_playwright() as p:
        b = await (p.webkit.launch() if ENGINE == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']))
        for w in (320, 390, 430):
            ctx = await b.new_context(viewport={'width': w, 'height': 820}, has_touch=True); await ctx.add_init_script('window.__test={}')
            pg, errs = await boot(ctx)
            if w == 320:
                g = await pg.evaluate(GEN)
                ok(g['notUnique'] == 0, f'drMake: one treasure door on every board ({g["total"]} boards, 8 levels)', g['notUnique'])
                ok(sorted(g['rules']) == sorted(['one', 'onef', 'two', 'lady', 'none', 'mix']), 'drMake: all six rules occur', sorted(g['rules']))
                ok(sorted(g['kinds']) == sorted(['here', 'nothere', 'at', 'notat', 'side', 'either', 'liar', 'true']), 'drMake: all eight inscription kinds occur', sorted(g['kinds']))
                ok([g['n'][str(l)] if str(l) in g['n'] else g['n'][l] for l in range(1, 9)] == [3, 3, 3, 4, 4, 4, 5, 5], 'drMake: door counts per level unchanged', g['n'])
                # every level renders and wins through the board (hook moves, real «ثبّت» click)
                for lv in range(1, 9):
                    await start(pg, 'pz_door', lv, 40 + lv)
                    n = await pg.evaluate("() => window.__test.pz.P.n")
                    ok(await pg.evaluate("(n) => document.querySelectorAll('.pl-door').length === n", n), f'pz_door lv{lv}: board drawn')
                    await pg.evaluate("() => window.__test.pz.set()"); await tap(pg, '#plgo'); ok(await result(pg) is True, f'pz_door lv{lv}: solved board wins')
            for kind in ('regression', 'mixed', 'mix'): await door_case(pg, w, kind)
            lv0 = await pg.evaluate("() => pzLv('pz_door')")
            await pg.reload(); await pg.wait_for_timeout(2000); await pg.evaluate("async()=>{const p=document.querySelector('.mpc[data-m=main]');if(p&&p.getClientRects().length)p.click();tab('puz');await mindlabPlayLayers.start()}"); await pg.wait_for_function("()=>window.mindlabPlayLayers?.ready===true", timeout=45000); ok(await pg.evaluate("() => pzLv('pz_door')") == lv0, f'pz_door@{w}: level kept after reload')
            ok(not errs, f'pz_door@{w} no page errors', errs); await ctx.close()
            # pz_pliar in its own context (fresh profile → its own first stage)
            ctx = await b.new_context(viewport={'width': w, 'height': 820}, has_touch=True); await ctx.add_init_script('window.__test={}')
            pg, errs = await boot(ctx); await pliar(pg, w, 0)
            ok(not errs, f'pz_pliar@{w} no page errors', errs); await ctx.close()
        await b.close()
    print(f'{ENGINE}: {len(checks)} passed, {len(problems)} failed'); [print('  FAIL', x) for x in problems]
    return 1 if problems or not checks else 0
sys.exit(asyncio.run(main()))
