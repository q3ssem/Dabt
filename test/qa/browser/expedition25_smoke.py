import asyncio, json, pathlib
from playwright.async_api import async_playwright

ROOT=pathlib.Path(__file__).resolve().parents[2]
async def main():
  errors=[]
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx=await browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,locale='ar-SA')
    page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    done={f'ml10_{i:02d}':True for i in range(1,21)}
    await page.add_init_script("localStorage.setItem('mindlab:expedition10:v1',"+json.dumps(json.dumps({'done':done,'stars':{},'best':{},'totalStars':60},ensure_ascii=False))+")")
    await page.goto('http://127.0.0.1:8765/index.html',wait_until='load',timeout=60000)
    await page.wait_for_timeout(1200)
    tab=page.locator('.tab[data-tab=puz]')
    if await tab.count(): await tab.click()
    await page.wait_for_timeout(400)
    await page.locator('.ex10-launch-go').click(timeout=15000)
    await page.wait_for_timeout(200)
    # Open stage 21 (zero-based index 20).
    await page.locator('[data-ex10-node="20"]').first.click()
    await page.locator('[data-ex10="start"]').click()
    path=await page.evaluate('ML10Logic.mazeAudit().path')
    for cell in path[1:]:
      await page.locator(f'[data-maze="{cell[0]},{cell[1]}"]').click()
    assert await page.get_by_text('نجاح!',exact=True).count(), 'stage 21 did not win'
    await page.locator('[data-ex10="next"]').click(); await page.locator('[data-ex10="start"]').click()
    jug=await page.evaluate('ML10Logic.audit().jug.path')
    for action in jug: await page.locator(f'[data-jug="{action}"]').click()
    assert await page.get_by_text('نجاح!',exact=True).count(), 'stage 22 did not win'
    await page.locator('[data-ex10="next"]').click(); await page.locator('[data-ex10="start"]').click()
    clicks=await page.evaluate('ML10Logic.signalSolution')
    for k in clicks: await page.locator(f'[data-signal="{k}"]').click()
    assert await page.get_by_text('نجاح!',exact=True).count(), 'stage 23 did not win'
    await page.locator('[data-ex10="next"]').click(); await page.locator('[data-ex10="start"]').click()
    moves=await page.evaluate('ML10Logic.hanoiAudit().path')
    for m in moves:
      await page.locator(f'[data-hanoi-peg="{m["from"]}"]').click()
      await page.locator(f'[data-hanoi-peg="{m["to"]}"]').click()
    assert await page.get_by_text('نجاح!',exact=True).count(), 'stage 24 did not win'
    await page.locator('[data-ex10="next"]').click(); await page.locator('[data-ex10="start"]').click()
    solution=await page.evaluate('ML10Logic.audit().seal[0]')
    for i,v in enumerate(solution): await page.locator(f'[data-seal-slot="{i}"]').select_option(label={'قمر':'☾ قمر','ورقة':'❧ ورقة','ماء':'≈ ماء','نجمة':'✦ نجمة','نار':'♨ نار'}[v])
    await page.locator('[data-ex10="check-seal"]').click()
    assert await page.get_by_text('نجاح!',exact=True).count(), 'stage 25 did not win'
    dims=await page.evaluate('({w:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth,body:document.body.scrollWidth})')
    await page.screenshot(path=str(ROOT/'qa/browser/expedition25-final-mobile.png'),full_page=True)
    print(json.dumps({'status':'passed' if not errors and dims['sw']<=dims['w']+2 else 'failed','pageErrors':errors,'viewport':dims,'completedNewStages':5},ensure_ascii=False,indent=2))
    await browser.close()
    if errors or dims['sw']>dims['w']+2: raise SystemExit(1)
asyncio.run(main())
