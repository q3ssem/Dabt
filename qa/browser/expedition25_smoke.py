import asyncio, json, os, pathlib, shutil, sys
from playwright.async_api import async_playwright
from player_openings import dismiss_opening

ROOT=pathlib.Path(__file__).resolve().parents[2]
# 5.5.28: the browser and the server address are configurable; the old copy hard-coded /usr/bin/chromium and port 8765.
URL=os.environ.get('MINDLAB_URL') or (sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765/index.html')
CHROME=os.environ.get('CHROME') or next((c for c in ('/usr/bin/chromium','/usr/bin/google-chrome','/usr/bin/chromium-browser') if os.path.exists(c)),None) or shutil.which('chromium') or shutil.which('google-chrome')
async def main():
  errors=[]
  async with async_playwright() as p:
    browser=await p.chromium.launch(**({'executable_path':CHROME} if CHROME else {}),args=['--no-sandbox'])
    ctx=await browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,locale='ar-SA')
    page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    done={f'ml10_{i:02d}':True for i in range(1,21)}
    await page.add_init_script("localStorage.setItem('mindlab:expedition10:v1',"+json.dumps(json.dumps({'done':done,'stars':{},'best':{},'totalStars':60},ensure_ascii=False))+")")
    await page.goto(URL,wait_until='load',timeout=60000)
    await page.wait_for_timeout(1200)
    # A fresh profile first shows the mode picker; the old script never dismissed it.
    pick=page.locator('.mpc[data-m=main]')
    if await pick.count(): await pick.click()
    tab=page.locator('.tab[data-tab=puz]')
    if await tab.count(): await tab.click()
    await page.wait_for_timeout(400)
    await page.locator('.ex10-launch-go').click(timeout=15000)
    await page.wait_for_timeout(200)
    # Open stage 21 (zero-based index 20) by tapping its node on the map, as a player would.
    await page.locator('.ex10-map [data-ex10-node="20"]').click()
    await page.locator('[data-ex10="start"]').click()
    await dismiss_opening(page)
    path=await page.evaluate('ML10Logic.mazeAudit().path')
    for cell in path[1:]:
      await page.locator(f'[data-maze="{cell[0]},{cell[1]}"]').click()
    assert await page.get_by_text('نجاح!',exact=True).count(), 'stage 21 did not win'
    await page.locator('[data-ex10="next"]').click(); await page.locator('[data-ex10="start"]').click(); await dismiss_opening(page)
    jug=await page.evaluate('ML10Logic.audit().jug.path')
    for action in jug: await page.locator(f'[data-jug="{action}"]').click()
    assert await page.get_by_text('نجاح!',exact=True).count(), 'stage 22 did not win'
    await page.locator('[data-ex10="next"]').click(); await page.locator('[data-ex10="start"]').click(); await dismiss_opening(page)
    clicks=await page.evaluate('ML10Logic.signalSolution')
    for k in clicks: await page.locator(f'[data-signal="{k}"]').click()
    assert await page.get_by_text('نجاح!',exact=True).count(), 'stage 23 did not win'
    await page.locator('[data-ex10="next"]').click(); await page.locator('[data-ex10="start"]').click(); await dismiss_opening(page)
    moves=await page.evaluate('ML10Logic.hanoiAudit().path')
    for m in moves:
      await page.locator(f'[data-hanoi-peg="{m["from"]}"]').click()
      await page.locator(f'[data-hanoi-peg="{m["to"]}"]').click()
    assert await page.get_by_text('نجاح!',exact=True).count(), 'stage 24 did not win'
    await page.locator('[data-ex10="next"]').click(); await page.locator('[data-ex10="start"]').click(); await dismiss_opening(page)
    solution=await page.evaluate('ML10Logic.audit().seal[0]')
    # motion-batch-1: the seal is a drag board now — drag each rune from the tray onto its slot
    for i,v in enumerate(solution): await page.locator(f'#ex10-seal [data-tray] [data-tok="{v}"]').drag_to(page.locator(f'#ex10-seal [data-slot="{i}"]'))
    await page.locator('[data-ex10="check-seal"]').click()
    assert await page.get_by_text('نجاح!',exact=True).count(), 'stage 25 did not win'
    dims=await page.evaluate('({w:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth,body:document.body.scrollWidth})')
    await page.screenshot(path=str(ROOT/'qa/browser/expedition25-final-mobile.png'),full_page=True)
    print(json.dumps({'status':'passed' if not errors and dims['sw']<=dims['w']+2 else 'failed','pageErrors':errors,'viewport':dims,'completedNewStages':5},ensure_ascii=False,indent=2))
    await browser.close()
    if errors or dims['sw']>dims['w']+2: raise SystemExit(1)
asyncio.run(main())
