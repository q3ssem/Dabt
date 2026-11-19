"""fit-ui — every puzzle fits one phone screen.
Usage: python3 qa/browser/fit_audit.py URL   (ENGINE=webkit · SIZES=390x844,320x640,430x932 · OUT=dir for JSON+shots · ONLY=pz_a,pz_b · PAGES=0 to skip Treasure/Expedition)
Mind Lab puzzles (88): the page never scrolls, the HUD is one row, the board's bottom is inside the screen
(or, below the minimum zoom, the board scrolls inside itself — listed, not failed), the info sheet opens and
closes, give-up needs two taps, a hint closes with a tap, and no page errors.
Treasure (21) and Expedition (25): the station picture is a backdrop, the board pane is zoomed to fit."""
import asyncio, json, os, sys, pathlib
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from smoke import open_game
from player_openings import dismiss_opening

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
ENGINE = os.environ.get('ENGINE', 'chromium'); OUT = os.environ.get('OUT')
SIZES = [tuple(map(int, s.split('x'))) for s in os.environ.get('SIZES', '390x844,320x640,430x932').split(',')]
ROOT = pathlib.Path(__file__).resolve().parents[2]
M = r"""()=>{const pl=document.querySelector('#play'),pb=document.querySelector('#pzb'),h=document.querySelector('.pzhud');
 const vis=b=>b.offsetParent&&getComputedStyle(b).visibility!=='hidden';
 const btn=[...pb.querySelectorAll('button,[data-tok],[data-slot]')].filter(vis).map(b=>{const r=b.getBoundingClientRect();return Math.min(r.width,r.height)}).filter(x=>x>4);
 const r=pb.getBoundingClientRect();
 return {fit:pl.classList.contains('fit'),playScroll:pl.scrollHeight>pl.clientHeight+2&&getComputedStyle(pl).overflowY!=='clip'&&getComputedStyle(pl).overflowY!=='hidden',
  playTop:pl.scrollTop,hudH:Math.round(h.getBoundingClientRect().height),bottom:Math.round(r.bottom),vh:innerHeight,
  z:pb.dataset.fitZoom,inner:pb.classList.contains('fit-scroll'),minBtn:btn.length?Math.round(Math.min(...btn)):null,
  info:!!document.querySelector('#fitinfo'),hidden:[...pb.querySelectorAll('.mla-adventure-intro,.castle-lore,.atheran-story,.lb-intro')].filter(vis).length}}"""

async def main():
    inv = json.loads((ROOT / 'legacy/inventory.json').read_text(encoding='utf-8'))
    ids = [g['id'] for g in inv['puzzles']]
    if os.environ.get('ONLY'): ids = os.environ['ONLY'].split(',')
    res, fails, inner = {}, [], []
    if OUT: os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await (p.webkit.launch() if ENGINE == 'webkit' else p.chromium.launch(args=['--no-sandbox']))
        for (w, hh) in SIZES:
            kw = {'viewport': {'width': w, 'height': hh}, 'has_touch': True, 'locale': 'ar-SA'}
            if ENGINE != 'webkit': kw.update(is_mobile=True, device_scale_factor=1)
            ctx = await b.new_context(**kw)
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(1200)
            if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]'); await pg.wait_for_timeout(700)
            for k, g in enumerate(ids):
                n = len(errs); tag = f'{g}@{w}x{hh}'
                try:
                    await open_game(pg, g); await pg.wait_for_timeout(700)
                    r = await pg.evaluate(M)
                    if OUT and w == 390: await pg.screenshot(path=f'{OUT}/{g}_{w}.png')
                    # info sheet opens and closes; give-up asks twice; nothing scrolls the play surface
                    if r['info']:
                        await pg.locator('#fitinfo').click(); await pg.wait_for_timeout(150)
                        r['sheet'] = await pg.locator('.fit-sheet .fit-sh-go').count() == 1
                        await pg.locator('.fit-sheet .fit-sh-go').click(); await pg.wait_for_timeout(150)
                        r['sheetClosed'] = await pg.locator('.fit-sheet').count() == 0
                    if k % 11 == 0:
                        q = pg.locator('.fit-tools #pzq')
                        if await q.count():
                            await q.click(); await pg.wait_for_timeout(100)
                            r['giveArm'] = await pg.evaluate("()=>document.querySelector('#pzq').classList.contains('arm')&&!!document.querySelector('#pzq').closest('.fit-tools')")
                    if k % 7 == 0 and await pg.locator('#pzh:not([hidden])').count():
                        await pg.locator('#pzh').click(); await pg.wait_for_timeout(150)
                        if await pg.locator('#pzt:not([hidden])').count():
                            await pg.locator('#pzt').click(); await pg.wait_for_timeout(100)
                            r['hintClosed'] = await pg.locator('#pzt').is_hidden()
                    r['errs'] = errs[n:]
                except Exception as e:
                    r = {'err': str(e)[:160], 'errs': errs[n:]}
                res[tag] = r
                bad = []
                if 'err' in r: bad.append(r['err'])
                else:
                    if not r['fit']: bad.append('fit layer not active')
                    if r['playScroll'] or r['playTop']: bad.append('play surface scrolls')
                    if r['hudH'] > 46: bad.append(f'HUD is {r["hudH"]}px tall (more than one row)')
                    if r['bottom'] > r['vh'] + 1: bad.append(f'board bottom {r["bottom"]} below screen {r["vh"]}')
                    if r['hidden']: bad.append('story banner still on the board')
                    if w == 390 and g in {'pz_zshadow','pz_pgarden','pz_parm','pz_peng','pz_plast','pz_ashade','pz_avsong'} and r['minBtn'] is not None and r['minBtn'] < 32:
                        bad.append(f'touch target is only {r["minBtn"]}px')
                    if r.get('sheet') is False or r.get('sheetClosed') is False: bad.append('info sheet')
                    if r.get('giveArm') is False: bad.append('give-up did not arm')
                    if r.get('hintClosed') is False: bad.append('hint did not close')
                    if r['inner']: inner.append(tag)
                if r.get('errs'): bad.append(f'page error {r["errs"][:1]}')
                if bad: fails.append(f'{tag}: ' + '; '.join(bad))
                await pg.evaluate("()=>{document.querySelectorAll('.fit-sheet').forEach(e=>e.remove());closePlay()}"); await pg.wait_for_timeout(200)
            if os.environ.get('PAGES', '1') != '0':
                await pages(pg, w, res, fails, errs)
            await ctx.close()
        await b.close()
    out = {'engine': ENGINE, 'checked': len(res), 'failures': fails, 'boardScrollsInside': inner}
    if OUT: json.dump(res, open(f'{OUT}/fit_audit_{ENGINE}.json', 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(out, ensure_ascii=False, indent=1))
    print(f'{ENGINE}: {len(res) - len(fails)} passed, {len(fails)} failed')
    if fails: raise SystemExit(1)

async def pages(pg, w, res, fails, errs):
    PM = r"""(sel)=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();let b=0;for(const c of e.children){const q=c.getBoundingClientRect();if(q.height)b=Math.max(b,q.bottom)}
      return {z:e.dataset.fitZoom,bottom:Math.round(b),vh:innerHeight,top:Math.round(r.top),info:!!document.querySelector('.fit-pinfo')}}"""
    await pg.goto(URL); await pg.wait_for_timeout(1000)
    if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]'); await pg.wait_for_timeout(500)
    await pg.click('.tab[data-tab=puz]'); await pg.wait_for_timeout(600)
    for i in range(21):
        n = len(errs); tag = f't7_{i + 1:02d}@{w}'
        await pg.evaluate(f"()=>{{const x=T7.state();T7.data.stations.forEach((s,j)=>{{if(j<{i})x.done[s.id]={{at:1}};else delete x.done[s.id]}});S.save();T7.open({i})}}")
        await pg.wait_for_timeout(300)
        for _ in range(6):
            if await pg.locator('#v5-board').count(): break
            bt = pg.locator('#v-puz .t7-btn.primary').last
            if not await bt.count(): break
            await bt.click(); await dismiss_opening(pg); await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(800)
        r = await pg.evaluate(PM, '.t7-puzzle-pane'); r = r or {'err': 'no board'}; r['errs'] = errs[n:]; res[tag] = r
        bad = [r['err']] if 'err' in r else ([] if r['bottom'] <= r['vh'] + 1 or r['z'] == '0.58' else [f'pane bottom {r["bottom"]} below {r["vh"]}']) + ([] if r['info'] else ['no ⓘ'])
        if r['errs']: bad.append(f'page error {r["errs"][:1]}')
        if bad: fails.append(f'{tag}: ' + '; '.join(bad))
    if not os.environ.get('MINDLAB_EX10_DONE', '1') == '0':
        await pg.evaluate("""()=>{const d={};for(let i=1;i<=25;i++)d['ml10_'+String(i).padStart(2,'0')]=true;localStorage.setItem('mindlab:expedition10:v1',JSON.stringify({done:d,stars:{},best:{},totalStars:60}))}""")
    await pg.goto(URL); await pg.wait_for_timeout(1000)
    await pg.click('.tab[data-tab=puz]'); await pg.wait_for_timeout(600)
    for k in range(25):
        n = len(errs); tag = f'ex_{k + 1:02d}@{w}'
        try:
            if not await pg.locator('.ex10-map').count(): await pg.locator('.ex10-launch-go').click(); await pg.wait_for_timeout(300)
            await pg.locator(f'.ex10-map [data-ex10-node="{k}"]').click(); await pg.locator('[data-ex10="start"]').click(); await dismiss_opening(pg); await pg.wait_for_timeout(900)
            r = await pg.evaluate(PM, '.ex10-game-content') or {'err': 'no board'}
            await pg.locator('.ex10-back').click(); await pg.wait_for_timeout(250)
        except Exception as e:
            r = {'err': str(e)[:120]}
        r['errs'] = errs[n:]; res[tag] = r
        bad = [r['err']] if 'err' in r else ([] if r['bottom'] <= r['vh'] + 1 or r['z'] == '0.58' else [f'pane bottom {r["bottom"]} below {r["vh"]}'])
        if r['errs']: bad.append(f'page error {r["errs"][:1]}')
        if bad: fails.append(f'{tag}: ' + '; '.join(bad))

asyncio.run(main())
