"""iPhone silent-switch choice in «مستواي»: shown only where navigator.audioSession exists (Safari 16.4+, faked
here), switches the session between 'ambient' (muted by the switch) and 'playback' (heard), survives a reload.
Usage: python3 qa/browser/silent_switch.py URL"""
import asyncio, sys
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
FAKE = "Object.defineProperty(navigator,'audioSession',{value:{type:'auto'},configurable:true})"
fails, passed = [], 0


def ok(c, label):
    global passed
    if c: passed += 1
    else: fails.append(label); print('FAIL', label, flush=True)


async def me(pg):
    await pg.goto(URL); await pg.wait_for_timeout(1200)
    if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]'); await pg.wait_for_timeout(300)
    await pg.evaluate("()=>tab('me')"); await pg.wait_for_timeout(500)


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        c = await b.new_context(viewport={'width': 390, 'height': 844}); pg = await c.new_page()
        await me(pg)
        ok(await pg.locator('[data-silent]').count() == 0, 'no silent-switch choice where the browser cannot change it')
        await c.close()
        c = await b.new_context(viewport={'width': 390, 'height': 844}); await c.add_init_script(FAKE); pg = await c.new_page()
        await me(pg)
        ok(await pg.locator('[data-silent]').count() == 2, 'choice shown on a browser with audioSession')
        ok(await pg.evaluate("navigator.audioSession.type") == 'ambient', 'default: muted by the silent switch (ambient)')
        ok(await pg.locator('[data-silent="false"].on').count() == 1, 'default chip is «لا يشتغل»')
        await pg.click('[data-silent="true"]'); await pg.wait_for_timeout(300)
        ok(await pg.evaluate("navigator.audioSession.type") == 'playback', 'يشتغل → playback')
        ok(await pg.evaluate("S.st.soundOnSilent===true"), 'choice saved')
        await me(pg)
        ok(await pg.evaluate("navigator.audioSession.type") == 'playback', 'choice applied again after reload')
        ok(await pg.locator('[data-silent="true"].on').count() == 1, 'chip shows the saved choice')
        await pg.click('[data-silent="false"]'); await pg.wait_for_timeout(300)
        ok(await pg.evaluate("navigator.audioSession.type") == 'ambient', 'لا يشتغل → ambient')
        await c.close(); await b.close()
    print(f'chromium: {passed} passed, {len(fails)} failed')
    sys.exit(1 if fails else 0)

asyncio.run(main())
