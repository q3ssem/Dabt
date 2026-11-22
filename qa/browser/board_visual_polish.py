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
            # The back-to-library action follows the 20 stages: it must also be reachable.
            back=page.locator("#stage .ml-authored-picker [data-back]")
            await back.scroll_into_view_if_needed(timeout=7000)
            back_reachable=await page.evaluate("""()=>{
              const picker=document.querySelector('#stage .ml-authored-picker');
              const action=picker.querySelector('[data-back]');
              const p=picker.getBoundingClientRect(),r=action.getBoundingClientRect();
              return r.top>=p.top-2 && r.bottom<=p.bottom+2 &&
                r.bottom<=window.innerHeight+2;
            }""")
            assert back_reachable,f"Return button is clipped or unreachable on {width}px"
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
        await page.evaluate("""()=>{
          S.st.skin='light';S.save();document.documentElement.dataset.skin='light';
        }""")
        await page.wait_for_function("()=>document.documentElement.dataset.skin==='light'",timeout=7000)
        await open_game(page,"dual")
        # Verify the N-Back grid and both response buttons use portrait height
        # without stretching the 3x3 tiles or moving buttons off-screen.
        dual_metrics=[]
        for bw,bh in [(320,760),(390,844),(430,932)]:
            await page.set_viewport_size({"width":bw,"height":bh})
            measured=await page.evaluate("""()=>{
                const b=document.querySelector('#stage > #bd.board');
                const btn=document.querySelector('#stage > .duo');
                const body=document.querySelector('#stage');
                if(!b||!btn)return null;
                const r=b.getBoundingClientRect(),q=btn.getBoundingClientRect();
                const cs=getComputedStyle(body);
                return {boardWidth:Math.round(r.width),boardHeight:Math.round(r.height),
                  matchBottom:Math.round(q.bottom),below:Math.round(innerHeight-q.bottom),
                  justify:cs.justifyContent,
                  controls:btn.querySelectorAll('button').length,
                  overflow:document.documentElement.scrollWidth>innerWidth+3};
            }""")
            assert measured and measured["controls"]==2,f"N-Back match controls missing at {bw}px: {measured}"
            assert abs(measured["boardWidth"]-measured["boardHeight"])<=3,f"N-Back tiles distorted: {measured}"
            assert measured["below"]>=8 and not measured["overflow"],f"N-Back controls cropped at {bw}px: {measured}"
            if bh>=844:
                assert measured["justify"]=="space-evenly",f"Brain-game height was not redistributed: {measured}"
                assert measured["below"]<=140,f"Excessive blank space under N-Back at {bw}px: {measured}"
            dual_metrics.append({"width":bw,**measured})
            if SHOTS: await page.screenshot(path=str(SHOTS/f"brain-dual-light-{bw}.png"))
        await page.set_viewport_size({"width":390,"height":844})
        legacy=await page.evaluate(MEASURE)
        assert legacy["skin"]=="light" and legacy["ink"]==rows[0]["ink"],"Brain-game screenshot does not use the saved light theme"
        assert legacy["button"] and legacy["button"]["radius"]>=19,"Legacy brain-game HUD not polished"
        assert not legacy["overflow"],"Brain-game panel overflows"
        if SHOTS:
            await page.screenshot(path=str(SHOTS/"brain-dual-light-390.png"))
        await page.evaluate("()=>closePlay()")
        # Verify the two separately-rendered campaign families also inherit
        # the visual typography while keeping their own handcrafted board art.
        await page.evaluate("()=>T7.open(0,true)")
        await page.locator("#v-puz .t7-puzzle-pane").wait_for(state="visible",timeout=18000)
        await page.locator("#v-puz.t7 .t7-tools .fit-pinfo").wait_for(state="visible",timeout=15000)
        sea=await page.evaluate("""()=>{
          const host=document.querySelector('#v-puz .t7-puzzle-pane');
          const info=document.querySelector('#v-puz .v5-chip');
          const icon=document.querySelector('#v-puz.t7 .t7-tools .t7-tool-icon');
          const rect=icon?.getBoundingClientRect();
          const visual=icon&&getComputedStyle(icon);
          const help=document.querySelector('#v-puz.t7 .t7-tools .fit-pinfo');
          const hr=help?.getBoundingClientRect();
          const hs=help&&getComputedStyle(help);
          return {visible:!!host && host.getBoundingClientRect().height>80,
            font:getComputedStyle(info||host).fontFamily,
            roundTool:!!icon&&Math.min(rect.width,rect.height)>=42 &&
              (visual.borderTopLeftRadius==='50%'||parseFloat(visual.borderTopLeftRadius)>=20),
            roundHelp:!!help&&Math.min(hr.width,hr.height)>=44&&parseFloat(hs.borderTopLeftRadius)>=20,
            blockingToasts:document.querySelectorAll('.fit-pbubble').length,
            overflow:document.documentElement.scrollWidth>innerWidth+3};
        }""")
        assert sea["visible"] and not sea["overflow"],f"Treasure campaign board is not usable: {sea}"
        assert sea['roundTool'] and sea['roundHelp'],f'Treasure toolbar icons are not all circular: {sea}'
        assert sea['blockingToasts']==0,f'Treasure rule toast is obstructing its board: {sea}'
        await page.locator('#v-puz.t7 .t7-tools .fit-pinfo').click()
        await page.locator('.fit-sheet-card .fit-sh-rule').wait_for(state='visible',timeout=7000)
        await page.locator('.fit-sheet-card .fit-sh-go').click()
        if SHOTS: await page.screenshot(path=str(SHOTS/"treasure-sea1-light-390.png"))
        await page.evaluate("async()=>await window.mindlabSide.start()")
        await page.wait_for_function("()=>!!window.ML10",timeout=20000)
        await page.evaluate("()=>ML10.startStage(0)")
        await page.locator("#v-puz .ex10-game-shell").wait_for(state="visible",timeout=18000)
        await page.locator("#v-puz .ex10-top-right .fit-pinfo").wait_for(state="visible",timeout=15000)
        side=await page.evaluate("""()=>{
          const host=document.querySelector('#v-puz .ex10-game-shell');
          const title=document.querySelector('#v-puz .ex10-game-top');
          const label=title?.querySelector('b');
          const c=label?getComputedStyle(label).color:'';
          const numbers=c.match(/[0-9.]+/g)?.slice(0,3).map(Number)||[];
          const back=title?.querySelector('.ex10-back');
          const rect=back?.getBoundingClientRect();
          const help=document.querySelector('#v-puz .ex10-top-right .fit-pinfo');
          const hr=help?.getBoundingClientRect();
          const hs=help&&getComputedStyle(help);
          return {visible:!!host && host.getBoundingClientRect().height>90,
            font:getComputedStyle(title||host).fontFamily,
            titleContrast:!!numbers.length&&Math.min(...numbers)>200,
            roundBack:!!back&&Math.min(rect.width,rect.height)>=42&&
               (getComputedStyle(back).borderTopLeftRadius==='50%' ||
                parseFloat(getComputedStyle(back).borderTopLeftRadius)>=20),
            roundHelp:!!help&&Math.min(hr.width,hr.height)>=44&&parseFloat(hs.borderTopLeftRadius)>=20,
            blockingToasts:document.querySelectorAll('.fit-pbubble').length,
            overflow:document.documentElement.scrollWidth>innerWidth+3};
        }""")
        assert side["visible"] and not side["overflow"],f"Side-journey board is not usable: {side}"
        assert side['titleContrast'] and side['roundBack'] and side['roundHelp'],f'Side-journey header or rules icons fail polish: {side}'
        assert side['blockingToasts']==0,f'Stale instructions carried into side journey: {side}'
        await page.locator('#v-puz .ex10-top-right .fit-pinfo').click()
        await page.locator('.fit-sheet-card .fit-sh-story').wait_for(state='visible',timeout=7000)
        await page.locator('.fit-sheet-card .fit-sh-go').click()
        if SHOTS: await page.screenshot(path=str(SHOTS/"side-lighthouse-light-390.png"))
        # Small iPhones (320 CSS px) and current large iPhones (430 CSS px):
        # all four chapter toolbar icons must remain reachable without
        # overhanging the viewport. This also catches title/button collisions.
        mobile_sizes=[(320,760),(430,932)]
        for width,height in mobile_sizes:
            await page.set_viewport_size({"width":width,"height":height})
            await page.evaluate("()=>T7.open(0,true)")
            await page.locator('#v-puz.t7 .t7-tools .fit-pinfo').wait_for(state='visible',timeout=10000)
            sea_mobile=await page.evaluate("""()=>{
              const all=[...document.querySelectorAll('#v-puz.t7 .t7-tools button')];
              const title=document.querySelector('#v-puz.t7 .t7-top h1')?.getBoundingClientRect();
              const icons=all.map(x=>x.getBoundingClientRect());
              const intersect=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+2&&
                Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+2;
              return {icons:icons.length,
                bounded:icons.every(r=>r.left>=-2&&r.right<=innerWidth+2),
                titleCollision:!!title&&icons.some(r=>intersect(title,r)),
                overflow:document.documentElement.scrollWidth>innerWidth+3};
            }""")
            assert sea_mobile["icons"]==4 and sea_mobile["bounded"],f"Sea toolbar does not fit {width}px: {sea_mobile}"
            assert not sea_mobile["titleCollision"] and not sea_mobile["overflow"],f"Sea title collides on {width}px: {sea_mobile}"
            if SHOTS: await page.screenshot(path=str(SHOTS/f"treasure-sea1-light-{width}.png"))
            await page.evaluate("()=>ML10.startStage(0)")
            await page.locator('#v-puz .ex10-top-right .fit-pinfo').wait_for(state='visible',timeout=10000)
            side_mobile=await page.evaluate("""()=>{
              const all=[...document.querySelectorAll('#v-puz .ex10-game-top button')];
              const heading=document.querySelector('#v-puz .ex10-game-top>div:first-child')?.getBoundingClientRect();
              const icons=all.map(x=>x.getBoundingClientRect());
              const intersect=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+2&&
                Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+2;
              return {icons:icons.length,
                bounded:icons.every(r=>r.left>=-2&&r.right<=innerWidth+2),
                titleCollision:!!heading&&icons.some(r=>intersect(heading,r)),
                overflow:document.documentElement.scrollWidth>innerWidth+3};
            }""")
            assert side_mobile["icons"]>=2 and side_mobile["bounded"],f"Side toolbar does not fit {width}px: {side_mobile}"
            # Lighthouse evidence should be readable text rows, not stacked
            # bordered cards. Verify typography and preserve every clue.
            evidence=await page.evaluate("""()=>{
              const box=document.querySelector('#v-puz .ex10-game-content .ex10-clues');
              if(!box)return null;
              const clues=[...box.querySelectorAll('.ex10-clue')];
              const rows=clues.map(el=>{
                const x=el.getBoundingClientRect(),s=getComputedStyle(el);
                return {left:Math.round(x.left),width:Math.round(x.width),
                  font:parseFloat(s.fontSize),bg:s.backgroundColor,
                  text:el.textContent.trim().length,rounded:parseFloat(s.borderRadius)};
              });
              return {count:clues.length,rows,
                grid:getComputedStyle(box).gridTemplateColumns,
                overflow:document.documentElement.scrollWidth>innerWidth+3};
            }""")
            assert evidence and evidence["count"]>=5,f"Lighthouse clue list incomplete at {width}px: {evidence}"
            assert all(x["font"]>=12 and x["text"]>6 and x["rounded"]==0 for x in evidence["rows"]),f"Side clues too small or still heavy cards: {evidence}"
            assert len(set(x["left"] for x in evidence["rows"]))==1,f"Clues are misaligned at {width}px: {evidence}"
            assert not evidence["overflow"],f"Side clues horizontally overflow at {width}px"

            assert not side_mobile["titleCollision"] and not side_mobile["overflow"],f"Side title collides on {width}px: {side_mobile}"
            if SHOTS: await page.screenshot(path=str(SHOTS/f"side-lighthouse-light-{width}.png"))
            if width==320:
                # WebKit formerly pushed the last row and status off the
                # 760px screenshot. Keep all real buttons reachable and >=44px.
                lower=await page.evaluate("""()=>{
                    const shell=document.querySelector('#v-puz .ex10-game-shell[data-stage-id="ml10_01"]');
                    const buttons=[...shell.querySelectorAll('.ex10-game-content > .ex10-controls button')];
                    const status=shell.querySelector('#ex10-feedback')?.getBoundingClientRect();
                    return {buttons:buttons.map(b=>{const r=b.getBoundingClientRect();return {
                        left:r.left,right:r.right,height:r.height,bottom:r.bottom};}),
                        statusTop:status?.top??null,statusBottom:status?.bottom??null,viewport:innerHeight};
                }""")
                assert len(lower["buttons"])==4,f"Lighthouse submit and recovery tools missing: {lower}"
                assert all(b["height"]>=44 and b["left"]>=-1 and b["right"]<=width+1
                           and b["bottom"]<=height-4 for b in lower["buttons"]),f"Lighthouse buttons clipped: {lower}"
                assert lower["statusBottom"] is not None and lower["statusBottom"]<=height-2,f"Lighthouse feedback clipped below fold: {lower}"
        # Verify the lighthouse clue background in DARK mode independently:
        # pale text must never be placed on the default light cream parent.
        await page.set_viewport_size({"width":390,"height":844})
        await page.evaluate("""()=>{
            S.st.skin='dark';S.save();document.documentElement.dataset.skin='dark';
            ML10.startStage(0);
        }""")
        await page.locator('#v-puz .ex10-game-shell[data-stage-id="ml10_01"] .ex10-clue').first.wait_for(state='visible',timeout=15000)
        dark_clues=await page.evaluate("""()=>{
            const p=document.querySelector('#v-puz .ex10-game-shell[data-stage-id="ml10_01"] .ex10-clues');
            const clue=p.querySelector('.ex10-clue');
            const s=getComputedStyle(p),c=getComputedStyle(clue);
            const values=x=>[...x.matchAll(/[0-9.]+/g)].slice(0,3).map(v=>+v[0]);
            const light=x=>{const v=values(x).map(z=>{z/=255;return z<=.04045?z/12.92:((z+.055)/1.055)**2.4;});
                return .2126*v[0]+.7152*v[1]+.0722*v[2];};
            const a=light(s.backgroundColor),b=light(c.color);
            return {background:s.backgroundColor,ink:c.color,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),
                count:p.querySelectorAll('.ex10-clue').length,overflow:document.documentElement.scrollWidth>innerWidth+3};
        }""")
        assert dark_clues["contrast"]>=4.5 and dark_clues["count"]==5 and not dark_clues["overflow"],f"Dark lighthouse evidence unreadable: {dark_clues}"
        if SHOTS: await page.screenshot(path=str(SHOTS/"side-lighthouse-dark-390.png"))
        # Complete the actual lock and inspect the result panel and next/retry/map.
        for digit,steps in ((1,4),(2,2)):
            for _ in range(steps):
                await page.locator(f'[data-dial="{digit}"][data-dir="up"]').click()
        await page.locator('[data-ex10="check-code"]').click()
        await page.locator('#v-puz .ex10-outcome').wait_for(state='visible',timeout=12000)
        result=await page.evaluate("""()=>{
            const p=document.querySelector('#v-puz .ex10-outcome');
            const actions=[...p.querySelectorAll('.ex10-actions-row button')];
            const numbers=x=>[...String(x).matchAll(/[0-9.]+/g)].slice(0,3).map(v=>+v[0]);
            const lum=x=>{const v=numbers(x).map(z=>{z/=255;return z<=.04045?z/12.92:((z+.055)/1.055)**2.4;});
                return .2126*v[0]+.7152*v[1]+.0722*v[2];};
            const ratio=(a,b)=>{const u=lum(a),v=lum(b);return (Math.max(u,v)+.05)/(Math.min(u,v)+.05);};
            const bg=getComputedStyle(p).backgroundColor;
            const heading=p.querySelector('h2'),body=p.querySelector(':scope > p');
            return {heading:heading?.textContent,
                headingContrast:heading?ratio(getComputedStyle(heading).color,bg):0,
                bodyContrast:body?ratio(getComputedStyle(body).color,bg):0,
                actions:actions.map(b=>{
                    const r=b.getBoundingClientRect(),c=getComputedStyle(b);
                    return {height:r.height,width:r.width,radius:parseFloat(c.borderTopLeftRadius),
                            background:c.backgroundColor};}),
                overflow:document.documentElement.scrollWidth>innerWidth+3};
        }""")
        assert result["heading"]=="نجاح!" and len(result["actions"])==3,f"Lighthouse outcome is incomplete: {result}"
        assert result["headingContrast"]>=4.5 and result["bodyContrast"]>=4.5,f"Dark outcome text is unreadable: {result}"
        assert all(min(b["width"],b["height"])>=48 and b["radius"]>=23 for b in result["actions"]) and not result["overflow"],f"Result controls inaccessible or not circular: {result}"
        if SHOTS: await page.screenshot(path=str(SHOTS/"side-lighthouse-result-dark-390.png"))
        assert not errors,errors[:5]
        print("BOARD_VISUAL_ACCEPTANCE="+json.dumps({
          "engine":ENGINE,"panels":len(rows)+3,"themes":["light","dark"],
          "widths":[320,390,430],"picker_levels":rows[0]["pickerButtons"],
          "close_contrast":[row["button"]["contrast"] for row in rows],
          "hud_icon_counts":[len(row["hudIcons"]) for row in rows],
          "dual_layout":dual_metrics,"errors":errors
        },ensure_ascii=False),flush=True)
        await browser.close()

asyncio.run(run())
