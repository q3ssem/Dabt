"""Mobile touch-density acceptance: four puzzle layouts that shrink to 24-37px
in fit-to-screen mode. Test only UI geometry and native page behavior; do not
write saves, forge wins, or change puzzle rules.
Usage: python qa/browser/phone_touch_dense.py URL chromium|webkit
"""
import asyncio
import json
import os
import sys
from playwright.async_api import async_playwright
from player_openings import dismiss_opening

URL = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8830/'
ENGINE = sys.argv[2] if len(sys.argv)>2 else 'chromium'
TARGETS = {
  'pz_tdig': '.xbg button.xc',
  'pz_pliar': '.pl-strow .pl-rot',
  'pz_pjail': '.jail-card button',
  'pz_wfirst': 'button[aria-label^="أدر الحلقة"]',
}

async def run():
  results = []
  async with async_playwright() as pw:
    browser = await (pw.webkit if ENGINE=='webkit' else pw.chromium).launch()
    context = await browser.new_context(viewport={'width':390,'height':844},
                                        is_mobile=True,has_touch=True,locale='ar-SA',
                                        reduced_motion='reduce')
    page = await context.new_page()
    page_errors = []
    page.on('pageerror', lambda e: page_errors.append(str(e)))
    await page.goto(URL,wait_until='domcontentloaded',timeout=45000)
    profile=page.locator('.mpc[data-m=main]')
    if await profile.count() and await profile.is_visible():
      await profile.click(timeout=8000)
    await page.evaluate("()=>tab('puz')")
    await page.wait_for_function("()=>window.mindlabPlayLayers?.ready===true",timeout=45000)
    for width,height in ((390,844),(320,640),(430,932)):
      await page.set_viewport_size({'width':width,'height':height})
      for game,selector in TARGETS.items():
        await page.evaluate("(g)=>startRun([g])",game)
        start=page.locator('#stage #go')
        if await start.count() and await start.first.is_visible():
          await start.first.click(timeout=6500)
        await dismiss_opening(page,wait=700)
        try:
          await page.wait_for_function(
            "(g)=>document.querySelector('#play')?.dataset.laGame===g && document.querySelector('#pzb.fit-large')?.dataset.fitZoom==='1.00'",
            arg=game,timeout=9000)
        except Exception:
          pass
        await page.wait_for_timeout(300)
        dims=await page.evaluate("""(sel)=>{
          const p=document.querySelector('#pzb'),play=document.querySelector('#play');
          const nodes=[...(p?.querySelectorAll(sel)||[])].filter(x=>x.getClientRects().length);
          return {id:play?.dataset.laGame,large:p?.classList.contains('fit-large'),
                  zoom:p?.dataset.fitZoom,
                  targets:nodes.map(x=>{const r=x.getBoundingClientRect();
                    return [Math.round(r.width),Math.round(r.height)]}),
                  pageOverflow:document.documentElement.scrollWidth>innerWidth+3,
                  boardScroll:p?.scrollHeight>p?.clientHeight+2};
        }""",selector)
        assert dims['id']==game, (game,width,dims)
        assert dims['large'] and dims['zoom']=='1.00', (game,width,dims)
        assert dims['targets'], (game,width,'target selector missing')
        assert min(min(d) for d in dims['targets'])>=42, (game,width,dims)
        assert not dims['pageOverflow'], (game,width,'page overflow',dims)
        results.append({'game':game,'width':width,'count':len(dims['targets']),
                        'minHit':min(min(d) for d in dims['targets']),
                        'boardScroll':dims['boardScroll']})
        if game=='pz_pliar' and width==390:
          info=page.locator('#fitinfo')
          assert await info.count(), 'instruction control must be available'
          await info.click()
          toggle=page.locator('.fit-sh-magnify')
          assert await toggle.count() and await toggle.is_visible(), 'mode can be reversed'
          await toggle.click()
          await page.wait_for_function("()=>!document.querySelector('#pzb')?.classList.contains('fit-large')")
    assert not page_errors, page_errors
    print('DENSE_PHONE_TOUCH='+json.dumps({'engine':ENGINE,'cases':len(results),
      'minimumHit':min(r['minHit'] for r in results),'reversible':True,
      'errors':page_errors},ensure_ascii=False),flush=True)
    await browser.close()

asyncio.run(run())
