"""86-puzzle browser OPEN/RENDER audit by source chapter, not a solver.

Each independent smoke case enters a real puzzle and inspects mobile play
surface geometry, board controls, screenshots and page errors. Save/score
must remain untouched when entering/exiting. A separate logic suite is
required to claim a puzzle is solvable, and manual review is still required.

python qa/browser/jaziran_86_open_audit.py URL chromium|webkit CHAPTER [OUTDIR]
"""
import asyncio, json, os, sys, traceback
from pathlib import Path
from playwright.async_api import async_playwright
from player_openings import dismiss_opening

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
CHAPTER=sys.argv[3] if len(sys.argv)>3 else 'training'
OUT=Path(sys.argv[4]) if len(sys.argv)>4 else Path('/tmp/mindlab-86')
ROOT=Path(__file__).resolve().parents[2]
INDEX=json.loads((ROOT/'docs/JAZIRAN_PUZZLE_INDEX_2026-11-22.json').read_text(encoding='utf-8'))
SECTIONS={s['chapter']:[e['id'] for e in s['entries'] if e['status']=='active'] for s in INDEX['sections']}
assert CHAPTER in SECTIONS and ENGINE in ('chromium','webkit'),(ENGINE,CHAPTER)
IDS=SECTIONS[CHAPTER]
OUT.mkdir(parents=True,exist_ok=True)

MEASURE=r"""()=>{
  const play=document.querySelector('#play'),stage=document.querySelector('#stage');
  const pzb=document.querySelector('#pzb'),hud=document.querySelector('#play .pzhud');
  if(!play||!stage)return {invalid:'missing puzzle play/stage'};
  const R=e=>{const a=e.getBoundingClientRect();return{x:Math.round(a.x),y:Math.round(a.y),
    w:Math.round(a.width),h:Math.round(a.height),bottom:Math.round(a.bottom)}};
  const visible=e=>!!(e&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
  const controls=[...(pzb||stage).querySelectorAll('button,[role="button"],input,select,textarea,[tabindex],canvas,[data-i],[data-tok],[data-slot]')].filter(visible);
  const touch=controls.map(e=>Math.min(R(e).w,R(e).h)).filter(x=>x>=4);
  const images=[...(pzb||stage).querySelectorAll('img')].filter(visible);
  const drawn=images.filter(i=>i.complete&&i.naturalWidth>0).length;
  const broken=images.filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.getAttribute('src')).slice(0,6);
  const ratios=images.filter(i=>i.naturalWidth>0).map(i=>{
    const r=R(i);return{src:(i.getAttribute('src')||'').slice(-80),
      style:getComputedStyle(i).objectFit,distort:Math.abs((r.w/r.h)-(i.naturalWidth/i.naturalHeight))>0.23,
      rendered:[r.w,r.h],native:[i.naturalWidth,i.naturalHeight]};
  });
  const b=pzb&&R(pzb),v=R(play),h=hud&&R(hud),s=R(stage);
  const scroll=document.documentElement.scrollWidth>innerWidth+3;
  const renderable=!!(b&&b.w>40&&b.h>40&&stage.querySelectorAll('*').length>12);
  return {id:play.dataset.laGame||'',size:[innerWidth,innerHeight],
    board:b,play:v,hud:h,stage:s,controls:controls.length,interactiveMin:touch.length?Math.min(...touch):null,
    smallTouchTargets:touch.filter(x=>x<40).length,hints:visible(document.querySelector('#pzh')),
    title:(document.querySelector('#play .pbar #pt')?.textContent||'').trim().slice(0,80),
    brokenImages:broken,imageCount:images.length,drawnImages:drawn,
    stretchedWithoutFit:ratios.filter(i=>i.distort&&i.style==='fill').slice(0,6),
    fit:play.classList.contains('fit'),renderable,scroll,
    boardBottomVisible:!b||b.bottom<=innerHeight+4||pzb.classList.contains('fit-scroll'),
    bodyOverflow:document.body.scrollWidth>innerWidth+3,
    background:getComputedStyle(play).backgroundColor,
    accent:getComputedStyle(play).getPropertyValue('--mlj-puzzle-accent').trim(),
    authoredPicker:!!document.querySelector('.ml-authored-picker'),
    activeIntro:!!document.querySelector('#fit-opening-overlay:not([hidden])')};
}"""

async def launch(page,game):
    await page.evaluate("(g)=>startRun([g])",game)
    await page.wait_for_timeout(250)
    picker=page.locator('#stage .ml-authored-picker .go-btn[data-level]')
    start=page.locator('#stage #go')
    mode='direct'
    if await picker.count() and await picker.first.is_visible():
        await picker.first.click(timeout=6500)
        mode='authored'
    elif await start.count() and await start.first.is_visible():
        await start.first.click(timeout=6500)
        mode='classic'
    if await dismiss_opening(page,wait=750):mode+='+story'
    # Countdown is asynchronous for some games. Other puzzles expose the board
    # directly; no hardcoded fake click on a missing #go button.
    try:
        await page.wait_for_function("()=>!document.querySelector('#stage .cd')",timeout=8500)
    except Exception:
        pass
    await page.wait_for_timeout(300)
    return mode

async def run():
    async with async_playwright() as pw:
        if ENGINE=='webkit':browser=await pw.webkit.launch()
        else:browser=await pw.chromium.launch(
            executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox'])
        context=await browser.new_context(viewport={'width':390,'height':844},
                   is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        page=await context.new_page()
        page_errors=[]
        page.on('pageerror',lambda e:page_errors.append(str(e)))
        await page.goto(URL,wait_until='domcontentloaded',timeout=45000)
        profile=page.locator('.mpc[data-m=main]')
        if await profile.count() and await profile.is_visible():
            await profile.click(timeout=8000)
        await page.evaluate("()=>tab('puz')")
        await page.wait_for_function("()=>window.mindlabPlayLayers?.ready===true",timeout=45000)
        # Set mute as a test preference only; this is an isolated browser context,
        # not an existing player's account or scores.
        await page.evaluate("()=>{S.st.mute=true}")
        results=[]
        for index,gid in enumerate(IDS):
            run={'id':gid,'engine':ENGINE,'chapter':CHAPTER,'cases':[],'route':None}
            offset=len(page_errors)
            try:
                await page.set_viewport_size({'width':390,'height':844})
                run['route']=await launch(page,gid)
                for width,height in ((390,844),(320,640),(430,932)):
                    await page.set_viewport_size({'width':width,'height':height})
                    await page.wait_for_timeout(180)
                    data=await page.evaluate(MEASURE)
                    data['viewport']=[width,height]
                    run['cases'].append(data)
                run['pageErrors']=page_errors[offset:]
                run['issues']=[]
                for d in run['cases']:
                    if not d.get('renderable'):
                        run['issues'].append(f"{d['viewport'][0]}:board_not_renderable")
                    if d.get('scroll') or d.get('bodyOverflow'):
                        run['issues'].append(f"{d['viewport'][0]}:horizontal_overflow")
                    if d.get('brokenImages'):
                        run['issues'].append(f"{d['viewport'][0]}:broken_image")
                    if d.get('stretchedWithoutFit'):
                        run['issues'].append(f"{d['viewport'][0]}:distorted_image")
                if run['pageErrors']:
                    run['issues'].append('javascript_error')
                if run['issues'] or index==0:
                    await page.set_viewport_size({'width':390,'height':844})
                    await page.screenshot(path=str(OUT/f'{CHAPTER}-{ENGINE}-{gid}.png'),timeout=9000)
            except Exception as ex:
                run['issues']=['exception'];run['error']=str(ex)[:500]
                try:await page.screenshot(path=str(OUT/f'{CHAPTER}-{ENGINE}-{gid}-fail.png'),timeout=8000)
                except Exception:pass
            finally:
                try:await page.evaluate("""()=>{
                    document.querySelectorAll('.fit-sheet').forEach(x=>x.remove());
                    if(typeof closePlay==='function')closePlay();
                }""")
                except Exception:pass
                await page.wait_for_timeout(100)
            results.append(run)
            print('JAZIRAN_86_CASE='+json.dumps({'id':gid,'route':run['route'],
                   'issues':run.get('issues',[]),'cases':len(run['cases'])},ensure_ascii=False),flush=True)
        summary={'engine':ENGINE,'chapter':CHAPTER,'expected':len(IDS),'opened':len(results),
                 'viewports':['390x844','320x640','430x932'],
                 'notable':[{'id':r['id'],'issues':r.get('issues',[]),'error':r.get('error','')}
                   for r in results if r.get('issues')],
                 'smallTargets':{r['id']:max((d.get('smallTouchTargets') or 0 for d in r['cases']),default=0)
                   for r in results},
                 'cases':results}
        path=OUT/f'{CHAPTER}-{ENGINE}.json'
        path.write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
        print('JAZIRAN_86_SUMMARY='+json.dumps({k:v for k,v in summary.items() if k not in ('cases','smallTargets')},ensure_ascii=False),flush=True)
        await browser.close()
        # Fail CI for missing boards, errors, overflow, or broken artwork, but keep
        # all per-puzzle JSON/screenshots for a targeted correction pass.
        assert not summary['notable'],f"{len(summary['notable'])}/{len(results)} puzzles need attention; see {path}"

asyncio.run(run())
