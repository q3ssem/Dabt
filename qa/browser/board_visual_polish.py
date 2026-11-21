"""Visual acceptance for the shared 5.5.29 board polish (real Chromium/WebKit).
The script checks both light/dark styles, circular icon hit areas, typography,
stage-picker geometry and a genuine gameplay screen; optional screenshots are
uploaded as GitHub Actions artifacts for human review.
"""
import asyncio
import json
import os
from pathlib import Path
import sys
from playwright.async_api import async_playwright
from smoke import open_game
from player_openings import dismiss_opening, close_transition

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765/"
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
SHOTS = Path(sys.argv[3]) if len(sys.argv) > 3 else None
if SHOTS:
    SHOTS.mkdir(parents=True, exist_ok=True)

MEASURE = """() => {
  const root=document.querySelector('#play');
  const s=getComputedStyle(root);
  const title=document.querySelector('#play .pbar #pt');
  const close=document.querySelector('#play .pbar .x');
  const t=title && getComputedStyle(title);
  const c=close && getComputedStyle(close);
  const r=close && close.getBoundingClientRect();
  const rgb=(v)=>{
    const n=String(v).match(/[0-9.]+/g);
    return n && n.length>=3?n.slice(0,3).map(Number):null;
  };
  const luminance=arr=>{
    if(!arr)return null;
    const x=arr.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});
    return .2126*x[0]+.7152*x[1]+.0722*x[2];
  };
  const l1=luminance(rgb(c?.color)),l2=luminance(rgb(c?.backgroundColor));
  const contrast=l1!==null&&l2!==null?(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05):null;
  const picker=document.querySelector('#stage .ml-authored-picker');
  const tools=[...document.querySelectorAll('#play .pzhud .pzhb,#play .fit-tools .pzgive')];
  return {
    skin:document.documentElement.dataset.skin,
    preference:typeof S!=='undefined'?S.st.skin:'unknown',
    ink:s.getPropertyValue('--bp-ink').trim(),teal:s.getPropertyValue('--bp-teal').trim(),
    titleFont:t?.fontFamily||'',titleSize:parseFloat(t?.fontSize||0),
    button:close?{size:[Math.round(r.width),Math.round(r.height)],
      radius:parseFloat(c.borderTopLeftRadius),contrast:Math.round(contrast*100)/100,
      background:c.backgroundColor,color:c.color}:null,
    hudIcons:tools.map(b=>{const r=b.getBoundingClientRect(),v=getComputedStyle(b);
      return {width:Math.round(r.width),height:Math.round(r.height),
        radius:parseFloat(v.borderTopLeftRadius),background:v.backgroundColor};
    }),
    pickerButtons:picker?.querySelectorAll('.ml-authored-levels button').length||0,
    overflow:document.documentElement.scrollWidth>innerWidth+3
  };
}"""

async def run():
    assert ENGINE in ("chromium","webkit")
    async with async_playwright() as pw:
        if ENGINE=="chromium":
            browser=await pw.chromium.launch(executable_path=os.getenv("CHROME","/usr/bin/google-chrome"),args=["--no-sandbox"])
        else:
            browser=await pw.webkit.launch()
        ctx=await browser.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True,locale="ar-SA",reduced_motion="reduce")
        page=await ctx.new_page()
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        await page.goto(URL,wait_until="load",timeout=45000)
        profile=page.locator(".mpc[data-m=main]")
        if await profile.count() and await profile.is_visible():
            await profile.click()
        await page.evaluate("()=>tab('puz')")
        await page.wait_for_function("()=>!!window.mindlabPlayLayers?.ready",timeout=45000)
        await page.wait_for_function("()=>!!document.querySelector('link[href*=board-polish]')?.sheet",timeout=15000)
        await page.evaluate("()=>document.fonts.ready")
        rows=[]
        for skin,width in [("light",320),("light",390),("dark",390)]:
            await page.set_viewport_size({"width":width,"height":844})
            # release54.js watches data-skin and restores the preference in
            # S.st.skin; use the actual app setting instead of only changing HTML.
            await page.evaluate("""(skin)=>{
              S.st.skin=skin; S.save();
              document.documentElement.dataset.skin=skin;
            }""",skin)
            await page.wait_for_function("(skin)=>document.documentElement.dataset.skin===skin",arg=skin,timeout=8000)
            await page.evaluate("()=>startRun(['pz_river'])")
            await page.locator("#stage .ml-authored-picker").wait_for(state="visible",timeout=20000)
            a=await page.evaluate(MEASURE)
            assert a["ink"] and a["teal"],f"Missing design palette for {skin}"
            assert a["titleFont"] and "tajawal" in a["titleFont"].lower(),f"Unexpected Arabic title font {a}"
            assert a["button"],"Missing close icon"
            assert min(a["button"]["size"])>=40 and a["button"]["radius"]>=19,f"Close icon not circular: {a}"
            assert a["button"]["contrast"] and a["button"]["contrast"]>=3.0,f"Low-contrast close icon: {a}"
            assert a["pickerButtons"]>=10,f"Stage picker hidden or incomplete: {a}"
            assert not a["overflow"],f"Horizontal overflow at {width}: {a}"
            # Verify the final authored stage is actually reachable on 320px
            # screens instead of being clipped below the fixed-height play area.
            last=page.locator("#stage .ml-authored-levels button").last
            await last.scroll_into_view_if_needed(timeout=7000)
            stage_reachable=await page.evaluate("""()=>{
              const picker=document.querySelector('#stage .ml-authored-picker');
              const last=picker.querySelector('.ml-authored-levels button:last-child');
              const p=picker.getBoundingClientRect(), r=last.getBoundingClientRect();
              return r.top>=p.top-2 && r.bottom<=p.bottom+2 &&
                r.bottom<=window.innerHeight+2;
            }""")
            assert stage_reachable,f"Last stage is clipped or unreachable on {width}px"
            if SHOTS and width==320:
                await page.screenshot(path=str(SHOTS/f"river-picker-last-stage-{skin}-{width}.png"))
            await page.evaluate("()=>document.querySelector('#stage .ml-authored-picker').scrollTop=0")
            rows.append({"theme":skin,"width":width,**a})
            if SHOTS:
                await page.screenshot(path=str(SHOTS/f"river-picker-{skin}-{width}.png"))
            await page.locator("#stage .ml-authored-picker .go-btn").click()
            # The story opening deliberately stays above the selector until the
            # player taps Start; never bypass the narrative gate in visual QA.
            await dismiss_opening(page,wait=2200)
            await close_transition(page)
            initial=await page.evaluate("""()=>{
              const root=document.querySelector('#stage');
              return {html:root?.innerHTML?.slice(0,180),
                authored:typeof RUN!=='undefined'?RUN?.authoredStage?.number:null,
                countdown:!!root?.querySelector('.cd'),
                picker:!!root?.querySelector('.ml-authored-picker')};
            }""")
            await page.wait_for_timeout(3200)
            follow=await page.evaluate("""()=>{
              const root=document.querySelector('#stage');
              return {html:root?.innerHTML?.slice(0,180),
                authored:typeof RUN!=='undefined'?RUN?.authoredStage?.number:null,
                countdown:!!root?.querySelector('.cd'),
                picker:!!root?.querySelector('.ml-authored-picker'),
                next:!!root?.querySelector('.lb,.pzbody,.ml-river-board')};
            }""")
            if follow["picker"]:
                if SHOTS: await page.screenshot(path=str(SHOTS/f"stuck-after-start-{skin}-{width}.png"))
                print("BOARD_STAGE_CLICK_DIAG="+json.dumps({"engine":ENGINE,"theme":skin,"width":width,"initial":initial,"follow":follow},ensure_ascii=False),flush=True)
            await page.locator("#stage .ml-authored-picker").wait_for(state="detached",timeout=9000)
            await page.wait_for_timeout(350)
            game=await page.evaluate(MEASURE)
            assert not game["overflow"],f"Game board overflow at {skin} {width}"
            for icon in game["hudIcons"]:
                assert min(icon["width"],icon["height"])>=40 and icon["radius"]>=18,f"Noncircular HUD icon: {icon}"
            if SHOTS:
                await page.screenshot(path=str(SHOTS/f"river-board-{skin}-{width}.png"))
            await page.evaluate("()=>closePlay()")
            await page.wait_for_timeout(200)
        assert rows[0]["ink"]!=rows[-1]["ink"],"Dark theme must change ink palette"
        assert rows[0]["teal"]!=rows[-1]["teal"],"Dark theme must change accent palette"
        await page.set_viewport_size({"width":390,"height":844})
        await page.evaluate("()=>document.documentElement.dataset.skin='light'")
        await open_game(page,"dual")
        legacy=await page.evaluate(MEASURE)
        assert legacy["button"] and legacy["button"]["radius"]>=19,"Legacy brain-game HUD not polished"
        assert not legacy["overflow"],"Brain-game panel overflows"
        if SHOTS:
            await page.screenshot(path=str(SHOTS/"brain-dual-light-390.png"))
        await page.evaluate("()=>closePlay()")
        assert not errors,errors[:5]
        print("BOARD_VISUAL_ACCEPTANCE="+json.dumps({
          "engine":ENGINE,"panels":len(rows)+1,"themes":["light","dark"],
          "widths":[320,390],"picker_levels":rows[0]["pickerButtons"],
          "close_contrast":[row["button"]["contrast"] for row in rows],
          "hud_icon_counts":[len(row["hudIcons"]) for row in rows],"errors":errors
        },ensure_ascii=False),flush=True)
        await browser.close()

asyncio.run(run())
