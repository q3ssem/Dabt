"""Visual/runtime acceptance: four chapter entry paths and both river boat directions.
Runs against a served checkout, not the GitHub Pages cached copy.
Usage: MINDLAB_URL=http://127.0.0.1:8765/index.html python3 qa/browser/design_integration_smoke.py
"""
import asyncio, json, os, pathlib, shutil, sys
from playwright.async_api import async_playwright

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
        browser=await p.chromium.launch(**({'executable_path':CHROME} if CHROME else {}),args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,locale='ar-SA')
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(URL,wait_until='load',timeout=90000)
        await page.wait_for_timeout(800)
        pick=page.locator('.mpc[data-m=main]')
        if await pick.count() and await pick.is_visible(): await pick.click()
        await page.locator('.tab[data-tab="puz"]').click(timeout=30000)
        await page.wait_for_function('() => !!(window.mindlabJourneyHub && window.ML10 && window.T7 && window.ATHERAN_CAMPAIGN)',timeout=40000)
        hub=page.locator('#mlj-unified-hub')
        await hub.wait_for(state='visible',timeout=20000)
        check(await page.locator('#mlj-unified-hub .mlj-ch-card').count()==4,'unified journey exposes four chapters')

        async def entry(id):
            await hub.wait_for(state='visible',timeout=20000)
            await hub.locator('.mlj-ch-card[data-mlj-ch="'+id+'"]').click(timeout=20000)
            await page.wait_for_timeout(150)

        await entry('seven_seas')
        check(await page.locator('#v-puz .t7-maphero').count()>0,'Seven Seas button opens original 21-station map')
        await page.screenshot(path=str(OUT/'01-seven-seas.png'))
        await page.evaluate('T7.hub()')
        await entry('palace')
        modal=page.locator('#mlj-palace-map')
        await modal.wait_for(state='visible',timeout=10000)
        check(await modal.locator('.mlj-palace-station').count()==19,'Palace button opens 19-station illustrated chapter map')
        await page.screenshot(path=str(OUT/'02-palace-map.png'))
        await modal.locator('.mlj-palace-close').click()
        await entry('atheran')
        check(await page.locator('#v-puz.ah-view').count()>0,'Atheran button opens official atlas rather than a heading')
        check(await page.locator('[data-ah="back"]').count()>0,'Atheran atlas contains its original navigation')
        await page.screenshot(path=str(OUT/'03-atheran-atlas.png'))
        await page.evaluate('ATHERAN_CAMPAIGN.back()')
        await entry('side')
        check(await page.locator('.ex10-map').count()>0,'Side journey button opens playable 25-stage map')
        check(await page.locator('.ex10-map [data-ex10-node]').count()==25,'Side map retains all 25 station nodes')
        await page.screenshot(path=str(OUT/'04-side-map.png'))

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
        js=r"""() => {
          const vessel=document.querySelector('#stage .rv10-boat'),scene=document.querySelector('#stage .rv10');
          const r=vessel.getBoundingClientRect(),b=scene.getBoundingClientRect();
          const hook=window.__test && window.__test.pz;
          return {x:r.left+r.width/2,board:b.width,state:hook&&hook.s(),at1:scene.classList.contains('at1'),
            parent:vessel.parentElement===scene,spriteCount:vessel.querySelectorAll('img').length,
            facing:[...vessel.querySelectorAll('img')].map(x=>x.getAttribute('src')).filter(Boolean),
            busy:vessel.getAttribute('aria-busy')};
        }"""
        before=await page.evaluate(js)
        check(before['parent'],'boat lives in the river scene coordinate space')
        check(before['spriteCount']>=6,'painted boat hull, shadow, farmer, oar and wake layers are present')
        check(before['state'] is not None,'original river QA state hook is available')
        check(before['at1'] is False,'boat begins at left dock')
        await page.screenshot(path=str(OUT/'05-river-left.png'))

        get_move=r"""() => {
          const h=window.__test && window.__test.pz;
          if(!h || typeof rvPath!=='function')return null;
          const path=rvPath(h.P.it.length,h.P.cap,h.P.conf,h.s());
          if(!path||path.length<2)return null;
          const mask=(path[0]^path[1])&((1<<h.P.it.length)-1);
          return h.P.it.map((_,i)=>i).filter(i=>mask>>i&1);
        }"""
        first_move=await page.evaluate(get_move)
        check(first_move is not None,'original solver produces a legal crossing')
        if first_move is None: raise RuntimeError('Cannot inspect boat without legal solver step')
        await page.evaluate('(ids) => ids.forEach(i=>window.__test.pz.tap(i))',first_move)
        await page.locator('#stage #lbgo').click()
        await page.wait_for_timeout(75)
        check(await page.locator('#stage .rv10.sail').count()>0,'sailing animation state is active mid-crossing')
        await page.wait_for_timeout(800)
        after=await page.evaluate(js)
        check(after['at1'] is True,'outbound crossing reaches opposite dock')
        check(after['state'] != before['state'],'crossing updates actual game state')
        check(after['x']-before['x']>before['board']*.12,'boat visibly travels across water, not a few pixels')
        check(any('farmer_return.png' in s for s in after['facing']),'boat swaps to return-facing drawn farmer')
        await page.screenshot(path=str(OUT/'06-river-right.png'))
        second_move=await page.evaluate(get_move)
        check(second_move is not None,'solver produces return crossing')
        if second_move is None: raise RuntimeError('No legal return move')
        await page.evaluate('(ids) => ids.forEach(i=>window.__test.pz.tap(i))',second_move)
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
