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
        # 4.2.3: play surfaces are solid panels with no painted backdrop. 5.5: their colour follows the theme
        # (white by default): light under data-skin=light, dark under data-skin=dark.
        selector = BACKGROUND_SURFACES[gid]
        skin = await page.evaluate("()=>document.documentElement.dataset.skin")
        await page.locator(selector).first.wait_for(state='visible', timeout=15000)
        result = await page.locator(selector).first.evaluate(r"""el=>{const st=getComputedStyle(el);const m=st.backgroundColor.match(/[\d.]+/g).map(Number);
          return {image:st.backgroundImage, lum:(.2126*m[0]+.7152*m[1]+.0722*m[2])/255, alpha:m.length>3?m[3]:1}}""")
        wrong_tone = result['lum'] < 0.8 if skin == 'light' else result['lum'] > 0.2
        if 'url(' in result['image'] or wrong_tone or result['alpha'] < 0.9:
            problems.append(f'{gid}: play surface is not a solid {skin} panel: {result}')
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
        b = (await p.webkit.launch() if getattr(a,'engine','chromium')=='webkit' else await p.chromium.launch(args=['--no-sandbox'], **kw))
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
            if await page.evaluate(f"()=>!!T7.data.stations[{i}].v5"):
                # 5.0 sea 1: play with real taps on the board controls (no state writes).
                for _ in range(6):
                    if await page.locator('#v5-board').count(): break
                    await page.locator('#v-puz .t7-btn.primary').last.click(); await page.wait_for_timeout(250)
                for _ in range(3):
                    gate = page.locator('.v5-gate .t7-btn.primary')
                    if not await gate.count(): break
                    await gate.click(); await page.wait_for_timeout(300)
                steps = await page.evaluate(f"""()=>{{const L=T7.logic,s=T7.data.stations[{i}],work=()=>T7.state().work[s.id];
                  if(s.kind==='weigh')return null;
                  let v=work()||L.initial(s),out=[],n=0,last=null;const pos=['أعلى','يمين','أسفل','يسار','الدرج'],nm=['الأيسر','الأوسط','الأيمن'],gate=['البوابة العليا','البوابة الوسطى','البوابة اليسرى','البوابة اليمنى'],bell=['الدائرة','المثلث','المعين','الموجة','النجمة'];
                  while(!L.solved(s,v)&&n++<40){{const nx=L.assist(s,v),d=v.map((x,k)=>x!==nx[k]?k:-1).filter(k=>k>=0);
                    if(s.kind==='locks')out.push(['القفل '+(d[0]+1)+':']);
                    else if(s.kind==='mirrors')out.push(['مرآة في الصف '+s.target.mirrors[d[0]][0]+' العمود '+s.target.mirrors[d[0]][1]+':']);
                    else if(s.kind==='cipher')out.push([pos[d[0]]+':',pos[d[1]]+':']);
                    else if(s.kind==='torn')out.push(['قصاصة في الموضع '+(d[0]+1),'قصاصة في الموضع '+(d[1]+1)]);
                    else if(s.kind==='chime')out.push(['جرس '+bell[nx[nx.length-1]]]);
                    else if(s.kind==='linked'){{const k=[0,1,2].find(k=>JSON.stringify(L.linkedTurn(s.target,v,k))===JSON.stringify(nx));out.push(last===k?['تمثال '+nm[k]]:['تمثال '+nm[k],'تمثال '+nm[k]]);last=k;}}
                    else if(s.kind==='tide')out.push([nx[0]!==v[0]?s.target.names[nx[0]]:'ذراع المد']);
                    else if(s.kind==='valves')out.push([gate[d[0]]]);
                    else if(s.kind==='slide')out.push(['لوح '+['','الدائرة','المثلث','المعين','الهلال','الموجة','الفرع','الورقة','النجمة'][v[nx.indexOf(0)]]]);
                    else if(s.kind==='lights')out.push(['بلورة '+(v.findIndex((_,k)=>L.equal(L.lightsPress(v,k),nx))+1)+':']);
                    else if(s.kind==='scales'){{const m=['الميزان الأعلى','الميزان الأوسط','الميزان الأسفل'];if(nx[3]===1&&v[3]===0)out.push(['@weigh']);else{{const dd=d.filter(i=>i<3);out.push([m[dd[0]],m[dd[1]]]);}}}}
                    else if(s.kind==='ropes')out.push(['وتد '+['أعلى اليسار','أعلى اليمين','الوسط الأيسر','الوسط الأيمن','أسفل اليسار','أسفل اليمين'][d[0]]]);
                    else if(s.kind==='gearfit'||s.kind==='path'){{const nm=i=>s.kind==='path'?'تجويف '+(i+1)+':':i===4?'الدرج:':'الموضع '+(i+1)+':';out.push([nm(d[0]),nm(d[1])]);}}
                    else if(s.kind==='drums')out.push(['الأسطوانة '+['العليا','الثانية','الثالثة','الرابعة'][d[0]]+':']);
                    else if(s.kind==='push'){{let k=0,dd;for(k=0;k<v.length/2;k++){{dd=[0,1,2,3].find(x=>L.equal(L.pushMove(s.target,v,k,x),nx));if(dd!==undefined)break;}}out.push(['حجر في الصف '+(v[k*2]+1)+' العمود '+(v[k*2+1]+1),'ادفع نحو '+['أعلى','يمين','أسفل','يسار'][dd]]);}}
                    else if(s.kind==='stroke')out.push(['النجمة '+(L.strokeAt(s.target,nx)+1)+' ']);
                    else if(s.kind==='hanoi'){{const m=['العمود الأيسر','العمود الأوسط','العمود الأيمن'];out.push([m[v[d[0]]],m[nx[d[0]]]]);}}
                    else if(s.kind==='river'){{const k=[0,1,2].find(k=>v[k+1]!==nx[k+1]);out.push(k===undefined?['عبور']:[s.target.items[k]+'،','عبور']);}}
                    else if(s.kind==='frogs')out.push(['زورق في الخانة '+(d.find(k=>v[k]!==0)+1)+' ']);
                    v=nx}}return out}}""")
                if steps is None:
                    for k in range(6):
                        await page.locator(f'#v5-board [aria-label^="حجر {k+1}"]').first.click(); await page.wait_for_timeout(80)
                    await page.locator('#v5-board .v5-weighbtn').click(); await page.wait_for_timeout(300)
                    cand = await page.evaluate(f"()=>{{const v=T7.state().work[T7.data.stations[{i}].id];return T7.logic.weighParts(v).p.map((x,k)=>x!==3?k:-1).filter(k=>k>=0)}}")
                    for k in cand[:2]:
                        await page.locator(f'#v5-board [aria-label^="حجر {k+1}"]').first.click(); await page.wait_for_timeout(80)
                    await page.locator('#v5-board .v5-weighbtn').click(); await page.wait_for_timeout(300)
                    ded = await page.evaluate(f"()=>T7.logic.weighDeduced(T7.state().work[T7.data.stations[{i}].id])")
                    steps = [[f'حجر {ded+1}']]
                for labels in steps:
                    for lab in labels:
                        if lab == '@weigh': await page.locator('#v5-board .v5-weighbtn').click(); await page.wait_for_timeout(200); continue
                        await page.locator(f'#v5-board [aria-label^="{lab}"]').first.click(); await page.wait_for_timeout(160)
                await page.wait_for_timeout(1200)
                done = await page.evaluate(f"()=>!!T7.state().done[T7.data.stations[{i}].id]")
                if shots: await page.screenshot(path=str(shots / f'station{i+1:02d}.png'))
                if not done: problems.append(f'station {i+1}: 5.0 board not completed by taps')
                if len(errs) > n: problems.append(f'station {i+1}: {errs[n:][:2]}')
                continue
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
    ap = argparse.ArgumentParser(); ap.add_argument('--url', default='http://localhost:8080/'); ap.add_argument('--chrome'); ap.add_argument('--engine', choices=['chromium', 'webkit'], default='chromium'); ap.add_argument('--shots')
    try:
        sys.exit(asyncio.run(main(ap.parse_args())))
    except Exception as exc:
        print(json.dumps({'status':'blocked_or_failed', 'error':str(exc), 'browser_checks_completed':False}, ensure_ascii=False, indent=2))
        sys.exit(1)
