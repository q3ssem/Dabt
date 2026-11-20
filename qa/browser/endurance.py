"""Endurance: play continuously for MINUTES (default 20) — open a puzzle, tap its board, close, next — and sample
JS heap / DOM nodes / listeners / audio nodes after a forced GC every minute. The loop runs inside the page so
Playwright handles do not keep anything alive. Pass = no steady growth (last third vs first third) and no errors.
Usage: python3 qa/browser/endurance.py URL OUT.json [MINUTES]"""
import asyncio, json, sys, time
from playwright.async_api import async_playwright

URL, OUT = sys.argv[1], sys.argv[2]
MINUTES = float(sys.argv[3]) if len(sys.argv) > 3 else 20
LOOP = r"""async (ms) => {
  const ids = Object.keys(GM).filter(k => /^pz_/.test(k)); const end = performance.now() + ms; let opened = 0, errors = 0;
  while (performance.now() < end) {
    const g = ids[(window.__enduranceI = ((window.__enduranceI || 0) + 1)) % ids.length];
    try {
      await startRun([g]); await new Promise(r => setTimeout(r, 250));
      const go = document.querySelector('#stage #go'); if (go) go.click();
      const op = document.querySelector('#fit-opening-overlay #fit-op-start'); await new Promise(r => setTimeout(r, 200)); const op2 = document.querySelector('#fit-opening-overlay #fit-op-start'); if (op2) op2.click();
      for (let i = 0; i < 40 && document.querySelector('#stage .cd'); i++) await new Promise(r => setTimeout(r, 100));
      const els = [...document.querySelectorAll('#pzb button, #pzb [data-i], #pzb .cell, #lbb button')].filter(e => e.getBoundingClientRect().width > 4).slice(0, 8);
      for (const e of els) { e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, pointerId: 1 })); e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, isPrimary: true, pointerId: 1 })); e.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise(r => setTimeout(r, 60)); }
      closePlay(); opened++;
      const sheet = document.querySelector('.fit-sheet'); if (sheet) sheet.remove();
    } catch (e) { errors++; try { closePlay(); } catch (_) {} }
    await new Promise(r => setTimeout(r, 150));
  }
  return { opened, errors };
}"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--js-flags=--expose-gc'])
        c = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        pg = await c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        s = await c.new_cdp_session(pg)
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
        await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
        await pg.evaluate("()=>{S.st.mute=true}")
        samples, total = [], {'opened': 0, 'errors': 0}; t0 = time.time()
        for minute in range(int(MINUTES)):
            r = await pg.evaluate(LOOP, 60000)
            total['opened'] += r['opened']; total['errors'] += r['errors']
            await s.send('HeapProfiler.collectGarbage'); await pg.wait_for_timeout(300)
            d = await s.send('Memory.getDOMCounters'); h = (await s.send('Runtime.getHeapUsage'))['usedSize']
            samples.append({'min': minute + 1, 'heapMB': round(h / 1048576, 2), 'nodes': d['nodes'], 'listeners': d['jsEventListeners'], 'docs': d['documents'], 'opened': total['opened']})
            print(json.dumps(samples[-1]), flush=True)
        await b.close()
    n = len(samples); third = max(1, n // 3)
    first = sum(x['heapMB'] for x in samples[:third]) / third; last = sum(x['heapMB'] for x in samples[-third:]) / third
    fn = sum(x['nodes'] for x in samples[:third]) / third; ln = sum(x['nodes'] for x in samples[-third:]) / third
    fl = sum(x['listeners'] for x in samples[:third]) / third; ll = sum(x['listeners'] for x in samples[-third:]) / third
    verdict = {'minutes': n, 'wall_s': round(time.time() - t0), 'opened': total['opened'], 'loopErrors': total['errors'], 'pageErrors': errs[:10],
               'heapFirstThirdMB': round(first, 2), 'heapLastThirdMB': round(last, 2), 'nodesFirst': round(fn), 'nodesLast': round(ln),
               'listenersFirst': round(fl), 'listenersLast': round(ll),
               'pass': last <= first * 1.15 + 1 and ln <= fn * 1.15 + 50 and ll <= fl * 1.1 + 10 and not errs}
    json.dump({'samples': samples, 'verdict': verdict}, open(OUT, 'w'), indent=1, ensure_ascii=False)
    print(json.dumps(verdict, ensure_ascii=False)); sys.exit(0 if verdict['pass'] else 1)

asyncio.run(main())
