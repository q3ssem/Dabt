"""Behavioral smoke tests for retired content and lightweight pre-puzzle introductions.
This deliberately validates only the cleanup surface, not all unrelated puzzle layout rules.
"""
import argparse
import asyncio
from playwright.async_api import async_playwright

async def visit(engine, url):
    browser = await (engine.chromium.launch(args=['--no-sandbox']) if engine.label == 'chromium' else engine.webkit.launch())
    ctx = await browser.new_context(viewport={'width':390,'height':844}, has_touch=True, reduced_motion='reduce', locale='ar-SA')
    page = await ctx.new_page()
    errors, requested = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: requested.append(r.url))
    await page.goto(url, wait_until='domcontentloaded')
    await page.wait_for_function("()=>!!window.fitOpenings && !!window.mindlabJourneyHub && typeof startRun==='function'", timeout=30000)
    status = await page.evaluate("""() => ({
        hasad: typeof G!=='undefined' && G.some(g=>g.id==='hasad'),
        hasadRuntime: !!window.MINDLAB_HASAD_RUNTIME,
        saved: localStorage.getItem('miran:v2'),
        chapterCount: window.__MINDLAB_JOURNEY_MAP?.stations?.length || 0,
        puzzleExists: typeof GM==='object' && !!GM.pz_river
    })""")
    assert not status['hasad'] and not status['hasadRuntime'], 'Retired word game is still registered'
    assert status['chapterCount'] >= 80 and status['puzzleExists'], 'Active expedition/puzzle engine missing'
    # Activate the visible play surface before opening an intro. Intro dialogs are
    # intentionally children of #play and must never show while Home is active.
    profile = page.locator('.mpc[data-m=main]')
    if await profile.count() and await profile.is_visible():
        await profile.click()
    await page.evaluate("()=>startRun(['pz_river'])")
    await page.wait_for_function("""() => {
      const play=document.querySelector('#play');
      return !!play && play.getBoundingClientRect().width>0 && play.getBoundingClientRect().height>0;
    }""", timeout=12000)
    saved_after_start = await page.evaluate("()=>localStorage.getItem('miran:v2')")
    # Exercise the actual pre-play controller; it must show text without opening a large atlas.
    await page.evaluate("()=>window.fitOpenings.open('pz_river', true)")
    opening = page.locator('#fit-opening-overlay')
    await opening.wait_for(state='visible')
    assert await page.locator('.fit-opening-title').inner_text() == 'عبور النهر'
    assert await page.locator('.fit-op-start').count() == 1
    style = await page.locator('.fit-opening-scene').evaluate('(e)=>getComputedStyle(e).backgroundImage')
    assert style == 'none', 'Pre-play introduction is still requesting a large image'
    await page.locator('#fit-op-start').click()
    await opening.wait_for(state='detached')
    assert await page.evaluate("()=>localStorage.getItem('miran:v2')") == saved_after_start, 'Intro changed player progress'
    await page.wait_for_timeout(400)
    assert not any('/hasad/' in x or '/designs_art/openings/batch' in x for x in requested), 'Removed art or game still downloaded'
    assert not errors, 'Page scripts failed: '+str(errors[:5])
    await ctx.close()
    await browser.close()
    print('PASS: cleaned startup, journey present, text-only intro, player save preserved, no retired downloads')

async def main():
    p = argparse.ArgumentParser()
    p.add_argument('url')
    p.add_argument('--engine', choices=['chromium','webkit'], default='chromium')
    args = p.parse_args()
    async with async_playwright() as pw:
        class Bundle:
            label = args.engine
            chromium = pw.chromium
            webkit = pw.webkit
        await visit(Bundle, args.url)

if __name__ == '__main__':
    asyncio.run(main())
