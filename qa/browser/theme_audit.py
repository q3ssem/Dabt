"""5.5 visual audit: under the WHITE theme, measure every screen pixel by pixel (DOM, SVG and Canvas alike).
  python3 qa/browser/theme_audit.py --url http://localhost:8080/ --out /tmp/audit [--skin light] [--engine webkit]
Writes audit.json (+ one screenshot per screen). A screen "follows the white theme" when its play area is not
dominated by dark pixels (luminance < 0.22). Also measures game-card geometry on the games and puzzles tabs."""
import argparse, asyncio, json, pathlib
from playwright.async_api import async_playwright
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]

def dark_ratio(path, box=None):
    im = Image.open(path).convert('RGB')
    if box: im = im.crop(box)
    im = im.resize((max(1, im.width // 4), max(1, im.height // 4)))
    px = list(im.getdata()); n = len(px)
    d = sum(1 for r, g, b in px if (.2126 * r + .7152 * g + .0722 * b) / 255 < .22)
    return round(d / n, 3) if n else 0

CARD_JS = r"""(sel)=>{const cards=[...document.querySelectorAll(sel)].filter(e=>e.offsetParent);if(!cards.length)return null;
 const r=cards.slice(0,40).map(c=>{const b=c.getBoundingClientRect(),img=c.querySelector('img,svg,canvas,[style*="background-image"],i,.ico,.gi');
  const ib=img?img.getBoundingClientRect():null,t=[...c.querySelectorAll('b,strong,h3,h4,.nm,.name')].find(x=>x.textContent.trim());
  return {w:b.width,h:b.height,art:ib?Math.round(ib.width*ib.height/(b.width*b.height)*100):0,artW:ib?ib.width:0,title:t?parseFloat(getComputedStyle(t).fontSize):0,lines:t?Math.round(t.getBoundingClientRect().height/parseFloat(getComputedStyle(t).lineHeight||'20')):0}});
 const cols=new Set(cards.slice(0,12).map(c=>Math.round(c.getBoundingClientRect().left))).size,avg=k=>Math.round(r.reduce((a,x)=>a+x[k],0)/r.length*10)/10;
 return {count:cards.length,columns:cols,cardW:avg('w'),cardH:avg('h'),artPctOfCard:avg('art'),artW:avg('artW'),titlePx:avg('title'),wrappedTitles:r.filter(x=>x.lines>1).length}}"""

async def main(a):
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    res = {'skin': a.skin, 'screens': {}, 'cards': {}}
    inv = json.loads((ROOT / 'legacy/inventory.json').read_text(encoding='utf-8'))
    async with async_playwright() as p:
        b = await (p.webkit.launch() if a.engine == 'webkit' else p.chromium.launch(args=['--no-sandbox'], **({'executable_path': a.chrome} if a.chrome else {})))
        ctx = await b.new_context(viewport={'width': a.w, 'height': a.h}, device_scale_factor=1, has_touch=True, is_mobile=a.engine != 'webkit', locale='ar-SA')
        await ctx.add_init_script(f"""(()=>{{try{{const k='miran:v2',s=JSON.parse(localStorage.getItem(k)||'null')||{{v:1,hist:[],best:{{}},lv:{{}},days:{{}}}};{'s.skin=' + json.dumps(a.skin) + ';' if a.skin != 'default' else ''}localStorage.setItem(k,JSON.stringify(s))}}catch(e){{}}}})()""")
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(a.url, wait_until='load'); await pg.wait_for_timeout(900); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
        if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]'); await pg.wait_for_timeout(500)
        res['resolved_skin'] = await pg.evaluate('()=>document.documentElement.dataset.skin')
        async def shot(name, sel=None):
            f = out / f'{name}.png'
            if sel and await pg.locator(sel).count():
                bb = await pg.locator(sel).first.bounding_box()
                await pg.screenshot(path=str(f)); box = (max(0, bb['x']), max(0, bb['y']), min(a.w, bb['x'] + bb['width']), min(a.h, bb['y'] + bb['height'])) if bb else None
            else:
                await pg.screenshot(path=str(f)); box = None
            res['screens'][name] = dark_ratio(f, box if box and box[2] > box[0] + 20 and box[3] > box[1] + 20 else None)
        for t in ['home', 'games', 'puz', 'me']:
            await pg.click(f'.tab[data-tab={t}]'); await pg.wait_for_timeout(600); await shot('tab_' + t)
            await pg.screenshot(path=str(out / f'tab_{t}_full.png'), full_page=True)
        await pg.click('.tab[data-tab=games]'); await pg.wait_for_timeout(500)
        res['cards']['games'] = await pg.evaluate(CARD_JS, a.games_card)
        await pg.click('.tab[data-tab=puz]'); await pg.wait_for_timeout(500)
        res['cards']['puzzles'] = await pg.evaluate(CARD_JS, a.puz_card)
        kids = await pg.evaluate("()=>G.filter(g=>g.kid).map(g=>g.id)")
        ids = [g['id'] for g in inv['brain'] if g['id'] != 'delay'] + [g['id'] for g in inv['puzzles']] + kids
        for gid in ids:
            try:
                await pg.evaluate('(g)=>startRun([g])', gid); await pg.wait_for_timeout(250)
                await shot('intro_' + gid, '#play')
                go = pg.locator('#stage #go')
                if await go.count(): await go.first.click(timeout=3000)
                await pg.wait_for_timeout(1700 if gid in kids else 1400 if gid.startswith('pz_') else 3900)
                await shot('play_' + gid, '#stage')
            except Exception as e:
                res['screens']['play_' + gid] = 'error: ' + str(e)[:80]
            await pg.evaluate('()=>closePlay()'); await pg.wait_for_timeout(120)
        # Treasure Island: map, every station story + board, reward, letter, finale
        await pg.click('.tab[data-tab=puz]'); await pg.wait_for_timeout(200)
        await pg.evaluate("()=>{const x=T7.state();T7.data.stations.forEach(s=>x.done[s.id]=x.done[s.id]||{at:1,moves:0,hints:0});S.save();T7.map()}"); await pg.wait_for_timeout(500)
        await shot('t7_map'); await pg.screenshot(path=str(out / 't7_map_full.png'), full_page=True)
        for i in range(21):
            await pg.evaluate(f'()=>T7.open({i})'); await pg.wait_for_timeout(350); await shot(f't7_story_{i+1:02d}')
            res.setdefault('t7_images', {})[i + 1] = await pg.evaluate(r"""()=>[...document.querySelectorAll('#v-puz img, #v-puz .t7-scene, #v-puz .v5-intro-crew-art')].filter(e=>e.offsetParent).slice(0,6).map(e=>{const r=e.getBoundingClientRect();const st=getComputedStyle(e);
              return {cls:(e.className||e.tagName).toString().split(' ')[0],w:Math.round(r.width),h:Math.round(r.height),nat:e.naturalWidth?[e.naturalWidth,e.naturalHeight]:null,fit:st.objectFit,bgSize:st.backgroundSize}})""")
            await pg.click('.v5-intro-go'); await pg.wait_for_timeout(400); await shot(f't7_board_{i+1:02d}', '.v5-pane')
        await pg.evaluate('()=>T7.openSecret(0)'); await pg.wait_for_timeout(300); await shot('t7_letter')
        await pg.evaluate('()=>T7.openFinale()'); await pg.wait_for_timeout(400); await shot('t7_finale')
        res['errors'] = errs[:10]
        await b.close()
    play = {k: v for k, v in res['screens'].items() if k.startswith('play_') and isinstance(v, float)}
    res['summary'] = {'screens': len(res['screens']), 'play_dark_over_40pct': sorted([k for k, v in play.items() if v > .4]),
                      'stations_dark_over_40pct': sorted([k for k, v in res['screens'].items() if k.startswith('t7_') and isinstance(v, float) and v > .4])}
    (out / 'audit.json').write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps({'resolved_skin': res['resolved_skin'], 'cards': res['cards'], 'dark_play': len(res['summary']['play_dark_over_40pct']), 'of': len(play), 'dark_t7': res['summary']['stations_dark_over_40pct'], 'errors': res['errors']}, ensure_ascii=False, indent=1))

ap = argparse.ArgumentParser(); ap.add_argument('--url', default='http://localhost:8080/'); ap.add_argument('--chrome'); ap.add_argument('--engine', default='chromium')
ap.add_argument('--out', default='/tmp/audit'); ap.add_argument('--skin', default='light'); ap.add_argument('--w', type=int, default=390); ap.add_argument('--h', type=int, default=844)
ap.add_argument('--games-card', default='#v-games .ui-gcard, #v-games .gc, #v-games [data-g], #v-games button.card')
ap.add_argument('--puz-card', default='#v-puz .la-card, #v-puz .lc, #v-puz [data-pz], #v-puz .la-item')
asyncio.run(main(ap.parse_args()))
