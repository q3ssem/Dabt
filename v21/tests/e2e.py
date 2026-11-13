"""End-to-end browser test for V21 (Chrome via Playwright).

Plays every authored case through the real UI widgets (no shortcuts into app state),
plus targeted checks: alternative solutions, wrong answers, memory hiding from the DOM
and the accessibility tree, keyboard and drag input, drafts, save failure, reveal ->
assisted, chapter unlocking and seals, reload persistence, backup/restore, smallest
screen, reduced motion, character frames, lab trial engines and offline play.

Run:  npm run build && npx vite preview --port 4173 &   then   python3 tests/e2e.py
"""
import asyncio, json, os, re, sys, time
from playwright.async_api import async_playwright

URL = os.environ.get('DABT_URL', 'http://127.0.0.1:4173/')
ROOT = os.path.dirname(os.path.abspath(__file__)) + '/../public/data/'
J = lambda p: json.load(open(ROOT + p, encoding='utf-8'))
T, P, L, C = J('treasure/treasure.json'), J('planets/planets.json'), J('lab/new-puzzles.json'), J('child/child.json')
AR = '٠١٢٣٤٥٦٧٨٩'
ar = lambda v: re.sub(r'\d', lambda m: AR[int(m.group())], str(v))
results = []

def ok(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f' — {detail}' if detail and not cond else ''))

async def cell(page, r, c, inner='button'):
    return page.locator(f'table.grid tr:nth-child({r + 1}) > td:nth-child({c + 1}) {inner}').first

async def fill_slots(page, ids):
    for i, pid in enumerate(ids):
        await page.locator(f'.tray [data-piece="{pid}"]').first.click()
        await page.locator(f'[data-slot="{i}"]').first.click()

def compute_rotate(s):
    if 'directions' in s:
        o = ['N', 'E', 'S', 'W']; tgt = o[(o.index(s['start']) + sum(s['clockwiseDegrees']) // 90) % 4]
        return (o.index(tgt) - o.index(s['start'])) % 4
    tgt = ((s['start'] - 1 + s['step'] * s['turns']) % s['size']) + 1
    return (tgt - s['start']) % s['size']

async def solve(page, p, response=None):
    """Operate the live widget for puzzle p and press the check button."""
    t, s, a = p['type'], p['setup'], (p['answer'] if response is None else response)
    if t == 'choice-story' and a is None: a = s['options'][0]
    if t not in ('memory', 'freebuild') and await page.locator('.slot.filled, .selcard.on, .choice.on, .switch.on').count():
        await page.get_by_role('button', name='أعد ترتيب المحاولة').click()  # clear a restored draft first
    if t in ('sequence', 'assignment') or (t == 'schedule' and 'durations' not in s):
        await fill_slots(page, [str(x) for x in a])
    elif t in ('numeric',) or (t == 'schedule' and 'durations' in s):
        await page.locator('.num-input').fill(ar(a))
    elif t in ('single', 'choice-story'):
        await page.locator('.choices .choice').nth([str(o) for o in s['options']].index(str(a))).click()
    elif t == 'multiselect':
        keys = list(s['cards'].keys()) if 'cards' in s else list(s['records'].keys()) if 'records' in s else [str(o) for o in s['options']]
        for k in a: await page.locator('.cards-select .selcard').nth(keys.index(str(k))).click()
    elif t == 'subset':
        keys = list(s['items'].keys())
        for k in a: await page.locator('.cards-select .selcard').nth(keys.index(k)).click()
    elif t == 'allocation':
        for slot, v in zip(s['slots'], a):
            for _ in range(v): await page.get_by_role('button', name=f'زد {slot}', exact=True).click()
    elif t == 'balance':
        for _ in range(a): await page.get_by_role('button', name='أضف قطعة').click()
    elif t == 'rotate':
        btn = page.locator('.rotate .row .btn').first
        for _ in range(compute_rotate(s)): await btn.click()
    elif t == 'path':
        for r, c in a[1:]: await (await cell(page, r, c)).click()
    elif t == 'coordinate':
        await (await cell(page, a[0], a[1])).click()
    elif t == 'mirror':
        for (r, c), m in zip(s['mirrorSlots'], a):
            b = await cell(page, r, c, '.mirror-slot')
            for _ in range(s['options'].index(m) + 1): await b.click()
        await page.get_by_role('button', name='شغّل الشعاع وتتبع خلاياه').click()
    elif t == 'toggle':
        for b in a: await page.locator('.switch', has=page.locator(f'b:text-is("{b}")')).click()
    elif t == 'graph':
        for n in a[1:]: await page.locator(f'.node:text-is("{n}")').click()
    elif t == 'memory':
        await page.get_by_role('button', name='جاهز للمشاهدة').click()
        await page.wait_for_timeout(s['exposureMs'] + 300)
        if 'after' in s: await page.locator('.memorygame .choices .choice').nth(a - 1).click()
        else: await fill_slots(page, a)
    elif t == 'freebuild':
        for i in range(2): await page.locator('.freebuild .tray .piece').nth(i).click()
    await page.locator('.actions .btn.primary').click()

async def open_case(page, hash_):
    if page.url.endswith(hash_): await page.goto(URL + '#/')
    await page.goto(URL + hash_); await page.wait_for_function('window.__dabtReady===true'); await page.wait_for_selector('.panel')

async def solved_ok(page):
    try: await page.wait_for_selector('.feedback.good', timeout=4000); return True
    except Exception: return False

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True)
        page = await ctx.new_page(); errors = []
        page.on('pageerror', lambda e: errors.append(str(e) + ' @ ' + page.url + ' ' + (e.stack or '')[:300]))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)

        # seed legacy data to exercise migration on first run
        await page.goto(URL); await page.evaluate("""() => { localStorage.clear(); localStorage.setItem('dabt35.treasure.solved', JSON.stringify(['TI-01-01','ti-03'])); localStorage.setItem('dabt.pro.v3.sessions', JSON.stringify([{id:'s',gameId:'rule-shift',mode:'practice',metrics:{accuracy:70,attempts:10}}])); }""")
        await page.reload(); await page.wait_for_function('window.__dabtReady===true')
        prof = json.loads(await page.evaluate("localStorage.getItem('dabt21.profile')"))
        ok('migration: legacy archived, not credited', prof['legacy'] and prof['legacy']['treasureSolvedOld'] == 2 and prof['treasure']['results'] == {})
        ok('migration: legacy keys untouched', await page.evaluate("localStorage.getItem('dabt35.treasure.solved')") == '["TI-01-01","ti-03"]')
        ok('migration: notice on home', await page.locator('.card.notice').count() == 1)

        # ---------------- wrong answer, undo, draft, keyboard, drag on Treasure chapter 1
        p1 = T['chapters'][0]['puzzles'][0]
        await open_case(page, '#/treasure/shore/TI-01-01')
        await fill_slots(page, ['14', '11']); await page.locator('.actions .btn.primary').click()
        ok('wrong order rejected with failure text', await page.locator('.feedback.bad').count() == 1)
        await page.get_by_role('button', name='تراجع خطوة').click()
        ok('undo restores previous placement', await page.locator('[data-slot="1"].filled').count() == 0)
        await page.get_by_role('button', name='→ عودة').click(); await page.wait_for_timeout(300)
        await open_case(page, '#/treasure/shore/TI-01-01')
        ok('draft restored after leaving', await page.locator('[data-slot="0"].filled').count() == 1)
        await page.get_by_role('button', name='أعد ترتيب المحاولة').click()
        # keyboard only
        await page.locator('.tray [data-piece="11"]').focus(); await page.keyboard.press('Enter')
        await page.locator('[data-slot="0"]').focus(); await page.keyboard.press('Enter')
        await page.locator('.tray [data-piece="14"]').focus(); await page.keyboard.press('Space')
        await page.locator('[data-slot="1"]').focus(); await page.keyboard.press('Enter')
        await page.locator('.actions .btn.primary').focus(); await page.keyboard.press('Enter')
        ok('keyboard-only solve (TI-01-01)', await solved_ok(page))
        frame = await page.evaluate("getComputedStyle(document.querySelector('.goal .sprite .sprite-frame')).backgroundPosition")
        ok('character frame: celebrate pose cut from strip (100% 0%)', frame.startswith('100%'), frame)
        # drag & drop on TI-01-08
        await open_case(page, '#/treasure/shore/TI-01-08')
        order = T['chapters'][0]['puzzles'][7]['answer']
        for i, pid in enumerate(order):
            src = page.locator(f'.tray [data-piece="{pid}"]'); dst = page.locator(f'[data-slot="{i}"]')
            await src.scroll_into_view_if_needed()
            sb, db = await src.bounding_box(), await dst.bounding_box()
            await page.mouse.move(sb['x'] + sb['width'] / 2, sb['y'] + sb['height'] / 2); await page.mouse.down()
            await page.mouse.move(sb['x'] + 30, sb['y'] + 30, steps=4); await page.mouse.move(db['x'] + db['width'] / 2, db['y'] + db['height'] / 2, steps=8); await page.mouse.up()
        await page.locator('.actions .btn.primary').click()
        ok('drag-and-drop solve (TI-01-08)', await solved_ok(page))

        # ---------------- memory hiding (visual DOM + accessibility tree)
        await page.goto(URL + '#/child'); await page.wait_for_function('window.__dabtReady===true')
        await page.get_by_role('button', name=re.compile('٦–٧')).click()
        await open_case(page, '#/child/memory/CH-03-02')
        await page.get_by_role('button', name='جاهز للمشاهدة').click(); await page.wait_for_timeout(300)
        ok('memory: sequence visible during watch', await page.locator('.mem-show').count() == 1)
        await page.wait_for_timeout(4200)
        view_text = await page.inner_text('#view')
        snap = await page.locator('#view').aria_snapshot()
        ok('memory: shown list removed from DOM after hiding', await page.locator('.mem-show').count() == 0)
        ok('memory: original prompt with the sequence replaced', 'تفاحة، قارب، ورقة' not in view_text and 'أعد العناصر كما طلبت لُمى' in view_text)
        ok('memory: screen-reader tree has no ordered target', 'تفاحة، قارب، ورقة' not in snap and 'العناصر المعروضة' not in snap)
        await fill_slots(page, ['تفاحة', 'قارب', 'ورقة']); await page.locator('.actions .btn.primary').click()
        ok('memory: correct recall accepted', await solved_ok(page))
        ok('memory: original shown for comparison only after solving', await page.locator('.mem-compare').count() == 1)

        # ---------------- reveal -> assisted
        await open_case(page, '#/child/numbers/CH-02-02')
        await page.get_by_role('button', name='اشرح الحل كاملًا').click(); await page.get_by_role('button', name='اعرض الحل').click()
        await page.wait_for_selector('.feedback.good')
        st = json.loads(await page.evaluate("localStorage.getItem('dabt21.profile')"))['child']['results'].get('CH-02-02', {})
        ok('reveal records assisted', st.get('status') == 'assisted', str(st))

        # ---------------- alternative solutions through the UI
        alt = {'TI-03-01': ['٢', '٣', '٤'], 'CH-10-04': ['أ', 'ج', 'ب', 'د'], 'CH-01-02': ['ب٢', 'ا', 'ب١']}
        await open_case(page, '#/child/daily-sequences/CH-10-04'); await solve(page, next(a for w in C['worlds'] for a in w['activities'] if a['id'] == 'CH-10-04'), alt['CH-10-04'])
        ok('alternative order accepted (CH-10-04 ب/ج swap)', await solved_ok(page))
        await open_case(page, '#/child/letters/CH-01-02'); await solve(page, next(a for w in C['worlds'] for a in w['activities'] if a['id'] == 'CH-01-02'), alt['CH-01-02'])
        ok('equivalent pieces accepted (CH-01-02 ب١/ب٢)', await solved_ok(page))
        ok('equivalent pieces display ب not internal ids', 'ب١' not in await page.inner_text('.panel'))

        # ---------------- save failure banner and retry
        await open_case(page, '#/child/numbers/CH-02-03')
        await page.evaluate('window.__dabtFailSave = true')
        await solve(page, next(a for w in C['worlds'] for a in w['activities'] if a['id'] == 'CH-02-03'))
        await page.wait_for_selector('.save-banner')
        ok('save failure: persistent banner shown', await page.locator('.save-banner').is_visible())
        await page.locator('.feedback .btn.primary').click(); await page.wait_for_timeout(200)
        ok('save failure: continue blocked while unsaved', '/CH-02-03' in page.url)
        await page.wait_for_timeout(800)
        await page.evaluate("() => { window.__dabtFailSave = false; document.querySelector('.save-banner button').click(); }")
        ok('save failure: retry clears banner', await page.locator('.save-banner').count() == 0)

        # ---------------- play every authored case through the UI
        async def play_all(label, cases):
            bad = []
            for hash_, p in cases:
                try:
                    await open_case(page, hash_)
                    await solve(page, p)
                    if not await solved_ok(page): bad.append(p['id'])
                except Exception as e: bad.append(f"{p['id']}:{str(e)[:80]}")
            ok(f'{label}: all {len(cases)} cases solved through live widgets', not bad, ', '.join(bad))
        # Treasure: in chapter order (also proves unlocking)
        tcases = [(f"#/treasure/{c['id']}/{p['id']}", p) for c in T['chapters'] for p in c['puzzles']]
        await page.goto(URL + '#/treasure'); await page.wait_for_function('window.__dabtReady===true')
        ok('treasure: chapter 2 locked before chapter 1 required puzzles', await page.locator('.chapter-card.locked').count() == 5)
        await play_all('Treasure Island', tcases)
        await page.goto(URL + '#/treasure'); await page.wait_for_function('window.__dabtReady===true')
        ok('treasure: all chapters unlocked', await page.locator('.chapter-card.locked').count() == 0)
        ok('treasure: six seals placed as live elements', await page.locator('.seal.has').count() == 6)
        await page.goto(URL + '#/treasure/shore'); await page.wait_for_function('window.__dabtReady===true')
        ok('treasure: seal not re-awarded on revisit', await page.locator('.seal-award.fresh').count() == 0 and await page.locator('.seal-award').count() == 1)
        await page.get_by_role('button', name='ملاحظة عن الدليل').click(); await page.wait_for_timeout(200)
        await page.goto(URL + '#/treasure/journal'); await page.wait_for_function('window.__dabtReady===true')
        jt = await page.inner_text('#view')
        ok('journal: tools and chosen note recorded', 'بوصلة الأثر' in jt and 'ملاحظة عن الدليل' in jt)
        await play_all('Planets', [(f"#/planets/{s['id']}/{p['id']}", p) for s in P['stations'] for p in s['puzzles']])
        await page.goto(URL + '#/planets/neptune'); await page.wait_for_function('window.__dabtReady===true')
        ok('planets: science card with source after station', await page.locator('.science a[href^="https://"]').count() == 1)
        # lab cases are played inside sessions: run each new game's practice session
        bad = []
        games = sorted({p['gameId'] for p in L['puzzles']})
        for g in games:
            await page.goto(URL + f'#/lab/{g}'); await page.wait_for_function('window.__dabtReady===true')
            await page.locator('.mode-card').first.click()
            for p in [x for x in L['puzzles'] if x['gameId'] == g]:
                await page.wait_for_selector('.panel'); await solve(page, p)
                if not await solved_ok(page): bad.append(p['id'])
                await page.locator('.feedback .btn.primary').click()
            await page.wait_for_selector('.result')
            if '٤ من ٤' not in await page.inner_text('.result'): bad.append(g + ':summary')
        ok(f'Lab: 28 authored cases solved in 7 game sessions', not bad, ', '.join(bad))
        child_cases = [(f"#/child/{w['id']}/{a['id']}", a) for w in C['worlds'] for a in w['activities']]
        await play_all('Child World', child_cases)
        prof = json.loads(await page.evaluate("localStorage.getItem('dabt21.profile')"))
        ok('saved results: 48 treasure / 36 planets / 28 lab / 48 child', [len(prof[s]['results']) for s in ('treasure', 'planets', 'lab', 'child')] == [48, 36, 28, 48], str([len(prof[s]['results']) for s in ('treasure', 'planets', 'lab', 'child')]))
        ok('free-build works saved with pieces', all(len(prof['child']['works'].get(i, {}).get('canvases', [{}])[0].get('pieces', [])) >= 1 for i in ['CH-06-01', 'CH-06-02', 'CH-06-03', 'CH-06-04']))
        ok('story decisions saved without grading', prof['treasure']['decisions'].get('TI-06-08') and prof['planets']['decisions'].get('PJ-09-04'))

        # every story option is accepted
        for opt in T['chapters'][5]['puzzles'][7]['setup']['options']:
            await open_case(page, '#/treasure/heart/TI-06-08'); await solve(page, T['chapters'][5]['puzzles'][7], opt)
            ok(f'story choice accepted: {opt}', await solved_ok(page) and T['chapters'][5]['endings'][opt][:20] in await page.inner_text('.feedback'))

        # replay does not duplicate rewards
        await open_case(page, '#/treasure/shore/TI-01-01'); await solve(page, p1)
        ok('replay shows no-duplicate-reward note', 'لا تتكرر المكافأة' in await page.inner_text('.feedback'))

        # two drawings on CH-06-03 kept on separate canvases
        await open_case(page, '#/child/create/CH-06-03')
        await page.locator('.freebuild .tray .piece').nth(2).click(); await page.get_by_role('tab', name='اللوحة ٢').click(); await page.locator('.freebuild .tray .piece').nth(0).click()
        await page.reload(); await page.wait_for_function('window.__dabtReady===true')
        w = json.loads(await page.evaluate("localStorage.getItem('dabt21.profile')"))['child']['works']['CH-06-03']
        ok('two canvases persisted after reload', len(w['canvases']) == 2 and all(len(c['pieces']) >= 1 for c in w['canvases']))

        # ---------------- lab trial engines: every legacy game runs to a saved summary
        engines = ['rule-switch', 'conjunction-search', 'corsi', 'stroop', 'go-no-go', 'temporal-order', 'number-sense', 'deduction', 'planning', 'visual-rotation', 'prospective-memory', 'pattern-matrix', 'probability-lab', 'working-update', 'evidence-check', 'causal-reasoning', 'analogy-relations']
        bad = []
        for g in engines:
            await page.goto(URL + f'#/lab/{g}'); await page.wait_for_function('window.__dabtReady===true')
            await page.locator('.mode-card').nth(1).click()  # challenge
            t0 = time.time(); k = 0
            sels = ['.trial-stage .choices .choice:not([disabled])', '.trial-stage .tray .piece', '.trial-stage .slot', '.trial-stage .keypad .btn', '.trial-stage .island:not([disabled])', '.trial-stage .search-item', '.trial-stage .evidence .btn', '.trial-stage .exp .btn', '.trial-stage .btn.primary:not([disabled])', '.trial-stage .btn.huge']
            while time.time() - t0 < 150:
                if await page.locator('.result').count(): break
                if await page.locator('.trial-stage .num-input').count(): await page.locator('.trial-stage .num-input').fill('3')
                k += 1
                for j in range(len(sels)):  # round-robin so multi-step trials (select piece -> slot -> submit) progress
                    loc = page.locator(sels[(k + j) % len(sels)])
                    n_ = await loc.count()
                    if n_:
                        try: await loc.nth(k % n_).click(timeout=400)
                        except Exception: pass
                        break
                await page.wait_for_timeout(80)
            if not await page.locator('.result').count() and g not in ('temporal-order', 'planning', 'causal-reasoning'): bad.append(g)
        # correct play for multi-step engines (temporal order, planning, causal design)
        async def play_engine(g, step):
            page.set_default_timeout(2500)  # the stage is inert between trials; fail fast and retry
            await page.goto(URL + f'#/lab/{g}'); await page.wait_for_function('window.__dabtReady===true'); await page.locator('.mode-card').nth(1).click()
            t0 = time.time()
            while time.time() - t0 < 150 and not await page.locator('.result').count():
                if await page.locator('.trial-stage[inert]').count():  # previous trial still on screen
                    await page.wait_for_timeout(100); continue
                try: await step()
                except Exception: pass
                await page.wait_for_timeout(100)
            page.set_default_timeout(30000)
            return await page.inner_text('.result') if await page.locator('.result').count() else ''
        seen = []
        async def temporal_step():
            if await page.locator('.temporal-show').count():
                txt = (await page.inner_text('.temporal-show')).strip()
                if txt and (not seen or seen[-1] != txt): seen.append(txt)
                return
            if await page.locator('.trial-stage .tray .piece').count() and seen:
                for i, name in enumerate(list(seen)):
                    await page.locator('.trial-stage .tray .piece', has_text=name).first.click(); await page.locator('.trial-stage .slot').nth(i).click()
                seen.clear(); await page.locator('.trial-stage .btn.primary').click()
        r = await play_engine('temporal-order', temporal_step)
        ok('temporal order: reproducing the shown order scores every trial', '٦ من ٦' in r, r[:60])
        async def plan_step():
            if not await page.locator('.trial-stage .deps').count() or not await page.locator('.trial-stage .tray .piece').count(): return
            deps = [re.match(r'(.+) قبل (.+)', x.strip()).groups() for x in await page.locator('.trial-stage .deps li').all_inner_texts()]
            nodes = []
            for a, b2 in deps:
                for n in (a, b2):
                    if n not in nodes: nodes.append(n)
            order = []
            while len(order) < len(nodes):
                for n in nodes:
                    if n not in order and all(a in order for a, b2 in deps if b2 == n): order.append(n); break
            for i, n in enumerate(order):
                await page.locator('.trial-stage .tray .piece', has_text=n + ' ·').first.click(); await page.locator('.trial-stage .slot').nth(i).click()
            await page.get_by_role('button', name='نفّذ الخطة افتراضيًا').click()
        r = await play_engine('planning', plan_step)
        ok('planning: any valid topological plan within budget is accepted', '٦ من ٦' in r, r[:60])
        async def causal_step():
            if not await page.locator('.trial-stage .exp').count(): return
            target = re.search(r'أثر (\S+)\.', await page.inner_text('.trial-stage .meter')).group(1)
            base = dict(re.match(r'(\S+): (\S+)', l).groups() for l in (await page.locator('.trial-stage .exp').first.inner_text()).split('\n')[1:] if ':' in l)
            nrows = await page.locator('.trial-stage .exp').nth(1).locator('.row').count()
            for ri in range(nrows):  # the panel re-renders after each click, so re-query every row
                row = page.locator('.trial-stage .exp').nth(1).locator('.row').nth(ri)
                f = (await row.locator('span').inner_text()).replace(':', '').strip()
                btns = row.locator('.btn')
                labels = [x.strip() for x in await btns.all_inner_texts()]
                want = [l for l in labels if l != base[f]][0] if f == target else base[f]
                await btns.nth(labels.index(want)).click()
            await page.get_by_role('button', name='اعتمد المقارنة').click()
        r = await play_engine('causal-reasoning', causal_step)
        ok('causal reasoning: changing only the target factor is scored valid', '٦ من ٦' in r, r[:60])
        prof = json.loads(await page.evaluate("localStorage.getItem('dabt21.profile')"))
        ok('Lab: all 17 trial engines complete a session and save it', not bad and len({s['gameId'] for s in prof['lab']['sessions']}) >= 24, ', '.join(bad))

        # corsi correctness: watch lit islands, repeat them
        await page.goto(URL + '#/lab/corsi'); await page.wait_for_function('window.__dabtReady===true'); await page.locator('.mode-card').first.click()
        seq = []
        for _ in range(40):
            lit = await page.evaluate("[...document.querySelectorAll('.island')].findIndex(b=>b.classList.contains('lit'))")
            if lit >= 0 and (not seq or seq[-1] != lit): seq.append(lit)
            if await page.locator('.island:not([disabled])').count(): break
            await page.wait_for_timeout(100)
        for i in seq: await page.locator('.island').nth(i).click()
        await page.wait_for_selector('.feedback.good, .feedback.bad')
        ok('corsi: repeating the lit sequence is scored correct', await page.locator('.feedback.good').count() == 1, str(seq))

        # go/no-go: press only on go
        await page.goto(URL + '#/lab/go-no-go'); await page.wait_for_function('window.__dabtReady===true'); await page.locator('.mode-card').nth(1).click()
        t0 = time.time()
        while time.time() - t0 < 90 and not await page.locator('.result').count():
            if await page.locator('.gng.go').count(): await page.keyboard.press('Space')
            await page.wait_for_timeout(60)
        rt = await page.inner_text('.result')
        ok('go/no-go: pressing only on go gives 24/24 with real timing', '٢٤ من ٢٤' in rt, rt[:80])

        # ---------------- backup export / restore through the UI
        await page.goto(URL + '#/profile'); await page.wait_for_function('window.__dabtReady===true')
        async with page.expect_download() as d: await page.get_by_role('button', name='احفظ نسخة من تقدّمك').click()
        path = await (await d.value).path()
        await page.evaluate("()=>{const p=JSON.parse(localStorage.getItem('dabt21.profile')); p.treasure.results={}; localStorage.setItem('dabt21.profile', JSON.stringify(p));}")
        await page.reload(); await page.wait_for_function('window.__dabtReady===true')
        await page.locator('input[type=file]').set_input_files(path); await page.get_by_role('button', name='استعد النسخة').click(); await page.wait_for_timeout(400)
        prof = json.loads(await page.evaluate("localStorage.getItem('dabt21.profile')"))
        ok('backup: exported file restores progress', len(prof['treasure']['results']) == 48)

        # ---------------- reduced motion
        await page.goto(URL + '#/profile'); await page.wait_for_function('window.__dabtReady===true')
        await page.get_by_label('حركة أقل').check()
        await page.goto(URL + '#/treasure/forest/TI-02-01'); await page.wait_for_selector('.sprite')
        dur = await page.evaluate("getComputedStyle(document.querySelector('.sprite')).animationDuration")
        ok('reduced motion: sprite animation limited to 120ms fade', dur == '0.12s', dur)

        # ---------------- smallest screen: no horizontal overflow
        small = await ctx.new_page(); await small.set_viewport_size({'width': 320, 'height': 568})
        over = []
        for h_ in ['#/', '#/treasure/shore/TI-01-05', '#/treasure/lighthouse/TI-03-03', '#/planets/venus/PJ-02-02', '#/lab/route-network', '#/child/create/CH-06-01', '#/treasure/forest/TI-02-06', '#/profile']:
            await small.goto(URL + h_); await small.wait_for_function('window.__dabtReady===true'); await small.wait_for_timeout(250)
            w_ = await small.evaluate('document.documentElement.scrollWidth')
            if w_ > 321: over.append(f'{h_}:{w_}')
        ok('320px screen: no horizontal overflow', not over, ', '.join(over))
        tgt = await small.evaluate("Math.min(...[...document.querySelectorAll('#view button')].filter(b=>b.offsetParent).map(b=>Math.min(b.offsetWidth,b.offsetHeight)))")
        ok('touch targets >= 40px on profile (48 for main controls)', tgt >= 40, str(tgt))
        await small.close()

        # ---------------- offline: download a section, then play without network
        await page.goto(URL + '#/treasure'); await page.wait_for_function('window.__dabtReady===true')
        await page.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.controller !== null", timeout=15000) if await page.evaluate("!!navigator.serviceWorker.controller") else await page.reload()
        await page.wait_for_function('window.__dabtReady===true')
        await page.wait_for_function("navigator.serviceWorker.controller !== null", timeout=15000)
        await page.get_by_role('button', name='نزّل للعمل دون اتصال').click()
        await page.wait_for_function("document.querySelector('.offline-box [role=status]').textContent.includes('متاحة دون اتصال')", timeout=30000)
        ok('offline: section announced only after download completed', True)
        await ctx.set_offline(True)
        await page.goto(URL + '#/treasure/archive/TI-04-02'); await page.wait_for_function('window.__dabtReady===true', timeout=15000)
        await page.reload(); await page.wait_for_function('window.__dabtReady===true', timeout=15000); await page.wait_for_timeout(800)
        img_ok = await page.evaluate("(()=>{const i=document.querySelector('.scene img'); return !!i && i.complete && i.naturalWidth>0})()")
        await solve(page, T['chapters'][3]['puzzles'][1]); solved_off = await solved_ok(page)
        ok('offline: reload without network, downloaded scene shown, puzzle playable and saved', img_ok and solved_off, f'img={img_ok} solved={solved_off}')
        await page.goto(URL + '#/planets/mars'); await page.wait_for_function('window.__dabtReady===true', timeout=15000); await page.wait_for_timeout(400)
        ok('offline: undownloaded section shows calm fallback, play stays available', await page.locator('.scene.missing').count() == 1 and await page.locator('.node-card').count() == 4)
        await ctx.set_offline(False)

        ok('no uncaught page errors', not [e for e in errors if 'net::ERR_INTERNET_DISCONNECTED' not in e and 'Failed to load resource' not in e], ' | '.join(errors[:5]))
        await browser.close()
    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)}/{len(results)} checks passed')
    json.dump([{'check': n, 'pass': p, 'detail': d} for n, p, d in results], open(os.path.dirname(os.path.abspath(__file__)) + '/e2e-results.json', 'w'), ensure_ascii=False, indent=1)
    sys.exit(1 if failed else 0)

asyncio.run(main())
