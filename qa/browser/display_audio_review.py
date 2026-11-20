"""Measure playable surface and exercise controls using a local review build."""
import argparse
import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright
from player_openings import dismiss_opening

SAMPLES = {'pz_river': '.rv10', 'pz_rush': '#rhb', 'pz_stat': '.st10'}
SIZES = [(320, 640), (390, 844), (430, 932), (844, 390)]
METRICS = """(selector)=>{
 const host = document.querySelector('#pzb'), scene = host?.querySelector(selector);
 if (!scene) return null;
 const box = e => {const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
 const B=box(host), P=box(scene);
 const targets=[...scene.querySelectorAll('button:not([disabled])')].filter(e=>e.getClientRects().length);
 const visibleButton = b => b.getClientRects().length && getComputedStyle(b).visibility==='visible';
 const buttons=[...document.querySelectorAll('#stage button,#quit')].filter(visibleButton);
 const overflow=targets.filter(e=>{const r=box(e); return r.x<0||r.y<0||r.x+r.w>innerWidth+1||r.y+r.h>innerHeight+1;});
 const hit=targets.filter(e=>{const r=box(e);return !e.contains(document.elementFromPoint(r.x+r.w/2,r.y+r.h/2));});
 return {body:B,scene:P,viewport:[innerWidth,innerHeight], heightUse:P.h/B.h,areaUse:P.h*P.w/(B.h*B.w),
   horizontalUse:P.w/B.w,blankY:Math.max(0,B.h-P.h),minTarget:Math.min(...targets.map(e=>{const r=box(e);return Math.min(r.w,r.h);})),
   clippedTargets:overflow.length,blockedCenters:hit.length,scroll:host.scrollHeight>host.clientHeight+2,
   hud:[...document.querySelectorAll('.pzhud button')].filter(visibleButton).map(e=>[e.id,e.getAttribute('aria-label'),box(e)]),
   duplicateActions:buttons.filter(e=>e.matches('.lb-hint,#lbre')).length,
   images:[...scene.querySelectorAll('img')].filter(e=>!e.complete||!e.naturalWidth).map(e=>e.getAttribute('src'))};
}"""

async def open_round(page, game, level=1):
    await page.evaluate("""([g, level])=>{startRun([g]);if(GM[g].puz)RUN.replay={id:g,lv:level,seed:8127};window.__test.pz=null;}""", [game, level])
    # The intro overlay may mount before or after the engine-owned start button;
    # follow the visible player controls, never force-click through a dialog.
    for _ in range(4):
        await dismiss_opening(page)
        go = page.locator('#stage #go')
        if await go.count() and await go.is_visible():
            await go.click(timeout=5500)
        await dismiss_opening(page)
        await page.wait_for_timeout(100)
        if not await page.locator('#stage .cd').count() and not await page.locator('#fit-opening-overlay').count():
            break
    await page.wait_for_function("()=>!document.querySelector('#stage .cd') && !document.querySelector('#fit-opening-overlay')", timeout=7000)

async def visit(browser, args, size, skin, ids):
    w,h=size
    ctx=await browser.new_context(viewport={'width': w,'height': h},screen={'width':w,'height':h},
                                  is_mobile=args.engine=='chromium',has_touch=True,locale='ar-SA',reduced_motion='reduce')
    await ctx.add_init_script('window.__test={}')
    pg=await ctx.new_page()
    errors=[]
    pg.on('pageerror', lambda e: errors.append(str(e)))
    await pg.goto(args.url, wait_until='domcontentloaded'); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
    await pg.wait_for_function("()=>typeof startRun==='function' && typeof MK==='object'")
    profile=pg.locator('.mpc[data-m=main]')
    if await profile.is_visible():
        await profile.click()
    out=[]
    for gid in ids:
        start=len(errors)
        record={'id':gid,'size':size,'skin':skin}
        try:
            await open_round(pg,gid)
            await pg.evaluate("(s)=>document.documentElement.dataset.skin=s",skin)
            await pg.wait_for_timeout(240)
            # Allow image decoding to settle; still fail if any resolved image is broken.
            if gid in SAMPLES:
                try:
                    await pg.wait_for_function("""selector => {
                      const scene=document.querySelector(selector);
                      return scene && [...scene.querySelectorAll('img')].every(i=>i.complete);
                    }""", SAMPLES[gid], timeout=6000)
                except Exception:
                    pass
            if gid in SAMPLES:
                record['layout']=await pg.evaluate(METRICS,SAMPLES[gid])
                if not args.all:
                    await pg.screenshot(path=args.out / f'{args.label}_{gid}_{w}x{h}_{skin}.jpg', quality=84)
            record.update(await pg.evaluate("""()=>{
              const b = document.querySelector('#pzb');
              const container = b || document.querySelector('#stage');
              return {mounted:!!b&&b.childElementCount>0,
                pics:[...container.querySelectorAll('img')].filter(e=>e.offsetWidth).map(e=>[e.getAttribute('src'),!!e.naturalWidth]),
                controls:[...container.querySelectorAll('button')].filter(e=>e.offsetWidth).length,
                scroll:!!b?.classList.contains('fit-scroll'),fit:b?.dataset.fitZoom,text:container.innerText.slice(0,600)};
            }"""))
            if not args.all and gid in SAMPLES and record.get('layout') and args.check:
                layout=record['layout']
                assert layout['duplicateActions'] == 0, 'duplicate hint or retry'
                assert layout['clippedTargets'] == 0, 'clipped controls'
                assert layout['blockedCenters'] == 0, 'overlapping controls'
                assert not layout['images'], 'missing scene images'
                if gid == 'pz_river' and h > w:
                    assert layout['heightUse'] >= .8 and layout['horizontalUse'] >= .85
                if gid == 'pz_rush':
                    assert abs(layout['scene']['w'] - layout['scene']['h']) < 2, 'parking grid distorted'
                    assert await pg.locator('#rhb > i').count() == 36

        except Exception as e:
            record['error']=str(e).splitlines()[0]
        record['pageErrors']=errors[start:]
        out.append(record)
        await pg.evaluate("()=>{if(RUN)closePlay();}")
    await ctx.close()
    return out

async def main():
    p=argparse.ArgumentParser()
    p.add_argument('url');p.add_argument('out',type=Path);p.add_argument('--label',default='review');p.add_argument('--engine',default='chromium');p.add_argument('--all',action='store_true')
    p.add_argument('--check',action='store_true')
    args=p.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if args.engine=='webkit' else pw.chromium.launch(args=['--no-sandbox'], **({'executable_path':os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {})))
        if args.all:
            ids=[x['id'] for x in json.loads((Path(__file__).parents[2]/'legacy/inventory.json').read_text())['puzzles']]
            jobs=[visit(browser,args,SIZES[1],'light',ids[i:i+11]) for i in range(0,len(ids),11)]
        else:
            jobs=[visit(browser,args,size,skin,list(SAMPLES)) for size in SIZES for skin in ('light','dark')]
        rows=[r for group in await asyncio.gather(*jobs) for r in group]
        (args.out / f'{args.label}_metrics.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
        print(f'{args.label}: {len(rows)} rows, {sum(bool(r.get("error") or r["pageErrors"]) for r in rows)} with script errors')
        faults=[{'id':r['id'],'size':r['size'],'skin':r['skin'],'error':r.get('error'),'pageErrors':r.get('pageErrors',[])} for r in rows if r.get('error') or r.get('pageErrors')]
        if faults: print('REVIEW_DIAGNOSTIC_ERRORS:',json.dumps(faults[:14],ensure_ascii=False))
        await browser.close()
        if args.check and any(r.get('error') or r['pageErrors'] for r in rows):
            raise SystemExit(1)

if __name__=='__main__':
    asyncio.run(main())
