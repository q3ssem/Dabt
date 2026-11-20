"""One-row HUD on narrow phones: give up / sound move into the ⓘ sheet only when the row would wrap, and still work there.
Usage: python3 qa/browser/compact_hud.py URL"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import open_game

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
CASES = [('pz_river', 320, 640), ('pz_river', 390, 844), ('pz_rush', 320, 640), ('pz_lock', 320, 640), ('pz_river', 844, 390)]
fails, passed = [], 0


def ok(cond, label):
    global passed
    if cond: passed += 1
    else: fails.append(label); print('FAIL', label, flush=True)


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for g, w, h in CASES:
            lab = f'{g}@{w}x{h}'
            c = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, locale='ar-SA')
            pg = await c.new_page(); await pg.goto(URL); await pg.wait_for_timeout(1000)
            if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
            await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
            await open_game(pg, g); await pg.wait_for_timeout(900)
            hud = await pg.evaluate("()=>Math.round(document.querySelector('#stage .pzhud').getBoundingClientRect().height)")
            ok(hud <= 46, f'{lab}: HUD is one row ({hud}px)')
            moved = await pg.evaluate("()=>[...document.querySelectorAll('#stage .fit-tools .fit-in-sheet')].map(b=>b.id||b.className.split(' ')[0])")
            sizes = await pg.evaluate("()=>[...document.querySelectorAll('#stage .pzhud button')].filter(b=>b.offsetParent).map(b=>{const r=b.getBoundingClientRect();return Math.min(r.width,r.height)})")
            ok(all(s >= 43.5 for s in sizes), f'{lab}: visible HUD buttons keep 44px targets {sizes}')
            if w >= 430: ok(not moved, f'{lab}: nothing moved on a wide screen ({moved})')
            if not moved: await c.close(); continue
            await pg.click('#stage .fit-info'); await pg.wait_for_timeout(300)
            if '#pzq' in [f'#{m}' for m in moved]:
                give = pg.locator('.fit-sheet .fit-sh-give'); ok(await give.count() == 1, f'{lab}: give-up is in the sheet')
                await give.click(); await pg.wait_for_timeout(200)
                ok(await pg.evaluate("()=>document.querySelector('#pzq').classList.contains('arm')"), f'{lab}: first tap arms the engine give-up')
                ok('متأكد' in (await give.inner_text()), f'{lab}: sheet asks for the second tap')
            if 'fit-sound' in moved:
                snd = pg.locator('.fit-sheet .fit-sh-sound'); before = await pg.evaluate('S.st.mute')
                await snd.click(); await pg.wait_for_timeout(150)
                ok(await pg.evaluate('S.st.mute') != before, f'{lab}: sound toggle in the sheet changes the setting')
                await snd.click(); await pg.wait_for_timeout(150)
                ok(await pg.evaluate('S.st.mute') == before, f'{lab}: sound toggle restores the setting')
            if '#pzq' in [f'#{m}' for m in moved]:
                await pg.locator('.fit-sheet .fit-sh-give').click(); await pg.wait_for_timeout(700)
                ok(not await pg.locator('.fit-sheet').count(), f'{lab}: second tap gives up and closes the sheet')
            await c.close()
        await b.close()
    print(f'chromium: {passed} passed, {len(fails)} failed')
    sys.exit(1 if fails else 0)

asyncio.run(main())
