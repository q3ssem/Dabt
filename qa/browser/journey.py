"""5.4.8 full Treasure Island journey in real Chrome — played with taps only, no state writes.

  python3 start.py &
  python3 qa/browser/journey.py [--url http://localhost:8080/] [--chrome /usr/bin/google-chrome] [--shots out/]

Covers: new journey from an empty device, the 21 stations in order (story → tool gate → board → reward),
tool gain/use, the six sea passages, the seven secrets, the treasures vault and notebook, the eighth-road
finale and its replay, reload/abrupt-close persistence, backup export and restore into a separate profile,
an older save, the sound layer (node counts — not listening), mute, background/return, and in-frame
layout for every board in portrait 390/320 and landscape 844×390.
"""
import argparse, asyncio, json, pathlib, re, sys
from playwright.async_api import async_playwright
from player_openings import dismiss_opening,close_transition

ROOT = pathlib.Path(__file__).resolve().parents[2]
SMOKE = (ROOT / 'qa/browser/smoke.py').read_text(encoding='utf-8')
STEPS_SRC = re.search(r'steps = await page\.evaluate\(f"""(.*?)"""\)', SMOKE, re.S).group(1)

AUDIO_SPY = r"""(()=>{window.__aud={osc:0,buf:0,ctx:0};const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
 const o=C.prototype.createOscillator,b=C.prototype.createBufferSource;
 C.prototype.createOscillator=function(){window.__aud.osc++;return o.apply(this,arguments)};
 C.prototype.createBufferSource=function(){window.__aud.buf++;return b.apply(this,arguments)};})()"""

# Every visible element of the puzzle view must stay inside the screen and inside its pane,
# unless an ancestor clips/scrolls it (that ancestor is then checked itself).
FRAME_JS = r"""()=>{const vw=document.documentElement.clientWidth,out=[],root=document.querySelector('#v-puz');if(!root)return['no #v-puz'];
 const pane=root.querySelector('.v5-pane'),pr=pane&&pane.getBoundingClientRect();
 for(const el of root.querySelectorAll('*')){const st=getComputedStyle(el);if(st.position==='fixed'||st.visibility==='hidden'||st.display==='none')continue;
  const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;let a=el.parentElement,clip=false;
  while(a&&a!==root){if(/auto|scroll|hidden|clip/.test(getComputedStyle(a).overflowX)){clip=true;break}a=a.parentElement}
  if(clip)continue;const tag=el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.className&&typeof el.className==='string'?'.'+el.className.split(' ')[0]:'');
  if(r.right>vw+1.5||r.left<-1.5)out.push('screen:'+tag+' ['+Math.round(r.left)+','+Math.round(r.right)+'] vw='+vw);
  else if(pr&&pane.contains(el)&&el!==pane&&(r.right>pr.right+1.5||r.left<pr.left-1.5))out.push('pane:'+tag+' ['+Math.round(r.left)+','+Math.round(r.right)+'] pane=['+Math.round(pr.left)+','+Math.round(pr.right)+']');}
 if(document.documentElement.scrollWidth>vw+2)out.push('page scrolls sideways '+document.documentElement.scrollWidth);
 return out.slice(0,6)}"""
IMAGES_JS = r"""async()=>{const bad=[];for(const i of document.querySelectorAll('#v-puz img')){if(!i.complete)await new Promise(r=>{i.onload=i.onerror=r;setTimeout(r,4000)});if(!i.naturalWidth)bad.push(i.getAttribute('src'))}
 const urls=new Set();for(const el of document.querySelectorAll('#v-puz *')){for(const m of getComputedStyle(el).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g))urls.add(m[1])}
 for(const u of urls){let s=0;try{s=(await fetch(u)).status}catch(e){}if(s!==200)bad.push(u+' '+s)}return bad}"""

async def enter_main(page):
    if await page.locator('.mpc[data-m=main]').count():
        await page.click('.mpc[data-m=main]'); await page.wait_for_timeout(500)

async def reveal(page, sel):
    """Open the folded section that holds a settings control, by tapping its summary like a user."""
    if await page.locator(sel).is_visible(): return
    summ = await page.evaluate(f"()=>{{const d=document.querySelector('{sel}')?.closest('details');if(!d)return null;d.querySelector(':scope>summary').setAttribute('data-q','1');return 1}}")
    if summ: await page.click('summary[data-q]'); await page.wait_for_timeout(250)

async def solve_board(page, i):
    await dismiss_opening(page)
    """Same tap-only solver the smoke test uses: read the next legal move, press the labelled control."""
    for _ in range(4):
        gate = page.locator('.v5-gate .t7-btn.primary')
        if not await gate.count(): break
        await gate.click(); await page.wait_for_timeout(250)
    steps = await page.evaluate(eval('f"""' + STEPS_SRC + '"""', {'i': i}))
    if steps is None:  # weigh: two real weighings then pick the odd stone
        for k in range(6):
            await page.locator(f'#v5-board [aria-label^="حجر {k+1}"]').first.click(); await page.wait_for_timeout(70)
        await page.locator('#v5-board .v5-weighbtn').click(); await page.wait_for_timeout(250)
        cand = await page.evaluate(f"()=>{{const v=T7.state().work[T7.data.stations[{i}].id];return T7.logic.weighParts(v).p.map((x,k)=>x!==3?k:-1).filter(k=>k>=0)}}")
        for k in cand[:2]:
            await page.locator(f'#v5-board [aria-label^="حجر {k+1}"]').first.click(); await page.wait_for_timeout(70)
        await page.locator('#v5-board .v5-weighbtn').click(); await page.wait_for_timeout(250)
        ded = await page.evaluate(f"()=>T7.logic.weighDeduced(T7.state().work[T7.data.stations[{i}].id])")
        steps = [[f'حجر {ded+1}']]
    n = 0
    for labels in steps:
        for lab in labels:
            if lab == '@weigh':
                await page.locator('#v5-board .v5-weighbtn').click(); await page.wait_for_timeout(180); continue
            await page.locator(f'#v5-board [aria-label^="{lab}"]').first.click(); await page.wait_for_timeout(150); n += 1
    return n

async def main(a):
    problems, log = [], {}
    shots = pathlib.Path(a.shots) if a.shots else None
    if shots: shots.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        kw = {'executable_path': a.chrome} if a.chrome else {}
        b = (await p.webkit.launch() if getattr(a,'engine','chromium')=='webkit' else await p.chromium.launch(args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'], **kw))
        mk = lambda vp: b.new_context(viewport=vp, device_scale_factor=2, is_mobile=True, has_touch=True, locale='ar-SA', accept_downloads=True)
        ctx = await mk({'width': 390, 'height': 844}); await ctx.add_init_script(AUDIO_SPY)
        page = await ctx.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.on('console', lambda m: m.type == 'error' and errs.append('console: ' + m.text))
        await page.goto(a.url, wait_until='load'); await page.wait_for_timeout(800); await enter_main(page)
        if await page.evaluate("()=>!!localStorage.getItem('miran:v2')&&!!JSON.parse(localStorage.getItem('miran:v2')).treasureV3&&Object.keys(JSON.parse(localStorage.getItem('miran:v2')).treasureV3.done).length"):
            problems.append('fresh profile already has journey progress')
        # ---- new journey from the puzzles tab ----
        await page.click('.tab[data-tab=puz]'); await page.wait_for_timeout(400)
        # Open the native first sea station through the map-free chapter folders.
        await page.locator('#mlj-journey-entry').click()
        await page.locator('#mlj-unified-hub .ml-folder-chapter[data-chapter="seven_seas"]').click()
        await page.locator('#mlj-unified-hub .ml-folder-station[data-station-id="sea7_0"]').click()
        await close_transition(page)
        await dismiss_opening(page,wait=1500)
        await page.wait_for_timeout(350)
        tools_seen, passages, sound = {}, 0, {}
        for i in range(21):
            n0 = len(errs)
            sid = await page.evaluate(f'()=>T7.data.stations[{i}].id')
            if not await page.locator('.t7-puzzle-layout[data-station-id="'+sid+'"]').count():
                problems.append(f'station {i+1}: native board not shown after triple-hero story opening'); break
            need = await page.evaluate(f"()=>[].concat(T7.data.stations[{i}].needs||[])")
            if need:
                gate = await page.locator('.v5-gate').count()
                have = await page.evaluate(f"()=>{json.dumps(need)}.map(n=>T7.state().v5.tools[n]||null)")
                if not gate: problems.append(f'station {i+1}: needs {need} but no tool gate shown')
                if None in have: problems.append(f'station {i+1}: tool {need} not owned on arrival {have}')
            for k, bad in enumerate(await page.evaluate(FRAME_JS)): problems.append(f'station {i+1} frame@390: {bad}')
            for bad in await page.evaluate(IMAGES_JS): problems.append(f'station {i+1} image: {bad}')
            a0 = await page.evaluate('()=>({...window.__aud})')
            moves = await solve_board(page, i)
            a1 = await page.evaluate('()=>({...window.__aud})')
            sound[sid] = a1['osc'] + a1['buf'] - a0['osc'] - a0['buf']
            if moves and sound[sid] < moves: problems.append(f'station {i+1}: {moves} moves but only {sound[sid]} sound nodes')
            await page.wait_for_timeout(1300)
            await close_transition(page)
            if not await page.evaluate(f"()=>!!T7.state().done['{sid}']"):
                problems.append(f'station {i+1}: not marked done after tap solve'); break
            if shots: await page.screenshot(path=str(shots / f'journey_{i+1:02d}_reward.png'))
            if need:
                st = await page.evaluate(f"()=>{json.dumps(need)}.map(n=>T7.state().v5.tools[n])")
                if any(x != 'used' for x in st): problems.append(f'station {i+1}: tool not recorded as used {st}')
            g = await page.evaluate(f"()=>T7.data.stations[{i}].gives||null")
            if g:
                tools_seen[g] = await page.evaluate(f"()=>T7.state().v5.tools['{g}']")
                if not tools_seen[g]: problems.append(f'station {i+1}: tool {g} not granted')
                if not await page.get_by_text(re.compile('حصلت على')).count(): problems.append(f'station {i+1}: reward does not name the tool')
            if i == 20:
                if not await page.locator('.v5-finale').count(): problems.append('finale scene missing after the last station')
                break
            await page.get_by_role('button', name='إلى المحطة التالية').click(); await page.wait_for_timeout(450)
            if await page.locator('.v545-passage-go').count():
                passages += 1
                await page.click('.v545-passage-go')
                await dismiss_opening(page,wait=1600)
            else:
                await page.locator('#mlj-unified-hub').wait_for(state='visible')
                await page.locator(f'#mlj-unified-hub .ml-folder-station[data-station-id="sea7_{i+1}"]').click()
                await close_transition(page)
                await dismiss_opening(page,wait=1600)
            if len(errs) > n0: problems.append(f'station {i+1} errors: {errs[n0:][:2]}')
        x = await page.evaluate('()=>{const x=T7.state();return {done:Object.keys(x.done).sort(),bonus:Object.keys(x.bonus).sort(),rewards:[...x.rewards].sort(),tools:x.v5.tools}}')
        log['journey'] = {'done': len(x['done']), 'secrets': x['bonus'], 'seals': x['rewards'], 'passages': passages, 'tools': x['tools']}
        if x['done'] != sorted(f'sea7_{k}' for k in range(21)): problems.append(f'done ids {x["done"]}')
        if x['bonus'] != sorted(f'sea7_secret_{k}' for k in range(7)): problems.append(f'secret ids {x["bonus"]}')
        if x['rewards'] != list(range(7)): problems.append(f'seals {x["rewards"]}')
        if passages != 6: problems.append(f'{passages} sea passages shown, expected 6')
        log['sound_nodes_per_station'] = sound
        # ---- vault, notebook, secrets, finale replay ----
        await page.get_by_role('button', name='الكنوز').first.click(); await page.wait_for_timeout(300)
        earned = await page.locator('.t7-modal .t7-treasure.earned').count()
        if earned != 7: problems.append(f'vault shows {earned}/7 seals')
        await page.locator('.t7-modal header .t7-btn').click(); await page.wait_for_timeout(200)
        await page.get_by_role('button', name='دفتر الرحلة').first.click(); await page.wait_for_timeout(300)
        nb = await page.evaluate("()=>({pages:document.querySelectorAll('.t7-modal .v5-page').length,oath:!!document.querySelector('.t7-modal .v546-notebook-oath')})")
        if nb['pages'] < 21 + 7 or not nb['oath']: problems.append(f'notebook incomplete {nb}')
        await page.locator('.t7-modal .v546-notebook-oath .t7-btn.primary').click(); await page.wait_for_timeout(400)
        if not await page.locator('.v5-finale').count(): problems.append('finale replay from notebook failed')
        if await page.locator('.v546-seal-card').count() != 7:
            problems.append('final scene lost its seven earned-seals visual record')
        await page.get_by_role('button',name='رجوع إلى المحطات').click()
        await page.locator('#mlj-unified-hub').wait_for(state='visible')
        await page.locator('#mlj-unified-hub .mlj-v3-extras summary').click()
        secrets=await page.evaluate('()=>T7.data.secrets.map(s=>({id:s.id,name:s.collectible}))')
        for ch,rec in enumerate(secrets):
            if not await page.locator('#mlj-unified-hub .mlj-v3-extras button',has_text=rec['name']).count():
                problems.append(f'earned secret {ch} missing from journey journal')
            await page.evaluate(f'()=>T7.openSecret({ch})'); await page.wait_for_timeout(160)
            if not await page.locator('.v5-letter').count(): problems.append(f'secret letter {ch} not shown')
        await page.evaluate('()=>T7.openFinale()'); await page.wait_for_timeout(200)
        if not await page.locator('.v5-finale').count(): problems.append('finale replay from native journey engine failed')
        if shots: await page.screenshot(path=str(shots / 'finale.png'), full_page=True)
        # ---- abrupt close: mid-board progress written before the tab dies ----
        await page.evaluate('()=>T7.open(4)'); await page.click('.v5-intro-go'); await page.wait_for_timeout(250)
        await page.evaluate("()=>{const b=[...document.querySelectorAll('#v5-board [aria-label]')].find(e=>!e.disabled&&e.tagName==='BUTTON');b&&b.click()}"); await page.wait_for_timeout(200)
        mid = await page.evaluate("()=>JSON.stringify(T7.state().work['sea7_4'])")
        saved = await page.evaluate('()=>localStorage.getItem("miran:v2")')
        state_before = await page.evaluate('()=>{const x=T7.state();return JSON.stringify({d:x.done,b:x.bonus,r:x.rewards,t:x.v5.tools,c:x.v5.ch})}')
        await page.close()  # no unload handshake
        page = await ctx.new_page(); page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(a.url, wait_until='load'); await page.wait_for_timeout(700); await enter_main(page)
        after = await page.evaluate('()=>{const x=T7.state();return JSON.stringify({d:x.done,b:x.bonus,r:x.rewards,t:x.v5.tools,c:x.v5.ch})}')
        if after != state_before: problems.append('progress changed after abrupt close + reopen')
        if await page.evaluate("()=>JSON.stringify(T7.state().work['sea7_4'])") != mid: problems.append('unfinished board lost after abrupt close')
        if 'miran:v2' not in await page.evaluate('()=>Object.keys(localStorage).join(",")'): problems.append('miran:v2 missing')
        # ---- backup export → restore into a separate, empty profile ----
        await page.click('.tab[data-tab=me]'); await page.wait_for_timeout(400)
        await reveal(page, '#dxBackup')
        async with page.expect_download() as dl: await page.click('#dxBackup')
        path = await (await dl.value).path(); backup = json.loads(pathlib.Path(path).read_text(encoding='utf-8'))
        if not backup.get('state', {}).get('treasureV3'): problems.append('backup has no treasureV3')
        ctx2 = await mk({'width': 390, 'height': 844}); p2 = await ctx2.new_page(); e2 = []
        p2.on('pageerror', lambda e: e2.append(str(e)))
        await p2.goto(a.url, wait_until='load'); await p2.wait_for_timeout(600); await enter_main(p2)
        await p2.click('.tab[data-tab=me]'); await p2.wait_for_timeout(300)
        p2.once('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await p2.set_input_files('#dxFile', path); await p2.wait_for_timeout(800)
        restored = await p2.evaluate('()=>{const x=T7.state();return JSON.stringify({d:x.done,b:x.bonus,r:x.rewards,t:x.v5.tools,c:x.v5.ch})}')
        if restored != state_before: problems.append('restored profile differs from exported journey')
        await p2.reload(); await p2.wait_for_timeout(600); await enter_main(p2)
        if await p2.evaluate('()=>Object.keys(T7.state().done).length') != 21: problems.append('restored journey not persisted after reload')
        # an older backup: a journey record from before moves/notes/bonus/v5 existed, seals earned
        old = json.loads(json.dumps(backup)); tv = old['state']['treasureV3']
        for k in ['moves', 'notes', 'bonus', 'usedTools', 'v5', 'updatedAt']: tv.pop(k, None)
        tv['work'] = {}; tv['hints'] = {}
        oldp = pathlib.Path(path).with_name('old_backup.json'); oldp.write_text(json.dumps(old, ensure_ascii=False), encoding='utf-8')
        await p2.click('.tab[data-tab=me]'); await p2.wait_for_timeout(300)
        p2.once('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await p2.set_input_files('#dxFile', str(oldp)); await p2.wait_for_timeout(800)
        o = await p2.evaluate('()=>{const x=T7.state();return {done:Object.keys(x.done).length,secrets:Object.keys(x.bonus).length,tools:Object.keys(x.v5.tools).length,status:(document.querySelector("#dxBackupStatus")||{}).textContent}}')
        log['old_backup_restore'] = o
        if o['done'] != 21 or o['secrets'] != 7 or o['tools'] != 11: problems.append(f'older backup not restored: {o}')
        if e2: problems.append(f'restore profile errors: {e2[:3]}')
        await ctx2.close()
        # ---- sound: mute, background, return ----
        await page.click('.tab[data-tab=puz]'); await page.wait_for_timeout(200)
        await page.evaluate('()=>T7.open(0)'); await page.click('.v5-intro-go'); await page.wait_for_timeout(250)
        async def tap():
            """One legal move on the station-1 locks board (restarts the attempt when it is solved)."""
            if await page.locator('.v5-done').count() or await page.evaluate("()=>T7.logic.solved(T7.data.stations[0],T7.state().work.sea7_0)"):
                await page.get_by_role('button', name='محاولة جديدة').first.click(); await page.wait_for_timeout(150)
            st = await page.evaluate(eval('f"""' + STEPS_SRC + '"""', {'i': 0}))
            await page.locator(f'#v5-board [aria-label^="{st[0][0]}"]').first.click(); await page.wait_for_timeout(80)
        nodes = '()=>window.__aud.osc+window.__aud.buf'
        c0 = await page.evaluate(nodes); await tap(); c1 = await page.evaluate(nodes)
        await page.evaluate('()=>{S.st.mute=true;S.save()}'); await tap(); await tap(); c2 = await page.evaluate(nodes)
        await page.evaluate('()=>{S.st.mute=false;S.save()}')
        log['sound'] = {'unmuted_move_nodes': c1 - c0, 'muted_two_moves_nodes': c2 - c1}
        if c1 - c0 < 1: problems.append('no sound nodes on an unmuted move')
        if c2 - c1 != 0: problems.append(f'{c2-c1} sound nodes while muted')
        st0 = await page.evaluate('()=>AC&&AC.state')
        await page.evaluate("()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))}")
        await page.wait_for_timeout(400); st1 = await page.evaluate('()=>AC&&AC.state')
        c3 = await page.evaluate(nodes); await page.evaluate("()=>{sfx.puzzleMove('locks');sfx.puzzleWin();sfx.brainMove()}"); c4 = await page.evaluate(nodes)
        await page.evaluate("()=>{delete document.hidden;delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'))}")
        await page.locator('#v5-board').tap(position={'x':5,'y':5}); await page.wait_for_timeout(400)  # tap the visible board to wake sound (the goal text now lives in the info sheet)
        st2 = await page.evaluate('()=>AC&&AC.state')
        c5 = await page.evaluate(nodes); await tap(); c6 = await page.evaluate(nodes)
        log['background'] = {'before': st0, 'hidden': st1, 'hidden_move_nodes': c4 - c3, 'after_return': st2, 'after_return_nodes': c6 - c5}
        if st1 != 'suspended': problems.append(f'AudioContext not suspended in background ({st1})')
        if c4 - c3: problems.append('sound nodes created while hidden')
        if st2 != 'running' or c6 - c5 < 1: problems.append(f'sound did not come back after return ({st2}, {c6-c5})')
        # «أرني حركة» preview: a tap during the 1.4 s demo must not act on the demo board
        await page.get_by_role('button', name='محاولة جديدة').first.click(); await page.wait_for_timeout(150)
        w0 = await page.evaluate("()=>JSON.stringify(T7.state().work.sea7_0)")
        for _ in range(3):
            await page.locator('.v5-hintbtn').click(); await page.wait_for_timeout(60)
        await page.wait_for_timeout(120)
        if not await page.locator('#v5-board.demo').count(): problems.append('«أرني حركة» preview did not start')
        await page.evaluate("()=>{const b=[...document.querySelectorAll('#v5-board button[aria-label]')].filter(e=>!e.disabled);b.forEach(x=>x.click())}")
        for b_ in await page.locator('#v5-board button[aria-label]').all():
            try: await b_.click(timeout=150, force=True)
            except Exception: pass
        await page.wait_for_timeout(1700)
        w1 = await page.evaluate("()=>JSON.stringify(T7.state().work.sea7_0)"); hist = await page.evaluate("()=>T7.state().v5.att.sea7_0.hist.length")
        log['demo_preview'] = {'board_unchanged_after_demo': w0 == w1, 'history': hist}
        if w0 != w1 or hist: problems.append(f'taps during the «أرني حركة» preview changed the board ({w0} → {w1}, history {hist})')
        # rapid moves: 40 taps in a burst must not throw or stall
        t = await page.evaluate("async()=>{const t0=performance.now();for(let k=0;k<40;k++){const b=[...document.querySelectorAll('#v5-board button[aria-label]')].find(e=>!e.disabled);b&&b.click();}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-t0}")
        log['burst_40_moves_ms'] = round(t)
        # ---- every board in frame: portrait 390/320 and landscape ----
        for w, h in [(390, 844), (320, 640), (844, 390), (1280, 800)]:
            await page.set_viewport_size({'width': w, 'height': h}); bad = 0
            for i in range(21):
                await page.evaluate(f'()=>T7.open({i})'); await page.click('.v5-intro-go'); await page.wait_for_timeout(160)
                for g in range(3):
                    gate = page.locator('.v5-gate .t7-btn.primary')
                    if not await gate.count(): break
                    await gate.click(); await page.wait_for_timeout(120)
                for msg in await page.evaluate(FRAME_JS): problems.append(f'station {i+1} frame@{w}x{h}: {msg}'); bad += 1
                if shots and (w != 390): await page.screenshot(path=str(shots / f'board_{i+1:02d}_{w}x{h}.png'))
            log[f'frames_{w}x{h}'] = 'ok' if not bad else f'{bad} issues'
        mem = await page.evaluate('()=>performance.memory?{used:Math.round(performance.memory.usedJSHeapSize/1048576),total:Math.round(performance.memory.totalJSHeapSize/1048576)}:null')
        log['js_heap_mb_after_full_run'] = mem
        if errs: problems.append(f'page errors: {errs[:5]}')
        await b.close()
    print(json.dumps({'status': 'failed' if problems else 'passed', **log, 'problems': problems}, ensure_ascii=False, indent=1))
    return 1 if problems else 0

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--url', default='http://localhost:8080/'); ap.add_argument('--chrome'); ap.add_argument('--engine', choices=['chromium', 'webkit'], default='chromium'); ap.add_argument('--shots')
    sys.exit(asyncio.run(main(ap.parse_args())))
