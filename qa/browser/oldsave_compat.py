"""Old-save compatibility: progress written by the pre-update build (main) must load unchanged on this branch.
1) On OLD, build a realistic save through the app's own state functions (palace, Treasure Island stations,
   Atheran, side journey, coins/stars), then dump localStorage.
2) Load that exact dump into NEW (fresh origin), boot, and compare: every key/value the player had is still there
   byte-for-byte, and the progress the app derives from it (done counts, unlocked chapters, coins) is identical.
Usage: python3 qa/browser/oldsave_compat.py NEW_URL OLD_URL"""
import asyncio, json, sys, os
from playwright.async_api import async_playwright

NEW, OLD = sys.argv[1], sys.argv[2]
fails, passed = [], 0


def ok(c, label):
    global passed
    if c: passed += 1
    else: fails.append(label); print('FAIL', label, flush=True)


SEED = r"""() => {
  const a = pState(); a.prog = Math.min(9, PW.length - 1); a.done = Object.fromEntries(PW.slice(0, a.prog).filter(w => w.id).map(w => [w.id, 1]));
  try { const x = T7.state(); T7.data.stations.slice(0, 7).forEach(s => { x.done[s.id] = { at: 1, stars: 3 }; }); } catch (e) {}
  try { const t = txState(); t.a4 = { prog: 2, done: { pz_aarch: 1, pz_alayer: 1 }, arts: [] }; } catch (e) {}
  try { S.st.coins = 137; } catch (e) {}
  S.save();
  const d = {}; for (let i = 1; i <= 6; i++) d['ml10_' + String(i).padStart(2, '0')] = true;
  localStorage.setItem('mindlab:expedition10:v1', JSON.stringify({ done: d, stars: { ml10_01: 3, ml10_02: 2 }, best: {}, totalStars: 5 }));
}"""
DERIVED = r"""() => {
  const out = {};
  try { const a = pState(); out.palaceProg = a.prog; out.palaceDone = Object.keys(a.done || {}).length; } catch (e) { out.palaceErr = String(e); }
  try { const x = T7.state(); out.t7Done = Object.keys(x.done || {}).length; } catch (e) { out.t7Err = String(e); }
  try { const t = txState(); out.atheranProg = t.a4 && t.a4.prog; out.atheranDone = t.a4 && Object.keys(t.a4.done || {}).length; } catch (e) {}
  try { out.coins = S.st.coins; } catch (e) {}
  try { out.aOpen = typeof aOpen === 'function' ? !!aOpen() : null; } catch (e) {}
  try { out.side = JSON.parse(localStorage.getItem('mindlab:expedition10:v1') || '{}').totalStars; } catch (e) {}
  return out;
}"""
DUMP = "() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))"


async def ensure_puzzle_layers(pg):
    pick = pg.locator('.mpc[data-m=main]')
    if await pick.count() and await pick.is_visible(): await pick.click()
    await pg.wait_for_function("()=>typeof tab==='function' && typeof startRun==='function'", timeout=30000)
    await pg.evaluate("()=>tab('puz')")
    await pg.wait_for_function("()=>!window.mindlabPlayLayers || window.mindlabPlayLayers.ready", timeout=45000)
    await pg.wait_for_function("()=>typeof pState==='function' && typeof txState==='function' && typeof T7!=='undefined' && typeof T7.state==='function'", timeout=30000)

async def boot(b, url, init=None):
    c = await b.new_context(viewport={'width': 390, 'height': 844})
    if init is not None:
        await c.add_init_script(f"(()=>{{if(sessionStorage.getItem('__seeded'))return;sessionStorage.setItem('__seeded','1');localStorage.clear();const d={json.dumps(init)};for(const k in d)localStorage.setItem(k,d[k]);}})()")
    pg = await c.new_page(); await pg.goto(url, wait_until='load')
    await ensure_puzzle_layers(pg)
    return c, pg


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'),args=['--no-sandbox'])
        c, pg = await boot(b, OLD)
        await pg.evaluate(SEED); await pg.reload(wait_until='load')
        await ensure_puzzle_layers(pg)
        old_dump = await pg.evaluate(DUMP); old_derived = await pg.evaluate(DERIVED); await c.close()
        ok(len(old_dump) >= 3, f'old build wrote a save ({len(old_dump)} keys)')
        c, pg = await boot(b, NEW, old_dump)
        await pg.wait_for_timeout(1500)
        new_dump = await pg.evaluate(DUMP); new_derived = await pg.evaluate(DERIVED)
        for k, v in old_dump.items():
            if k.startswith('mindlab:perf') or k.startswith('__'): continue
            ok(k in new_dump, f'key kept: {k}')
            if k in new_dump and k not in ('miran:v2',):
                ok(new_dump[k] == v, f'value unchanged: {k}')
        # the main save may gain fields the new build adds, but every old field keeps its value
        if 'miran:v2' in old_dump and 'miran:v2' in new_dump:
            o, n = json.loads(old_dump['miran:v2']), json.loads(new_dump['miran:v2'])
            lost = [k for k in o if k not in n]; changed = [k for k in o if k in n and o[k] != n[k] and k not in ('lastOpen', 'sessions', 'lastSeen', 'last')]
            ok(not lost, f'miran:v2 keeps every field (lost: {lost[:8]})')
            ok(not changed, f'miran:v2 field values unchanged (changed: {changed[:8]})')
        for k, v in old_derived.items():
            ok(new_derived.get(k) == v, f'derived {k}: old={v} new={new_derived.get(k)}')
        await c.close(); await b.close()
    print(json.dumps({'old': old_derived, 'new': new_derived}, ensure_ascii=False))
    print(f'chromium: {passed} passed, {len(fails)} failed')
    sys.exit(1 if fails else 0)

asyncio.run(main())
