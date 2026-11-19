"""Puzzle control icons: visible, readable, touchable and working, in the white and the black theme.
Usage: python3 qa/browser/controls_audit.py URL   (ENGINE=webkit · ONLY=pz_a,pz_b · SKINS=light,dark · SHOTS=dir)
For every Mind Lab puzzle and both themes, each control in the play bar and the puzzle HUD
(close, pause, hint, restart, info, sound, journal, give up) must show a painted icon:
  - either its SVG is rendered (opacity > 0, a stroke or fill that differs from the button surface), or
  - its CSS background image is set and that image really loads (naturalWidth > 0),
and be at least 40x40 px. Then the hint opens a hint box, the hint box closes on tap, restart rebuilds the
board, the sound button toggles its pressed state, and close leaves the puzzle."""
import asyncio, json, os, sys, pathlib
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from smoke import open_game

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
ENGINE = os.environ.get('ENGINE', 'chromium')
SKINS = os.environ.get('SKINS', 'light,dark').split(',')
SHOTS = os.environ.get('SHOTS')
ROOT = pathlib.Path(__file__).resolve().parents[2]

PROBE = r"""async()=>{
 const sel=['#quit','#dxPauseBtn','#pzh','#pzr','#fitinfo','.fit-sound','.fit-journal','#pzq'];
 const out=[];
 const lum=c=>{const m=(c||'').match(/[\d.]+/g);if(!m)return null;const[r,g,b,a]=m.map(Number);if(a===0)return null;return .2126*r+.7152*g+.0722*b};
 for(const s of sel){for(const b of document.querySelectorAll('#play '+s)){
  if(!b.offsetParent||b.hidden)continue;const cs=getComputedStyle(b),r=b.getBoundingClientRect();
  const row={sel:s,w:Math.round(r.width),h:Math.round(r.height),how:null,ok:false};
  const svg=b.querySelector('svg');
  if(svg){const ss=getComputedStyle(svg);const shp=svg.querySelector('path,circle,rect,line,polyline,polygon,ellipse');const ps=shp?getComputedStyle(shp):null;
    const ink=ps?(ps.stroke!=='none'?ps.stroke:ps.fill):null;const bgL=lum(cs.backgroundColor),inkL=lum(ink);
    if(+ss.opacity>0.2&&ss.visibility==='visible'&&ss.display!=='none'&&svg.getBoundingClientRect().width>8&&ink&&ink!=='none'&&(bgL==null||inkL==null||Math.abs(bgL-inkL)>40)){row.how='svg';row.ok=true}
    else row.svg={op:ss.opacity,ink,bg:cs.backgroundColor}}
  for(const [where,st] of [['element',cs],['::after',getComputedStyle(b,'::after')],['::before',getComputedStyle(b,'::before')]]){
    if(row.ok)break;if(where!=='element'&&(!st.content||st.content==='none'))continue;
    const m=(st.backgroundImage||'').match(/url\(["']?([^"')]+)["']?\)/);
    if(m&&(where==='element'||(parseFloat(st.width)>=12&&parseFloat(st.height)>=12&&+st.opacity>0.2&&st.display!=='none'))){const ok=await new Promise(res=>{const im=new Image();im.onload=()=>res(im.naturalWidth>0);im.onerror=()=>res(false);im.src=m[1]});if(ok){row.how='image'+(where==='element'?'':where);row.ok=true}else row.img='failed '+m[1].split('/').pop()}
    else if(!row.img)row.img='none'}
  if(!row.ok){const ps=getComputedStyle(b,'::before');const masked=(ps.webkitMaskImage&&ps.webkitMaskImage!=='none')||(ps.maskImage&&ps.maskImage!=='none');
    if(ps.content&&ps.content!=='none'&&masked){const inkL=lum(ps.backgroundColor),bgL=lum(cs.backgroundColor);if(inkL!=null&&(bgL==null||Math.abs(inkL-bgL)>40)){row.how='mask';row.ok=true}else row.mask={ink:ps.backgroundColor,bg:cs.backgroundColor}}}
  out.push(row)}}
 return out}"""

async def set_skin(pg, skin):
    await pg.evaluate("(k)=>{try{S.st.skin=k;S.save&&S.save()}catch(e){};document.documentElement.dataset.skin=k}", skin)
    await pg.wait_for_timeout(150)

async def main():
    inv = json.loads((ROOT / 'legacy/inventory.json').read_text(encoding='utf-8'))
    ids = [g['id'] for g in inv['puzzles']]
    if os.environ.get('ONLY'): ids = os.environ['ONLY'].split(',')
    fails, checked = [], 0
    async with async_playwright() as p:
        b = await (p.webkit.launch() if ENGINE == 'webkit' else p.chromium.launch(args=['--no-sandbox']))
        kw = {'viewport': {'width': 390, 'height': 844}, 'has_touch': True, 'locale': 'ar-SA'}
        if ENGINE != 'webkit': kw.update(is_mobile=True)
        for skin in SKINS:
            ctx = await b.new_context(**kw)
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(1200)
            if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]'); await pg.wait_for_timeout(600)
            await set_skin(pg, skin)
            for k, g in enumerate(ids):
                tag = f'{g}@{skin}'; n = len(errs)
                try:
                    await open_game(pg, g); await pg.wait_for_timeout(500)
                    if (await pg.evaluate("()=>document.documentElement.dataset.skin")) != skin: fails.append(f'{tag}: theme did not apply')
                    rows = await pg.evaluate(PROBE); checked += 1
                    for r in rows:
                        if not r['ok']: fails.append(f'{tag}: {r["sel"]} has no visible icon ({r.get("svg") or ""} {r.get("img") or ""})')
                        if min(r['w'], r['h']) < 40: fails.append(f'{tag}: {r["sel"]} is {r["w"]}x{r["h"]} (under 40px)')
                    if SHOTS and k < 4: os.makedirs(SHOTS, exist_ok=True); await pg.screenshot(path=f'{SHOTS}/{g}_{skin}.png', clip={'x': 0, 'y': 0, 'width': 390, 'height': 140})
                    # function: hint, close hint, restart, sound
                    if await pg.locator('#pzh:not([hidden]):not([disabled])').count():
                        await pg.locator('#pzh').click(); await pg.wait_for_timeout(150)
                        if await pg.locator('#pzt:not([hidden])').count():
                            await pg.locator('#pzt').click(); await pg.wait_for_timeout(120)
                            if not await pg.locator('#pzt').is_hidden(): fails.append(f'{tag}: hint box did not close on tap')
                        else: fails.append(f'{tag}: hint button showed nothing')
                    if await pg.locator('#pzr:not([hidden])').count():
                        before = await pg.evaluate("()=>document.querySelector('#pzb')&&document.querySelector('#pzb').innerHTML.length")
                        await pg.locator('#pzr').click(); await pg.wait_for_timeout(250)
                        rebuilt = await pg.evaluate("()=>{const b=document.querySelector('#pzb');return !!b&&b.children.length>0}")
                        if not rebuilt: fails.append(f'{tag}: restart left an empty board')
                    snd = pg.locator('#play .fit-sound')
                    if await snd.count():
                        a0 = await snd.get_attribute('aria-pressed'); await snd.click(); await pg.wait_for_timeout(100); a1 = await snd.get_attribute('aria-pressed')
                        if a0 == a1: fails.append(f'{tag}: sound button did not toggle ({a0})')
                        await snd.click(); await pg.wait_for_timeout(80)
                    await pg.locator('#play #quit').click(); await pg.wait_for_timeout(250)
                    if await pg.evaluate("()=>{const p=document.querySelector('#play');return p&&!p.hidden&&p.offsetParent!==null&&!!document.querySelector('#pzb')}"):
                        fails.append(f'{tag}: close did not leave the puzzle')
                except Exception as e:
                    fails.append(f'{tag}: {str(e)[:140]}')
                if errs[n:]: fails.append(f'{tag}: page error {errs[n:][:1]}')
                await pg.evaluate("()=>{try{closePlay()}catch(e){}}"); await pg.wait_for_timeout(150)
            await ctx.close()
        await b.close()
    print(json.dumps({'engine': ENGINE, 'puzzleThemeRuns': checked, 'failures': fails[:200], 'failureCount': len(fails)}, ensure_ascii=False, indent=1))
    print(f'{ENGINE}: {checked} puzzle×theme runs, {len(fails)} failures')
    if fails: raise SystemExit(1)

asyncio.run(main())
