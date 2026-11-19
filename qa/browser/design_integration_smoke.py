"""Visual/runtime acceptance: four chapter entry paths and both river boat directions.
Runs against a served checkout, not the GitHub Pages cached copy.
Usage: MINDLAB_URL=http://127.0.0.1:8765/index.html python3 qa/browser/design_integration_smoke.py
"""
import asyncio, json, os, pathlib, shutil, sys
from playwright.async_api import async_playwright
from player_openings import close_transition

ROOT=pathlib.Path(__file__).resolve().parents[2]
URL=os.environ.get('MINDLAB_URL','http://127.0.0.1:8765/index.html')
OUT=pathlib.Path(os.environ.get('OUT',ROOT/'qa/browser/design-integration-shots'))
OUT.mkdir(parents=True,exist_ok=True)
CHROME=os.environ.get('CHROME') or next((p for p in ('/usr/bin/chromium','/usr/bin/google-chrome') if os.path.exists(p)),None) or shutil.which('chromium')

async def main():
    problems=[]
    def check(value,message):
        if not value: problems.append(message)
        print(('PASS' if value else 'FAIL')+' '+message,flush=True)
    errors=[]
    async with async_playwright() as p:
        engine=os.environ.get('ENGINE','chromium')
        browser=await (p.webkit.launch() if engine=='webkit' else p.chromium.launch(**({'executable_path':CHROME} if CHROME else {}),args=['--no-sandbox']))
        page=await browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,locale='ar-SA')
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(URL,wait_until='load',timeout=90000)
        await page.wait_for_timeout(800)
        pick=page.locator('.mpc[data-m=main]')
        if await pick.count() and await pick.is_visible(): await pick.click()
        await page.locator('.tab[data-tab="puz"]').click(timeout=30000)
        await page.wait_for_function('() => !!(window.mindlabJourneyHub && window.ML10 && window.T7 && window.ATHERAN_CAMPAIGN)',timeout=40000)
        await page.locator('#mlj-journey-entry').click()
        hub = page.locator('#mlj-unified-hub')
        await hub.wait_for(state='visible', timeout=20000)
        check(await hub.locator('.mlj-v3-cluster').count() == 13, 'overview includes all four routes')
        await hub.locator('#mlj-v3-overview').click()
        for chapter, count in (('seven_seas', 21), ('palace', 19), ('atheran', 21), ('side', 25)):
            check(await hub.locator(f'.mlj-v3-pin[data-chapter="{chapter}"]').count() == count,
                  f'{chapter} shows {count} stations on the unified map')
        await hub.locator('[data-station-id="pz_aarch"]').click()
        check(await hub.locator('.mlj-v3-start').is_hidden(), 'Atheran retains its campaign gate')
        await page.keyboard.press('Escape')
        await page.screenshot(path=str(OUT/'01-unified-map.png'))
        await page.keyboard.press('Escape')

        # Enter the unchanged legacy puzzle engine and inspect the new layered boat in real Chrome.
        await page.evaluate('() => {if (typeof closePlay==="function") closePlay(); T7.hub();}')
        await page.evaluate('() => startRun(["pz_river"])')
        for _ in range(5):
            overlay=page.locator('#fit-opening-overlay #fit-op-start')
            if await overlay.count() and await overlay.is_visible():
                await overlay.click()
                await page.wait_for_timeout(100)
            start=page.locator('#stage #go')
            if await start.count() and await start.is_visible():
                await start.click()
                await page.wait_for_timeout(850)
            if await page.locator('#stage .rv10-boat').count(): break
            await page.wait_for_timeout(400)
        await page.locator('#stage .rv10-boat').wait_for(state='visible',timeout=20000)
        # The official 80-puzzle opening may appear after the game intro. Dismiss
        # it through its real button before interacting with bank passengers.
        opening=page.locator('#fit-opening-overlay')
        if await opening.count() and await opening.is_visible():
            await opening.locator('#fit-op-start').click()
            await opening.wait_for(state='detached',timeout=10000)
        js=r"""() => {
          const vessel=document.querySelector('#stage .rv10-boat'),scene=document.querySelector('#stage .rv10');
          const r=vessel.getBoundingClientRect(),b=scene.getBoundingClientRect();
          return {x:r.left+r.width/2,board:b.width,rightBank:document.querySelectorAll('#stage #rvb1 [data-tok]').length,
            at1:scene.classList.contains('at1'),
            parent:vessel.parentElement===scene,spriteCount:vessel.querySelectorAll('img').length,
            facing:[...vessel.querySelectorAll('img')].map(x=>x.getAttribute('src')).filter(Boolean),
            busy:vessel.getAttribute('aria-busy')};
        }"""
        before=await page.evaluate(js)
        check(before['parent'],'boat lives in the river scene coordinate space')
        check(before['spriteCount']>=6,'painted boat hull, shadow, farmer, oar and wake layers are present')
        check(before['rightBank']==0,'all passengers start on the left bank')
        check(before['at1'] is False,'boat begins at left dock')
        await page.screenshot(path=str(OUT/'05-river-left.png'))

        get_move=r"""() => {
          // Read the visible bank placements, then ask the original public solver.
          // No test-only or debug hooks are necessary in production builds.
          if(typeof rvPath!=='function' || typeof rvMake!=='function')return null;
          const P=rvMake(typeof pzLv==='function'?pzLv('pz_river'):1),n=P.it.length,F=1<<n;
          const scene=document.querySelector('#stage .rv10');
          let state=scene.classList.contains('at1')?F:0;
          for(const el of document.querySelectorAll('#stage #rvb1 [data-tok]'))
            state|=1<<(+el.dataset.tok);
          const path=rvPath(n,P.cap,P.conf,state);
          if(!path || path.length<2)return null;
          const mask=(path[0]^path[1])&(F-1);
          return P.it.map((_,i)=>i).filter(i=>mask>>i&1);
        }"""
        first_move=await page.evaluate(get_move)
        check(first_move is not None,'original solver produces a legal crossing')
        if first_move is None: raise RuntimeError('Cannot inspect boat without legal solver step')
        for i in first_move: await page.locator('#stage #rvb0 [data-tok="'+str(i)+'"]').click()
        await page.locator('#stage #lbgo').click()
        await page.wait_for_timeout(75)
        check(await page.locator('#stage .rv10.sail').count()>0,'sailing animation state is active mid-crossing')
        await page.wait_for_timeout(800)
        after=await page.evaluate(js)
        check(after['at1'] is True,'outbound crossing reaches opposite dock')
        check(after['rightBank']>before['rightBank'],'crossing moves actual passengers to right bank')
        check(after['x']-before['x']>before['board']*.12,'boat visibly travels across water, not a few pixels')
        check(any('farmer_return.png' in s for s in after['facing']),'boat swaps to return-facing drawn farmer')
        await page.screenshot(path=str(OUT/'06-river-right.png'))
        second_move=await page.evaluate(get_move)
        check(second_move is not None,'solver produces return crossing')
        if second_move is None: raise RuntimeError('No legal return move')
        for i in second_move: await page.locator('#stage #rvb1 [data-tok="'+str(i)+'"]').click()
        await page.locator('#stage #lbgo').click()
        await page.wait_for_timeout(800)
        returned=await page.evaluate(js)
        check(returned['at1'] is False,'return crossing reaches starting dock')
        check(returned['x']<after['x']-after['board']*.12,'return boat visibly travels back to the left bank')
        check(not returned['busy'],'boat clears busy state after arrival')
        await page.screenshot(path=str(OUT/'07-river-return.png'))
        check(not errors,'no uncaught JavaScript errors on map and river interactions')
        print(json.dumps({'status':'passed' if not problems else 'failed','problems':problems,
          'pageErrors':errors[:8], 'boat':{'initialX':before['x'],'arrivalX':after['x'],'returnX':returned['x'],
          'boardWidth':before['board'],'movingPassengersFirst':first_move,'movingPassengersReturn':second_move},
          'screenshots':str(OUT)},ensure_ascii=False,indent=2))
        await browser.close()
        if problems: sys.exit(1)

asyncio.run(main())
