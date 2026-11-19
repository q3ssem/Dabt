"""pz_rush (موقف السيارات): the painted board must equal the engine state at every moment that matters.
Usage: python3 qa/browser/rush_board.py URL   (ENGINE=webkit · SIZES=390x844,844x390 · LEVELS=1-8 · SHOTS=dir)
For each level: right after Start (first painted frames, 60 ms) every vehicle is present, fully opaque, its art
loaded, inside the 6x6 grid, at the engine's row/column with the engine's length and direction, with a footprint
pad covering exactly its cells. Then one real drag; the board must still match. Then restart: same start state as
the first deal. Then the engine's optimal path (rhSolve) is played through the engine's own commit and must win —
every level is solvable as dealt."""
import asyncio, json, os, sys, pathlib
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from smoke import open_game

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
ENGINE = os.environ.get('ENGINE', 'chromium')
SIZES = [tuple(map(int, s.split('x'))) for s in os.environ.get('SIZES', '390x844,844x390').split(',')]
a, b = os.environ.get('LEVELS', '1-8').split('-'); LEVELS = range(int(a), int(b) + 1)
SHOTS = os.environ.get('SHOTS')

STATE = r"""()=>{const pz=window.__test&&window.__test.pz,B=document.querySelector('#rhb');if(!pz||!B)return null;const br=B.getBoundingClientRect(),cell=br.width/6;
 const cars=[...B.querySelectorAll('.rhcar')].map(c=>{const r=c.getBoundingClientRect(),cs=getComputedStyle(c),img=c.querySelector('img'),pad=c.querySelector('.rh10'),ps=pad?getComputedStyle(pad,'::before'):null;
  return {i:+c.dataset.i,x:(r.left-br.left)/cell,y:(r.top-br.top)/cell,w:r.width/cell,h:r.height/cell,op:+cs.opacity,vis:cs.visibility,disp:cs.display,
   img:img?(img.complete&&img.naturalWidth>0):false,pad:!!(ps&&ps.content&&ps.content!=='none'),inGrid:r.left>=br.left-2&&r.right<=br.right+2&&r.top>=br.top-2&&r.bottom<=br.bottom+2}});
 return {eng:pz.vs.map(v=>[v.r,v.c,v.len,v.h]),cars,grid:B.querySelectorAll(':scope>i:not(.rhpuff)').length,ratio:+(br.width/br.height).toFixed(3)}}"""

def compare(s, tag):
    bad = []
    if not s: return [f'{tag}: no board/engine hook']
    if s['grid'] != 36: bad.append(f'{tag}: grid has {s["grid"]} cells, not 36')
    if abs(s['ratio'] - 1) > .02: bad.append(f'{tag}: grid not square ({s["ratio"]})')
    cars = {c['i']: c for c in s['cars']}
    if len(cars) != len(s['eng']): bad.append(f'{tag}: {len(cars)} painted vehicles, engine has {len(s["eng"])}')
    for i, (r, c, ln, h) in enumerate(s['eng']):
        d = cars.get(i)
        if not d: bad.append(f'{tag}: vehicle {i} missing'); continue
        w, hh = (ln, 1) if h else (1, ln)
        if abs(d['x'] - c) > .12 or abs(d['y'] - r) > .12: bad.append(f'{tag}: vehicle {i} painted at ({d["x"]:.2f},{d["y"]:.2f}), engine ({c},{r})')
        if abs(d['w'] - w) > .12 or abs(d['h'] - hh) > .12: bad.append(f'{tag}: vehicle {i} painted {d["w"]:.2f}x{d["h"]:.2f}, engine {w}x{hh}')
        if d['op'] < .99 or d['vis'] != 'visible' or d['disp'] == 'none': bad.append(f'{tag}: vehicle {i} not fully shown (opacity {d["op"]})')
        if not d['img']: bad.append(f'{tag}: vehicle {i} art not loaded')
        if not d['pad']: bad.append(f'{tag}: vehicle {i} has no footprint pad')
        if not d['inGrid']: bad.append(f'{tag}: vehicle {i} outside the grid')
    return bad

async def main():
    fails, runs = [], 0
    async with async_playwright() as p:
        br = await (p.webkit.launch() if ENGINE == 'webkit' else p.chromium.launch(args=['--no-sandbox']))
        for (w, h) in SIZES:
            kw = {'viewport': {'width': w, 'height': h}, 'has_touch': True, 'locale': 'ar-SA'}
            if ENGINE != 'webkit': kw['is_mobile'] = True
            ctx = await br.new_context(**kw); await ctx.add_init_script('window.__test={}')
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(1200)
            if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]'); await pg.wait_for_timeout(600)
            for lv in LEVELS:
                tag = f'lv{lv}@{w}x{h}'; runs += 1
                await pg.evaluate(f"()=>pzSetLv('pz_rush',{lv})")
                await pg.evaluate('(g)=>startRun([g])', 'pz_rush')
                await pg.locator('#stage #go').wait_for(state='visible', timeout=20000)
                await pg.locator('#stage #go').click()
                from smoke import dismiss_opening
                await dismiss_opening(pg)
                await pg.wait_for_function("()=>document.querySelectorAll('#rhb .rhcar').length>0", timeout=20000)
                await pg.wait_for_timeout(60)
                await pg.evaluate("async()=>Promise.all([...document.querySelectorAll('#rhb img')].map(i=>i.decode?i.decode().catch(()=>0):0))")
                first = await pg.evaluate(STATE); fails += compare(first, tag + ' first frame')
                if SHOTS and lv in (1, 8): os.makedirs(SHOTS, exist_ok=True); await pg.screenshot(path=f'{SHOTS}/rush_{tag}.png')
                mv = await pg.evaluate("""()=>{const vs=__test.pz.vs,g=new Int8Array(36).fill(-1);vs.forEach((v,i)=>{for(let k=0;k<v.len;k++)g[(v.r+(v.h?0:k))*6+v.c+(v.h?k:0)]=i});
                  for(let i=0;i<vs.length;i++){const v=vs[i];for(const d of[-1,1]){const np=(v.h?v.c:v.r)+d,cell=d<0?np:np+v.len-1;if(cell<0||cell>5)continue;if(g[v.h?v.r*6+cell:cell*6+v.c]===-1)return [i,d,v.h]}}return null}""")
                if mv:
                    i, d, hz = mv
                    box = await pg.locator(f'#rhb .rhcar[data-i="{i}"]').bounding_box(); B = await pg.locator('#rhb').bounding_box(); cell = B['width'] / 6
                    x0, y0 = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
                    before = await pg.evaluate(f'()=>{{const v=__test.pz.vs[{i}];return v.h?v.c:v.r}}')
                    await pg.mouse.move(x0, y0); await pg.mouse.down(); await pg.mouse.move(x0 + (d * cell if hz else 0), y0 + (0 if hz else d * cell), steps=8); await pg.mouse.up()
                    await pg.wait_for_timeout(450)
                    after = await pg.evaluate(f'()=>{{const v=__test.pz.vs[{i}];return v.h?v.c:v.r}}')
                    if after != before + d: fails.append(f'{tag}: drag of vehicle {i} moved it {after - before}, expected {d}')
                    fails += compare(await pg.evaluate(STATE), tag + ' after first move')
                await pg.locator('#pzr').click(); await pg.wait_for_timeout(120)
                again = await pg.evaluate(STATE); fails += compare(again, tag + ' after restart')
                if again and first and again['eng'] != first['eng']: fails.append(f'{tag}: restart dealt a different board')
                won = await pg.evaluate("""async()=>{const pz=__test.pz,p=rhSolve(pz.vs,200000);if(!p)return 'unsolvable';for(const [i,np] of p){pz.commit(i,np);await new Promise(r=>setTimeout(r,20))}
                  for(let t=0;t<40;t++){if(document.querySelector('#pzb.solved')||document.querySelector('#stage .res'))return 'won';await new Promise(r=>setTimeout(r,100))}return 'not won'}""")
                if won != 'won': fails.append(f'{tag}: optimal path {won}')
                await pg.evaluate('()=>{try{closePlay()}catch(e){}}'); await pg.wait_for_timeout(300)
            if errs: fails.append(f'{w}x{h}: page errors {errs[:2]}')
            await ctx.close()
        await br.close()
    print(json.dumps({'engine': ENGINE, 'levelRuns': runs, 'failures': fails}, ensure_ascii=False, indent=1))
    print(f'{ENGINE}: {runs} level runs, {len(fails)} failures')
    if fails: raise SystemExit(1)

asyncio.run(main())
