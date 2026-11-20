"""List elements that stay dark under the white theme, grouped by selector signature (for targeted design-system fixes)."""
import argparse, asyncio, json, pathlib, collections
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
JS = r"""(lim)=>{const out=[];const lum=c=>{const m=c.match(/[\d.]+/g);if(!m)return 1;const a=m.length>3?+m[3]:1;if(a<.45)return 1;return (.2126*m[0]+.7152*m[1]+.0722*m[2])/255};
 for(const e of document.querySelectorAll('#play *, #play, #v-puz *, .t7-modal *')){if(!e.offsetParent&&e.id!=='play')continue;const r=e.getBoundingClientRect();if(r.width*r.height<lim)continue;
  const st=getComputedStyle(e);let L=lum(st.backgroundColor);const gi=st.backgroundImage;let grad=false;
  if(gi&&gi.includes('gradient')){const cs=[...gi.matchAll(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi)].map(x=>x[0]);if(cs.length){const ls=cs.map(c=>c[0]=='#'?(()=>{const h=c.slice(1);const v=h.length<6?h.split('').map(x=>parseInt(x+x,16)):[0,2,4].map(i=>parseInt(h.substr(i,2),16));return (.2126*v[0]+.7152*v[1]+.0722*v[2])/255})():lum(c));L=Math.min(L,Math.max(...ls));grad=true}}
  if(L<.3){const cls=(e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className||'').toString().trim().split(/\s+/).slice(0,2).join('.');out.push((e.id?'#'+e.id:'')+e.tagName.toLowerCase()+(cls?'.'+cls:'')+(grad?' [grad]':''))}}
 return out}"""
async def main(a):
    inv = json.loads((ROOT / 'legacy/inventory.json').read_text(encoding='utf-8'))
    agg = collections.Counter(); where = collections.defaultdict(set)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox'], **({'executable_path': a.chrome} if a.chrome else {}))
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        await ctx.add_init_script("(()=>{const k='miran:v2',s=JSON.parse(localStorage.getItem(k)||'null')||{v:1,hist:[],best:{},lv:{},days:{}};s.skin='light';localStorage.setItem(k,JSON.stringify(s))})()")
        pg = await ctx.new_page(); await pg.goto(a.url); await pg.wait_for_timeout(800); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
        if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
        kids = await pg.evaluate("()=>G.filter(g=>g.kid).map(g=>g.id)")
        ids = [g['id'] for g in inv['brain'] if g['id'] != 'delay'] + [g['id'] for g in inv['puzzles']] + kids
        for gid in ids:
            await pg.evaluate('(g)=>startRun([g])', gid); await pg.wait_for_timeout(200)
            for x in await pg.evaluate(JS, 1500): agg[x] += 1; where[x].add(gid + ':intro')
            go = pg.locator('#stage #go')
            if await go.count():
                try: await go.first.click(timeout=2500)
                except Exception: pass
            await pg.wait_for_timeout(1300)
            for x in await pg.evaluate(JS, 1500): agg[x] += 1; where[x].add(gid)
            await pg.evaluate('()=>closePlay()'); await pg.wait_for_timeout(100)
        await pg.click('.tab[data-tab=puz]'); await pg.evaluate("()=>{const x=T7.state();T7.data.stations.forEach(s=>x.done[s.id]={at:1});S.save()}")
        for i in range(21):
            await pg.evaluate(f'()=>T7.open({i})'); await pg.wait_for_timeout(150)
            for x in await pg.evaluate(JS, 1500): agg[x] += 1; where[x].add(f't7s{i+1}')
            await pg.click('.v5-intro-go'); await pg.wait_for_timeout(250)
            for x in await pg.evaluate(JS, 1500): agg[x] += 1; where[x].add(f't7b{i+1}')
        await b.close()
    rows = [{'sel': k, 'hits': v, 'screens': len(where[k]), 'examples': sorted(where[k])[:6]} for k, v in agg.most_common()]
    pathlib.Path(a.out).write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    print(len(rows), 'dark selector signatures'); [print(r['screens'], r['sel'], r['examples'][:4]) for r in rows[:a.top]]
ap = argparse.ArgumentParser(); ap.add_argument('--url', default='http://localhost:8080/'); ap.add_argument('--chrome'); ap.add_argument('--out', default='/tmp/dark.json'); ap.add_argument('--top', type=int, default=120)
asyncio.run(main(ap.parse_args()))
