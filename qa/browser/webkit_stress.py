"""WebKit (WPE) compositor-crash stress: one tab, the same puzzle solved again and again without navigating.
Usage: wkstress.py URL puzzle rounds variant out.json
variant: base | nobind (Atheran piece bindings off for the 4 boards) | nocss (motion/motion.css removed) | noanim (all CSS animations/transitions off)"""
import asyncio, sys, json, time, subprocess
from playwright.async_api import async_playwright
URL, G, N, V, OUT = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]
INIT = {'base': '', 
  'nobind': "addEventListener('load',()=>setTimeout(()=>{const B=window.ATHRAN_BINDINGS;if(B)['pz_aarch','pz_alayer','pz_acity','pz_arelic','pz_door','pz_pliar'].forEach(g=>delete B.PIECES[g])},800));",
  'nocss': "new MutationObserver(()=>document.querySelectorAll('link[href*=\"motion.css\"]').forEach(l=>l.remove())).observe(document,{childList:true,subtree:true});",
  'noanim': "addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='*,*::before,*::after{animation:none!important;transition:none!important}';document.head.append(s)});"}[V]
def segv(): return subprocess.run(['dmesg'], capture_output=True, text=True).stdout.count('segfault')
async def main():
    seg0 = segv(); rec = {'variant': V, 'puzzle': G, 'rounds': 0}
    async with async_playwright() as p:
        b = await p.webkit.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 820}, has_touch=True)
        await ctx.add_init_script('window.__test={};' + INIT); pg = await ctx.new_page()
        await pg.goto(URL); await pg.wait_for_timeout(2000)
        if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
        btn = {'pz_arelic': '#arlgo', 'pz_aarch': '#aargo', 'pz_alayer': '#alygo', 'pz_acity': '#actgo', 'pz_door': '#plgo'}[G]
        t0 = time.time()
        try:
            for i in range(N):
                await pg.evaluate("(g) => { window.__test = {}; startRun([g]) }", G); await pg.wait_for_timeout(250)
                if await pg.locator('#stage #go').count(): await pg.locator('#stage #go').click(timeout=8000)
                for _ in range(40):
                    if await pg.evaluate("() => !!(window.__test.pz && window.__test.pz.P)"): break
                    if await pg.locator('#stage #go').count(): await pg.locator('#stage #go').click(timeout=8000)
                    await pg.wait_for_timeout(250)
                await pg.wait_for_timeout(600)
                await pg.evaluate("() => { const h = window.__test.pz; if (h.set) h.set(); else if (h.pick) h.pick(h.P.gone) }")
                await pg.locator(btn).first.click(timeout=8000); await pg.wait_for_timeout(2200); rec['rounds'] = i + 1
            rec['result'] = 'ok'
        except Exception as e: rec['result'] = 'CRASH: ' + str(e)[:80]
        rec['secs'] = round(time.time() - t0); rec['new_segfaults'] = segv() - seg0
    json.dump(rec, open(OUT, 'w')); print(json.dumps(rec))
asyncio.run(main())
