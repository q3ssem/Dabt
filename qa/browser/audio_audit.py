"""Programmatic audio audit (not a listening test): per puzzle, which sound events fire on interaction, how many
audio nodes they create, nothing while idle, nothing when muted, one AudioContext for the whole app.
Usage: python3 qa/browser/audio_audit.py URL OUT.json [ids,comma,separated]"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import open_game

URL = sys.argv[1]; OUT = sys.argv[2]
INIT = r"""(()=>{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;window.__au={ctx:0,nodes:0,buffers:0};
const W=class extends A{constructor(...a){super(...a);window.__au.ctx++;}};window.AudioContext=W;if(window.webkitAudioContext)window.webkitAudioContext=W;
for(const m of ['createOscillator','createBufferSource','createGain','createBiquadFilter','createStereoPanner']){const o=A.prototype[m];if(o)A.prototype[m]=function(...a){window.__au.nodes++;return o.apply(this,a)}}
const ob=A.prototype.createBuffer;A.prototype.createBuffer=function(...a){window.__au.buffers++;return ob.apply(this,a)};})();"""
WRAP = r"""()=>{if(window.__sfxw||typeof sfx==='undefined')return;window.__sfxw=1;window.__ev=[];for(const k of Object.keys(sfx)){const f=sfx[k];if(typeof f!=='function')continue;sfx[k]=function(...a){window.__ev.push(k+(typeof a[0]==='string'?':'+a[0]:''));return f.apply(this,a)}}
if(window.Watercolor&&Watercolor.stone){const s=Watercolor.stone;Watercolor.stone=function(){window.__ev.push('watercolor.stone');return s.apply(this,arguments)}}}"""
async def poke(page):
    """Trigger game controls via Playwright hit testing, never synthetic DOM events."""
    controls = page.locator('#pzb button:not([disabled]), #pzb [role="button"], #pzb [data-i], #pzb .cell, #pzb td, #lbb button, #lbb [data-slot]')
    n = 0
    for i in range(min(await controls.count(), 20)):
        if n >= 5: break
        el = controls.nth(i)
        try:
            if not await el.is_visible(): continue
            box = await el.bounding_box()
            if not box or box['width'] < 6 or box['height'] < 6: continue
            await el.click(timeout=1300)
            n += 1
            await page.wait_for_timeout(90)
        except Exception:
            continue
    return n

async def main():
    ids = sys.argv[3].split(',') if len(sys.argv) > 3 else None
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        c = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, locale='ar-SA')
        await c.add_init_script(INIT); pg = await c.new_page(); await pg.goto(URL); await pg.wait_for_timeout(1200)
        if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
        # Load puzzle dependencies through the app's deferred public entrypoint.
        await pg.evaluate("async()=>{if(window.mindlabPlayLayers && !window.mindlabPlayLayers.ready) await window.mindlabPlayLayers.start()}")
        await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready", timeout=45000)
        await pg.mouse.click(5, 5)  # a real gesture unlocks audio, as on a phone
        await pg.evaluate(WRAP)
        await pg.evaluate("()=>{try{sfx.tick()}catch(e){}}")  # the engine's own context exists first, as in real play
        if not ids: ids = await pg.evaluate("()=>Object.keys(GM).filter(k=>/^pz_/.test(k))")
        for g in ids:
            try:
                await pg.evaluate("()=>{try{closePlay()}catch(e){}}"); await asyncio.wait_for(open_game(pg, g), 25)
            except Exception as e:
                res[g] = {'error': str(e)[:80]}; continue
            await pg.wait_for_timeout(600)
            try:
                res[g] = await probe(pg)
            except Exception as e:
                res[g] = {'error': str(e)[:80]}
            print(g, json.dumps(res[g], ensure_ascii=False), flush=True)
        await b.close()
    bad = {g: r for g, r in res.items() if ('error' in r or not r.get('pokes', 0) or r.get('idleNodes2s', 0) or r.get('mutedNodes', 0) or r.get('contexts', 0) > 1)}
    json.dump({'results': res, 'violations': bad}, open(OUT, 'w'), ensure_ascii=False, indent=1)
    print('puzzles', len(res), 'errors', sum('error' in r for r in res.values()), 'violations', len(bad), json.dumps(bad, ensure_ascii=False)[:600])
    sys.exit(1 if bad else 0)


async def probe(pg):
    a0 = await pg.evaluate("()=>({...window.__au,ev:window.__ev.length})")
    n = await poke(pg); await pg.wait_for_timeout(400)
    a1 = await pg.evaluate("()=>({...window.__au,ev:window.__ev.length})")
    ev = await pg.evaluate(f"()=>window.__ev.slice({a0['ev']})")
    await pg.wait_for_timeout(1200)
    a1b = await pg.evaluate("()=>({...window.__au})")
    await pg.wait_for_timeout(2000)
    a2 = await pg.evaluate("()=>({...window.__au})")
    await pg.evaluate("()=>{S.st.mute=true}")
    await pg.wait_for_timeout(300)
    muted = await pg.evaluate("()=>({...window.__au})")
    await poke(pg); await pg.wait_for_timeout(2300)
    a3 = await pg.evaluate("()=>({...window.__au})")
    await pg.evaluate("()=>{S.st.mute=false}")
    return {'pokes': n, 'events': sorted(set(ev)), 'eventCount': len(ev), 'nodes': a1['nodes'] - a0['nodes'],
            'idleNodes2s': a2['nodes'] - a1b['nodes'], 'mutedNodes': a3['nodes'] - muted['nodes'], 'contexts': a3['ctx'], 'buffers': a3['buffers'] - a0['buffers']}

asyncio.run(main())
