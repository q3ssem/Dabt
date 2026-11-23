"""Mobile-native touch surfaces and reversible magnification for dense game boards.
Checks real native interactions after magnification, in both WebKit/Chromium.
This is not a solver test of every puzzle or every level.
Usage: python qa/browser/jaziran_magnify.py URL chromium|webkit [shots_dir]
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from player_openings import dismiss_opening

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
OUT=Path(sys.argv[3]) if len(sys.argv)>3 else None
if OUT:OUT.mkdir(parents=True,exist_ok=True)
assert ENGINE in ('chromium','webkit')

async def launch(page,gid):
    await page.evaluate("(g)=>startRun([g])",gid)
    await page.wait_for_timeout(230)
    picker=page.locator('#stage .ml-authored-picker .go-btn[data-level]')
    go=page.locator('#stage #go')
    if await picker.count() and await picker.first.is_visible():
        await picker.first.click(timeout=8000)
    elif await go.count() and await go.is_visible():
        await go.click(timeout=8000)
    await dismiss_opening(page,wait=1000)
    await page.wait_for_function("()=>!!document.querySelector('#play.fit #pzb')",timeout=15000)
    await page.wait_for_timeout(350)

async def toggle(page,enlarge):
    await page.locator('#fitinfo').click(timeout=8000)
    option=page.locator('.fit-sheet .fit-sh-magnify')
    await option.wait_for(state='visible',timeout=7000)
    assert await option.get_attribute('aria-pressed')==('false' if enlarge else 'true')
    await option.click()
    await page.wait_for_function("(expected)=>document.querySelector('#pzb')?.classList.contains('fit-large')===expected",arg=enlarge,timeout=7000)

async def measure(page):
    return await page.evaluate("""()=>{
      const board=document.querySelector('#pzb');
      const zr=document.querySelector('#zrt'),btn=document.querySelector('#zrw8');
      const slot=document.querySelector('[data-wlg-slot="0"]');
      const rect=e=>e?{w:Math.round(e.getBoundingClientRect().width),
        h:Math.round(e.getBoundingClientRect().height)}:null;
      return {zoom:board?.dataset.fitZoom,large:board?.classList.contains('fit-large'),
        scroll:board?.classList.contains('fit-scroll'),
        overflowDocument:document.documentElement.scrollWidth>innerWidth+5,
        board:{height:Math.round(board?.getBoundingClientRect().height||0),
          scrollHeight:board?.scrollHeight,clientHeight:board?.clientHeight},
        slider:rect(zr),wait:rect(btn),slot:rect(slot)};
    }""")

async def main():
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
          pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),
                             args=['--no-sandbox']))
        context=await browser.new_context(viewport={'width':320,'height':640},
            is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        page=await context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(URL,wait_until='domcontentloaded',timeout=45000)
        picker=page.locator('.mpc[data-m=main]')
        if await picker.count() and await picker.is_visible(): await picker.click()
        await page.evaluate("()=>tab('puz')")
        await page.wait_for_function("()=>!!window.mindlabPlayLayers?.ready",timeout=45000)
        results=[]
        for gid in ('pz_zroute','pz_wlog','pz_zcode','pz_pliar','pz_pjail','pz_aheart','pz_tdig'):
            await launch(page,gid)
            saved=await page.evaluate("""()=>JSON.stringify({
              original:localStorage.getItem('miran:v2'),
              seas:localStorage.getItem('treasureV3'),
              side:localStorage.getItem('mindlab:expedition10:v1')})""")
            normal=await measure(page)
            auto_large={'pz_tdig','pz_pliar','pz_pjail'}
            if gid in auto_large:
                assert normal['large'] and normal['zoom']=='1.00',f'{gid}: dense phone board must start at native touch size: {normal}'
                # Preserve the player's right to return to the compact presentation.
                await toggle(page,False)
                normal=await measure(page)
                assert not normal['large'],f'{gid}: compact opt-out did not work'
            else:
                assert not normal['large'],f'{gid}: only reviewed dense boards use the new default'
            await toggle(page,True)
            big=await measure(page)
            assert big['large'] and big['scroll'] and big['zoom']=='1.00',f'{gid}: failed to enable native-size scroll: {big}'
            assert not big['overflowDocument'],f'{gid}: magnification leaked page scroll'
            assert big['board']['height']<=page.viewport_size['height'],f'{gid}: board escaped viewport'
            if gid=='pz_zroute':
                assert big['slider'] and big['slider']['h']>=44,big
                assert big['wait'] and big['wait']['h']>=44,big
                # User must be able to plan a genuine wait step while zoomed.
                await page.locator('#zrw8').click()
                assert await page.evaluate("()=>document.querySelector('#zrt')?.max")=='1','zoomed button did not reach native game'
            if gid=='pz_wlog':
                assert big['slot'] and big['slot']['w']>=44 and big['slot']['h']>=44,big
                # MK keyboard alternative: Enter on a journal page then Enter on its slot.
                await page.locator('.wlgp button[data-tok]').first.focus()
                await page.keyboard.press('Enter')
                await page.locator('[data-wlg-slot="0"]').focus()
                await page.keyboard.press('Enter')
                assert await page.locator('[data-wlg-slot="0"] img').count()>=1,\
                    'keyboard-placed page was not shown in the journal timeline'
            if gid=='pz_zcode':
                letter=page.locator('#zkb button[data-c="ا"]')
                box=await letter.bounding_box()
                assert box and box['width']>=44 and box['height']>=44,                    f'dense cipher keyboard stayed tiny in enlarged mode: {box}'
                available=page.locator('#zkm button.zkc:not([disabled])').first
                await available.click()
                await letter.click()
                assert await page.locator('#zkm button.zkc.sel b').first.inner_text()=='ا',                    'magnified cipher key did not reach the native symbol mapping'
            if gid=='pz_pliar':
                turns=page.locator('#pzb button.pl-rot')
                assert await turns.count()>=2,'palace rotator buttons missing'
                boxes=[await turns.nth(i).bounding_box() for i in range(min(4,await turns.count()))]
                assert all(b and b['width']>=44 and b['height']>=44 for b in boxes),boxes
                await turns.first.click(timeout=4000)
            if gid=='pz_pjail':
                suspect=page.locator('#pzb .jail-card button').first
                await suspect.wait_for(state='visible',timeout=7000)
                bounds=await suspect.bounding_box()
                assert bounds and bounds['height']>=44,bounds
                await suspect.click(timeout=4000)
            if gid=='pz_aheart':
                controls=page.locator('#pzb .heart-tools button')
                assert await controls.count()>=2,'native heart undo/retry controls missing'
                sizes=[await controls.nth(i).bounding_box() for i in range(min(2,await controls.count()))]
                assert all(box and box['height']>=44 for box in sizes),sizes
            if gid=='pz_tdig':
                cells=page.locator('#pzb .xbg button.xc')
                assert await cells.count()>=24,'native dig tiles not found'
                bounds=[await cells.nth(i).bounding_box() for i in range(min(6,await cells.count()))]
                assert all(box and box['width']>=44 and box['height']>=44 for box in bounds),bounds
                await cells.first.click(timeout=4000)
            if OUT:await page.screenshot(path=str(OUT/f'jaziran-magnify-{ENGINE}-{gid}-320.png'))
            await toggle(page,False)
            restored=await measure(page)
            assert not restored['large'] and not restored['overflowDocument'],restored
            native=await page.evaluate("""()=>JSON.stringify({
              original:localStorage.getItem('miran:v2'),
              seas:localStorage.getItem('treasureV3'),
              side:localStorage.getItem('mindlab:expedition10:v1')})""")
            assert saved==native,'presentation changes must not mutate native player save'
            results.append({'id':gid,'autoLarge':gid in auto_large,'small':normal,'large':big,'restored':restored})
            await page.evaluate("()=>closePlay()")
            await page.wait_for_timeout(110)
        assert not errors,errors[:5]
        print('JAZIRAN_MAGNIFY='+json.dumps({'engine':ENGINE,'checked':7,'viewport':'320x640',
          'native_scrolled':True,'keyboard_wlog':True,'slider_zroute':True,'cipher_zcode':True,
          'native_save_unchanged':True,'errors':errors},ensure_ascii=False),flush=True)
        await browser.close()

asyncio.run(main())
