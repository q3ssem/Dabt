"""5.5: text contrast under the white theme on every screen (WCAG ratio, effective background found by walking up the tree).
  python3 qa/browser/contrast_audit.py --url http://localhost:8080/ [--skin light] [--min 3.0]
Fails on texts below --min (3.0 = WCAG large-text / UI floor). Texts drawn over photos/painted scenes are skipped
(their background is an image, so a colour ratio is meaningless) and listed as 'over_image'."""
import argparse, asyncio, json, pathlib, collections
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
JS = r"""(scope)=>{
 const P=s=>{const m=s.match(/[\d.]+/g);return m?{r:+m[0],g:+m[1],b:+m[2],a:m.length>3?+m[3]:1}:null};
 const L=c=>[c.r,c.g,c.b].map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const mix=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
 const bgOf=e=>{const stack=[];for(let n=e;n&&n.nodeType===1;n=n.parentElement){const st=getComputedStyle(n);
   if(st.backgroundImage&&st.backgroundImage.includes('url('))return {img:true};
   if(st.backgroundImage&&st.backgroundImage.includes('gradient')){const cs=[...st.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(x=>P(x[0]));if(cs.length){const avg={r:0,g:0,b:0,a:0};cs.forEach(c=>{avg.r+=c.r;avg.g+=c.g;avg.b+=c.b;avg.a+=c.a});['r','g','b','a'].forEach(k=>avg[k]/=cs.length);stack.push(avg);if(avg.a>.95)break;continue}}
   const c=P(st.backgroundColor);if(c&&c.a>0){stack.push(c);if(c.a>.95)break}}
  let b={r:255,g:255,b:255,a:1};const root=P(getComputedStyle(document.body).backgroundColor);if(root&&root.a>.5)b=root;
  for(let i=stack.length-1;i>=0;i--)b=mix(stack[i],b);return b};
 const out=[];const seen=new Set();
 for(const e of document.querySelectorAll(scope)){
  if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')continue;
  const own=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');if(!own||!/[\p{L}\p{N}]/u.test(own)||e.classList.contains('kemo'))continue;
  const st=getComputedStyle(e);if(st.visibility==='hidden'||+st.opacity<.35)continue;if(st.webkitBackgroundClip==='text'||st.backgroundClip==='text'){const g=[...st.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(x=>P(x[0]));if(g.length)st.__fill=g}
  const r=e.getBoundingClientRect();if(r.width<4||r.height<4)continue;
  const bg=bgOf(st.__fill?e.parentElement:e);if(bg.img){out.push({t:own.slice(0,24),img:1});continue}
  let fg=P(st.color);if(st.__fill){const g=st.__fill;fg={r:g.reduce((a,c)=>a+c.r,0)/g.length,g:g.reduce((a,c)=>a+c.g,0)/g.length,b:g.reduce((a,c)=>a+c.b,0)/g.length,a:1}}if(!fg)continue;
  if(st.filter&&st.filter.includes('brightness')){const k=parseFloat(st.filter.match(/brightness\(([\d.]+)/)[1]);fg={...fg,r:fg.r*k,g:fg.g*k,b:fg.b*k}}const f=mix(fg,bg);
  const a=L(f),b2=L(bg),ratio=(Math.max(a,b2)+.05)/(Math.min(a,b2)+.05);
  const key=own.slice(0,24)+Math.round(ratio*10);if(seen.has(key))continue;seen.add(key);
  out.push({t:own.slice(0,24),ratio:Math.round(ratio*100)/100,size:parseFloat(st.fontSize),cls:(e.className&&e.className.baseVal===undefined?e.className:'').toString().split(' ')[0]})}
 return out}"""
async def main(a):
    inv = json.loads((ROOT / 'legacy/inventory.json').read_text(encoding='utf-8'))
    bad, overimg, total = [], 0, 0
    async with async_playwright() as p:
        b = await (p.webkit.launch() if a.engine == 'webkit' else p.chromium.launch(args=['--no-sandbox'], **({'executable_path': a.chrome} if a.chrome else {})))
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=a.engine != 'webkit', has_touch=True, locale='ar-SA')
        if a.skin != 'default': await ctx.add_init_script("(()=>{const k='miran:v2',s=JSON.parse(localStorage.getItem(k)||'null')||{v:1,hist:[],best:{},lv:{},days:{}};s.skin='%s';localStorage.setItem(k,JSON.stringify(s))})()" % a.skin)
        pg = await ctx.new_page(); await pg.goto(a.url); await pg.wait_for_timeout(900); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
        if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
        async def check(name, scope):
            nonlocal overimg, total
            for x in await pg.evaluate(JS, scope):
                if x.get('img'): overimg += 1; continue
                total += 1
                if x['ratio'] < a.min: bad.append({'screen': name, **x})
        for t in ['home', 'games', 'puz', 'me']:
            await pg.click(f'.tab[data-tab={t}]'); await pg.wait_for_timeout(500)
            if t == 'me': await pg.evaluate("()=>document.querySelectorAll('#v-me details').forEach(d=>d.open=true)")
            await check('tab_' + t, f'#v-{t} *')
        kids = await pg.evaluate("()=>G.filter(g=>g.kid).map(g=>g.id)")
        for gid in [g['id'] for g in inv['brain'] if g['id'] != 'delay'] + [g['id'] for g in inv['puzzles']] + kids:
            await pg.evaluate('(g)=>startRun([g])', gid); await pg.wait_for_timeout(200); await check('intro_' + gid, '#play *')
            go = pg.locator('#stage #go')
            if await go.count():
                try: await go.first.click(timeout=2500)
                except Exception: pass
            await pg.wait_for_timeout(1500 if gid.startswith('pz_') or gid in kids else 3900); await check(gid, '#play *')
            await pg.evaluate('()=>closePlay()'); await pg.wait_for_timeout(80)
        await pg.click('.tab[data-tab=puz]'); await pg.evaluate("()=>{const x=T7.state();T7.data.stations.forEach(s=>x.done[s.id]={at:1});S.save();T7.map()}"); await pg.wait_for_timeout(300)
        await check('t7_map', '#v-puz *')
        for i in range(21):
            await pg.evaluate(f'()=>T7.open({i})'); await pg.wait_for_timeout(200); await check(f't7_story_{i+1}', '#v-puz *')
            await pg.click('.v5-intro-go'); await pg.wait_for_timeout(250); await check(f't7_board_{i+1}', '#v-puz *')
        for ch in range(7):
            await pg.evaluate(f'()=>T7.openSecret({ch})'); await pg.wait_for_timeout(150); await check(f't7_letter_{ch}', '#v-puz *')
        await pg.evaluate('()=>T7.openFinale()'); await pg.wait_for_timeout(250); await check('t7_finale', '#v-puz *')
        for m in ['notebook', 'treasures']:
            await pg.evaluate('()=>T7.map()'); await pg.get_by_role('button', name='دفتر الرحلة' if m == 'notebook' else 'الكنوز').first.click(); await pg.wait_for_timeout(250)
            await check('modal_' + m, '.t7-modal *'); await pg.evaluate("()=>document.querySelector('.t7-modal')?.close()")
        await b.close()
    by = collections.Counter(x['cls'] or x['t'] for x in bad)
    res = {'status': 'failed' if bad else 'passed', 'skin': a.skin, 'min_ratio': a.min, 'texts_checked': total, 'over_images_skipped': overimg, 'low_contrast': len(bad), 'by_class': by.most_common(30), 'examples': bad[:40]}
    if a.out: pathlib.Path(a.out).write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps({k: v for k, v in res.items() if k != 'examples'} | {'examples': bad[:15]}, ensure_ascii=False, indent=1))
    return 1 if bad else 0
ap = argparse.ArgumentParser(); ap.add_argument('--url', default='http://localhost:8080/'); ap.add_argument('--chrome'); ap.add_argument('--engine', default='chromium')
ap.add_argument('--skin', default='light'); ap.add_argument('--min', type=float, default=3.0); ap.add_argument('--out')
raise SystemExit(asyncio.run(main(ap.parse_args())))
