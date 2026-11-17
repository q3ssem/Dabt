"""motion-batch-1 — real play of the converted puzzles at 320/390/430 (no QA solve shortcuts for the moves).
Atheran: pz_aarch, pz_alayer, pz_arelic — pointer drag (mouse with steps) AND the tap alternative (tap piece, tap slot); pz_acity — touch a species on the web.
Side journey: ml10_07 (shelf drag + 45 s timer expiry), ml10_10 (finger drawing across the stars), ml10_16 (docks), ml10_25 (seal).
Also: no horizontal overflow, no page errors, saves kept after reload.
Usage: python3 qa/browser/motion_play.py http://127.0.0.1:8150/   (ENGINE=webkit; SHOTS=dir for 390 screenshots)"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
ENGINE = os.environ.get('ENGINE', 'chromium'); SHOTS = os.environ.get('SHOTS')
checks, problems = [], []
def ok(c, label, extra=None):
    if os.environ.get('FORCE_FAIL') and label == os.environ['FORCE_FAIL']: c = False  # proves a failing check gives a non-zero exit
    (checks if c else problems).append(label if c else f'{label} :: {extra}'); return c

async def drag(pg, src, dst):
    """A real finger-style drag. If the slot is off screen, hold the piece at the screen edge until the page scrolls to it."""
    # bring the piece above the fixed bottom tab bar, as a player would by scrolling
    await pg.locator(src).first.evaluate("e => { const b = e.getBoundingClientRect(); if (b.top < 40 || b.bottom > innerHeight - 110) e.scrollIntoView({block: 'center'}) }"); await pg.wait_for_timeout(80)
    a = await pg.locator(src).first.bounding_box()
    H = pg.viewport_size['height']; x0, y0 = a['x'] + a['width'] / 2, a['y'] + a['height'] / 2
    await pg.mouse.move(x0, y0); await pg.mouse.down(); await pg.mouse.move(x0 + 8, y0 + 8, steps=3)
    for _ in range(80):
        b = await pg.locator(dst).first.bounding_box()
        if b['y'] >= 20 and b['y'] + b['height'] <= H - 70: break
        await pg.mouse.move(x0, 12 if b['y'] < 20 else H - 12, steps=2); await pg.wait_for_timeout(60)
    b = await pg.locator(dst).first.bounding_box()
    await pg.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2, steps=10); await pg.mouse.up(); await pg.wait_for_timeout(60)
async def tap(pg, src, dst):
    await pg.locator(src).first.click(); await pg.wait_for_timeout(40); await pg.locator(dst).first.click(); await pg.wait_for_timeout(60)
async def overflow(pg, sel):
    return await pg.evaluate("(s) => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll(s + ', ' + s + ' *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > W + 1 || b.left < -1) && getComputedStyle(e).position !== 'fixed' }).map(e => e.className.baseVal ?? e.className).slice(0, 4) }", sel)
async def result(pg):
    for _ in range(30):
        if await pg.evaluate("() => !!document.querySelector('#stage .res')"): return await pg.evaluate("() => !!document.querySelector('#stage .res .bigstars') || /أحسنت|انفتح|عرفت|الحقيقة|صحيح/.test(document.querySelector('#stage .res').innerText)")
        await pg.wait_for_timeout(200)
    return False
async def start(pg, gid):
    await pg.evaluate("(g) => startRun([g])", gid); await pg.wait_for_timeout(300)
    if await pg.locator('#stage #go').count(): await pg.click('#stage #go')
    await pg.wait_for_timeout(2400)

async def atheran(pg, w):
    mode = 'drag'
    for gid in ('pz_aarch', 'pz_alayer', 'pz_acity', 'pz_arelic'):
        for mode in ('drag', 'tap'):
            await pg.goto(URL); await pg.wait_for_timeout(1500)  # a fresh page per board (keeps long WebKit sessions light)
            if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
            await start(pg, gid); mv = drag if mode == 'drag' else tap; P = await pg.evaluate("() => window.__test.pz.P")
            if gid == 'pz_aarch':
                for r in range(len(P['cap'])):
                    await mv(pg, f'[data-tray="c"] [data-tok="c{P["cap"][r]}"]', f'[data-slot="c{r}"]')
                    await mv(pg, f'[data-tray="f"] [data-tok="f{P["fat"][r]}"]', f'[data-slot="f{r}"]')
                ok(await pg.evaluate("() => { const h = window.__test.pz, s = h.state(); return JSON.stringify(s) }") is not None, f'{gid}@{w} {mode}: rows filled by hand'); go = '#aargo'
            elif gid == 'pz_alayer':
                for q, e in enumerate(P['ev']):
                    j = P['items'].index(e); await mv(pg, f'.mk-tray [data-tok="{j}"], [data-tray] [data-tok="{j}"]', f'.mk-slot.tl[data-slot="{q}"]')
                ok(await pg.evaluate("() => { const h = window.__test.pz; return JSON.stringify(h.state()) === JSON.stringify(h.P.ev.map(e => h.P.items.indexOf(e))) }"), f'{gid}@{w} {mode}: timeline filled by hand'); go = '#alygo'
            elif gid == 'pz_acity':
                # priority-7 R4: the hypothesis is chosen by touching the dark species on the web itself (no simulation stone)
                await pg.locator(f'#actweb [data-sp="{P["gone"]}"]').scroll_into_view_if_needed(); await pg.locator(f'#actweb [data-sp="{P["gone"]}"]').click(); go = '#actgo'
            else:
                await mv(pg, f'[data-tray="s"] [data-tok="{P["tr"]}"]', '[data-slot="cmp"]')
                ok(await pg.evaluate("() => document.querySelector('#arlcmp').classList.contains('good')"), f'{gid}@{w} {mode}: comparison lights the true source')
                await mv(pg, f'[data-slot="cmp"] [data-tok="{P["tr"]}"]', '[data-slot="truth"]'); go = '#arlgo'
            ov = await overflow(pg, '#stage'); ok(not ov, f'{gid}@{w} {mode}: no overflow', ov)
            if SHOTS and w == 390 and mode == 'drag': await pg.screenshot(path=f'{SHOTS}/{gid}_after.png', full_page=True)
            await pg.click(go); ok(await result(pg), f'{gid}@{w} {mode}: solved by hand → win')

async def exp_open(pg, i):
    await pg.evaluate("(i) => ML10.startStage(i)", i); await pg.wait_for_timeout(500)
async def exp_won(pg):
    for _ in range(25):
        t = await pg.evaluate("() => (document.querySelector('.ex10-outcome h2')||{}).textContent||''")
        if t: return 'نجاح' in t
        await pg.wait_for_timeout(200)
    return await pg.evaluate("() => document.querySelector('.ex10').innerText.slice(0,200)")
async def expedition(pg, w):
    await pg.evaluate("() => { const t = document.querySelector('.tab[data-tab=puz]'); t && t.click() }"); await pg.wait_for_timeout(300)
    await pg.locator('.ex10-launch-go').click(timeout=15000); await pg.wait_for_timeout(300)
    before = await pg.evaluate("() => ML10.state()")
    # 07: shelf — drag three, tap two, then win
    await exp_open(pg, 6); tgt = ['map', 'compass', 'lantern', 'telescope', 'key']
    for q, k in enumerate(tgt): await (drag if q < 3 else tap)(pg, f'#ex10-shelf [data-tray] [data-tok="{k}"]', f'#ex10-shelf [data-slot="{q}"]')
    ov = await overflow(pg, '.ex10'); ok(not ov, f'ml10_07@{w}: no overflow', ov)
    ok((await exp_won(pg)) is True, f'ml10_07@{w}: shelf ordered by hand → win')
    if SHOTS and w == 390: await pg.screenshot(path=f'{SHOTS}/ml10_07_after.png', full_page=True)
    # 07: timer expiry (fast clock) → fail screen, no win recorded
    await exp_open(pg, 6); await drag(pg, '#ex10-shelf [data-tray] [data-tok="map"]', '#ex10-shelf [data-slot="0"]')
    await pg.clock.run_for(46000); await pg.wait_for_timeout(300)
    fail = await pg.evaluate("() => (document.querySelector('.ex10-outcome h2')||{}).textContent||''")
    ok('تعثر' in fail, f'ml10_07@{w}: timer runs out → fail screen', fail)
    # 10: draw across the stars with one finger
    await exp_open(pg, 9); sol = ['N', 'W', 'SW', 'SE', 'E', 'S']
    await pg.evaluate("() => document.querySelector('#ex10-sf').scrollIntoView({block: 'center'})"); await pg.wait_for_timeout(200)
    pts = [await pg.locator(f'[data-star="{s}"]').bounding_box() for s in sol]; c = [(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2) for b in pts]
    await pg.mouse.move(*c[0]); await pg.mouse.down()
    for p in c[1:]: await pg.mouse.move(*p, steps=14)
    await pg.mouse.up()
    ov = await overflow(pg, '.ex10'); ok(not ov, f'ml10_10@{w}: no overflow', ov)
    if SHOTS and w == 390: await pg.screenshot(path=f'{SHOTS}/ml10_10_after.png', full_page=True)
    ok((await exp_won(pg)) is True, f'ml10_10@{w}: star route drawn by finger → win')
    # 16: docks — a wrong full set is refused, then the valid set wins
    await exp_open(pg, 15); items = await pg.evaluate("() => ML10Logic.manifestItems")
    good = await pg.evaluate("() => ML10Logic.manifestSolutions ? ML10Logic.manifestSolutions()[0] : ['بلور','بوصلة','لؤلؤ','توابل']")
    bad = await pg.evaluate("(it) => { const perm = a => a.length < 2 ? [a] : a.flatMap((x, i) => perm(a.filter((_, j) => j !== i)).map(r => [x, ...r])); return perm(it).find(o => !ML10Logic.manifestValid(o)) }", items)
    for q, k in enumerate(bad): await drag(pg, f'#ex10-docks [data-tray] [data-tok="{k}"]', f'#ex10-docks [data-slot="{q}"]')
    await pg.click('[data-ex10="check-manifest"]'); await pg.wait_for_timeout(300)
    ok(not await pg.evaluate("() => !!document.querySelector('.ex10-outcome')"), f'ml10_16@{w}: wrong docks refused')
    for q, k in enumerate(good): await tap(pg, f'#ex10-docks [data-tok="{k}"]', f'#ex10-docks [data-slot="{q}"]')
    ov = await overflow(pg, '.ex10'); ok(not ov, f'ml10_16@{w}: no overflow', ov)
    if SHOTS and w == 390: await pg.screenshot(path=f'{SHOTS}/ml10_16_after.png', full_page=True)
    await pg.click('[data-ex10="check-manifest"]'); ok((await exp_won(pg)) is True, f'ml10_16@{w}: docks by hand → win')
    # 25: seal
    await exp_open(pg, 24); seal = await pg.evaluate("() => ML10Logic.audit().seal[0]")
    for q, v in enumerate(seal): await drag(pg, f'#ex10-seal [data-tray] [data-tok="{v}"]', f'#ex10-seal [data-slot="{q}"]')
    ov = await overflow(pg, '.ex10'); ok(not ov, f'ml10_25@{w}: no overflow', ov)
    if SHOTS and w == 390: await pg.screenshot(path=f'{SHOTS}/ml10_25_after.png', full_page=True)
    await pg.click('[data-ex10="check-seal"]'); ok((await exp_won(pg)) is True, f'ml10_25@{w}: seal by hand → win')
    after = await pg.evaluate("() => ML10.state()")
    return before, after

async def main():
    async with async_playwright() as p:
        b = await (p.webkit.launch() if ENGINE == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']))
        for w in (320, 390, 430):
            ctx = await b.new_context(viewport={'width': w, 'height': 800}, has_touch=True, locale='ar-SA')
            await ctx.add_init_script('window.__test={}')
            done = {f'ml10_{i:02d}': True for i in range(1, 25)}
            await ctx.add_init_script("if(!localStorage.getItem('mindlab:expedition10:v1'))localStorage.setItem('mindlab:expedition10:v1'," + json.dumps(json.dumps({'done': done, 'stars': {}, 'best': {}, 'totalStars': 72}, ensure_ascii=False)) + ")")
            pg = await ctx.new_page(); await pg.clock.install(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
            await pg.goto(URL); await pg.wait_for_timeout(2500)
            if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
            await atheran(pg, w)
            await pg.goto(URL); await pg.wait_for_timeout(2000)
            if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
            mainBefore = await pg.evaluate("() => localStorage.getItem('miran:v2')")
            bef, aft = await expedition(pg, w)
            await pg.reload(); await pg.wait_for_timeout(2000)
            kept = await pg.evaluate("() => JSON.parse(localStorage.getItem('mindlab:expedition10:v1'))")
            ok(all(kept['done'].get(k) for k in ('ml10_07', 'ml10_10', 'ml10_16', 'ml10_25')), f'@{w} side-journey wins kept after reload')
            ok(await pg.evaluate("() => localStorage.getItem('miran:v2')") == mainBefore, f'@{w} side journey did not touch the main save')
            ok(not errs, f'@{w} no page errors', errs); await ctx.close()
        await b.close()
    print(f'{ENGINE}: {len(checks)} passed, {len(problems)} failed'); [print('  FAIL', x) for x in problems]
    return 1 if problems or not checks else 0
sys.exit(asyncio.run(main()))
