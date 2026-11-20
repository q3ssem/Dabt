"""App-wide UI sweep in real Chrome: every tab, profile page controls, theme, mute toggle, kids mode, TV page,
assessment pages, then offline reload through the service worker."""
import asyncio, json, sys
from playwright.async_api import async_playwright
import argparse
ap = argparse.ArgumentParser(); ap.add_argument('--url', default='http://localhost:8080/'); ap.add_argument('--chrome'); ap.add_argument('--engine', choices=['chromium', 'webkit'], default='chromium'); A = ap.parse_args()
URL = A.url if A.url.endswith('/') else A.url + '/'
SHOTS = '/tmp/mindlab_sweep_'
KW = {'executable_path': A.chrome} if A.chrome else {}

OV = "()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2"
async def main():
    probs, log = [], {}
    async with async_playwright() as p:
        b = (await p.webkit.launch() if getattr(A,'engine','chromium')=='webkit' else await p.chromium.launch(args=['--no-sandbox'], **KW))
        for vp in [{'width': 390, 'height': 844}, {'width': 844, 'height': 390}]:
            c = await b.new_context(viewport=vp, is_mobile=True, has_touch=True, device_scale_factor=2, locale='ar-SA')
            pg = await c.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('dialog', lambda d: asyncio.ensure_future(d.dismiss()))
            tag = f"{vp['width']}x{vp['height']}"
            t0 = asyncio.get_event_loop().time()
            await pg.goto(URL, wait_until='load'); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
            nav = await pg.evaluate("()=>{const n=performance.getEntriesByType('navigation')[0];return {dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd),transfer_kb:Math.round(n.transferSize/1024)}}")
            log[f'load_{tag}'] = nav
            modes = await pg.evaluate("()=>[...document.querySelectorAll('.mpc')].map(e=>e.dataset.m)")
            log['profile_modes'] = modes
            await pg.click('.mpc[data-m=main]'); await pg.wait_for_timeout(500)
            for t in ['home', 'games', 'puz', 'me', 'home']:
                n = len(errs)
                await pg.click(f'.tab[data-tab={t}]', timeout=8000); await pg.wait_for_timeout(500)
                if await pg.evaluate(OV): probs.append(f'{tag} tab {t}: sideways scroll')
                await pg.screenshot(path=SHOTS + f'sweep_{t}_{tag}.png')
                if len(errs) > n: probs.append(f'{tag} tab {t}: {errs[n:][:2]}')
            # profile page: open every fold, toggle theme and mute through the real buttons
            await pg.click('.tab[data-tab=me]'); await pg.wait_for_timeout(300)
            for s in await pg.locator('#v-me details > summary').all():
                try: await s.click(timeout=2000); await pg.wait_for_timeout(120)
                except Exception as e: probs.append(f'{tag} me fold: {str(e)[:80]}')
            if await pg.evaluate(OV): probs.append(f'{tag} me (all folds open): sideways scroll')
            await pg.screenshot(path=SHOTS + f'sweep_me_open_{tag}.png', full_page=True)
            for sk in ['light', 'dark', 'auto', 'dark']:
                if await pg.locator(f'#v-me [data-sk="{sk}"]').count():
                    await pg.locator(f'#v-me [data-sk="{sk}"]').first.click(timeout=4000); await pg.wait_for_timeout(200)
                    got = await pg.evaluate("()=>[document.documentElement.dataset.skin,S.st.skin]")
                    if sk != 'auto' and got[0] != sk: probs.append(f'{tag} theme {sk} -> {got}')
                else: probs.append(f'{tag} theme button {sk} missing')
            labels = await pg.locator('#v-me [data-sk]').all_inner_texts(); log['theme_labels'] = labels
            m0 = await pg.evaluate('()=>S.st.mute')
            if await pg.locator('#mt').count():
                await pg.locator('#mt').click(timeout=4000); await pg.wait_for_timeout(200); m1 = await pg.evaluate('()=>S.st.mute')
                await pg.locator('#mt').click(timeout=4000); await pg.wait_for_timeout(200); m2 = await pg.evaluate('()=>S.st.mute')
                if not (m1 != m0 and m2 == m0): probs.append(f'{tag} mute toggle {m0}->{m1}->{m2}')
                saved = await pg.evaluate("()=>JSON.parse(localStorage.getItem('miran:v2')).mute")
                if saved != m2: probs.append('mute not persisted')
            else: probs.append('mute button #mt missing')
            # kids mode
            await pg.reload(); await pg.wait_for_timeout(600); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
            kid = [m for m in modes if m != 'main']
            for m in kid:
                if await pg.locator(f'.mpc[data-m="{m}"]').count():
                    await pg.click(f'.mpc[data-m="{m}"]'); await pg.wait_for_timeout(700)
                    await pg.screenshot(path=SHOTS + f'sweep_mode_{m}_{tag}.png')
                    if await pg.evaluate(OV): probs.append(f'{tag} mode {m}: sideways')
                    await pg.reload(); await pg.wait_for_timeout(600); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
            if errs: probs.append(f'{tag} errors: {errs[:3]}')
            await c.close()
        # kids games: start each kid game through the engine
        c = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        pg = await c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(600); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000); await pg.click('.mpc[data-m=main]'); await pg.wait_for_timeout(300)
        kids = await pg.evaluate("()=>G.filter(g=>g.kid).map(g=>g.id)")
        log['kid_games'] = len(kids); bad = []
        for k in kids:
            n = len(errs)
            try:
                await pg.evaluate('(g)=>startRun([g])', k); await pg.wait_for_timeout(300)
                go = pg.locator('#stage #go')
                if await go.count(): await go.first.click(timeout=3000); await pg.wait_for_timeout(1500)
                if await pg.evaluate(OV): bad.append(k + ':sideways')
            except Exception as e: bad.append(k + ':' + str(e)[:60])
            await pg.evaluate('()=>closePlay()'); await pg.wait_for_timeout(150)
            if len(errs) > n: bad.append(k + ':' + errs[n][:80])
        if bad: probs.append(f'kid games: {bad}')
        # TV + assessment pages
        for path in ['tv/index.html', 'tv/remote.html', 'assessment/dashboard.html', 'assessment/rule-switch.html']:
            n = len(errs); await pg.goto(URL + path, wait_until='load'); await pg.wait_for_timeout(700); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
            if len(errs) > n: probs.append(f'{path}: {errs[n:][:2]}')
        # offline: install SW online, then reload with the network cut
        await c.close()
        c = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        pg = await c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000); await pg.wait_for_function("()=>navigator.serviceWorker&&navigator.serviceWorker.controller||new Promise(r=>setTimeout(()=>r(false),100))", timeout=30000)
        await pg.evaluate("()=>navigator.serviceWorker.ready"); await pg.reload(); await pg.wait_for_timeout(9000); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
        (await pg.locator('.mpc[data-m=main]').count() and await pg.click('.mpc[data-m=main]')); await pg.click('.tab[data-tab=puz]'); await pg.click('.v5-hubcard'); await pg.wait_for_timeout(300)
        await pg.evaluate('()=>T7.open(0)'); await pg.wait_for_timeout(800)
        caches = await pg.evaluate("async()=>{const out={};for(const k of await caches.keys()){out[k]=(await (await caches.open(k)).keys()).length}return out}")
        log['caches_online'] = caches
        await c.set_offline(True)
        await pg.reload(wait_until='load'); await pg.wait_for_timeout(1200); await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
        ok = await pg.evaluate("()=>typeof T7==='object'&&document.title")
        (await pg.locator('.mpc[data-m=main]').count() and await pg.click('.mpc[data-m=main]')); await pg.click('.tab[data-tab=puz]'); await pg.click('.v5-hubcard'); await pg.wait_for_timeout(300)
        await pg.evaluate('()=>T7.open(0)'); await pg.wait_for_timeout(600); await pg.click('.v5-intro-go'); await pg.wait_for_timeout(500)
        imgs = await pg.evaluate("()=>[...document.querySelectorAll('#v-puz img')].map(i=>[i.getAttribute('src').split('/').pop(),i.naturalWidth>0])")
        broken = [i for i, okk in imgs if not okk]
        log['offline'] = {'app': ok, 'station1_images': len(imgs), 'broken': broken}
        if ok != 'مختبر العقل': probs.append(f'offline reload failed: {ok}')
        if broken: probs.append(f'offline images missing on a visited station: {broken}')
        await pg.screenshot(path=SHOTS + 'offline_station1.png')
        # a station never opened online
        await pg.evaluate('()=>{const x=T7.state();T7.data.stations.forEach((s,j)=>{if(j<12)x.done[s.id]={at:1}});S.save();T7.open(12)}'); await pg.wait_for_timeout(600)
        await pg.click('.v5-intro-go'); await pg.wait_for_timeout(500)
        imgs2 = await pg.evaluate("()=>[...document.querySelectorAll('#v-puz img')].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src').split('/').pop())")
        log['offline_unvisited_station13_missing_images'] = imgs2
        if imgs2: probs.append(f'offline: unvisited station 13 board images missing {imgs2[:2]}')
        await pg.screenshot(path=SHOTS + 'offline_station13.png')
        if errs: probs.append(f'offline errors: {errs[:3]}')
        await b.close()
    sys.exitcode = 1 if probs else 0
    print(json.dumps({'status': 'failed' if probs else 'passed', **log, 'problems': probs}, ensure_ascii=False, indent=1))
asyncio.run(main()); sys.exit(sys.exitcode)
