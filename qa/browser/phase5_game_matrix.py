"""Phase 5: run a representative matrix of live brain/movement game introductions.
This complements pure logic tests and does not claim every level was solved.
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
from smoke import open_game
from player_openings import dismiss_opening

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
AUTHORED={'pz_river','pz_rush','pz_pipe','pz_flow','pz_ice','pz_tan','pz_untangle'}
SELECTED=[
  'dual','juggle','loci','piano','scene','matrix',
  'pz_river','pz_rush','pz_pipe','pz_flow','pz_ice','pz_tan','pz_untangle'
]
async def open_one(page, gid, width):
    await page.set_viewport_size({'width':width,'height':844})
    if gid in AUTHORED:
        # These seven games open their authored-stage picker instead of the legacy #go button.
        await page.evaluate('(id)=>startRun([id])',gid)
        picker=page.locator('#stage .ml-authored-picker')
        await picker.wait_for(state='visible',timeout=20000)
        resume=picker.locator('.go-btn[data-level]')
        await resume.click()
        await dismiss_opening(page,wait=1000)
        await page.wait_for_function("()=>!document.querySelector('#stage .cd')",timeout=20000)
        await page.wait_for_timeout(400)
    else:
        # Older games use the shared legacy #go intro; wait for countdown completion.
        await open_game(page,gid)
    # A usable stage must retain navigation/controls; do not assume specific engine geometry.
    info=await page.evaluate("""()=>{
       const stage=document.querySelector('#stage');
       const body=document.querySelector('#play');
       const W=document.documentElement.clientWidth;
       return {
          nodes:stage?.querySelectorAll('*')?.length||0,
          buttons:stage?.querySelectorAll('button,input,[role="button"],canvas,[tabindex]')?.length||0,
          stageHeight:Math.round(stage?.getBoundingClientRect().height||0),
          wide:document.documentElement.scrollWidth>W+3,
          visible:!!body&&getComputedStyle(body).display!=='none'
       };
    }""")
    assert info['nodes']>=2 and info['stageHeight']>40 and info['visible'],f'{gid}@{width}: empty or invisible game: {info}'
    assert not info['wide'],f'{gid}@{width}: horizontal overflow'
    assert info['buttons']>0 or info['nodes']>12,f'{gid}@{width}: no game board elements'
    await page.evaluate('()=>closePlay()')
    await page.wait_for_timeout(130)
    return info

async def main():
    assert ENGINE in ('chromium','webkit')
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox']))
        context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        page=await context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(URL,wait_until='load',timeout=45000)
        profile=page.locator('.mpc[data-m=main]')
        if await profile.count() and await profile.is_visible(): await profile.click()
        await page.evaluate("()=>tab('puz')")
        await page.wait_for_function("()=>!!window.mindlabPlayLayers?.ready",timeout=45000)
        results=[]
        for gid in SELECTED:
            for width in ([320,390,430] if gid in ('pz_river','pz_rush','pz_pipe','pz_flow','pz_ice','pz_tan','pz_untangle') else [390]):
                try:
                    result=await open_one(page,gid,width)
                    results.append({'id':gid,'width':width,'controls':result['buttons']})
                except Exception as err:
                    raise AssertionError(f'{gid}@{width}: {err}') from err
                assert not errors,f'Page errors after {gid}: {errors[:4]}'
        assert len(results)==27,len(results)
        print('PHASE5_GAME_MATRIX='+json.dumps({'engine':ENGINE,'cases':len(results),'tested_games':SELECTED,'widths':[320,390,430],'errors':errors},ensure_ascii=False),flush=True)
        await browser.close()
asyncio.run(main())
