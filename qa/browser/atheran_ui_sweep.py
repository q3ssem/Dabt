"""5.5.28 athran-assets-2 — Atheran screens on phone and tablet widths, online and offline, from a real completed (or mid-way) save.

Loads a save written by atheran_campaign.py (OUT/save.json), then at 320, 390 and 768 px: the campaign cover,
the atlas with its 21 station buttons and map markers (state, size, overlap), the station / region / relics /
journal / secret-worlds / finale screens, a stage intro and a played stage. Every <img> must load, every UI frame
binding must point at an existing image, no screen may scroll sideways. A mid-way save checks the three marker
states. Then the same browser goes offline and reloads: the cover, atlas and an already opened station must still
draw. Usage: SAVE=path/save.json OUT=dir python3 qa/browser/atheran_ui_sweep.py URL  (ENGINE=webkit for Safari)
"""
import asyncio, json, os, pathlib, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8130/index.html'
SAVE = json.loads(pathlib.Path(os.environ['SAVE']).read_text(encoding='utf-8'))
OUT = pathlib.Path(os.environ.get('OUT', 'ui-sweep')); OUT.mkdir(parents=True, exist_ok=True)
ENGINE = os.environ.get('ENGINE', 'chromium')
SOLVE = (pathlib.Path(__file__).parent / 'atheran_campaign.py').read_text(encoding='utf-8').split('SOLVE = r"""')[1].split('"""')[0]
checks, problems = [], []
def ok(c, label, extra=None):
    (checks if c else problems).append(label if c else f'{label} :: {extra}'); return c

IMGS = """() => { const bad = []; let n = 0;
  document.querySelectorAll('img').forEach(i => { const r = i.getBoundingClientRect(); if (!i.src || i.closest('[hidden]') || r.width === 0 || r.bottom < 0 || r.top > innerHeight) return; n++;
    if (!(i.complete && i.naturalWidth > 0)) bad.push(i.getAttribute('src').slice(-70)); });
  return { n, bad }; }"""
OVERFLOW = "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
FRAMES = """async () => { const out = []; for (const e of document.querySelectorAll('[data-ah-frame]')) { const r = e.getBoundingClientRect(); if (!r.width) continue;
  const u = getComputedStyle(e).borderImageSource; const m = /url\\("?([^")]+)/.exec(u); let okk = false;
  if (m) { const im = new Image(); im.src = m[1]; await im.decode().then(() => okk = im.naturalWidth > 0).catch(() => okk = false); }
  out.push({ f: e.dataset.ahFrame, ok: okk }); } return out; }"""
MAP = """() => { const btn = [...document.querySelectorAll('#v-puz [data-as]')].map(b => { const r = b.getBoundingClientRect(); return { i: +b.dataset.as, w: r.width, h: r.height, x: r.x, y: r.y, cls: b.className, txt: b.innerText.trim().slice(0, 30), dis: b.disabled }; });
  const mk = [...document.querySelectorAll('.ah-map-marker')].map(m => { const r = m.getBoundingClientRect(); const s = m.querySelector('.ah-marker-state'); return { st: m.className.replace('ah-map-marker', '').trim(), w: r.width, h: r.height, loaded: !!(s && s.complete && s.naturalWidth) }; });
  const vw = innerWidth; return { btn, mk, vw }; }"""

async def shot(pg, name): await pg.screenshot(path=str(OUT / f'{name}.png'), full_page=False)

async def close_modals(pg):
    await pg.evaluate("() => document.querySelector('.atheran-book-close')?.click()"); await pg.wait_for_timeout(250)
    for _ in range(6):
        n = await pg.evaluate("() => document.querySelectorAll('.xvaultm:not(.out)').length")
        if not n: return
        await pg.evaluate("() => { const ms = [...document.querySelectorAll('.xvaultm:not(.out)')]; const m = ms[ms.length - 1]; const c = m.querySelector('[data-close]'); if (c) c.click(); else m.remove(); }")
        await pg.wait_for_timeout(350)

async def screen(pg, tag, label):
    await pg.wait_for_timeout(700)
    im = await pg.evaluate(IMGS); ov = await pg.evaluate(OVERFLOW); fr = await pg.evaluate(FRAMES)
    ok(not im['bad'], f'{tag} {label}: all {im["n"]} visible images load', im['bad'][:4])
    ok(ov <= 1, f'{tag} {label}: no sideways scroll', ov)
    ok(all(f['ok'] for f in fr), f'{tag} {label}: frame borders load ({", ".join(sorted(set(f["f"] for f in fr))) or "none"})', fr)
    await shot(pg, f'{tag}-{label}')
    return fr

async def main():
    async with async_playwright() as p:
        browser = await (p.webkit.launch() if ENGINE == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']))
        seen_frames = set(); asset_urls = set()
        for w, h in ((320, 640), (390, 844), (430, 932), (768, 1024)):
            tag = f'{ENGINE}-{w}'
            ctx = await browser.new_context(viewport={'width': w, 'height': h}, screen={'width': w, 'height': h}, has_touch=True, locale='ar-SA', is_mobile=True)
            await ctx.add_init_script('window.__test={}')
            await ctx.add_init_script(f"if(!localStorage.getItem('__seeded')){{const s={json.dumps(SAVE, ensure_ascii=False)};for(const k in s)localStorage.setItem(k,s[k]);localStorage.setItem('__seeded','1')}}")
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.on('request', lambda r: '/atheran/assets/' in r.url and asset_urls.add(r.url.split('/atheran/assets/')[1]))
            await pg.goto(URL, wait_until='load'); await pg.wait_for_timeout(1500)
            if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
            await pg.click('.tab[data-tab=puz]'); await pg.wait_for_timeout(900)
            seen_frames |= {f['f'] for f in await screen(pg, tag, 'cover')}
            await pg.click('.ah-launch-go'); await pg.wait_for_timeout(900)
            seen_frames |= {f['f'] for f in await screen(pg, tag, 'atlas')}
            m = await pg.evaluate(MAP)
            ok(len(m['btn']) == 21, f'{tag}: 21 station buttons', len(m['btn']))
            small = [b['i'] for b in m['btn'] if b['w'] < 30 or b['h'] < 30]
            ok(not small, f'{tag}: every station button is at least 30×30 px (WCAG 2.5.8 asks 24)', small)
            hit = [(a['i'], c['i']) for a in m['btn'] for c in m['btn'] if a['i'] < c['i'] and a['x'] < c['x'] + c['w'] - 2 and c['x'] < a['x'] + a['w'] - 2 and a['y'] < c['y'] + c['h'] - 2 and c['y'] < a['y'] + a['h'] - 2]
            ok(not hit, f'{tag}: no two station buttons overlap', hit)
            outside = [b['i'] for b in m['btn'] if b['x'] < -1 or b['x'] + b['w'] > m['vw'] + 1]
            ok(not outside, f'{tag}: station buttons stay inside the screen', outside)
            ok(len(m['mk']) == 18 and all(k['loaded'] for k in m['mk']), f'{tag}: 18 map markers (the 3 gate stations sit above the map) drawn with their state art', [k for k in m['mk'] if not k['loaded']][:3])
            (OUT / f'{tag}-map.json').write_text(json.dumps(m, ensure_ascii=False), encoding='utf-8')
            # station modal + scene
            await pg.locator('#v-puz [data-as="4"]').scroll_into_view_if_needed(); await pg.click('#v-puz [data-as="4"]')
            seen_frames |= {f['f'] for f in await screen(pg, tag, 'station')}
            await close_modals(pg)
            for fn, label in (("() => aRegionInfo(1)", 'region'), ("() => aTraces()", 'relics'), ("() => aSwList()", 'secrets'), ("() => aFinale(0)", 'finale')):
                await pg.evaluate(fn); seen_frames |= {f['f'] for f in await screen(pg, tag, label)}; await close_modals(pg)
            jr = pg.locator('.atheran-journal-open:visible')
            if await jr.count():
                await jr.first.click(); seen_frames |= {f['f'] for f in await screen(pg, tag, 'journal')}; await close_modals(pg)
            # a stage: intro, play, result
            await pg.evaluate("() => aStation(4)"); await pg.wait_for_timeout(400)
            await pg.locator('.zmodal button:visible, .xvaultm button:visible', has_text='ابدأ').last.click(); await pg.wait_for_timeout(500)
            seen_frames |= {f['f'] for f in await screen(pg, tag, 'stage-intro')}
            if await pg.locator('#stage #go').count(): await pg.click('#stage #go')
            await pg.wait_for_timeout(3600)
            bg = await pg.evaluate("() => getComputedStyle(document.querySelector('#play')).getPropertyValue('--ah-stage-bg')")
            ok('stage1' in bg or 'stage_1' in bg, f'{tag}: stage 1 shows its own stage background', bg[-80:])
            seen_frames |= {f['f'] for f in await screen(pg, tag, 'play')}
            await pg.locator('#play button:visible', has_text='تلميح').first.click(); await pg.wait_for_timeout(500)
            seen_frames |= {f['f'] for f in await screen(pg, tag, 'hint')}
            await pg.evaluate(SOLVE, await pg.evaluate("() => ASTN[4].id"))
            for _ in range(40):
                if await pg.evaluate("() => !!document.querySelector('#stage .res[data-ah-frame]')"): break
                await pg.wait_for_timeout(250)
            fr = await screen(pg, tag, 'result'); seen_frames |= {f['f'] for f in fr}
            ok(any(f['f'] in ('ui_win_screen_frame', 'ui_perfect_win_frame') for f in fr), f'{tag}: a won stage shows a win frame', fr)
            if w == 390:
                # a lost stage: three wrong guesses on the giants end the stage → the retry frame
                await pg.evaluate("() => closePlay()"); await pg.wait_for_timeout(300)
                await pg.evaluate("() => startRun(['pz_agiant'])"); await pg.wait_for_timeout(300)
                if await pg.locator('#stage #go').count(): await pg.click('#stage #go')
                await pg.wait_for_timeout(3400)
                for _ in range(3):
                    await pg.evaluate("() => { const h = __test.pz, P = h.P; h.pick(P.ans === 0 ? 1 : 0); h.check ? h.check() : h.go(); }"); await pg.wait_for_timeout(900)
                for _ in range(30):
                    if await pg.evaluate("() => !!document.querySelector('#stage .res[data-ah-frame]')"): break
                    await pg.wait_for_timeout(250)
                fr = await screen(pg, tag, 'retry'); seen_frames |= {f['f'] for f in fr}
                ok(any(f['f'] == 'ui_retry_screen_frame' for f in fr), f'{tag}: a lost stage shows the retry frame', fr)
                # a win with mistakes: two wrong guesses, then the right one → fewer than three stars → the plain win frame
                await pg.evaluate("() => closePlay()"); await pg.wait_for_timeout(300)
                await pg.evaluate("() => startRun(['pz_agiant'])"); await pg.wait_for_timeout(300)
                if await pg.locator('#stage #go').count(): await pg.click('#stage #go')
                await pg.wait_for_timeout(3400)
                for _ in range(2):
                    await pg.evaluate("() => { const h = __test.pz, P = h.P; h.pick(P.ans === 0 ? 1 : 0); h.check ? h.check() : h.go(); }"); await pg.wait_for_timeout(900)
                await pg.evaluate(SOLVE, 'pz_agiant')
                for _ in range(30):
                    if await pg.evaluate("() => !!document.querySelector('#stage .res[data-ah-frame]')"): break
                    await pg.wait_for_timeout(250)
                fr = await screen(pg, tag, 'win-with-mistakes'); seen_frames |= {f['f'] for f in fr}
                stars = await pg.evaluate("() => document.querySelectorAll('#stage .res .bigstars path[fill=\"var(--gold)\"]').length")
                ok(any(f['f'] == 'ui_win_screen_frame' for f in fr), f'{tag}: a win with {stars} gold stars shows the plain win frame', fr)
            ok(not errs, f'{tag}: no JavaScript errors', errs[:3])
            if w == 390 and ENGINE == 'chromium':  # Playwright's WebKit cannot reload a service-worker page offline
                # offline: the same browser, no network, reload
                await pg.evaluate("() => closePlay()"); await pg.wait_for_timeout(300)
                ctrl = await pg.evaluate("async () => { await navigator.serviceWorker.ready; return !!navigator.serviceWorker.controller }")
                if not ctrl: await pg.reload(); await pg.wait_for_timeout(1500)
                await pg.wait_for_timeout(4000)  # background warm of the opened station
                warm = await pg.evaluate("() => window.__ahWarm || {}")
                cached = await pg.evaluate("async () => { const ks = await caches.keys(); const out = {}; for (const k of ks) out[k] = (await (await caches.open(k)).keys()).length; return out; }")
                ok(any('motion-batch-1-core' in k for k in cached), 'service worker installed the 5.5.28 athran-assets-2 core cache', cached)
                await ctx.set_offline(True)
                await pg.reload(); await pg.wait_for_timeout(2000)
                if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
                await pg.click('.tab[data-tab=puz]'); await pg.wait_for_timeout(900)
                await screen(pg, tag, 'offline-cover')
                await pg.click('.ah-launch-go'); await pg.wait_for_timeout(900)
                await screen(pg, tag, 'offline-atlas')
                ok(await pg.evaluate("() => !!window.ATHRAN_BINDINGS"), 'offline: the bindings layer loads from the cache')
                await pg.evaluate("() => aStation(4)"); await pg.wait_for_timeout(400)
                await pg.locator('.zmodal button:visible, .xvaultm button:visible', has_text='ابدأ').last.click(); await pg.wait_for_timeout(500)
                if await pg.locator('#stage #go').count(): await pg.click('#stage #go')
                await pg.wait_for_timeout(3600)
                await screen(pg, tag, 'offline-play')
                # stage 3 of the same station was never shown online: it must come from the warm-up
                u3 = await pg.evaluate("() => MINDLAB_ATHRAN_ASSETS.url(MINDLAB_ATHRAN_ASSETS.stationBackground(ASTN[4].id, 2)?.asset_id || '')")
                st3 = await pg.evaluate("async (u) => u ? (await fetch(u)).status : -1", u3)
                ok(st3 == 200, 'offline: stage 3 background of an opened station is available (warmed)', [u3[-60:], st3, warm])
                other = await pg.evaluate("async () => (await fetch(MINDLAB_ATHRAN_ASSETS.url(MINDLAB_ATHRAN_ASSETS.list('station_stage_bg').find(r => r.station_id === ASTN[15].id).asset_id))).status")
                (OUT / 'offline.json').write_text(json.dumps({'warm': warm, 'cached': cached, 'unopened_station_stage_status': other}, ensure_ascii=False), encoding='utf-8')
                await ctx.set_offline(False)
            await ctx.close()
        # mid-way save: the three marker states
        ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, locale='ar-SA')
        await ctx.add_init_script(f"if(!localStorage.getItem('__seeded')){{const s={json.dumps(SAVE, ensure_ascii=False)};for(const k in s)localStorage.setItem(k,s[k]);localStorage.setItem('__seeded','1')}}")
        pg = await ctx.new_page(); await pg.goto(URL); await pg.wait_for_timeout(1500)
        if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
        await pg.evaluate("() => { const a = aState(); const keep = ASTN.slice(0, 7).map(s => s.id); a.done = Object.fromEntries(keep.map(k => [k, 1])); a.prog = 7; S.save(); }")
        await pg.click('.tab[data-tab=puz]'); await pg.wait_for_timeout(700); await pg.click('.ah-launch-go'); await pg.wait_for_timeout(900)
        m = await pg.evaluate(MAP)
        st = [k['st'] for k in m['mk']]
        ok(st.count('done') == 4 and st.count('open') == 1 and st.count('locked') == 13, 'mid-way (7 stations done): the 18 map markers read 4 done, 1 open, 13 locked', st)
        cls = [b['cls'].split()[-1] for b in m['btn']]
        ok(cls.count('done') == 7 and cls.count('cur') == 1 and cls.count('lock') == 13, 'mid-way: the 21 station buttons read 7 done, 1 current, 13 locked', cls)
        cls = [b['cls'] for b in m['btn']]
        (OUT / 'midway-map.json').write_text(json.dumps(m, ensure_ascii=False), encoding='utf-8')
        await shot(pg, f'{ENGINE}-midway-atlas')
        await pg.locator('.ah-station-map-markers').scroll_into_view_if_needed(); await shot(pg, f'{ENGINE}-midway-map')
        await browser.close()
    (OUT / 'assets_requested.json').write_text(json.dumps(sorted(asset_urls), ensure_ascii=False), encoding='utf-8')
    print(json.dumps({'status': 'passed' if not problems else 'failed', 'checks': len(checks), 'problems': problems, 'frames_seen': sorted(seen_frames), 'assets_requested': len(asset_urls)}, ensure_ascii=False, indent=1))
    sys.exit(0 if not problems else 1)
asyncio.run(main())
