"""Engine pilot: عبور النهر drawn by PixiJS 8 through the scene kit (scenes/pz_river.json). Checks the WebGL scene starts, the DOM boat (passengers, drop slot)
follows the Pixi boat, a full solution still wins, the big cross button sits under the boat, no JS errors,
and the open time with Pixi vs the DOM scene.
Usage: python3 qa/browser/river_pixi.py URL   (ENGINE=webkit)"""
import asyncio, json, os, sys, time
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import open_game

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
ENGINE = os.environ.get('ENGINE', 'chromium')
fails, passed, info = [], 0, {}


def ok(c, label):
    global passed
    if c: passed += 1
    else: fails.append(label); print('FAIL', label, flush=True)


async def main():
    async with async_playwright() as p:
        b = await getattr(p, ENGINE).launch()
        for w, h in [(390, 844), (320, 640), (844, 390)]:
            lab = f'{w}x{h}'
            c = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=ENGINE == 'chromium', has_touch=True, locale='ar-SA')
            await c.add_init_script('window.__test={}'); pg = await c.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
            await pg.goto(URL); await pg.wait_for_timeout(1000)
            if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
            await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
            t0 = time.time(); await open_game(pg, 'pz_river')
            await pg.wait_for_function("()=>['pixi','off'].includes(document.querySelector('.rv10')?.dataset.scene)", timeout=20000)
            info[lab] = {'pixiReadyS': round(time.time() - t0, 2)}
            state = await pg.evaluate("()=>document.querySelector('.rv10').dataset.scene")
            ok(state == 'pixi', f'{lab}: Pixi scene running ({state})')
            ok(await pg.evaluate("()=>!!document.querySelector('.rv10 > canvas.scene-canvas')"), f'{lab}: WebGL canvas in the scene')
            # DOM boat follows the Pixi boat
            async def sync():
                return await pg.evaluate("""()=>{const v=document.querySelector('.rv10-boat'),r=v.getBoundingClientRect(),s=document.querySelector('.rv10').getBoundingClientRect(),st=window.mlRiverPixiState();
                  if(!st.on)return {on:false,dx:0,dy:0,sailing:false};return {on:true,dx:Math.abs(r.x+r.width/2-s.x-st.boat.x),dy:Math.abs(r.y+r.height/2-s.y-st.boat.y),side:st.side,sailing:st.sailing}}""")
            d = await sync(); ok(d['dx'] < 3 and d['dy'] < 3, f'{lab}: DOM boat on the Pixi boat {d}')
            btn = await pg.evaluate("""()=>{const b=document.querySelector('#lbgo'),r=b.getBoundingClientRect(),s=document.querySelector('.rv10').getBoundingClientRect();return {w:r.width,h:r.height,bottomGap:s.bottom-r.bottom,inHud:!!b.closest('.pzhud')}}""")
            ok(btn['w'] >= 60 and not btn['inHud'] and btn['bottomGap'] < 40, f'{lab}: big cross button under the boat {btn}')
            # play the optimal solution through the engine hook, crossing with the real button
            # follow the engine's own shortest path from the current state, crossing with the real button
            WON = "()=>!!(document.querySelector('.rv10.won')||document.querySelector('#stage .res'))"
            for step in range(20):
                if await pg.evaluate(WON): break
                moved = await pg.evaluate("""async()=>{const H=window.__test&&window.__test.pz;if(!H)return 'nohook';
                  const n=H.P.it.length,F=1<<n,s=H.s(),p=rvPath(n,H.P.cap,H.P.conf,s);if(!p||p.length<2)return 'nopath';
                  const d=(p[0]^p[1])&(F-1);for(let i=0;i<n;i++)if(d>>i&1)H.tap(i);document.querySelector('#lbgo').click();return 'ok'}""")
                if moved != 'ok': ok(False, f'{lab}: drive solution ({moved})'); break
                await pg.wait_for_timeout(250)
                mid = await sync()
                if step == 0 and mid.get('on', True): ok(mid['sailing'], f'{lab}: Pixi boat sails during the crossing')
                await pg.wait_for_timeout(700)
                if await pg.evaluate(WON): break
                d = await sync(); ok(d['dx'] < 3 and d['dy'] < 3 and not d['sailing'], f'{lab}: step {step}: docked and DOM boat follows {d}')
            for _ in range(20):
                if await pg.evaluate(WON): break
                await pg.wait_for_timeout(150)
            ok(await pg.evaluate(WON), f'{lab}: optimal solution wins with the Pixi scene')
            ok(not errs, f'{lab}: no JS errors {errs[:2]}')
            await pg.evaluate("()=>{try{closePlay()}catch(e){}}"); await pg.wait_for_timeout(300)
            ok(not await pg.evaluate("()=>!!document.querySelector('canvas.scene-canvas')"), f'{lab}: canvas removed after closing')
            await c.close()
        # if the engine cannot load, the DOM scene stays playable (fresh browser: no engine in any cache)
        await b.close(); b = await getattr(p, ENGINE).launch()
        c = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); await c.add_init_script('window.__test={}')
        await c.route('**/vendor/pixi/**', lambda r: r.abort())
        pg = await c.new_page(); await pg.goto(URL); await pg.wait_for_timeout(1000)
        if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
        await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
        await open_game(pg, 'pz_river'); await pg.wait_for_timeout(1500)
        fb = await pg.evaluate("()=>({scene:document.querySelector('.rv10').dataset.scene||'',landscape:getComputedStyle(document.querySelector('.rv10-landscape')).display,canvas:!!document.querySelector('canvas.scene-canvas')})")
        ok(fb['scene'] == 'off' and fb['landscape'] != 'none' and not fb['canvas'], f'engine blocked: DOM scene stays {fb}')
        await pg.evaluate("()=>{const H=window.__test.pz;H.tap(0)}"); await pg.click('#lbgo'); await pg.wait_for_timeout(900)
        ok(await pg.evaluate("()=>window.__test.pz.moves()===1"), 'engine blocked: the puzzle still plays')
        await c.close()
        await b.close()
    print(json.dumps(info))
    print(f'{ENGINE}: {passed} passed, {len(fails)} failed')
    sys.exit(1 if fails else 0)

asyncio.run(main())
