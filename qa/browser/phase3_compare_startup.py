"""Compare observed cold Home load traffic on the published build and candidate.

This is a controlled Linux/Chromium lab measurement, not field RUM data.
Usage: python qa/browser/phase3_compare_startup.py BASE_URL CANDIDATE_URL
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

BASELINE, CANDIDATE = sys.argv[1:3]

async def measure(browser,url):
    ctx=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='ar-SA')
    page=await ctx.new_page()
    responses=[]; errors=[]
    page.on('response',lambda r: responses.append({
        'bytes':int(r.headers.get('content-length') or 0),
        'type':r.request.resource_type,
        'path':r.url.split('?')[0].split('/')[-1]
    }) if r.url.startswith(url) else None)
    page.on('pageerror',lambda e: errors.append(str(e)))
    await page.goto(url,wait_until='load',timeout=45000)
    profile=page.locator('.mpc[data-m=main]')
    if await profile.count() and await profile.is_visible(): await profile.click()
    await page.wait_for_timeout(3500)
    timing=await page.evaluate("""()=>{
      const n=performance.getEntriesByType('navigation')[0];
      const p=performance.getEntriesByType('paint').find(x=>x.name==='first-contentful-paint');
      return {dcl_ms:Math.round(n?.domContentLoadedEventEnd||0),
        load_ms:Math.round(n?.loadEventEnd||0),
        fcp_ms:p?Math.round(p.startTime):null,
        play_ready:!!window.mindlabPlayLayers?.ready,side_ready:!!window.ML10};
    }""")
    rows={
      'requests':len(responses),'resource_bytes':sum(r['bytes'] for r in responses),
      'images_bytes':sum(r['bytes'] for r in responses if r['type']=='image'),
      'scripts_bytes':sum(r['bytes'] for r in responses if r['type']=='script'),
      'styles_bytes':sum(r['bytes'] for r in responses if r['type']=='stylesheet'),
      'errors':errors[:4],**timing
    }
    await ctx.close()
    return rows

async def main():
    async with async_playwright() as playwright:
        browser=await playwright.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox'])
        old=await measure(browser,BASELINE)
        new=await measure(browser,CANDIDATE)
        await browser.close()
    changes={key:round((new[key]-old[key])/old[key]*100,1) if old[key] else None for key in ('requests','resource_bytes','images_bytes','scripts_bytes','styles_bytes')}
    print('PHASE3_STARTUP_COMPARISON='+json.dumps({'baseline':old,'candidate':new,'delta_pct':changes},ensure_ascii=False),flush=True)
    assert not new['errors'],f'Candidate startup JavaScript errors: {new["errors"]}'
    assert not new['play_ready'] and not new['side_ready'],'Home should not initialize puzzle/side engines'
    assert new['resource_bytes']<=old['resource_bytes']*1.05,'Candidate Home resource bytes regressed by more than 5%'

asyncio.run(main())
