"""Batch-3 PDF palette acceptance: 86 color identities, light/dark and safe audio gating.
This is a browser rendering test, not proof that 86 puzzles were each solved.
Usage: python qa/browser/jaziran_batch3_palette.py URL [chromium|webkit] [screenshots-dir]
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from player_openings import dismiss_opening

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
SHOTS=Path(sys.argv[3]) if len(sys.argv)>3 else None
if SHOTS:SHOTS.mkdir(parents=True,exist_ok=True)
ROOT=Path(__file__).resolve().parents[2]
INDEX=json.loads((ROOT/'docs/JAZIRAN_PUZZLE_INDEX_2026-11-22.json').read_text(encoding='utf-8'))
ENTRIES=[{'id':e['id'],'color':e['proposed_color'].upper()} for sec in INDEX['sections'] for e in sec['entries'] if e['status']=='active']
assert len(ENTRIES)==86

async def main():
    assert ENGINE in ('chromium','webkit')
    async with async_playwright() as p:
        browser=await (p.webkit.launch() if ENGINE=='webkit' else p.chromium.launch(
            executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox']))
        ctx=await browser.new_context(viewport={'width':390,'height':844},locale='ar-SA',
                                      is_mobile=True,has_touch=True,reduced_motion='reduce')
        page=await ctx.new_page()
        errors=[]
        page.on('pageerror',lambda exc:errors.append(str(exc)))
        await page.goto(URL,wait_until='load',timeout=45000)
        picker=page.locator('.mpc[data-m=main]')
        if await picker.count() and await picker.is_visible():await picker.click()
        await page.evaluate("()=>tab('puz')")
        await page.wait_for_function("()=>window.mindlabPlayLayers?.ready",timeout=45000)
        # Use a known authored level rather than the legacy #go intro: river opens a stage picker.
        await page.evaluate("()=>startRun(['pz_river'])")
        await page.locator('#stage .ml-authored-picker .go-btn[data-level]').wait_for(state='visible',timeout=20000)
        await page.locator('#stage .ml-authored-picker .go-btn[data-level]').click()
        await dismiss_opening(page,wait=1000)
        await page.wait_for_function("()=>!document.querySelector('#stage .cd')",timeout=20000)
        actual=await page.evaluate("()=>document.querySelector('#play')?.dataset.laGame")
        assert actual=='pz_river',f'active game marker missing: {actual}'
        # The actual HUD is on screen; temporarily change only the marker to exercise
        # the CSS selector table, then restore it without touching any engine state.
        for theme in ('light','dark'):
            await page.evaluate("(skin)=>{S.st.skin=skin;document.documentElement.dataset.skin=skin}",theme)
            await page.wait_for_function("(skin)=>document.documentElement.dataset.skin===skin",arg=theme)
            measured=await page.evaluate("""entries=>{
              const play=document.getElementById('play'), bar=play.querySelector('.pbar'), original=play.dataset.laGame;
              const data=[];
              for(const e of entries){
                play.dataset.laGame=e.id;
                const style=getComputedStyle(play);
                const rim=getComputedStyle(bar);
                data.push({id:e.id,color:style.getPropertyValue('--mlj-puzzle-accent').trim().toUpperCase(),
                  border:rim.borderTopColor,top:rim.borderTopWidth});
              }
              play.dataset.laGame=original;
              return data;
            }""",ENTRIES)
            assert len(measured)==86
            assert all(x['color']==entry['color'] for x,entry in zip(measured,ENTRIES)),\
                f"palette mismatch in {theme}: {[x for x,e in zip(measured,ENTRIES) if x['color']!=e['color']][:4]}"
            assert all(float(x['top'].replace('px',''))>=2.9 for x in measured),'palette rim not painted'
            assert len(set(x['color'] for x in measured))==86,'non-unique identity colors'
            if SHOTS:await page.screenshot(path=str(SHOTS/f'jaziran-palette-{ENGINE}-{theme}.png'))
        # No dormant source or muted audio may become a sound-producing action.
        audio=await page.evaluate("""()=>{
          if(typeof sfx!=='object'||typeof sfx.puzzleIdentity!=='function')return {installed:false};
          const muted=S.st.mute;
          S.st.mute=true;
          const silent=sfx.puzzleIdentity('pz_river');
          S.st.mute=muted;
          return {installed:true,mutedSilent:silent===false,
            unknownSilent:sfx.puzzleIdentity('pz_xbottle')===false};
        }""")
        assert audio['installed'] and audio['mutedSilent'] and audio['unknownSilent'],audio
        assert not errors,errors[:5]
        print('JAZIRAN_BATCH3_PALETTE='+json.dumps({'engine':ENGINE,'verified_palette':86,
              'themes':['light','dark'],'audio_mute_safe':True,'retired_audio_safe':True,
              'actual_game':'pz_river','errors':errors},ensure_ascii=False),flush=True)
        await browser.close()

asyncio.run(main())
