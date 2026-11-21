"""Chromium smoke test: homepage must not load the journey until requested."""
import asyncio, json, os, sys
from urllib.parse import urlsplit
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765/'
CHROME=os.environ.get('CHROME','/usr/bin/google-chrome')
async def main():
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
        context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='ar-SA')
        page=await context.new_page()
        requests=[]; errors=[]; resources=[]
        page.on('request',lambda req: requests.append(urlsplit(req.url).path))
        page.on('response',lambda res: resources.append({'path':urlsplit(res.url).path,
            'bytes':int(res.headers.get('content-length') or 0),'type':res.request.resource_type})
            if res.url.startswith(URL) else None)
        page.on('pageerror',lambda exc: errors.append(str(exc)))
        await page.goto(URL,wait_until='load',timeout=45000)
        profile=page.locator('.mpc[data-m=main]')
        if await profile.count() and await profile.is_visible(): await profile.click()
        await page.wait_for_timeout(3500)
        before=await page.evaluate("""() => ({
          ready:!!window.mindlabPlayLayers?.ready,side:!!window.ML10,
          tab:typeof curTab!=='undefined'?curTab:'unknown'
        })""")
        deferred=['/motion/lab10.js','/motion/expedition-art.css','/atheran/campaign/campaign.js','/expedition10/app.js']
        early=sum(any(x in path for x in deferred) for path in requests)
        assert not before['ready'], 'Play bundle loaded on Home'
        assert not before['side'], 'Side journey loaded on Home'
        assert early==0, 'Play resources downloaded on Home'
        assert not errors, errors[:4]
        pre=len(requests)
        home_resources=list(resources)
        await page.evaluate("() => tab('puz')")
        await page.wait_for_function("() => !!window.mindlabPlayLayers?.ready",timeout=45000)
        assert not await page.evaluate("() => !!window.ML10"),'Side journey loaded without choosing it'
        await page.evaluate("async () => await window.mindlabSide.start()")
        await page.wait_for_function("() => !!window.ML10",timeout=20000)
        assert not errors,errors[:4]
        assert await page.evaluate("() => document.documentElement.scrollWidth <= innerWidth+3"),'Horizontal overflow'
        assert await page.evaluate("() => typeof window.mindlabOffline?.prepareAll==='function'"),'Offline control missing'
        print('PHASE2_BROWSER_AUDIT='+json.dumps({'on_home':before,'requests_home':pre,
           'unwanted_play_requests':early,'requests_after_navigation':len(requests),
           'homepage_bytes_uncompressed':sum(x['bytes'] for x in home_resources),
           'homepage_largest_resources':sorted(home_resources,key=lambda x:x['bytes'],reverse=True)[:15],
           'play_ready':True,'side_ready':True,'errors':errors},ensure_ascii=False))
        await browser.close()
asyncio.run(main())
