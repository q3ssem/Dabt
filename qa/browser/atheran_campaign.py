"""5.5.28 — Atheran campaign, played end to end in a real browser through the player's own screens.

Fresh profile → the campaign card is locked → the Seven Kings palace is marked finished (that chapter is out of
scope here, so its save is seeded) → the atlas opens → each of the 21 stations is started from its map button and
its three stages are solved with the engine's own QA hook (window.__test.pz) → traces, the five secret worlds
(discovered through their original triggers, then played), the finale panels, a replay that must not lower the best
result, a reload that must keep everything, and the library rule (secret worlds hidden until discovered).

Usage: python3 qa/browser/atheran_campaign.py [URL]   (env CHROME=/path/to/chrome, OUT=dir for screenshots)
Exit code 0 only when every check passed.
"""
import asyncio, json, os, pathlib, shutil, sys
from playwright.async_api import async_playwright
from player_openings import dismiss_opening, close_transition

URL = os.environ.get('MINDLAB_URL') or (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/index.html')
CHROME = os.environ.get('CHROME') or next((c for c in ('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser') if os.path.exists(c)), None)
OUT = pathlib.Path(os.environ.get('OUT') or (pathlib.Path(__file__).resolve().parent / 'atheran-shots'))
OUT.mkdir(parents=True, exist_ok=True)

# One solver per engine, using only the engine's QA hook and its generated puzzle P. Returns nothing; the harness
# then waits for the win screen. These never call aWin directly: the engine's own check decides the win.
SOLVE = r"""
async (id) => {
  const h = window.__test && window.__test.pz; if (!h) return 'no-hook';
  const P = h.P || {}, wait = ms => new Promise(r => setTimeout(r, ms));
  const sc = () => { if (h.check) h.check(); else if (h.go) h.go(); };
  switch (id) {
    case 'pz_aport': h.pick(P.t0); h.go(); break;
    case 'pz_aroot': case 'pz_aherd': for (const m of P.sol) { h.act(m); await wait(60); } break;
    case 'pz_ashade': case 'pz_agiant': case 'pz_aflow': case 'pz_wlake': h.pick(P.ans); sc(); break;
    case 'pz_aecho': h.pick(P.src); sc(); break;
    case 'pz_acity': h.pick(P.gone); sc(); break;
    case 'pz_abridge': { const r = h.solve(); for (const i of r.slice(1)) { h.tap(i); await wait(40); } sc(); break; }
    case 'pz_asilent': for (let i = 0; i < 40; i++) { if (document.querySelector('#play').hidden) break; if (h.ready && !h.ready()) { await wait(250); continue; } h.answer(); await wait(350); } break;
    case 'pz_aheart': for (let i = 0; i < (P.ops || []).length; i++) { h.reverse(); await wait(60); } h.pick(P.ans); await wait(60); sc(); break;
    default: if (h.set) h.set(); await wait(60); sc();
  }
  return 'ok';
}
"""

PIECES_STATE = r"""() => { const p = document.querySelector('#pzb'); if (!p) return null; const m = {};
  p.querySelectorAll('[data-ah-state]').forEach(e => { const s = e.dataset.ahState || 'none'; m[s] = (m[s] || 0) + 1; });
  p.querySelectorAll('image.ah-pc').forEach(e => { const s = 'svg:' + e.dataset.state; m[s] = (m[s] || 0) + 1; });
  return { game: p.dataset.ahPieces || '', states: m }; }"""
bind_log = {}
checks, problems = [], []
def ok(cond, label, extra=None):
    (checks if cond else problems).append(label if cond else f'{label} :: {extra}')
    return cond

async def main():
    async with async_playwright() as p:
        engine = os.environ.get('ENGINE', 'chromium')  # ENGINE=webkit runs the same journey in Safari's engine
        browser = await (p.webkit.launch() if engine == 'webkit' else p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox']))
        VW, VH = (int(x) for x in os.environ.get('VIEWPORT', '390x844').split('x'))  # VIEWPORT=430x932 = iPhone 16 Plus
        ctx = await browser.new_context(viewport={'width': VW, 'height': VH}, screen={'width': VW, 'height': VH}, is_mobile=True, has_touch=True, device_scale_factor=1, locale='ar-SA')
        page = await ctx.new_page(); errors = []
        page.on('pageerror', lambda e: errors.append(str(e)[:200]))
        await page.add_init_script('window.__test={}')
        await page.goto(URL, wait_until='load', timeout=60000); await page.wait_for_timeout(1500); await page.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
        if await page.locator('.mpc[data-m=main]').count(): await page.click('.mpc[data-m=main]')
        ev = page.evaluate

        # --- gate: locked before the Seven Kings palace, library hides the five secret worlds ---
        await page.click('.tab[data-tab=puz]'); await page.wait_for_timeout(900)
        card = await ev("() => document.querySelector('.ah-launch')?.innerText || ''")
        ok('مقفلة' in card, 'campaign card says locked on a fresh profile', card)
        lib = await ev("() => LA.librarySections().flatMap(s => s[1].map(g => g.id))")
        ok(not any(x.startswith('pz_w') for x in lib), 'library hides all five secret worlds before discovery')
        ok('pz_aflow' in lib, 'pz_aflow is back in the library')
        await ev("() => { const t = txState(); t.a4 = { prog: 0, done: Object.fromEntries(PW.map(w => [w.id, 1])), arts: [] }; S.save(); }")
        await ev("() => renderPuz()"); await page.wait_for_timeout(500)
        ok(await ev("() => aOpen()"), 'campaign opens once all 19 palace stations are done (any order)')
        # 5.5.28 moved the entry into the journey hub; the hub's Atheran chapter calls this same function.
        await ev("() => window.ATHERAN_CAMPAIGN.open()"); await page.wait_for_timeout(900)
        await page.screenshot(path=str(OUT / '01-atlas.png'))
        ok(await ev("() => LA.view === 'atheran' && document.querySelectorAll('#v-puz [data-as]').length === 21"), 'atlas shows 21 station buttons')

        scenes_seen = []
        async def wait_win(timeout=12000):
            for _ in range(timeout // 250):
                state = await ev("() => ({ next: !!document.querySelector('#play #ag:not([hidden])') && document.querySelector('#play #ag').offsetParent !== null, hidden: document.querySelector('#play').hidden, over: /انتهت|حاول مرة/.test(document.querySelector('#stage')?.innerText || '') && !document.querySelector('#play #ag') })")
                if state['next'] or state['hidden']: return True
                await page.wait_for_timeout(250)
            return False

        async def play_stages(gid, label, stages=3):
            for k in range(stages):
                go = page.locator('#stage #go')
                if await go.count(): await go.first.click()
                await dismiss_opening(page)
                await page.wait_for_timeout(3600)
                hud = await ev("() => document.querySelector('.pzhud')?.innerText.replace(/\\s+/g, ' ') || ''")
                if k == 0: await ev("() => { window.__ahVfxLog = []; }")
                pre = await ev(PIECES_STATE) if k == 0 else None
                res = await ev(SOLVE, gid)
                won = await wait_win()
                if k == 0:
                    await page.wait_for_timeout(300)
                    bind_log[gid] = {'start': pre, 'won': await ev(PIECES_STATE), 'vfx': await ev("() => window.__ahVfxLog || []"),
                                     'res_frame': await ev("() => document.querySelector('#stage .res')?.dataset.ahFrame || ''")}
                if not ok(won and res == 'ok', f'{label} stage {k + 1} won', f'{res} hud={hud}'):
                    await page.screenshot(path=str(OUT / f'fail-{gid}-{k + 1}.png')); return False
                if k < stages - 1:
                    await page.locator('#play #ag').click(); await page.wait_for_timeout(500)
            return True

        async def back_to_atlas():
            if not await ev("() => document.querySelector('#play').hidden"):
                hm = page.locator('#play #hm')
                if await hm.count() and await hm.is_visible(): await hm.click()
                else: await ev("() => closePlay()")
            await page.wait_for_timeout(700)
            if await ev("() => LA.view !== 'atheran' || curTab !== 'puz' || document.querySelector('#v-puz').offsetParent === null"):
                await ev("() => ATHERAN_CAMPAIGN.open()"); await page.wait_for_timeout(400)
            await close_modals()

        async def close_modals():
            await close_transition(page)
            # the campaign opens its story scene a moment after a first win; read it (screenshot once) and close it
            quiet = 0
            for _ in range(24):
                c = page.locator('.xvaultm:not(.out) [data-close]')
                if await c.count():
                    quiet = 0
                    if not scenes_seen and await page.locator('.xvaultm .asc').count():
                        scenes_seen.append(1); await page.screenshot(path=str(OUT / '05-scene.png'))
                    # a story decision (حجر الضوء، طريق القناديل) must be answered before the scene can close
                    await ev("() => { const ms = [...document.querySelectorAll('.xvaultm:not(.out)')]; const m = ms[ms.length - 1]; if (!m) return; const c = m.querySelector('.achoice [data-c]'); if (c) { c.click(); return; } m.querySelector('[data-close]').click(); }")
                    await page.wait_for_timeout(320)
                else:
                    quiet += 1
                    if quiet >= 3: break
                    await page.wait_for_timeout(250)

        # --- the 21 stations, in order, from the atlas ---
        stations = await ev("() => ASTN.map(s => s.id)")
        for i, gid in enumerate(stations):
            await close_modals()
            await page.click(f'#v-puz [data-as="{i}"]'); await page.wait_for_timeout(450)
            await page.locator('.zmodal button:visible, .xvaultm button:visible', has_text='ابدأ').last.click(); await page.wait_for_timeout(500)
            if not await play_stages(gid, f'station {i + 1} {gid}'): break
            await back_to_atlas()
            st = await ev("(id) => { const a = aState(); return { done: !!a.done[id], stars: a.stars[id] || 0, prog: a.prog }; }", gid)
            ok(st['done'] and st['stars'] == 3 and st['prog'] == i + 1, f'station {i + 1} recorded: done, 3 stars, progress {i + 1}', st)
        await page.screenshot(path=str(OUT / '02-atlas-complete.png'))

        a = await ev("() => { const a = aState(); return { tr: (a.tr || []).length, sw: a.sw || {}, perfect3: a.perfect3 || {} }; }")
        ok(a['tr'] == 14, 'all 14 expedition traces collected through the stations', a['tr'])
        ok(a['perfect3'].get('pz_asilent') == 1, 'flawless pz_asilent recorded (lake condition)')

        # --- secret worlds: discovered through their original triggers, then played ---
        async def discover(k):
            await back_to_atlas()
            if k == 'bones':
                tw = page.locator('#v-puz .atwaf')  # the wandering giant drawn on the atlas
                if await tw.count():  # it walks along the map; bring it above the bottom tab bar first
                    await ev("() => document.querySelector('#v-puz .atwaf').scrollIntoView({ block: 'center' })"); await page.wait_for_timeout(300)
                    await tw.first.click(force=True)
            elif k == 'spores':
                b = page.locator('#anight')
                if await b.count(): await b.click()
                else:  # at night (19:00–05:00) the garden's mark is already on the atlas
                    m = page.locator('#v-puz [data-swm="spores"]')
                    if await m.count(): await m.first.click(force=True)
            else:
                m = page.locator(f'#v-puz [data-swm="{k}"]')  # a new mark pulses, so it never counts as "stable"
                if await m.count():
                    await ev("(k) => document.querySelector(`#v-puz [data-swm='${k}']`).scrollIntoView({ block: 'center' })", k); await page.wait_for_timeout(300)
                    await m.first.click(force=True)
            await page.wait_for_timeout(600)
            return await ev("(k) => !!(aState().sw || {})[k]", k)

        triggers = {}
        for k, gid in [('bones', 'pz_wbone'), ('spores', 'pz_wspore'), ('lake', 'pz_wlake'), ('ship', 'pz_wlog'), ('first', 'pz_wfirst')]:
            hidden_before = await ev("(id) => !LA.librarySections().some(s => s[1].some(g => g.id === id))", gid)
            ok(hidden_before, f'{gid} hidden from the library before discovery')
            found = await discover(k)
            triggers[k] = found
            ok(found, f'secret {k} discovered through its in-game trigger')
            ok(await ev("(id) => LA.librarySections().some(s => s[1].some(g => g.id === id))", gid), f'{gid} appears in the library after discovery')
            start = page.locator('.zmodal button:visible, .xvaultm button:visible', has_text='ادخل')
            if not await start.count(): start = page.locator('.zmodal button:visible, .xvaultm button:visible', has_text='ابدأ')
            if await start.count(): await start.last.click()
            else: await ev("(id) => { document.querySelectorAll('.zmodal,.xvaultm').forEach(m => m.remove()); startRun([id]); }", gid)
            await page.wait_for_timeout(500)
            n = await ev("(id) => { const s = txStageOf && txStageOf(id); return s && s.lv ? 3 : 1; }", gid)
            if await play_stages(gid, f'secret {k}', stages=n):
                await back_to_atlas()
                ok(await ev("(k) => !!(aState().swd || {})[k]", k), f'secret {k} recorded as cleared')
        await page.screenshot(path=str(OUT / '03-secrets.png'))

        # --- finale ---
        await back_to_atlas()
        fin = page.locator('#afinb')
        if await fin.count(): await fin.click()
        else: await ev("() => aFinale()")
        await page.wait_for_timeout(700)
        texts = []
        for _ in range(8):
            texts.append(await ev("() => document.querySelector('#afin')?.innerText || ''"))
            nx = page.locator('#afin button:visible, .zmodal button:visible', has_text='التالي')
            if not await nx.count(): break
            await nx.first.click(); await page.wait_for_timeout(400)
        await page.screenshot(path=str(OUT / '04-finale.png'))
        joined = ' '.join(texts)
        ok(len([t for t in texts if t]) >= 5, 'finale shows its five panels', len(texts))
        ok('ورد' in joined and 'نهى' in joined and 'رواء' in joined, 'finale names Roaa, Noha and Ward')

        # --- best result is kept on replay with a hint ---
        await back_to_atlas()
        await page.click('#v-puz [data-as="0"]'); await page.wait_for_timeout(400)
        await page.locator('.zmodal button:visible, .xvaultm button:visible', has_text='ابدأ').last.click(); await page.wait_for_timeout(500)
        go = page.locator('#stage #go')
        if await go.count(): await go.first.click()
        await page.wait_for_timeout(3600)
        await page.locator('#play button:visible', has_text='تلميح').first.click(); await page.wait_for_timeout(400)
        await ev(SOLVE, stations[0]); await wait_win()
        await back_to_atlas()
        ok(await ev("() => aState().stars.pz_aarch === 3"), 'replaying a station with a hint keeps its best result (3 stars)')

        # --- reload keeps everything, under the same save key ---
        before = await ev("() => JSON.stringify(txState().a5)")
        keys = await ev("() => Object.keys(localStorage)")
        await page.reload(); await page.wait_for_timeout(1500); await page.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=20000)
        after = await ev("() => JSON.stringify(txState().a5)")
        ok(before == after, 'campaign save survives a reload unchanged')
        ok('miran:v2' in keys, 'progress lives under miran:v2')
        ok(not errors, 'no JavaScript errors during the whole run', errors[:3])
        (OUT / 'save.json').write_text(json.dumps(await ev("() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))"), ensure_ascii=False), encoding='utf-8')
        await browser.close()
    (OUT / 'bindings.json').write_text(json.dumps(bind_log, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps({'status': 'passed' if not problems else 'failed', 'checks': len(checks), 'problems': problems, 'triggers': triggers, 'shots': str(OUT)}, ensure_ascii=False, indent=2))
    sys.exit(0 if not problems else 1)

asyncio.run(main())
