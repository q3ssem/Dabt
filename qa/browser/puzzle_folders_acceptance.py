"""Navigation-only QA for four-across folder tiles and real-save unlock gates.
Usage: python qa/browser/puzzle_folders_acceptance.py URL chromium|webkit
Fixture progress is written in a disposable Playwright profile only; it is NOT
evidence of a solved puzzle or an instruction to change anyone's real save.
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8830/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
SHOTS=Path(os.getenv('SHOTS','/tmp/mindlab-puzzle-folders-screens'))
SHOTS.mkdir(parents=True,exist_ok=True)

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
            names=await folders.evaluate_all("(nodes)=>nodes.map(n=>n.dataset.folderName)")
            assert len(names)==len(set(names)),f'duplicate library folders: {names}'
            expected={'منطق وأرقام','حركة ومسارات','مغامرة القرصان',
                      'الحطام والمعبد','قصر المرايا','أرض أثران'}
            assert set(names)==expected,f'expected six original sections, found {names}'
            secret_ids={'pz_wbone','pz_wspore','pz_wlake','pz_wlog','pz_wfirst'}
            visible_ids=set(await page.evaluate("()=>LA.folderStatus().flatMap(s=>s.items.map(g=>g.id))"))
            assert not secret_ids.intersection(visible_ids),f'undiscovered secret puzzles leaked into library: {secret_ids.intersection(visible_ids)}'
            await page.wait_for_function("""() => curTab === 'puz' &&
              [...document.querySelectorAll('#v-puz .ml-folder-category img')].every(img=>img.complete && img.naturalWidth>0)
            """,timeout=15000)
            await page.screenshot(path=str(SHOTS/f'folders-{ENGINE}-{width}.png'),full_page=True)
            assert count>=4, f'only {count} library folders'
            assert await page.locator('#v-puz .la-section').count()==0,'old all-puzzles-at-once layout remains'
            await page.locator('[data-folder-name="حركة ومسارات"]').click()
            tiles=page.locator('#v-puz .ml-folder-grid .ml-folder-puzzle')
            n=await tiles.count()
            await page.wait_for_function("""() => 
              [...document.querySelectorAll('#v-puz .ml-folder-grid img')].every(img=>img.complete && img.naturalWidth>0)
            """,timeout=15000)
            await page.screenshot(path=str(SHOTS/f'movement-grid-{ENGINE}-{width}.png'),full_page=True)
            assert n>=5, f'movement has only {n} puzzles'
            assert not await tiles.nth(0).is_disabled(),'initial puzzle is locked'
            assert await tiles.nth(1).is_disabled(),'second puzzle open without completing first'
            # Contrast of locked Arabic text must be readable; status stays visibly disabled.
            for skin in ('light','dark'):
                await page.evaluate('(skin)=>document.documentElement.dataset.skin=skin',skin)
                ratio=await page.locator('#v-puz .ml-folder-grid .ml-folder-locked').first.evaluate("""tile=>{
                  const rgb=v=>v.match(/[0-9.]+/g).slice(0,3).map(Number);
                  const lum=v=>{
                    const channels=rgb(v).map(x=>x/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));
                    return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
                  };
                  const fg=getComputedStyle(tile.querySelector('b')).color;
                  const bg=getComputedStyle(tile).backgroundColor;
                  const a=lum(fg),b=lum(bg);
                  return {ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),
                          opacity:getComputedStyle(tile).opacity};
                }""")
                assert ratio['ratio']>=4.5,f'{skin} locked Arabic label low contrast: {ratio}'
                assert ratio['opacity']=='1',f'{skin} locked card faded: {ratio}'
            await page.evaluate("()=>document.documentElement.dataset.skin='light'")
            gridcols=await page.locator('#v-puz .ml-folder-grid').evaluate('(el)=>getComputedStyle(el).gridTemplateColumns.split(" ").length')
            assert gridcols==4,f'{width} screen not four columns: {gridcols}'
            coords=await tiles.nth(0).bounding_box(),await tiles.nth(1).bounding_box(),await tiles.nth(3).bounding_box(),await tiles.nth(4).bounding_box()
            a,b,d,e=coords
            assert a and b and d and e and abs(a['y']-d['y'])<=3 and e['y']>a['y']+20, f'{width}: incorrect four per row {coords}'
            # Exercise the real native tile handler, not just the disabled CSS state.
            await tiles.nth(0).click()
            await page.locator('#stage .ml-authored-picker .go-btn[data-level]').first.wait_for(
                state='visible',timeout=25000)
            active=await page.evaluate("()=>curGame()?.id")
            assert active=='pz_river',f'folder did not launch its native puzzle: {active}'
            await page.evaluate("()=>{closePlay();LA.folderBack();tab('puz');renderPuz()}")
            await page.locator('[data-folder-name="حركة ومسارات"]').click()
            tiles=page.locator('#v-puz .ml-folder-grid .ml-folder-puzzle')
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
            assert 'ml-folder-completed' in (await tiles.nth(0).get_attribute('class') or ''),'won card lacks distinct style'
            assert 'مكتمل' in (await tiles.nth(0).inner_text()),'won card lacks a visible completion label'
            assert not await tiles.nth(0).is_disabled(),'won puzzle cannot be replayed'
            await page.reload(wait_until='load')
            main=page.locator('.mpc[data-m=main]')
            if await main.count() and await main.is_visible(): await main.click()
            await page.evaluate("()=>tab('puz')")
            await page.wait_for_function("()=>window.LA?.puzzleFoldersReady && window.mindlabPlayLayers?.ready",timeout=45000)
            await page.locator('[data-folder-name="حركة ومسارات"]').click()
            assert not await page.locator('#v-puz .ml-folder-grid .ml-folder-puzzle').nth(1).is_disabled(),'unlock lost after reload'
            # Sparse historical saves must not make formerly playable early puzzles inaccessible.
            # This test changes only an isolated browser profile, never a real player's save.
            await page.evaluate("(id)=>{pzState().n[id]=1;S.save()}",ids[4])
            await page.evaluate("()=>renderPuz()")
            tiles=page.locator('#v-puz .ml-folder-grid .ml-folder-puzzle')
            for i in range(6):
                assert not await tiles.nth(i).is_disabled(),f'sparse legacy win re-locked puzzle {i+1}'
            assert await tiles.nth(6).is_disabled(),'sparse win unlocked more than one next puzzle'
            await page.reload(wait_until='load')
            main=page.locator('.mpc[data-m=main]')
            if await main.count() and await main.is_visible(): await main.click()
            await page.evaluate("()=>tab('puz')")
            await page.wait_for_function("()=>window.LA?.puzzleFoldersReady && window.mindlabPlayLayers?.ready",timeout=45000)
            await page.locator('[data-folder-name="حركة ومسارات"]').click()
            tiles=page.locator('#v-puz .ml-folder-grid .ml-folder-puzzle')
            assert not await tiles.nth(3).is_disabled(),'legacy earlier puzzle re-locked after reload'
            assert not await tiles.nth(5).is_disabled(),'legacy following puzzle re-locked after reload'
            assert await tiles.nth(6).is_disabled(),'legacy unlock advanced two stages after reload'
            # Historical chapter-only wins must agree with the independent library.
            # There is deliberately no pzState().n write for these two chapters.
            await page.evaluate("""() => {
              const all=LA.folderStatus();
              const palace=all.find(s=>s.name==='قصر المرايا').items;
              const athran=all.find(s=>s.name==='أرض أثران').items;
              pState().done[palace[2].id]=1;
              aState().done[athran[1].id]=1;
              S.save();
            }""")
            legacy=await page.evaluate("""() => Object.fromEntries(
              ['قصر المرايا','أرض أثران'].map(name=>[
                name, LA.folderStatus().find(s=>s.name===name).items
                  .slice(0,5).map(x=>({id:x.id,open:x.open,done:x.done}))
              ])
            )""")
            assert legacy['قصر المرايا'][2]['done'] and legacy['قصر المرايا'][3]['open'],'palace native save missing from library'
            assert not legacy['قصر المرايا'][4]['open'],'palace native save skipped an extra puzzle'
            assert legacy['أرض أثران'][1]['done'] and legacy['أرض أثران'][2]['open'],'Atheran native save missing from library'
            assert not legacy['أرض أثران'][3]['open'],'Atheran native save skipped an extra puzzle'
            await page.reload(wait_until='load')
            main=page.locator('.mpc[data-m=main]')
            if await main.count() and await main.is_visible(): await main.click()
            await page.evaluate("()=>tab('puz')")
            await page.wait_for_function("()=>window.LA?.puzzleFoldersReady && window.mindlabPlayLayers?.ready",timeout=45000)
            assert await page.evaluate("""() => {
              const all=LA.folderStatus();
              return ['قصر المرايا','أرض أثران'].every(name=>
                all.find(s=>s.name===name).items.some(x=>x.done))
            }"""),'historical chapter-only wins vanished after reload'
            assert await page.locator('.ml-folder-category').count()==6,'folder grid missing after historical reload'
            await page.locator('#mlj-journey-entry').click()
            assert await page.locator('#mlj-unified-hub.ml-folder-journey').is_visible(),'story folder dialog does not open'
            assert await page.locator('#mlj-unified-hub .mlj-v3-map-scroll, #mlj-unified-hub .mlj-map-img').count()==0,'legacy map still present'
            assert await page.locator('#mlj-unified-hub .ml-folder-chapter').count()==4,'story chapters missing'
            await page.wait_for_function("""() =>
              [...document.querySelectorAll('#mlj-unified-hub .ml-folder-chapter img')].every(img=>img.complete && img.naturalWidth>0)
            """,timeout=15000)
            await page.screenshot(path=str(SHOTS/f'story-chapters-{ENGINE}-{width}.png'))
            await page.locator('#mlj-unified-hub [data-chapter="seven_seas"]').click()
            sts=page.locator('#mlj-unified-hub .ml-folder-stations .ml-folder-station')
            assert await sts.count()==21,f'seven seas stations {await sts.count()}, expected 21'
            await page.screenshot(path=str(SHOTS/f'story-stations-{ENGINE}-{width}.png'))
            assert not await sts.nth(0).is_disabled(),'first sea station locked'
            assert await sts.nth(1).is_disabled(),'second sea station unlocked without first real win'
            assert await page.locator('#mlj-unified-hub .ml-folder-stations').evaluate("(e)=>getComputedStyle(e).gridTemplateColumns.split(' ').length")==4
            await page.locator('#mlj-unified-hub .ml-folder-back').click()
            await page.locator('#mlj-unified-hub [data-chapter="palace"]').click()
            assert await page.locator('#mlj-unified-hub .ml-folder-station').count()==19,'palace station count changed'
            await page.locator('#mlj-unified-hub .ml-folder-back').click()
            await page.locator('#mlj-unified-hub [data-chapter="atheran"]').click()
            atheran=page.locator('#mlj-unified-hub .ml-folder-station')
            assert await atheran.count()==21,'official Atheran station count changed'
            assert await atheran.first.is_disabled(),'official Atheran unlocked before palace completion'
            await page.locator('#mlj-unified-hub .ml-folder-back').click()
            await page.locator('#mlj-unified-hub [data-chapter="side"]').click()
            await page.wait_for_function("()=>!!window.ML10",timeout=45000)
            await page.locator('#mlj-unified-hub .ml-folder-stations .ml-folder-station').first.wait_for(state='visible',timeout=15000)
            assert await page.locator('#mlj-unified-hub .ml-folder-stations .ml-folder-station').count()==24,'side journey count wrong'
            await page.locator('#mlj-close-atlas').click()
            assert await page.locator('#mlj-unified-hub').is_hidden()
            # The redesigned library must not delete the illustrated campaign atlases.
            await page.evaluate("()=>mindlabJourneyHub.returnToMap('seven_seas')")
            map_btn=page.locator('#mlj-unified-hub .ml-folder-original-map')
            assert await map_btn.count()==1,'official chapter atlas link missing'
            await map_btn.click()
            assert await page.locator('#v-puz .t7-station').count()==21,'original seven-seas atlas was removed'
            await page.evaluate("()=>T7.hub()")
            await page.evaluate("()=>mindlabJourneyHub.returnToMap('palace')")
            await page.locator('#mlj-unified-hub .ml-folder-original-map').click()
            assert await page.locator('#mlj-palace-map .mlj-palace-station').count()==19,'original palace atlas was removed'
            await page.locator('#mlj-palace-map .mlj-palace-close').click()
            await page.evaluate("()=>mindlabJourneyHub.returnToMap('atheran')")
            await page.locator('#mlj-unified-hub .ml-folder-original-map').click()
            assert await page.locator('#v-puz.ah-view').count()==1,'original Atheran atlas was removed'
            assert 'مقفلة' in (await page.locator('#v-puz .ah-top').inner_text()),'Atheran atlas lost its native palace gate'
            await page.evaluate("()=>ATHERAN_CAMPAIGN.back()")
            assert not await page.evaluate("()=>document.documentElement.scrollWidth>innerWidth+3"),'horizontal overflow'
            assert not errors,errors[:5]
            stats.append({'width':width,'library_categories':count,'category_names':names,'movement_puzzles':n,
                          'columns':gridcols,'story_stations':21,'side_stations':24,
                          'persisted_unlock':True,'errors':errors})
            await browser.close()
    print('PUZZLE_FOLDERS='+json.dumps({'browser':ENGINE,'screens':stats},ensure_ascii=False),flush=True)
asyncio.run(run())
