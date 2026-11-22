"""Navigation-only QA for four-across folder tiles and real-save unlock gates.
Usage: python qa/browser/puzzle_folders_acceptance.py URL chromium|webkit
Fixture progress is written in a disposable Playwright profile only; it is NOT
evidence of a solved puzzle or an instruction to change anyone's real save.
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8830/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'

async def run():
    assert ENGINE in ('chromium','webkit')
    stats=[]
    async with async_playwright() as p:
        for width in (320,390,430):
            browser=await getattr(p,ENGINE).launch()
            context=await browser.new_context(viewport={'width':width,'height':844},has_touch=True,
                                              is_mobile=True,locale='ar-SA',reduced_motion='reduce')
            page=await context.new_page()
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            await page.goto(URL,wait_until='load',timeout=45000)
            main=page.locator('.mpc[data-m=main]')
            if await main.count() and await main.is_visible(): await main.click()
            await page.evaluate("()=>tab('puz')")
            await page.wait_for_function("()=>window.LA?.puzzleFoldersReady && window.mindlabPlayLayers?.ready && !!window.mindlabJourneyHub",timeout=45000)
            folders=page.locator('#v-puz .ml-folder-category')
            await folders.first.wait_for(state='visible',timeout=20000)
            count=await folders.count()
            assert count>=4, f'only {count} library folders'
            assert await page.locator('#v-puz .la-section').count()==0,'old all-puzzles-at-once layout remains'
            await page.locator('[data-folder-name="حركة ومسارات"]').click()
            tiles=page.locator('#v-puz .ml-folder-grid .ml-folder-puzzle')
            n=await tiles.count()
            assert n>=5, f'movement has only {n} puzzles'
            assert not await tiles.nth(0).is_disabled(),'initial puzzle is locked'
            assert await tiles.nth(1).is_disabled(),'second puzzle open without completing first'
            gridcols=await page.locator('#v-puz .ml-folder-grid').evaluate('(el)=>getComputedStyle(el).gridTemplateColumns.split(" ").length')
            assert gridcols==4,f'{width} screen not four columns: {gridcols}'
            coords=await tiles.nth(0).bounding_box(),await tiles.nth(1).bounding_box(),await tiles.nth(3).bounding_box(),await tiles.nth(4).bounding_box()
            a,b,d,e=coords
            assert a and b and d and e and abs(a['y']-d['y'])<=3 and e['y']>a['y']+20, f'{width}: incorrect four per row {coords}'
            ids=await page.evaluate("""() => {
              const row=LA.folderStatus().find(x=>x.name==='حركة ومسارات');
              return row.items.map(x=>x.id);
            }""")
            old=await page.evaluate('(id)=>pzState().n[id]||0',ids[0])
            assert not old,'empty disposable profile already has puzzle wins'
            await page.evaluate("(id)=>{pzState().n[id]=1;S.save()}",ids[0])
            await page.evaluate("()=>renderPuz()")
            tiles=page.locator('#v-puz .ml-folder-grid .ml-folder-puzzle')
            assert not await tiles.nth(1).is_disabled(),'real stored progress does not unlock the following puzzle'
            assert await tiles.nth(2).is_disabled(),'winning first puzzle incorrectly unlocks entire folder'
            await page.reload(wait_until='load')
            main=page.locator('.mpc[data-m=main]')
            if await main.count() and await main.is_visible(): await main.click()
            await page.evaluate("()=>tab('puz')")
            await page.wait_for_function("()=>window.LA?.puzzleFoldersReady && window.mindlabPlayLayers?.ready",timeout=45000)
            await page.locator('[data-folder-name="حركة ومسارات"]').click()
            assert not await page.locator('#v-puz .ml-folder-grid .ml-folder-puzzle').nth(1).is_disabled(),'unlock lost after reload'
            await page.locator('.ml-folder-back').first.click()
            assert await page.locator('.ml-folder-category').count()>=4,'return to folder grid fails'
            await page.locator('#mlj-journey-entry').click()
            assert await page.locator('#mlj-unified-hub.ml-folder-journey').is_visible(),'story folder dialog does not open'
            assert await page.locator('#mlj-unified-hub .mlj-v3-map-scroll, #mlj-unified-hub .mlj-map-img').count()==0,'legacy map still present'
            assert await page.locator('#mlj-unified-hub .ml-folder-chapter').count()==4,'story chapters missing'
            await page.locator('#mlj-unified-hub [data-chapter="seven_seas"]').click()
            sts=page.locator('#mlj-unified-hub .ml-folder-stations .ml-folder-station')
            assert await sts.count()==21,f'seven seas stations {await sts.count()}, expected 21'
            assert not await sts.nth(0).is_disabled(),'first sea station locked'
            assert await sts.nth(1).is_disabled(),'second sea station unlocked without first real win'
            assert await page.locator('#mlj-unified-hub .ml-folder-stations').evaluate("(e)=>getComputedStyle(e).gridTemplateColumns.split(' ').length")==4
            await page.locator('#mlj-unified-hub .ml-folder-back').click()
            await page.locator('#mlj-unified-hub [data-chapter="side"]').click()
            await page.wait_for_function("()=>!!window.ML10",timeout=45000)
            await page.locator('#mlj-unified-hub .ml-folder-stations .ml-folder-station').first.wait_for(state='visible',timeout=15000)
            assert await page.locator('#mlj-unified-hub .ml-folder-stations .ml-folder-station').count()==24,'side journey count wrong'
            await page.locator('#mlj-close-atlas').click()
            assert await page.locator('#mlj-unified-hub').is_hidden()
            assert not await page.evaluate("()=>document.documentElement.scrollWidth>innerWidth+3"),'horizontal overflow'
            assert not errors,errors[:5]
            stats.append({'width':width,'library_categories':count,'movement_puzzles':n,
                          'columns':gridcols,'story_stations':21,'side_stations':24,
                          'persisted_unlock':True,'errors':errors})
            await browser.close()
    print('PUZZLE_FOLDERS='+json.dumps({'browser':ENGINE,'screens':stats},ensure_ascii=False),flush=True)
asyncio.run(run())
