"""Characters that the app's own fonts cannot draw (they fall to whatever the device has, or to a tofu box).
Usage: python3 qa/browser/glyphs_audit.py URL
Reads the bundled fonts' character maps (fonts/*.woff2), then walks the visible text of: the home, games, puzzles
and «مستواي» tabs (all folds open), the lighthouse lock (ml10_01), and the opening board of a set of puzzles.
For each text, the element's computed font-family decides which bundled font is in charge; a character not in
that font is reported. Fails on any uncovered digit or letter, and on the two reported spots (the lock dials and the
«مستواي» island line). Emoji are listed separately: they are drawn by the device's emoji font on every phone."""
import asyncio, json, os, sys, pathlib
from fontTools.ttLib import TTFont
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from smoke import open_game, dismiss_opening

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
ROOT = pathlib.Path(__file__).resolve().parents[2]
PUZZLES = os.environ.get('PUZZLES', 'pz_lock,pz_xlock,pz_plock,pz_pclock,pz_rush,pz_river,pz_zcode,pz_aarch').split(',')

def cmap(prefix):
    s = set()
    for f in (ROOT / 'fonts').glob(prefix + '*.woff2'): s |= set(TTFont(str(f)).getBestCmap())
    return sorted(s)

WALK = r"""([tajawal,aref])=>{const T=new Set(tajawal),A=new Set(aref),out=[];
 const isEmoji=c=>c>=0x1F000||(c>=0x2600&&c<=0x27BF)||c===0xFE0F||c===0x200D||(c>=0x1F1E6&&c<=0x1F1FF);
 const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
 while(n=w.nextNode()){const t=n.nodeValue;if(!t||!t.trim())continue;const e=n.parentElement;if(!e||!e.offsetParent&&getComputedStyle(e).position!=='fixed')continue;
  const cs=getComputedStyle(e);if(cs.visibility==='hidden'||+cs.opacity===0||parseFloat(cs.fontSize)<1)continue;
  const fam=cs.fontFamily.toLowerCase();const set=fam.indexOf('aref')>-1&&(fam.indexOf('aref')<fam.indexOf('tajawal')||fam.indexOf('tajawal')<0)?A:fam.indexOf('tajawal')>-1?T:null;
  for(const ch of t){const c=ch.codePointAt(0);if(c<=0x20||c===0xA0)continue;
   if(isEmoji(c)){out.push(['emoji',ch,e.className||e.tagName]);continue}
   if(!set){out.push(['nofont',ch,e.className||e.tagName,fam.slice(0,40)]);continue}
   if(!set.has(c))out.push([/\p{L}|\p{N}/u.test(ch)?'letter':'symbol',ch,(e.className&&e.className.baseVal===undefined?e.className:e.tagName).slice(0,40),fam.slice(0,30)])}}
 return out}"""

async def main():
    tj, ar = cmap('tajawal'), cmap('aref-ruqaa')
    found = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, locale='ar-SA')
        pg = await ctx.new_page(); await pg.goto(URL); await pg.wait_for_timeout(1500)
        if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]'); await pg.wait_for_timeout(700)
        async def scan(view):
            await pg.evaluate('document.fonts.ready')
            for kind, ch, where, *fam in await pg.evaluate(WALK, [tj, ar]):
                found.setdefault(view, {}).setdefault((kind, ch), set()).add(where)
        for tab in ('home', 'games', 'puz', 'me'):
            t = pg.locator(f'.tab[data-tab={tab}]')
            if await t.count(): await t.click(); await pg.wait_for_timeout(600)
            if tab == 'me': await pg.evaluate("()=>document.querySelectorAll('#v-me details').forEach(d=>d.open=true)"); await pg.wait_for_timeout(300)
            await scan('tab:' + tab)
        await pg.click('.tab[data-tab=puz]'); await pg.wait_for_timeout(400)
        await pg.evaluate("()=>{ML10.renderMap();ML10.startStage?ML10.startStage(0):ML10.openFromJourney(0)}"); await pg.wait_for_timeout(700)
        try: await dismiss_opening(pg)
        except Exception: pass
        st = pg.locator('[data-ex10="start"]')
        if await st.count(): await st.click(); await pg.wait_for_timeout(700)
        dial = await pg.evaluate("""()=>{const d=document.querySelector('#ex10-d0');if(!d)return null;const cs=getComputedStyle(d);
          return {font:cs.fontFamily,ok:document.fonts.check(cs.fontSize+' '+cs.fontFamily.split(',')[0],d.textContent),btn:[...document.querySelectorAll('.ex10-dial button')].map(b=>b.textContent).join('')}}""")
        await scan('ml10_01')
        for g in PUZZLES:
            try: await open_game(pg, g); await pg.wait_for_timeout(400); await scan(g)
            except Exception as e: found.setdefault(g, {})[('error', str(e)[:60])] = set()
            await pg.evaluate('()=>{try{closePlay()}catch(e){}}'); await pg.wait_for_timeout(200)
        await b.close()
    fails, report = [], {}
    for view, items in found.items():
        for (kind, ch), where in items.items():
            report.setdefault(view, []).append(f'{kind} {ch} U+{ord(ch[0]):04X} in {sorted(where)[:3]}' if kind != 'error' else f'error {ch}')
            if kind in ('letter', 'nofont', 'error'): fails.append(f'{view}: {kind} {ch!r} in {sorted(where)[:2]}')
    if not dial: fails.append('ml10_01: lock dials not found')
    else:
        if 'serif' == dial['font'].split(',')[0].strip().strip('"').lower() or not dial['ok']: fails.append(f'ml10_01: dial digits not drawn by a bundled font ({dial})')
        if any(c in dial['btn'] for c in '▲▼'): fails.append('ml10_01: dial buttons still use ▲▼ glyphs')
    if any('🏝' in r for r in report.get('tab:me', [])): fails.append('tab:me: island line still uses the 🏝 emoji')
    print(json.dumps({'report': report, 'dial': dial, 'failures': fails}, ensure_ascii=False, indent=1))
    print(f'glyphs: {sum(len(v) for v in report.values())} findings, {len(fails)} failures')
    if fails: raise SystemExit(1)

asyncio.run(main())
