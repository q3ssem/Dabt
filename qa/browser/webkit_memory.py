"""WebKit long single-tab session with memory telemetry: one page, N puzzles in a row, RSS of the WebKit web process
after each round. Usage: wkmem.py URL N puzzles(comma) out.json [nav|spa]
  nav: page.goto between rounds (fresh document each time)   spa: stay in the same document (startRun again)"""
import asyncio, sys, json, subprocess, time
from playwright.async_api import async_playwright
URL, N, G, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3].split(','), sys.argv[4]; MODE = sys.argv[5] if len(sys.argv) > 5 else 'nav'
def rss():
    out = subprocess.run(['ps', '-eo', 'pid,rss,args'], capture_output=True, text=True).stdout.splitlines()
    return {l.split()[0]: int(l.split()[1]) // 1024 for l in out if 'WPEWebProcess' in l and '<defunct>' not in l}
async def main():
    rec = {'url': URL, 'mode': MODE, 'puzzles': G, 'rounds': []}
    async with async_playwright() as p:
        b = await p.webkit.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 820}, has_touch=True); await ctx.add_init_script('window.__test={}')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160])); crashed = []
        pg.on('crash', lambda *_: crashed.append(time.time()))
        await pg.goto(URL); await pg.wait_for_timeout(2000)
        if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
        try:
            for i in range(N):
                g = G[i % len(G)]
                if MODE == 'nav':
                    await pg.goto(URL); await pg.wait_for_timeout(1400)
                    if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
                else:
                    await pg.evaluate("() => { document.querySelector('#stage .res, #stage') && 0 }")
                await pg.evaluate("() => { window.__test = {} }")
                await pg.evaluate("(g) => startRun([g])", g); await pg.wait_for_timeout(300)
                if await pg.locator('#stage #go').count(): await pg.locator('#stage #go').click(timeout=8000)
                await pg.wait_for_timeout(1800)
                await pg.evaluate("""() => { const h = window.__test.pz; if (!h) return; if (h.solve) h.solve(); else if (h.set) h.set(); else if (h.pick) h.pick(h.P.gone); }""")
                btn = {'pz_arelic': '#arlgo', 'pz_aarch': '#aargo', 'pz_alayer': '#alygo', 'pz_acity': '#actgo', 'pz_door': '#plgo', 'pz_pliar': '#plgo'}.get(g)
                if btn and await pg.locator(btn).count(): await pg.locator(btn).first.click(timeout=8000)
                if g == 'pz_pliar': await pg.wait_for_timeout(1300); await pg.evaluate("() => window.__test.pz.set()"); await pg.locator('#plgo').click(timeout=8000)
                await pg.wait_for_timeout(2600)
                dom = await pg.evaluate("() => [document.getElementsByTagName('*').length, document.querySelectorAll('img').length]")
                rec['rounds'].append({'i': i, 'g': g, 'rss_mb': rss(), 'dom': dom})
                print(i, g, rec['rounds'][-1]['rss_mb'], dom, flush=True)
            rec['result'] = 'ok'
        except Exception as e:
            rec['result'] = f'CRASH at round {len(rec["rounds"])}: {str(e)[:120]}'; rec['crash_events'] = len(crashed)
        rec['page_errors'] = errs
    json.dump(rec, open(OUT, 'w'), ensure_ascii=False, indent=1); print(rec['result'])
asyncio.run(main())
