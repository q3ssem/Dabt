"""Browser smoke test for مختبر العقل (phone viewport, real Chrome).

  pip install playwright  # uses an installed Chrome/Chromium
  python3 start.py &       # serve the app on http://localhost:8080
  python3 qa/browser/smoke.py [--url http://localhost:8080/] [--chrome /usr/bin/google-chrome] [--shots out/]

Opens every brain game and every original puzzle, plays through all 21 Treasure
Island stations (solving each with the in-game assist), and fails on any page error
or horizontal overflow. Optional screenshots help the visual review.
"""
import argparse, asyncio, json, pathlib, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
BACKGROUND_SURFACES = {'piano': '#pk', 'mot': '.field', 'pz_pipe': '#pzb', 'tol': '#tolb', 'pz_rush': '.rhwrap2'}

async def open_game(page, gid):
    await page.evaluate('(g)=>startRun([g])', gid)
    go = page.locator('#stage #go')
    await go.wait_for(state='visible', timeout=20000)
    start = await go.element_handle()
    await go.click()
    # Some games keep their own .intro container after start (cards: the player writes personal cards), and
    # racer reuses id="go" for its in-game signal button, so wait for THIS start button to leave and the countdown to end.
    await page.wait_for_function("b=>!document.querySelector('#stage .cd')&&!(b.isConnected&&b.offsetParent)", arg=start, timeout=20000)
    await page.wait_for_timeout(350)

# Every watercolor url() actually painted inside the game must answer HTTP 200 (catches 4.2's watercolor/watercolor/art/... 404).
PAINTED_URLS_JS = r"""async()=>{
  const urls=new Set();
  for(const el of [document.querySelector('#play'),...document.querySelectorAll('#play *')]){
    if(!el)continue;const bg=getComputedStyle(el).backgroundImage;
    for(const m of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) if(m[1].includes('/watercolor/')) urls.add(m[1]);
  }
  const out=[];
  for(const u of urls){let st=0;try{st=(await fetch(u,{cache:'no-store'})).status}catch(e){}out.push([u,st]);}
  return out;
}"""

async def visual_checks(page, gid, problems):
    if gid in BACKGROUND_SURFACES:
        selector = BACKGROUND_SURFACES[gid]
        await page.locator(selector).first.wait_for(state='visible', timeout=15000)
        await page.wait_for_function("g=>{const w=window.Watercolor,c=WC_MANIFEST.games[g];return w&&w.images.get(c.file)}", arg=gid, timeout=20000)
        result = await page.locator(selector).first.evaluate(r"""async el=>{
          const st=getComputedStyle(el), bg=st.backgroundImage;
          const urls=[...bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(x=>x[1]);
          const loaded=await Promise.all(urls.map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i.naturalWidth>0);i.onerror=()=>resolve(false);i.src=src})));
          return {background:bg, urls, loaded, width:el.clientWidth,height:el.clientHeight};
        }""")
        statuses = await page.evaluate("async us=>Promise.all(us.map(async u=>{try{return (await fetch(u,{cache:'no-store'})).status}catch(e){return 0}}))", result['urls'])
        if any(st != 200 for st in statuses): problems.append(f'{gid}: background HTTP {list(zip(result["urls"], statuses))}')
        if result['background']=='none' or not result['urls'] or not all(result['loaded']) or not result['width'] or not result['height']:
            problems.append(f'{gid}: background absent or undecoded: {result}')
    if gid=='pz_grid':
        ratios=await page.locator('.lgt th').evaluate_all(r"""els=>{
          const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
          const lum=c=>c.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
          return els.filter(e=>e.textContent.trim()).map(e=>{const s=getComputedStyle(e),a=lum(rgb(s.color)),b=lum(rgb(s.backgroundColor));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
        }""")
        if not ratios or min(ratios)<4.5: problems.append(f'pz_grid: header contrast {ratios}')


async def main(a):
    inv = json.loads((ROOT / 'legacy/inventory.json').read_text(encoding='utf-8'))
    shots = pathlib.Path(a.shots) if a.shots else None
    if shots: shots.mkdir(parents=True, exist_ok=True)
    problems = []
    async with async_playwright() as p:
        kw = {'executable_path': a.chrome} if a.chrome else {}
        b = await p.chromium.launch(args=['--no-sandbox'], **kw)
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='ar-SA')
        page = await ctx.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(a.url, wait_until='load'); await page.wait_for_timeout(1000)
        if await page.locator('.mpc[data-m=main]').count():
            await page.click('.mpc[data-m=main]'); await page.wait_for_timeout(800)
        manifest_bad = await page.evaluate("""async()=>{const seen=new Set(),bad=[];for(const c of Object.values(WC_MANIFEST.games)){
          const files=c.file==='pack-scenes'||/^pack-scenes/.test(c.file)?[0,1,2,3].map(i=>'pack-scenes-'+i):[c.file];
          for(const f of files){if(seen.has(f))continue;seen.add(f);const u=Watercolor.url({file:f});let st=0;try{st=(await fetch(u,{cache:'no-store'})).status}catch(e){}
            if(st!==200||u.includes('watercolor/watercolor'))bad.push(u+' -> '+st);}}return {count:seen.size,bad};}""")
        manifest_files = manifest_bad['count']
        for x in manifest_bad['bad']: problems.append(f'manifest background: {x}')
        title = await page.title()
        if title != 'مختبر العقل': problems.append(f'title is {title!r}')
        overflow_js = "()=>{const W=document.documentElement.clientWidth,st=document.querySelector('#stage'),sx=st&&getComputedStyle(st).overflowX;return (document.documentElement.scrollWidth>W+2&&getComputedStyle(document.documentElement).overflowX!=='hidden')||(st&&/auto|scroll/.test(sx)&&st.scrollWidth>st.clientWidth+8)}"
        for gid in [g['id'] for g in inv['brain']] + [g['id'] for g in inv['puzzles']]:
            n = len(errs)
            if gid == 'delay': continue  # internal delayed-recall helper, no standalone run
            try:
                await open_game(page, gid)
            except Exception as exc:
                problems.append(f'{gid}: could not start: {str(exc)[:120]}')
                await page.evaluate("()=>closePlay()"); continue
            await visual_checks(page, gid, problems)
            for u, st in await page.evaluate(PAINTED_URLS_JS):
                if st != 200: problems.append(f'{gid}: painted background HTTP {st}: {u}')
            wide = await page.evaluate(overflow_js)
            if shots: await page.screenshot(path=str(shots / f'{gid}.png'))
            await page.evaluate("()=>closePlay()"); await page.wait_for_timeout(300)
            new = errs[n:]
            if new: problems.append(f'{gid}: {new[:2]}')
            if wide: problems.append(f'{gid}: page scrolls sideways')
        await page.click('.tab[data-tab=puz]'); await page.wait_for_timeout(600)
        for i in range(21):
            n = len(errs)
            await page.evaluate(f"()=>{{const x=T7.state();T7.data.stations.forEach((s,j)=>{{if(j<{i})x.done[s.id]={{at:1}};else delete x.done[s.id]}});x.rewards=[...Array(Math.floor({i}/3)).keys()];S.save();T7.open({i})}}")
            for _ in range(12):
                if await page.locator('#t7-board').count(): break
                if not await page.evaluate("()=>{const b=[...document.querySelectorAll('#v-puz button')].filter(b=>!b.closest('.t7-tools')&&b.offsetParent&&!b.disabled).at(-1);if(!b)return false;b.click();return true}"): break
                await page.wait_for_timeout(200)
            ok = await page.evaluate(f"()=>{{const L=T7.logic,s=T7.data.stations[{i}],x=T7.state();let v=x.work[s.id]||L.initial(s),n=0;if(s.kind==='map')v=[1,2,3,4,5,6,7,8,0];else while(!L.solved(s,v)&&n++<60){{const nx=L.assist(s,v);if(!nx)break;v=nx}}x.work[s.id]=v;S.save();T7.render();return L.solved(s,v)}}")
            await page.get_by_text('اختبر الحل').click(); await page.wait_for_timeout(900)
            done = await page.evaluate(f"()=>!!T7.state().done[T7.data.stations[{i}].id]")
            if shots: await page.screenshot(path=str(shots / f'station{i+1:02d}.png'))
            if not (ok and done): problems.append(f'station {i+1}: not completed')
            if len(errs) > n: problems.append(f'station {i+1}: {errs[n:][:2]}')
        assessment_status = {}
        for path in ['assessment/dashboard.html', 'assessment/rule-switch.html']:
            response = await ctx.request.get(a.url.rstrip('/')+'/'+path)
            assessment_status[path] = response.status
            if response.status != 200: problems.append(f'{path}: HTTP {response.status}')
        if shots:
            for width in [320, 390, 430, 768]:
                await page.set_viewport_size({'width': width, 'height': 1024 if width==768 else 844})
                for gid in [*BACKGROUND_SURFACES, 'pz_grid']:
                    await open_game(page, gid)
                    await visual_checks(page, gid, problems)
                    if await page.evaluate(overflow_js): problems.append(f'{gid}@{width}: overflow')
                    await page.screenshot(path=str(shots / f'{gid}-{width}.png'), full_page=True)
                    await page.evaluate('()=>closePlay()')
                for name in ['dashboard', 'rule-switch']:
                    await page.goto(a.url.rstrip('/')+'/assessment/'+name+'.html', wait_until='networkidle')
                    if await page.evaluate(overflow_js): problems.append(f'{name}@{width}: overflow')
                    await page.screenshot(path=str(shots / f'assessment-{name}-{width}.png'), full_page=True)
                await page.goto(a.url, wait_until='load')
                if await page.locator('.mpc[data-m=main]').count(): await page.click('.mpc[data-m=main]')
        if errs: problems.append(f'page errors observed: {errs[:5]}')
        await b.close()
    print(json.dumps({'status': 'failed' if problems else 'passed', 'games': len(inv['brain']), 'puzzles': len(inv['puzzles']), 'stations': 21, 'skipped': ['delay: internal helper'], 'assessment_status': assessment_status, 'manifest_backgrounds_checked': manifest_files, 'screenshot_widths': [320,390,430,768] if shots else [], 'problems': problems}, ensure_ascii=False, indent=2))
    return 1 if problems else 0

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--url', default='http://localhost:8080/'); ap.add_argument('--chrome'); ap.add_argument('--shots')
    try:
        sys.exit(asyncio.run(main(ap.parse_args())))
    except Exception as exc:
        print(json.dumps({'status':'blocked_or_failed', 'error':str(exc), 'browser_checks_completed':False}, ensure_ascii=False, indent=2))
        sys.exit(1)
