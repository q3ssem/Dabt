"""Kids section: every kid game opens from the kid profile, starts, takes taps, closes — no JS errors, no broken
images, start button reachable without scrolling, nothing wider than the screen.
Usage: python3 qa/browser/kids_smoke.py URL [ENGINE=webkit] [SIZES=390x844,320x640]"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from player_openings import dismiss_opening

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
ENGINE = os.environ.get('ENGINE', 'chromium')
SIZES = [tuple(map(int, s.split('x'))) for s in os.environ.get('SIZES', '390x844,320x640').split(',')]
fails, passed = [], 0


def ok(c, label):
    global passed
    if c: passed += 1
    else: fails.append(label); print('FAIL', label, flush=True)


async def main():
    async with async_playwright() as p:
        b = await getattr(p, ENGINE).launch()
        for w, h in SIZES:
            c = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=ENGINE == 'chromium', has_touch=True, locale='ar-SA')
            pg = await c.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
            await pg.goto(URL); await pg.wait_for_timeout(1200)
            if await pg.locator('.mpc[data-m=kid]').count(): await pg.click('.mpc[data-m=kid]'); await pg.wait_for_timeout(500)
            await pg.evaluate("()=>{const k=kidSt();if(!k.list.length){k.list.push({id:'qa1',name:'تجربة',av:'🦁',age:7});k.active='qa1';S.save();}}")
            await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
            ids = await pg.evaluate("()=>KID_GAMES.map(g=>typeof g==='string'?g:g.id).filter(id=>GM[id])")
            ok(len(ids) >= 20, f'{w}: kid games listed ({len(ids)})')
            for g in ids:
                lab = f'{g}@{w}x{h}'; n = len(errs)
                try:
                    await pg.evaluate("g=>startRun([g])", g); await pg.wait_for_timeout(500)
                    go = await pg.evaluate("()=>{const g=document.querySelector('#stage #go');if(!g)return null;const r=g.getBoundingClientRect();return [r.top,r.bottom,innerHeight]}")
                    if go: ok(go[1] <= go[2] + 1, f'{lab}: start button on screen without scrolling ({round(go[1])} ≤ {go[2]})')
                    if await pg.locator('#stage #go').count(): await pg.locator('#stage #go').click()
                    await dismiss_opening(pg, 800)
                    for _ in range(40):
                        if not await pg.locator('#stage .cd').count(): break
                        await pg.wait_for_timeout(100)
                    await pg.wait_for_timeout(500)
                    # Use the browser's actual hit-testing, scrolling and pointer events.
                    # Dispatching MouseEvent from page.evaluate bypasses occlusion and
                    # is not proof that a child can touch a game control.
                    controls = pg.locator('#stage button:not([disabled]), #stage [role="button"], #stage [data-i], #stage .cell')
                    native_taps = 0
                    for i in range(min(await controls.count(), 20)):
                        if native_taps >= 1: break
                        target = controls.nth(i)
                        try:
                            if await target.get_attribute('id', timeout=1300) == 'pzq': continue
                            if not await target.is_visible(): continue
                            box = await target.bounding_box()
                            if not box or box['width'] < 6 or box['height'] < 6: continue
                            await target.click(timeout=1300)
                            native_taps += 1
                            await pg.wait_for_timeout(90)
                        except Exception:
                            # A covered or non-interactive tile is not evidence
                            # of real touch acceptance; try another target.
                            continue
                    ok(native_taps > 0, f'{lab}: at least one real Playwright tap accepted')
                    wide = await pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth")
                    ok(wide <= 1, f'{lab}: nothing wider than the screen ({wide}px)')
                    broken = await pg.evaluate("()=>[...document.querySelectorAll('#play img')].filter(i=>i.complete&&i.getAttribute('src')&&i.naturalWidth===0).map(i=>i.getAttribute('src')).slice(0,3)")
                    ok(not broken, f'{lab}: no broken images {broken}')
                    await pg.evaluate("()=>{try{closePlay()}catch(e){}}"); await pg.wait_for_timeout(250)
                except Exception as e:
                    ok(False, f'{lab}: {str(e)[:120]}')
                ok(len(errs) == n, f'{lab}: no JS errors {errs[n:][:2]}')
            await c.close()
        await b.close()
    print(f'{ENGINE}: {passed} passed, {len(fails)} failed')
    sys.exit(1 if fails else 0)

asyncio.run(main())
