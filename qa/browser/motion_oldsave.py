"""motion-batch-1 — old saves and the Atheran unlock.
1) A save made on the previous build (main 5.5.28, OLD url) — palace progressed with pz_door and pz_pliar won, side journey
   progress — is loaded into this build: palace progress, stars, wins, levels and the side-journey save read back unchanged.
2) With every palace station done except pz_pliar, Atheran stays closed; winning pz_pliar on the new statues screen opens it.
Usage: python3 qa/browser/motion_oldsave.py NEW_URL OLD_URL   (ENGINE=webkit)"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from player_openings import dismiss_opening
NEW, OLD = sys.argv[1], sys.argv[2]; ENGINE = os.environ.get('ENGINE', 'chromium')
checks, problems = [], []
def ok(c, label, extra=None):
    if os.environ.get('FORCE_FAIL') and label == os.environ['FORCE_FAIL']: c = False  # proves a failing check gives a non-zero exit
    (checks if c else problems).append(label if c else f'{label} :: {extra}'); return c
SNAP = """() => { const t = txState(), a = pState(); return { prog: a.prog, done: a.done, stars: a.stars || {}, arts: a.arts, aopen: aOpen(),
  lv: Object.fromEntries(['pz_door', 'pz_pliar', 'pz_aarch', 'pz_plib', 'pz_untangle'].map(g => [g, pzLv(g)])), a5: JSON.stringify(t.a5 && t.a5.stars || {}),
  ex10: localStorage.getItem('mindlab:expedition10:v1') } }"""
async def boot(ctx, url):
    pg = await ctx.new_page(); await pg.goto(url); await pg.wait_for_timeout(2500); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
    if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
    return pg
async def start(pg, gid):
    await pg.reload(); await pg.wait_for_timeout(2000); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
    if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
    await pg.evaluate("(g) => startRun([g])", gid); await pg.wait_for_timeout(300)
    if await pg.locator('#stage #go').count(): await pg.click('#stage #go')
    await dismiss_opening(pg, 1500)
    await pg.wait_for_timeout(2400)
async def wait_res(pg):
    for _ in range(30):
        if await pg.evaluate("() => !!document.querySelector('#stage .res')"): return True
        await pg.wait_for_timeout(200)
    return False
async def main():
    async with async_playwright() as p:
        b = await (p.webkit.launch() if ENGINE == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']))
        # ---- 1. make the save on the old build
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True); await ctx.add_init_script('window.__test={}')
        done = {f'ml10_{i:02d}': True for i in range(1, 9)}
        await ctx.add_init_script("if(!localStorage.getItem('mindlab:expedition10:v1'))localStorage.setItem('mindlab:expedition10:v1'," + json.dumps(json.dumps({'done': done, 'stars': {'ml10_07': 2}, 'best': {}, 'totalStars': 20}, ensure_ascii=False)) + ")")
        pg = await boot(ctx, OLD)
        await pg.evaluate("() => { const a = pState(); a.prog = PW.findIndex(w => w.id === 'pz_pliar'); a.done = Object.fromEntries(PW.slice(0, a.prog).filter(w => w.id).map(w => [w.id, 1])); S.save() }")
        await start(pg, 'pz_door'); t = await pg.evaluate("() => window.__test.pz.P.t"); await pg.click(f'.drd[data-d="{t}"]'); await wait_res(pg)
        for _ in range(3):  # a palace station has three stages
            await start(pg, 'pz_pliar'); await pg.evaluate("() => { const h = window.__test.pz; h.set(h.P.sol.tr.map(x => !x), h.P.sol.door); h.enter() }"); await wait_res(pg); await pg.wait_for_timeout(600)
        await pg.wait_for_timeout(800); old = await pg.evaluate(SNAP)
        store = await pg.evaluate("() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))"); await ctx.close()
        ok(old['done'].get('pz_pliar') == 1, 'old build: pz_pliar won (setup)', old['done'])
        # ---- 2. open that save on the new build
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True); await ctx.add_init_script('window.__test={}')
        await ctx.add_init_script("if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded',1);const s=" + json.dumps(store, ensure_ascii=False) + ";localStorage.clear();for(const k in s)localStorage.setItem(k,s[k])}")
        pg = await boot(ctx, NEW); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        new = await pg.evaluate(SNAP)
        for k in ('prog', 'done', 'stars', 'arts', 'aopen', 'lv', 'a5', 'ex10'): ok(new[k] == old[k], f'old save → new build: {k} unchanged', [old[k], new[k]])
        await pg.reload(); await pg.wait_for_timeout(2200); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000); again = await pg.evaluate(SNAP)
        ok(again == new, 'old save survives a reload on the new build', [new, again])
        # ---- 3. Atheran opens after the palace, through pz_pobs (two maps) and pz_pliar (statues) on the new boards
        await pg.evaluate("() => { const a = pState(); a.done = Object.fromEntries(PW.filter(w => w.id && w.id !== 'pz_pliar' && w.id !== 'pz_pobs').map(w => [w.id, 1])); a.prog = PW.findIndex(w => w.id === 'pz_pliar'); S.save() }")
        ok(not await pg.evaluate("() => aOpen()"), 'Atheran closed while pz_pobs and pz_pliar are not done')
        for st in range(3):
            await start(pg, 'pz_pobs'); await pg.evaluate("() => window.__test.pz.solve()"); await wait_res(pg); await pg.wait_for_timeout(700)
        ok(await pg.evaluate("() => !!pState().done.pz_pobs"), 'pz_pobs (three stages on the two-layer board) counts for the palace')
        ok(not await pg.evaluate("() => aOpen()"), 'Atheran still closed: pz_pliar is left')
        for st in range(3):
            await start(pg, 'pz_pliar')
            ok(not await pg.evaluate("() => aOpen()"), f'Atheran still closed before stage {st + 1} of pz_pliar')
            for r in range(2):  # the door entrance, then the pqMake hall (priority-7 R4 board)
                await pg.evaluate("() => window.__test.pz.set()"); await pg.click('#plgo'); await pg.wait_for_timeout(1300)
            await wait_res(pg); await pg.wait_for_timeout(600)
        ok(await pg.evaluate("() => !!pState().done.pz_pliar"), 'pz_pliar won on the statues screen counts for the palace')
        ok(await pg.evaluate("() => aOpen()"), 'Atheran opens after the palace is completed')
        st1 = await pg.evaluate("() => JSON.stringify([pState().prog, PW.length, Object.keys(pState().done).length, localStorage.getItem('miran:v2').length])")
        await pg.reload(); await pg.wait_for_timeout(2200); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
        st2 = await pg.evaluate("() => JSON.stringify([pState().prog, PW.length, Object.keys(pState().done).length, localStorage.getItem('miran:v2').length])")
        ok(await pg.evaluate("() => aOpen()"), 'Atheran still open after reload', [st1, st2])
        ok(not errs, 'no page errors', errs); await b.close()
    print(f'{ENGINE}: {len(checks)} passed, {len(problems)} failed'); [print('  FAIL', x) for x in problems]
    return 1 if problems or not checks else 0
sys.exit(asyncio.run(main()))
