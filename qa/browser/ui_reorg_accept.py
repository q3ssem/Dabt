"""Acceptance for the Atheran UI reorganisation, at 320, 390 and 768 px (Chromium, or ENGINE=webkit).

- puzzles tab: the official chapter card comes first, the side journey below it under its own heading; no «لغز اليوم» box
- side journey: every one of the 25 stages opens, its brief keeps the two drawn tools side by side (same row),
  the stage scene carries the lock badge, the attempts render as rows; no sideways scroll, no clipped text in the brief
- Atheran: every one of the 21 stations opens and its board is on screen; the story folds into one row
- no JavaScript errors anywhere
Usage: python3 qa/browser/ui_reorg_accept.py http://127.0.0.1:8130/  [OUT=dir for screenshots]
"""
import asyncio, json, os, pathlib, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8130/'
OUT = pathlib.Path(os.environ.get('OUT', 'ui-reorg')); OUT.mkdir(parents=True, exist_ok=True)
ENGINE = os.environ.get('ENGINE', 'chromium')
SAVE = json.loads(pathlib.Path(os.environ['SAVE']).read_text(encoding='utf-8')) if os.environ.get('SAVE') else None
checks, problems = [], []
def ok(c, label, extra=None):
    (checks if c else problems).append(label if c else f'{label} :: {extra}'); return c

CLIP = """(sel) => [...document.querySelectorAll(sel)].filter(e => e.offsetParent && e.clientWidth > 4 && (e.scrollWidth > e.clientWidth + 2) && getComputedStyle(e).overflowX !== 'auto' && getComputedStyle(e).overflowX !== 'scroll' && getComputedStyle(e).textOverflow !== 'ellipsis' && !e.closest('[style*="-webkit-line-clamp"]')).map(e => (e.className || e.tagName) + ':' + e.textContent.trim().slice(0, 30))"""

async def main():
    async with async_playwright() as p:
        b = await (p.webkit.launch() if ENGINE == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']))
        for w, h in ((320, 640), (390, 844), (768, 1024)):
            tag = f'{ENGINE}-{w}'
            ctx = await b.new_context(viewport={'width': w, 'height': h}, screen={'width': w, 'height': h}, is_mobile=True, has_touch=True, device_scale_factor=2)
            await ctx.add_init_script('window.__test={}')
            if SAVE: await ctx.add_init_script(f"if(!localStorage.getItem('__seeded')){{const s={json.dumps(SAVE, ensure_ascii=False)};for(const k in s)localStorage.setItem(k,s[k]);localStorage.setItem('__seeded','1')}}")
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
            await pg.goto(URL); await pg.wait_for_timeout(2000); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
            if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
            await pg.click('.tab[data-tab=puz]'); await pg.wait_for_timeout(1000)
            lib = await pg.evaluate("""() => { const v = document.getElementById('v-puz'), a = v.querySelector('.ah-launch'), s = v.querySelector('.ex10-launch');
              return { a: !!a, s: !!s, order: a && s ? !!(a.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) : null, head: !!v.querySelector('.ah-side-head'),
                       day: !!v.querySelector('#pzday') || [...v.querySelectorAll('b')].some(x => /^لغز اليوم/.test(x.textContent)),
                       ah: a ? a.getBoundingClientRect().height : 0, sh: s ? s.getBoundingClientRect().height : 0,
                       ov: document.documentElement.scrollWidth - document.documentElement.clientWidth } }""")
            ok(lib['a'] and lib['s'] and lib['order'], f'{tag}: official chapter card first, side journey below it', lib)
            ok(lib['head'], f'{tag}: the side journey sits under its own «رحلة جانبية» heading')
            ok(lib['sh'] < lib['ah'], f'{tag}: the side journey card is smaller than the chapter card', (lib['ah'], lib['sh']))
            ok(not lib['day'], f'{tag}: no «لغز اليوم» box in the puzzles tab')
            ok(lib['ov'] <= 1, f'{tag}: puzzles tab has no sideways scroll', lib['ov'])
            await pg.screenshot(path=str(OUT / f'{tag}-puzzles.png'))
            # side journey: map + 25 stages
            await pg.click('.ex10-launch-go'); await pg.wait_for_timeout(1000)
            mp = await pg.evaluate("() => ({ n: document.querySelectorAll('.ex10-node').length, locks: document.querySelectorAll('.ex10-node.locked svg').length, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth })")
            ok(mp['n'] == 25 and mp['ov'] <= 1, f'{tag}: side-journey map shows 25 stations without sideways scroll', mp)
            await pg.screenshot(path=str(OUT / f'{tag}-ex10-map.png'))
            bad_tools, bad_clip, bad_ov, bad_lock = [], [], [], []
            for i in range(25):
                await pg.evaluate(f"() => ML10.startStage({i})"); await pg.wait_for_timeout(500)
                r = await pg.evaluate("""() => { const t = [...document.querySelectorAll('.ex10-brief .ex10-art-detail')].map(e => e.getBoundingClientRect());
                  const sc = document.querySelector('.ex10-game-scene'); const lock = sc && sc.querySelector('.ex10-state-badge');
                  return { tools: t.length, row: t.length < 2 || Math.abs(t[0].top - t[1].top) < 2, lock: !!lock, st: sc && sc.dataset.state,
                           ov: document.documentElement.scrollWidth - document.documentElement.clientWidth } }""")
                if not r['row']: bad_tools.append(i + 1)
                if not r['lock']: bad_lock.append(i + 1)
                if r['ov'] > 1: bad_ov.append((i + 1, r['ov']))
                clip = await pg.evaluate(CLIP, '.ex10-brief *, .ex10-clue, .ex10-game-top *')
                if clip: bad_clip.append((i + 1, clip[:2]))
                if i in (0, 2, 3, 12, 24): await pg.screenshot(path=str(OUT / f'{tag}-ex10-s{i + 1:02d}.png'))
            ok(not bad_tools, f'{tag}: the two drawn tools sit side by side in all 25 stages', bad_tools)
            ok(not bad_lock, f'{tag}: every stage scene carries its state badge (lock / done)', bad_lock)
            ok(not bad_ov, f'{tag}: no stage scrolls sideways', bad_ov)
            ok(not bad_clip, f'{tag}: no clipped text in the stage brief / attempts', bad_clip[:3])
            # lighthouse (stage 1) locked state
            await pg.evaluate("() => ML10.startStage(0)"); await pg.wait_for_timeout(500)
            lh = await pg.evaluate("() => { const sc = document.querySelector('.ex10-game-scene'), b = sc.querySelector('.ex10-state-badge').getBoundingClientRect(), r = sc.getBoundingClientRect(); return { st: sc.dataset.state, cx: (b.left + b.width / 2 - r.left) / r.width, f: getComputedStyle(sc, '::after').backgroundImage } }")
            ok(lh['st'] in ('locked', 'done') and (lh['st'] == 'done' or (0.4 < lh['cx'] < 0.6 and 'gradient' in lh['f'] and '0.78' in lh['f'])), f'{tag}: lighthouse scene shows a centred lock over a dimmed picture', lh)
            # Atheran stations
            await pg.evaluate("() => { const v = document.getElementById('v-puz'); }")
            ids = await pg.evaluate("() => ASTN.map(s => s.id)")
            bad_board, bad_story = [], []
            for k, g in enumerate(ids):
                await pg.evaluate("(g) => startRun([g])", g); await pg.wait_for_timeout(250)
                if await pg.locator('#stage #go').count(): await pg.click('#stage #go')
                await pg.wait_for_timeout(2600)
                r = await pg.evaluate("() => { const b = document.querySelector('#pzb'), s = document.querySelector('#pzb .atheran-story'); return { board: !!b && b.getBoundingClientRect().height > 120, story: s ? s.getBoundingClientRect().height : 0, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth } }")
                if not r['board'] or r['ov'] > 1: bad_board.append((g, r))
                if r['story'] > 80: bad_story.append((g, round(r['story'])))
                if k in (0, 6, 13, 20): await pg.screenshot(path=str(OUT / f'{tag}-ath-{g}.png'))
                await pg.evaluate("() => closePlay()"); await pg.wait_for_timeout(150)
            ok(not bad_board, f'{tag}: all 21 Atheran stations open with their board and no sideways scroll', bad_board[:3])
            ok(not bad_story, f'{tag}: the station story folds into one compact row (≤80 px)', bad_story[:3])
            ok(not errs, f'{tag}: no JavaScript errors', errs[:3])
            await ctx.close()
        await b.close()
    print(json.dumps({'status': 'passed' if not problems else 'failed', 'checks': len(checks), 'problems': problems}, ensure_ascii=False, indent=1))
    sys.exit(0 if not problems else 1)
asyncio.run(main())
