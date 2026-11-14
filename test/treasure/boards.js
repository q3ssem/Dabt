'use strict';
/* Treasure Island 5.0 · the 21 puzzle boards: challenges, tool gates, hints, undo, motion, drag and long-press preview.
   Rules and answers live in data.js / logic.js; this file only draws and records attempts. */
(function (root) {
  const $ = q => DX.$(q), later = (f, ms) => root.__T7_SYNC ? f() : setTimeout(f, ms), L = () => TreasureLogic;
  const ART = 'treasure/art/story5/';
  const CH = ['الحل', 'أقل حركات', 'بدون تلميح', 'خبير', 'لغز اليوم'];
  const NO_UNDO = ['weigh'];

  function v5state(x) {
    const v = x.v5 || (x.v5 = {});
    for (const k of ['ch', 'att', 'tools']) if (!v[k] || typeof v[k] !== 'object' || Array.isArray(v[k])) v[k] = {};
    return v;
  }
  function chal(x, id) { const v = v5state(x); const c = v.ch[id] || (v.ch[id] = [false, false, false]); while (c.length < 4) c.push(false); return c; }
  function firstOpen(x, id, done) { const c = chal(x, id); if (!done) return 0; const i = c.slice(0, 3).findIndex((d, k) => !d && (k === 0 || c[k - 1])); return i < 0 ? 0 : i; }
  function attempt(x, s, done) {
    const v = v5state(x);
    if (!v.att[s.id] || ![0, 1, 2, 3, 4].includes(v.att[s.id].c) || (v.att[s.id].c === 4 && !s.daily)) v.att[s.id] = { c: firstOpen(x, s.id, done), moves: 0, hint: 0, tool: !s.needs, hist: [] };
    if (!Array.isArray(v.att[s.id].hist)) v.att[s.id].hist = [];
    return v.att[s.id];
  }
  function solution(s) { let v = L().initial(s), n = 0; while (!L().solved(s, v) && n++ < 60) v = L().assist(s, v); return v; }
  function img(name, cls = '', extra = {}) { return DX.el('img', { src: ART + name + '.webp', alt: '', class: cls, draggable: 'false', ...extra }); }
  const crewOf = s => (s.dialog && s.dialog[s.dialog.length - 1] || ['ورد'])[0];
  const CREWART = { 'رِواء': 'crew_rawaa', 'نُهى': 'crew_nuha', 'نَبض': 'crew_nabd', 'شِبل': 'crew_shibl', 'سُهيل': 'crew_suhail', 'ورد': 'crew_ward', 'نوفل': 'crew_nawfal' };

  /* ctx: {s, x, done, sealed, E, button, A, save, work(), setWork(v), onFirstWin(), map(), notebook(), rerender()}
     ctx.s is replaced by a getter that returns the station's board for the current challenge (main, alt or expert). */
  function bind(ctx) {
    if (ctx.base) return;
    ctx.base = ctx.s;
    Object.defineProperty(ctx, 's', { configurable: true, get: () => L().variant(ctx.base, attempt(ctx.x, ctx.base, ctx.done()).c) });
  }
  const opens = (ctx, c, k) => k === 4 ? !!ctx.base.daily : k === 0 || (k < 3 ? ctx.done() && c[k - 1] : !!ctx.base.expert && ctx.done() && (ctx.sealed ? ctx.sealed() : true));

  function render(host, ctx) {
    bind(ctx);
    const { x, E, button } = ctx, base = ctx.base, s = ctx.s;
    const at = attempt(x, base, ctx.done());
    const c = chal(x, base.id);
    host.innerHTML = '';
    host.dataset.kind = s.kind;
    if (lastId !== base.id) { sel = null; picked = null; lastId = base.id; }
    const names = base.challenges || CH;
    const chips = E('div', { class: 'v5-chips', role: 'tablist' });
    names.forEach((name, k) => {
      if (k === 3 && !base.expert || k === 4 && !base.daily) return;
      const open = opens(ctx, c, k);
      chips.append(E('button', {
        type: 'button', class: 'v5-chip' + (at.c === k ? ' on' : '') + (c[k] ? ' won' : '') + (k === 3 ? ' expert' : ''), disabled: !open, role: 'tab', 'aria-selected': at.c === k,
        'aria-label': `التحدي ${k + 1}: ${name}${c[k] ? '، مكتمل' : open ? '' : '، مقفل'}`,
        onclick: () => { if (at.c !== k) startAttempt(ctx, k); }
      }, E('span', { class: 'v5-star', text: c[k] ? '★' : '☆' }), E('b', { text: name })));
    });
    const limit = s.kind === 'tide' ? s.target.budget : (at.c === 1 || at.c === 4) && s.kind !== 'weigh' ? s.target.min : null;
    const label = s.kind === 'weigh' ? 'الوزنات' : s.kind === 'chime' ? 'الضربات' : s.kind === 'tide' ? 'الأفعال' : s.kind === 'river' ? 'العبور' : s.kind === 'slide' ? 'الانزلاقات' : ['gearfit', 'path', 'cipher', 'torn'].includes(s.kind) ? 'التبديلات' : 'الحركات';
    const counter = E('div', { class: 'v5-counter' }, E('span', { text: label }), E('b', { id: 'v5-moves', text: String(at.moves) }),
      limit ? E('small', { text: '/ ' + limit }) : null,
      at.c >= 2 ? E('small', { class: 'v5-nohint', text: at.c === 4 ? 'لغز اليوم' : at.c === 3 ? 'لوحة الخبير' : at.hint ? 'استُعمل تلميح' : 'بلا تلميح' }) : null);
    host.append(E('div', { class: 'v5-head' }, chips, counter), E('p', { class: 'v5-goal', text: s.goal + (at.c === 2 && base.alt ? ' (ترتيب مختلف عن المحاولة الأولى)' : at.c === 3 && !base.expert.goal ? ' لوحة الخبير أكبر من لوحة القصة.' : at.c === 4 ? ' لغز اليوم: ترتيب جديد كل يوم.' : '') }));
    host.append(E('div', { class: 'v5-board v5-k-' + s.kind, id: 'v5-board' }));
    host.append(E('div', { class: 'v5-crew', id: 'v5-crew', role: 'status', 'aria-live': 'polite' }));
    const hintBox = E('div', { class: 'v5-hint', id: 'v5-hint', role: 'status', 'aria-live': 'polite' });
    host.append(hintBox);
    if (at.hint) showHint(ctx, hintBox, at.hint);
    const undo = button('تراجع', () => undoMove(ctx), 'v5-undobtn');
    undo.disabled = !at.hist.length || NO_UNDO.includes(s.kind); undo.id = 'v5-undo';
    const hintBtn = button(at.hint >= 3 ? 'استُعملت التلميحات' : at.hint === 2 ? 'أرني حركة' : at.hint ? 'التلميح الثاني' : 'تلميح', () => useHint(ctx), 'v5-hintbtn');
    hintBtn.disabled = at.hint >= 3;
    host.append(E('div', { class: 'v5-bar' }, hintBtn, NO_UNDO.includes(s.kind) ? null : undo,
      button('محاولة جديدة', () => startAttempt(ctx, at.c)), button('دفتر الرحلة', () => ctx.notebook()), button('الخريطة', () => ctx.map())));
    paint(ctx);
  }

  function startAttempt(ctx, k) {
    bind(ctx);
    const { x } = ctx, base = ctx.base;
    v5state(x).att[base.id] = { c: k, moves: 0, hint: 0, tool: !base.needs, wrong: 0, hist: [] };
    sel = null; picked = null;
    const s = ctx.s, w = L().initial(s);
    if (s.random && s.kind === 'weigh') w[0] = Math.floor(Math.random() * 9);
    ctx.setWork(w);
    ctx.save();
    ctx.rerender();
  }

  function useHint(ctx) {
    const { x } = ctx, base = ctx.base, at = attempt(x, base, ctx.done());
    if (at.hint >= 3) return;
    at.hint++;
    x.hints[base.id] = (x.hints[base.id] || 0) + 1;
    ctx.save();
    ctx.rerender();
    if (at.hint === 3) showMove(ctx);
  }

  // Hint text: the authored hints, plus where the current board stands (closer / further / stuck).
  function showHint(ctx, box, level) {
    const { E } = ctx, s = ctx.s, at = attempt(ctx.x, ctx.base, ctx.done());
    box.innerHTML = '';
    box.append(E('b', { text: level === 1 ? 'التلميح الأول' : level === 2 ? 'التلميح الثاني' : 'التلميحات' }), E('p', { text: s.hints[0] }));
    if (level >= 2) box.append(E('p', { text: s.hints[1] }));
    const d = s.kind === 'weigh' ? null : L().distance(s, ctx.work());
    if (d !== null) box.append(E('p', { class: 'v5-where', text: d === 0 ? 'اللوحة محلولة.' : d < 0 ? 'لا طريق إلى الحل من هذه اللوحة؛ تراجع أو ابدأ محاولة جديدة.' : at.lastD >= 0 && at.lastD !== undefined && d > at.lastD ? `حركتك الأخيرة أبعدتك عن الحل. بقي ${d} على الأقل.` : `بقي ${d} ${d === 1 ? 'حركة' : 'حركات'} على الأقل من هنا.` }));
    if (level >= 3) box.append(E('p', { class: 'v5-where', text: 'شاهد اللوحة: تتحرك الخطوة التالية ثم تعود.' }));
    box.classList.add('on');
  }

  // «أرني حركة»: play the next move on the board, then return to the real state (no move counted).
  function showMove(ctx) {
    const s = ctx.s, v = ctx.work(), n = L().assist(s, v);
    if (!n) return;
    const b = $('#v5-board'); if (!b) return;
    ctx.setWork(n); paint(ctx); b.classList.add('demo');
    later(() => { ctx.setWork(v); paint(ctx); const bb = $('#v5-board'); if (bb) bb.classList.remove('demo'); }, 1400);
  }

  function free(ctx, next) { ctx.setWork(next); ctx.save(); paint(ctx); }
  function undoMove(ctx) {
    const at = attempt(ctx.x, ctx.base, ctx.done());
    if (!at.hist.length) return;
    sel = null; picked = null;
    moved(ctx, at.hist.pop(), { undo: true });
  }
  function moved(ctx, next, opt = {}) {
    const { x } = ctx, base = ctx.base, s = ctx.s, at = attempt(x, base, ctx.done());
    const prev = ctx.work();
    if (!opt.undo) { at.hist.push(prev.slice()); if (at.hist.length > 60) at.hist.shift(); }
    ctx.prev = prev;
    ctx.setWork(next);
    at.moves++;
    x.moves[base.id] = (x.moves[base.id] || 0) + 1;
    const d = s.kind === 'weigh' || s.kind === 'slide' && at.c === 3 ? null : L().distance(s, next);
    const lastD = at.lastD; at.lastD = d;
    ctx.save();
    const m = $('#v5-moves');
    if (m) { m.textContent = String(at.moves); m.parentElement.classList.toggle('over', at.c === 1 && at.moves > s.target.min); }
    const u = $('#v5-undo'); if (u) u.disabled = !at.hist.length;
    paint(ctx);
    if (L().solved(s, next)) { const b = $('#v5-board'); if (b) b.classList.add('win'); try { tone(880, .18, 'sine', .05); later(() => tone(1175, .25, 'sine', .05), 140); } catch (e) {} later(() => solvedNow(ctx), 900); return; }
    if (s.kind === 'tide' && at.moves >= s.target.budget) { say(ctx, 'انتهت الأفعال قبل الوصول. ابدأ محاولة جديدة.'); return; }
    if (at.c === 1 && s.kind !== 'weigh' && at.moves === s.target.min + 1) { crew(ctx, 'نَبض', 'تجاوزت أقل عدد من الحركات. أكمل الحل، أو ابدأ محاولة جديدة لنيل النجمة.'); return; }
    // The crew talks during the story attempt only, so the challenges stay clean.
    if (at.c === 0 && d !== null) {
      if (d < 0) crew(ctx, crewOf(base), 'لا أرى طريقًا من هنا. جرّب «تراجع».');
      else if (d > 0 && d <= 2 && (lastD === undefined || lastD === null || lastD > 2)) crew(ctx, 'شِبل', d === 1 ? 'حركة واحدة فقط!' : 'اقتربنا! حركتان فقط.');
      else if (opt.undo) crew(ctx, crewOf(base), 'رجعنا خطوة. فكّر قبل الحركة التالية.');
    }
  }

  function say(ctx, t) { const f = $('#v5-say'); if (f) { f.textContent = t; f.classList.add('on'); } }
  function crew(ctx, who, text) {
    const f = $('#v5-crew'); if (!f) return;
    f.innerHTML = ''; f.append(img(CREWART[who] || 'crew_ward', 'v5-crew-face'), ctx.E('p', {}, ctx.E('b', { text: who + ': ' }), text));
    f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  }

  function solvedNow(ctx) {
    const { x, E, button } = ctx, base = ctx.base, s = ctx.s, at = attempt(x, base, ctx.done()), c = chal(x, base.id);
    const firstWin = !ctx.done();
    const earned = at.c === 0 || at.c >= 3 || (at.c === 1 && (s.kind === 'weigh' ? !at.wrong : at.moves <= s.target.min)) || (at.c === 2 && !at.hint);
    if (earned && at.c < 4) c[at.c] = true;
    if (at.c === 0) c[0] = true;
    if (at.c === 4 && ctx.onDaily) ctx.onDaily(at.moves, s.target.min, at.hint);
    ctx.save();
    if (firstWin) return ctx.onFirstWin({ moves: at.moves, hints: at.hint });
    const host = $('#v5-board');
    if (!host) return;
    const names = base.challenges || CH;
    const why = at.c === 4 ? `حللت لغز اليوم في ${at.moves} حركة (أقل عدد ${s.target.min}). عد غدًا للغز جديد.` : earned ? (at.c === 0 ? 'أعدت حل اللغز.' : at.c === 1 ? `نجمة «أقل حركات»: ${at.moves} حركات.` : at.c === 2 ? 'نجمة «بدون تلميح».' : `نجمة «خبير» في ${at.moves} حركة (أقل عدد ${s.target.min}).`)
      : at.c === 1 ? (s.kind === 'weigh' ? 'اخترت حجرًا خاطئًا في هذه المحاولة؛ حاول من جديد.' : `حللته في ${at.moves} حركة؛ الحد ${s.target.min}. حاول من جديد.`) : 'استعملت تلميحًا في هذه المحاولة؛ حاول من جديد دون تلميح.';
    const next = at.c === 4 ? -1 : c.findIndex((d, k) => !d && k < 4 && (k !== 3 || base.expert) && opens(ctx, c, k));
    host.append(E('div', { class: 'v5-done' }, E('b', { text: earned ? '★ تحقق التحدي' : 'انحل اللغز' }), E('p', { text: why }),
      E('div', { class: 'v5-bar' }, next >= 0 ? button('التحدي التالي: ' + names[next], () => startAttempt(ctx, next), 'primary') : null,
        button('محاولة جديدة', () => startAttempt(ctx, at.c)), button('الخريطة', () => ctx.map()))));
  }

  /* ---------- painting: motion (FLIP), drag and long-press preview are shared by every board ---------- */
  function paint(ctx) {
    const b = $('#v5-board');
    if (!b) return;
    const before = new Map();
    if (b.querySelectorAll && b.getBoundingClientRect) b.querySelectorAll('[data-k]').forEach(n => { try { before.set(n.getAttribute('data-k'), n.getBoundingClientRect()); } catch (e) {} });
    b.innerHTML = '';
    ctx.drop = ctx.swipe = ctx.peek = null;
    b.append(ctx.E('p', { id: 'v5-say', class: 'v5-say', role: 'status', 'aria-live': 'polite' }));
    ({ locks: paintLocks, cipher: paintCipher, mirrors: paintMirrors, torn: paintTorn, chime: paintChime, linked: paintLinked, tide: paintTide, weigh: paintWeigh, valves: paintValves, slide: paintSlide, lights: paintLights, scales: paintScales, ropes: paintRopes, gearfit: paintGearfit, drums: paintDrums, push: paintPush, stroke: paintStroke, hanoi: paintHanoi, river: paintRiver, frogs: paintFrogs, path: paintPath })[ctx.s.kind](b, ctx);
    if (before.size && b.querySelectorAll) b.querySelectorAll('[data-k]').forEach(n => {
      const r0 = before.get(n.getAttribute('data-k')); if (!r0 || !n.animate) return;
      const r1 = n.getBoundingClientRect(), dx = r0.left - r1.left, dy = r0.top - r1.top;
      if (Math.abs(dx) + Math.abs(dy) > 2) n.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'translate(0,0)' }], { duration: 280, easing: 'cubic-bezier(.3,1.25,.5,1)' });
    });
    wire(b, ctx);
  }

  // Drag a piece onto another (or swipe it), and press-and-hold to preview what a move affects.
  let press = null;
  function wire(b, ctx) {
    if (!b.addEventListener || b.__wired) return; b.__wired = true;
    const target = e => e.target && e.target.closest ? e.target.closest('[data-drag],[data-peek]') : null;
    b.addEventListener('pointerdown', e => {
      const t = target(e); if (!t) return;
      press = { t, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, peeked: false, ghost: null };
      if (t.hasAttribute('data-peek') && ctx.peek) press.timer = setTimeout(() => { if (!press || press.moved) return; press.peeked = true; peek(b, ctx.peek(t.getAttribute('data-peek'))); }, 420);
    });
    b.addEventListener('pointermove', e => {
      if (!press || e.pointerId !== press.id) return;
      const dx = e.clientX - press.x, dy = e.clientY - press.y;
      if (!press.moved && Math.hypot(dx, dy) > 12 && press.t.hasAttribute('data-drag')) {
        press.moved = true; clearTimeout(press.timer);
        const r = press.t.getBoundingClientRect(), g = press.t.cloneNode(true);
        g.className += ' v5-ghostdrag'; g.style.cssText += `;position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;pointer-events:none;z-index:50`;
        document.body.append(g); press.ghost = g; press.r = r; press.t.classList.add('dragging');
      }
      if (press.ghost) press.ghost.style.transform = `translate(${dx}px,${dy}px) scale(1.08)`;
    });
    const end = e => {
      if (!press || e.pointerId !== press.id) return;
      clearTimeout(press.timer);
      const p = press; press = null;
      if (p.peeked) { peek(b, []); p.t.__noclick = Date.now(); return; }
      if (!p.moved) return;
      p.ghost && p.ghost.remove(); p.t.classList.remove('dragging'); p.t.__noclick = Date.now();
      const dx = e.clientX - p.x, dy = e.clientY - p.y, src = p.t.getAttribute('data-drag');
      const under = document.elementFromPoint(e.clientX, e.clientY), drop = under && under.closest && under.closest('[data-drop]');
      if (drop && ctx.drop && drop !== p.t) { sel = null; ctx.drop(src, drop.getAttribute('data-drop')); return; }
      if (ctx.swipe && Math.hypot(dx, dy) > 24) ctx.swipe(src, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
    // A drag or a long press must not also count as a tap.
    b.addEventListener('click', e => { const t = target(e); if (t && t.__noclick && Date.now() - t.__noclick < 500) { e.stopPropagation(); e.preventDefault(); } }, true);
  }
  function peek(b, keys) {
    b.querySelectorAll('.peek').forEach(n => n.classList.remove('peek'));
    (keys || []).forEach(k => b.querySelectorAll(`[data-k="${k}"],[data-pk="${k}"]`).forEach(n => n.classList.add('peek')));
  }
  // Tap-two-to-swap with drag support for every swap board.
  function swapTo(ctx, i, j, v) { const n = v.slice(); [n[i], n[j]] = [n[j], n[i]]; sel = null; try { tone(470, .06, 'triangle', .04); } catch (er) {} moved(ctx, n); }

  function toolGate(b, ctx, tool, label) {
    const { x, E } = ctx, s = ctx.base, at = attempt(x, s, ctx.done());
    if (at.tool) return false;
    const list = [].concat(s.needs || tool), k = Math.min(at.tp || 0, list.length - 1), name = list[k], T = TreasureData.SEA1_TOOLS[name];
    const has = !!v5state(x).tools[name];
    const lab = Array.isArray(label) ? label[k] : label;
    b.append(E('div', { class: 'v5-gate' }, img(T.art, 'v5-gate-art'), E('p', { text: has ? lab : 'تحتاج ' + T.name + ' من ' + T.from + ' أولًا.' }),
      list.length > 1 ? E('small', { class: 'v5-gate-step', text: `الأداة ${k + 1} من ${list.length}` }) : null,
      ctx.button(has ? 'ضع ' + T.name : 'غير متاحة', () => {
        if (!has) return;
        at.tp = k + 1; v5state(x).tools[name] = 'used';
        if (at.tp >= list.length) at.tool = true;
        try { tone(392, .12, 'triangle', .05); } catch (er) {}
        ctx.save(); paint(ctx);
      }, 'primary')));
    return true;
  }

  // Locks: four sliders; a window beside each shows which other locks must be out/in before it can move.
  function paintLocks(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), L = TreasureLogic, at = attempt(ctx.x, s, ctx.done());
    const box = E('div', { class: 'v5-chest' }), nx = nextHint(ctx), nxi = nx ? diffIdx(v, nx)[0] : -1;
    ctx.peek = i => ['w' + i];
    t.rules.forEach((rule, i) => {
      const can = L.locksCan(t, v, i);
      const win = E('div', { class: 'v5-window ' + (can ? 'ok' : 'wait'), id: 'v5-win-' + i, 'aria-hidden': 'true', 'data-pk': 'w' + i });
      for (let r = 0; r < t.rules.length; r++) {
        const need = rule.find(([j]) => j === r);
        const line = E('i', { class: 'v5-mini' + (r === i ? ' self' : '') + (need ? ' need' : '') });
        if (need) line.append(E('u', { class: 'v5-mini-knob ' + (need[1] ? 'out' : 'in') + (v[r] === need[1] ? ' met' : '') }));
        if (r === i) line.append(E('u', { class: 'v5-mini-self' }));
        win.append(line);
      }
      if (at.hint >= 1 && rule.some(([, w]) => w === 0)) win.classList.add('pulse');
      const slider = E('button', {
        type: 'button', class: 'v5-track' + (v[i] ? ' out' : '') + (can ? '' : ' blocked') + (nxi === i ? ' pulse' : ''), 'data-peek': i,
        'aria-label': `القفل ${i + 1}: ${v[i] ? 'مسحوب' : 'داخل المجرى'}${can ? '' : '، محجوب'}`,
        onclick: () => {
          const n = L.locksMove(t, v, i);
          if (!n) { win.classList.remove('flash'); void win.offsetWidth; win.classList.add('flash'); try { sfx.bad(); } catch (e) {} return; }
          try { tone(300 + i * 60, .08, 'triangle', .05); } catch (e) {}
          moved(ctx, n);
        }
      }, E('span', { class: 'v5-groove' }), img('ch1_s1_piece_lock_slider', 'v5-slider'));
      box.append(E('div', { class: 'v5-lockrow' }, slider, win));
    });
    b.append(box, E('p', { class: 'v5-legend' },
      E('span', {}, E('i', { class: 'v5-mini v5-leg' }, E('u', { class: 'v5-mini-knob out met' })), ' مسحوب'), E('span', {}, E('i', { class: 'v5-mini v5-leg' }, E('u', { class: 'v5-mini-knob in met' })), ' داخل المجرى'),
      E('span', {}, E('u', { class: 'v5-mini-self' }), ' هذا القفل')));
    if (L.solved(s, v)) box.classList.add('open');
  }

  // Cipher: four sockets around the compass; tap two symbols to swap them.
  let picked = null, sel = null, lastId = null;
  function paintCipher(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L0 = L(), nx = nextHint(ctx);
    const pos = ['أعلى', 'يمين', 'أسفل', 'يسار', 'الدرج'], AR = { shell: 'الصدفة', anchor: 'المرساة', fish: 'السمكة', sail: 'الشراع', boat: 'القارب' };
    const art = k => t.symbols[k] === 'boat' ? 'ch3_s1_piece_boat' : 'ch1_s2_piece_' + t.symbols[k];
    const card = (c, k) => {
      const [kind, a, bb] = c, A = img(art(a), 'v5-cc-a'), B = bb !== undefined ? img(art(bb), 'v5-cc-b') : null;
      const pic = kind === 'N' ? E('div', { class: 'v5-cc n' }, img('tool_compass', 'v5-cc-compass'), A) : E('div', { class: 'v5-cc ' + kind.toLowerCase() }, E('i', { class: 'v5-ring' }), A, B, kind === 'CW' ? E('i', { class: 'v5-arc' }) : null);
      const txt = kind === 'N' ? `${AR[t.symbols[a]]} عند طرف البوصلة` : kind === 'OPP' ? `${AR[t.symbols[a]]} تقابل ${AR[t.symbols[bb]]}` : kind === 'CW' ? `${AR[t.symbols[bb]]} بعد ${AR[t.symbols[a]]} مع عقارب الساعة` : `${AR[t.symbols[a]]} بجوار ${AR[t.symbols[bb]]}`;
      return E('figure', { class: at.hint >= 1 && k === 0 ? 'pulse' : '' }, pic, E('figcaption', { text: txt }));
    };
    const clues = E('div', { class: 'v5-clues v5-clues4' }, ...t.clues.map(card));
    const ring = E('div', { class: 'v5-cring' });
    const gated = toolGate(b, ctx, 'compass', 'ضع البوصلة في تجويفها لتعرف أين الشمال.');
    const ghost = nx ? diffIdx(v, nx) : [];
    const tap = p => { if (gated) return; if (picked === null) { picked = p; paint(ctx); return; } if (picked === p) { picked = null; paint(ctx); return; } const q = picked; picked = null; swapTo(ctx, q, p, v); };
    v.forEach((sym, p) => {
      const el = E('button', {
        type: 'button', class: 'v5-socket p' + p + (picked === p ? ' picked' : '') + (ghost.includes(p) ? ' pulse' : ''), disabled: gated, 'data-drag': p, 'data-drop': p,
        'aria-label': `${pos[p]}: ${AR[t.symbols[sym]]}${picked === p ? '، محدد' : ''}`, 'aria-pressed': picked === p, onclick: () => tap(p)
      }, img(art(sym), 'v5-sym', { 'data-k': 'sym' + sym }));
      if (p === 4) ring.__tray = el; else ring.append(el);
    });
    ring.append(E('div', { class: 'v5-cslot' + (at.tool ? ' set' : '') + (at.hint >= 1 ? ' pulse' : ''), style: at.tool ? `--north:${[0, 90, 180, 270][t.northPos] - 0}deg` : '' }, at.tool ? img('tool_compass', 'v5-needle') : null));
    ctx.drop = (a, c) => swapTo(ctx, +a, +c, v);
    b.append(clues, ring, E('div', { class: 'v5-ctray' }, E('small', { text: 'الدرج' }), ring.__tray));
    if (L0.solved(s, v)) ring.classList.add('solved');
  }

  // Mirrors: 5×5 board, source left of row 4, lens at row 5 col 1; tap a mirror to turn it a quarter.
  function paintMirrors(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic;
    const gated = toolGate(b, ctx, 'key', 'ضع المفتاح لفتح غطاء آلة الضوء.');
    const tr = at.tool ? L.mirrorTrace(t, v) : { path: [], hit: false }, nxv = at.hint >= 1 ? L.assist(s, v) : null, nxm = nxv ? diffIdx(v, nxv)[0] : -1;
    const ghost = at.hint >= 2 ? L.mirrorTrace(t, solution(s)) : null;
    const grid = E('div', { class: 'v5-grid' + (gated ? ' covered' : '') + (tr.hit ? ' lit' : ''), style: `--n:${t.n}` });
    const side = (dr, dc) => dr === -1 ? 't' : dr === 1 ? 'b' : dc === -1 ? 'l' : 'r';
    const back = (dr, dc) => side(-dr, -dc);
    const segs = (trace, cls) => { const m = new Map(); trace.path.slice(1).forEach(p => { const k = p[0] + ',' + p[1]; const a = m.get(k) || []; a.push(back(p[2], p[3])); if (p.length > 4) a.push(side(p[4], p[5])); m.set(k, a); }); return m; };
    const beam = segs(tr), ghostSeg = ghost ? segs(ghost) : new Map(), order = new Map(); tr.path.slice(1).forEach((p, k) => { const key = p[0] + ',' + p[1]; if (!order.has(key)) order.set(key, k); });
    for (let r = 1; r <= t.n; r++) for (let c = 1; c <= t.n; c++) {
      const m = t.mirrors.findIndex(p => p[0] === r && p[1] === c), lens = r === t.lens[0] && c === t.lens[1];
      const cell = E(m >= 0 ? 'button' : 'div', { class: 'v5-cell' + (m >= 0 ? ' mirror' : '') + (lens ? ' lens' : '') });
      (ghostSeg.get(r + ',' + c) || []).forEach(sd => cell.append(E('i', { class: 'v5-ray ghost ' + sd })));
      (beam.get(r + ',' + c) || []).forEach(sd => cell.append(E('i', { class: 'v5-ray grow ' + sd, style: `animation-delay:${(order.get(r + ',' + c) || 0) * 70}ms` })));
      if (m >= 0) {
        cell.type = 'button'; cell.disabled = gated;
        cell.setAttribute('aria-label', `مرآة في الصف ${r} العمود ${c}: ${v[m] ? 'مائلة إلى اليمين' : 'مائلة إلى اليسار'}`);
        if (at.hint >= 1 && nxm === m) cell.classList.add('pulse');
        const im = img('ch1_s3_piece_mirror', 'v5-mirror'); im.style.transform = `rotate(${v[m] ? 0 : 90}deg)`;
        cell.append(im);
        cell.onclick = () => { const n = v.slice(); n[m] = 1 - n[m]; try { tone(660, .05, 'sine', .04); } catch (e) {} moved(ctx, n); };
      }
      if (lens) cell.append(img('tool_lens', 'v5-lens'));
      grid.append(cell);
    }
    grid.append(E('span', { class: 'v5-emitter', style: `top:calc(${(t.source[0] - .5) / t.n * 100}% - 14px)`, 'aria-hidden': 'true' }));
    b.append(grid);
  }

  /* ---------- seas 2–3 ---------- */
  const SHAPES = {
    1: '<path d="M20 5 L35 32 L5 32Z"/>', 2: '<circle cx="20" cy="20" r="13"/>', 3: '<path d="M20 3 L37 20 L20 37 L3 20Z"/>',
    4: '<path d="M27 5 A15 15 0 1 0 27 35 A11.5 11.5 0 1 1 27 5Z"/>', 5: '<path d="M3 24 Q11.5 8 20 20 T37 16 L37 26 Q28.5 34 20 24 T3 32Z"/>',
    6: '<path d="M4 28 V12 H14 V22 H22 V12 H32 V22 H36 V28 H26 V18 H18 V28Z"/>', 7: '<path d="M20 3 C36 11 36 29 20 37 C4 29 4 11 20 3Z"/>'
  };
  const BADGE = {
    circle: '<circle cx="20" cy="20" r="11" fill="none" stroke-width="5"/>', triangle: '<path d="M20 7 L33 31 L7 31Z" fill="none" stroke-width="4.5" stroke-linejoin="round"/>',
    diamond: '<path d="M20 5 L34 20 L20 35 L6 20Z" fill="none" stroke-width="4.5" stroke-linejoin="round"/>', wave: '<path d="M4 22 Q10 12 16 20 T28 20 T38 18" fill="none" stroke-width="5" stroke-linecap="round"/>'
  };
  const svg = (inner, cls, vb = '0 0 40 40') => { const e = DX.el('span', { class: cls, 'aria-hidden': 'true' }); e.innerHTML = `<svg viewBox="${vb}">${inner}</svg>`; return e; };
  const ring = (cls, pulse) => cls + (pulse ? ' pulse' : '');

  // Torn map: swap fragments; half-joints drawn on each edge; solid edge = matched, dashed = not yet.
  function paintTorn(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), L = TreasureLogic, at = attempt(ctx.x, s, ctx.done());
    const grid = E('div', { class: 'v5-torn' + (L.solved(s, v) ? ' solved' : ''), style: `--c:${t.cols}` });
    const sides = ['t', 'r', 'b', 'l'];
    v.forEach((piece, pos) => {
      const e = t.pieces[piece];
      const frag = E('button', { type: 'button', 'data-drag': pos, 'data-drop': pos, 'data-k': 'f' + piece, class: 'v5-frag' + (sel === pos ? ' picked' : '') + (at.hint >= 2 && piece === 0 ? ' pulse' : '') + (at.hint >= 2 && pos === 0 && piece !== 0 ? ' pulse' : ''),
        'aria-label': `قصاصة في الموضع ${pos + 1}${sel === pos ? '، محددة' : ''}`, 'aria-pressed': sel === pos,
        onclick: () => {
          if (sel === null) { sel = pos; paint(ctx); return; }
          if (sel === pos) { sel = null; paint(ctx); return; }
          const n = v.slice(); [n[sel], n[pos]] = [n[pos], n[sel]]; sel = null;
          try { tone(440, .05, 'triangle', .04); } catch (er) {}
          moved(ctx, n);
        } }, img('ch2_s1_piece_map_fragment', 'v5-frag-art'));
      e.forEach((code, sd) => {
        const ok = L.tornEdgeOk(t, v, pos, sd);
        frag.append(E('i', { class: 'v5-edge ' + sides[sd] + (ok ? ' ok' : '') + (at.hint >= 1 && code === 0 ? ' hl' : '') }));
        if (code === 0) frag.append(E('i', { class: 'v5-coast ' + sides[sd] }));
        else frag.append(svg(SHAPES[code], 'v5-joint ' + sides[sd] + ' j' + code));
      });
      grid.append(frag);
    });
    ctx.drop = (a, c) => swapTo(ctx, +a, +c, v);
    b.append(grid);
  }

  // Bells: fit the clapper, strike four bells; the strip is checked after the fourth strike.
  function paintChime(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L0 = L(), n = t.badges.length;
    const NM = { circle: 'الدائرة', triangle: 'المثلث', diamond: 'المعين', wave: 'الموجة', star: 'النجمة' };
    const badge = (i, cls = 'v5-badge') => svg(BADGE[t.badges[i]], cls);
    const card = (r, k) => { const [kind, a, c] = r;
      const pic = kind === 'adj' ? E('div', { class: 'v5-pair' }, badge(a), E('b', { text: '→' }), badge(c)) : kind === 'before' ? E('div', { class: 'v5-time' }, E('i', { class: 'v5-start' }), badge(a), E('b', { text: '…→' }), badge(c))
        : kind === 'apart' ? E('div', { class: 'v5-pair apart' }, badge(a), E('b', { text: '✕' }), badge(c)) : E('div', { class: 'v5-slots4' }, ...Array.from({ length: n }, (_, k2) => E('i', { class: k2 === 0 || k2 === n - 1 ? 'no' : '' }, k2 === 0 || k2 === n - 1 ? badge(a, 'v5-badge sm') : null)));
      const txt = kind === 'adj' ? `${NM[t.badges[a]]} ثم ${NM[t.badges[c]]} مباشرة` : kind === 'before' ? `${NM[t.badges[a]]} قبل ${NM[t.badges[c]]}` : kind === 'apart' ? `${NM[t.badges[a]]} و${NM[t.badges[c]]} لا يتجاوران` : `${NM[t.badges[a]]} ليست أولًا ولا أخيرًا`;
      return E('figure', { class: at.hint >= 1 && k === 0 ? 'pulse' : '' }, pic, E('figcaption', { text: txt })); };
    const clues = E('div', { class: 'v5-clues v5-bclues v5-clues4' }, ...t.rules.map(card));
    const gated = toolGate(b, ctx, 'clapper', 'ركّب المطرقة في الجرس الناقص لتعود الأجراس إلى العمل.');
    const strip = E('div', { class: 'v5-strip' + (v.length === 0 && at.moves > 0 && at.moves % n === 0 && !L0.solved(s, v) ? ' shake' : ''), style: `--n:${n}` });
    const goal = at.hint >= 2 ? solution(s) : null;
    for (let k = 0; k < n; k++) {
      const slot = E('i', { class: 'v5-slot' });
      if (v[k] !== undefined) slot.append(badge(v[k], 'v5-badge pop'));
      else if (goal && k < 2) slot.append(badge(goal[k], 'v5-badge ghost'));
      strip.append(slot);
    }
    const row = E('div', { class: 'v5-bells', style: `--n:${n}` });
    t.badges.forEach((name, i) => row.append(E('button', {
      type: 'button', class: 'v5-bell' + (v.includes(i) ? ' used' : ''), disabled: gated || v.includes(i),
      'aria-label': `جرس ${NM[name]}`,
      onclick: () => {
        const nx = L0.chimeStrike(t, v, i); if (!nx) return;
        try { tone([523, 587, 659, 784, 988][i], .3, 'sine', .06); } catch (er) {}
        if (nx.length === 0) say(ctx, 'ليس هذا النداء. تبقى الضربات محسوبة؛ أعد الترتيب من البداية.');
        moved(ctx, nx);
      } }, img('ch2_s2_piece_bell', 'v5-bell-art'), badge(i, 'v5-badge on-bell'))));
    b.append(clues, strip, row);
  }

  // Linked statues: first tap previews who turns with it; second tap turns them a quarter clockwise.
  function paintLinked(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic;
    const gated = toolGate(b, ctx, 'rope', 'اربط الحبل بين قواعد التماثيل لتعود حركتها مترابطة.');
    const row = E('div', { class: 'v5-birds' + (gated ? ' covered' : '') + (L.solved(s, v) ? ' solved' : '') });
    const turning = sel !== null ? t.links[sel] : [];
    t.links.forEach((links, i) => {
      const bird = img('ch2_s3_piece_bird_statue', 'v5-bird'); bird.style.transform = `rotate(${v[i] * 90}deg)`;
      const goal = img('ch2_s3_piece_bird_statue', 'v5-bird-goal'); goal.style.transform = `rotate(${t.goal[i] * 90}deg)`;
      row.append(E('div', { class: 'v5-statue' },
        E('button', { type: 'button', disabled: gated, 'data-peek': i, 'data-pk': 'b' + i, class: 'v5-base' + (sel === i ? ' picked' : '') + (turning.includes(i) ? ' turning' : '') + (at.hint >= 1 && i === 0 ? ' pulse' : '') + (v[i] === t.goal[i] ? ' match' : ''),
          'aria-label': `تمثال ${['الأيسر', 'الأوسط', 'الأيمن'][i]}${sel === i ? '، المس مرة ثانية للتدوير' : ''}`,
          onclick: () => {
            if (sel !== i) { sel = i; paint(ctx); return; }
            try { tone(180 + i * 40, .25, 'triangle', .05); } catch (er) {}
            moved(ctx, L.linkedTurn(t, v, i));
          } }, bird),
        E('div', { class: 'v5-goalshadow' }, goal)));
    });
    if (!gated) { row.append(E('i', { class: 'v5-rope r1' }), E('i', { class: 'v5-rope r2' })); }
    ctx.peek = i => t.links[+i].map(j => 'b' + j);
    const key = E('div', { class: 'v5-linkkey' + (at.hint >= 2 ? ' pulse' : '') }, E('span', {}, '◉◉○'), E('span', {}, '○◉◉'), E('span', {}, '○○◉'));
    b.append(row, key);
  }

  // Tide: tap a neighbouring station to cross an open channel, or pull the tide lever; eight actions at most.
  function paintTide(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L0 = L(), nx = nextHint(ctx);
    const out = at.moves >= t.budget && !L0.solved(s, v), wave = L0.waveOn(t, v);
    const W = 300, H = 400, P = n => [(t.nodes[n][1] - .5) * 100, (t.nodes[n][0] - .5) * 100];
    const hl = at.hint >= 1 ? [t.wave.edge] : [];
    let lines = '';
    t.edges.forEach(([a, c, lv]) => {
      const [x1, y1] = P(a), [x2, y2] = P(c), wv = [a, c].sort().join() === t.wave.edge.slice().sort().join(), open = lv === v[1] && !(wv && wave), mid = [(x1 + x2) / 2, (y1 + y2) / 2], h = hl.some(([p, q]) => (p === a && q === c) || (p === c && q === a));
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="ch ${open ? 'open' : 'shut'} ${lv ? 'hi' : 'lo'}${h ? ' hl' : ''}${wv ? ' wavy' : ''}"/>` +
        `<g transform="translate(${mid[0]} ${mid[1]})" class="tag ${lv ? 'hi' : 'lo'}"><circle r="13"/><path d="M-8 ${lv ? -3 : 4} q4 -5 8 0 t8 0" /><rect x="-8" y="${lv ? 4 : -7}" width="16" height="3" rx="1"/></g>` +
        (wv ? `<g transform="translate(${mid[0] + 22} ${mid[1]})" class="wavemark${wave ? ' on' : ''}"><path d="M-12 2 q4 -8 8 0 t8 0 t8 0"/></g>` : '');
    });
    const map = E('div', { class: 'v5-tide ' + (v[1] ? 'high' : 'low') + (out ? ' out' : '') + (wave ? ' wave' : '') });
    const svgEl = E('span', { class: 'v5-tide-svg', 'aria-hidden': 'true' }); svgEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}">${lines}</svg>`;
    map.append(svgEl);
    t.nodes.forEach((n, i) => {
      const [x, y] = P(i), here = v[0] === i, near = !here && L0.tideOpen(t, v[0], i, v[1], v);
      map.append(E('button', { type: 'button', class: 'v5-node' + (here ? ' here' : '') + (near ? ' near' : '') + (i === t.goal[0] ? ' goal' : '') + (nx && nx[0] === i && nx[0] !== v[0] ? ' pulse' : ''),
        style: `left:${x / W * 100}%;top:${y / H * 100}%`, disabled: out || here, 'aria-label': `${t.names[i]}${here ? '، الزورق هنا' : near ? '، قناة مفتوحة' : ''}`,
        onclick: () => {
          if (!L0.tideOpen(t, v[0], i, v[1], v)) { say(ctx, wave && [v[0], i].sort().join() === t.wave.edge.slice().sort().join() ? 'الموجة تغمر هذه القناة الآن. انتظر فعلًا آخر.' : 'لا قناة مفتوحة بين المحطتين الآن.'); return; }
          try { tone(392, .08, 'sine', .04); } catch (er) {}
          moved(ctx, [i, v[1], (v[2] + 1) % t.wave.period]);
        } }, here ? img('ch3_s1_piece_boat', 'v5-boat', { 'data-k': 'boat' }) : E('i', { class: 'v5-dot' }), E('small', { text: t.names[i] })));
    });
    const pips = E('div', { class: 'v5-pips', 'aria-label': `الأفعال المستعملة ${at.moves} من ${t.budget}؛ الموجة في كل فعل ثالث` });
    for (let k = 0; k < t.budget; k++) pips.append(E('i', { class: (k < at.moves ? 'used' : '') + (k % t.wave.period === t.wave.at ? ' wavepip' : '') }));
    const lever = E('button', { type: 'button', class: 'v5-lever ' + (v[1] ? 'high' : 'low') + (nx && nx[1] !== v[1] ? ' pulse' : ''), disabled: out,
      'aria-label': `ذراع المد: ${v[1] ? 'مد' : 'جزر'}، المس للتبديل`,
      onclick: () => { try { tone(v[1] ? 300 : 360, .2, 'triangle', .05); } catch (er) {} moved(ctx, [v[0], 1 - v[1], (v[2] + 1) % t.wave.period]); } },
      img('ch3_s1_piece_tide_lever', 'v5-lever-art'), E('b', { text: v[1] ? 'مد' : 'جزر' }));
    const legend = E('div', { class: 'v5-tkey' },
      E('span', {}, svg('<circle cx="20" cy="20" r="16" class="lo"/><path d="M12 24 q4 -5 8 0 t8 0" fill="none" stroke-width="3"/><rect x="12" y="13" width="16" height="3"/>', 'v5-tkeyic lo'), ' تفتح في الجزر'),
      E('span', {}, svg('<circle cx="20" cy="20" r="16" class="hi"/><path d="M12 17 q4 -5 8 0 t8 0" fill="none" stroke-width="3"/><rect x="12" y="24" width="16" height="3"/>', 'v5-tkeyic hi'), ' تفتح في المد'),
      E('span', {}, E('i', { class: 'v5-wavekey' }), ' الموجة: كل فعل ثالث'));
    b.append(E('div', { class: 'v5-tide-top' }, lever, pips), E('p', { class: 'v5-wavewarn' + (wave ? ' on' : ''), text: wave ? 'الفعل القادم وقت الموجة: قناة الرصيف مغمورة.' : '' }), map, legend);
  }

  // Weighing: tap a stone to move it tray → left pan → right pan → tray; weigh; then pick the heavier.
  function paintWeigh(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic, o = L.weighParts(v);
    const gated = toolGate(b, ctx, 'balance', 'ركّب ميزان القوافل لتبدأ المقارنة.');
    const rule = E('div', { class: 'v5-wrule' }, ...Array.from({ length: 5 }, (_, k) => E('span', { class: k === 2 ? 'heavy' : '' }, img('ch3_s2_piece_stone', 'v5-wr-stone'))), E('b', { text: 'حجر واحد أثقل' }));
    const res = o.stage === 0 ? 0 : o.stage === 1 ? o.r1 : o.r2, tilt = o.stage === 3 ? 0 : res === 1 ? -9 : res === 2 ? 9 : 0;
    const cap = o.stage === 0 ? 3 : 1;
    const pan = side => {
      const stones = o.p.map((x, i) => x === side ? i : -1).filter(i => i >= 0);
      const p = E('div', { class: 'v5-pan ' + (side === 1 ? 'left' : 'right') }, img('ch3_s2_piece_balance_pan', 'v5-pan-art'));
      const holds = E('div', { class: 'v5-holds' });
      for (let k = 0; k < cap; k++) {
        const i = stones[k];
        holds.append(i === undefined ? E('i', { class: 'v5-hold' }) : E('button', { type: 'button', class: 'v5-stone on-pan', 'data-k': 'st' + i, 'aria-label': `حجر ${i + 1} في الكفة ${side === 1 ? 'اليسرى' : 'اليمنى'}`, disabled: gated || o.stage === 3, onclick: () => tap(i) }, img('ch3_s2_piece_stone', 'v5-st')));
      }
      p.append(holds); return p;
    };
    const bal = E('div', { class: 'v5-bal', style: `--tilt:${tilt}deg` }, img('ch3_s2_piece_balance_stand', 'v5-stand'), E('div', { class: 'v5-beam' }, img('ch3_s2_piece_balance_beam', 'v5-beam-art')), pan(1), pan(2));
    const tray = E('div', { class: 'v5-tray' });
    o.p.forEach((x, i) => {
      const deduced = o.stage === 2;
      tray.append(x === 1 || x === 2 ? E('i', { class: 'v5-hold empty' }) : E('button', { type: 'button', 'data-k': 'st' + i, class: 'v5-stone' + (x === 3 ? ' out' : '') + (at.hint >= 2 && o.stage === 0 && i < 6 ? ' pulse' : ''),
        disabled: gated || o.stage === 3 || (x === 3 && !deduced), 'aria-label': `حجر ${i + 1}${x === 3 ? '، مستبعد' : ''}`, onclick: () => tap(i) }, img('ch3_s2_piece_stone', 'v5-st')));
    });
    function tap(i) {
      if (o.stage === 2) {
        const r = L.weighPick(t, v, i);
        if (!r) { at.wrong = (at.wrong || 0) + 1; ctx.save(); say(ctx, 'ليس هذا الحجر. راجع ما قالته الوزنتان.'); const n = tray.children[i]; n && n.classList && n.classList.add('shake'); return; }
        moved(ctx, r); return;
      }
      const n = L.weighPlace(t, v, i); if (n) free(ctx, n);
    }
    const ready = L.weighReady(v);
    const word = r => r === 1 ? 'مالت الكفة اليسرى' : r === 2 ? 'مالت الكفة اليمنى' : 'اتزنت الكفتان';
    const status = E('p', { class: 'v5-wstatus' + (at.hint >= 1 && o.stage > 0 ? ' pulse' : '') }, o.stage === 0 ? 'ضع ثلاثة أحجار في كل كفة، واترك ثلاثة في الصندوق.' : o.stage === 1 ? `${word(o.r1)}. الأحجار الباقية في الصندوق هي المرشحة؛ ضع حجرًا منها في كل كفة.` : o.stage === 2 ? `${word(o.r1)}، ثم ${word(o.r2)}. اختر الحجر الأثقل.` : 'انفتح الختم.');
    b.append(rule, bal, ctx.button(o.stage < 2 ? 'زِن' : 'تمت الوزنتان', () => { const n = L.weighNow(t, v); if (n) { try { tone(220, .35, 'triangle', .06); } catch (er) {} moved(ctx, n); } }, 'primary v5-weighbtn' + (ready ? '' : ' wait')), status, tray);
    const wbtn = b.querySelector('.v5-weighbtn'); if (wbtn) wbtn.disabled = gated || !ready;
  }

  // Valves: four gates; water reaches both basins with no active waste drain.
  function paintValves(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic;
    const gated = toolGate(b, ctx, 'valve', 'ركّب مقبض التحويل في فتحة التحكم لتعمل البوابات.');
    const f = gated ? {} : L.valvesFlow(t, v), w = k => f[k] ? ' wet' : '';
    const pipes = `
      <path class="pipe${gated ? '' : ' wet'}" d="M150 18 V70"/>
      <path class="pipe${w('toB')}" d="M150 70 V150"/><path class="pipe waste${w('wasteA')}" d="M150 70 H262"/>
      <path class="pipe${w('toC')}" d="M150 150 H70 V215"/><path class="pipe${w('toD')}" d="M150 150 H230 V215"/>
      <path class="pipe${w('left')}" d="M70 215 V282"/><path class="pipe waste${w('wasteC')}" d="M70 215 H14"/>
      <path class="pipe${w('right')}" d="M230 215 V282"/><path class="pipe waste${w('wasteD')}" d="M230 215 H286"/>
      <circle class="src" cx="150" cy="16" r="12"/>
      <g class="drain${w('wasteA')}" transform="translate(272 70)"><circle r="11"/><path d="M-5 -5 L5 5 M5 -5 L-5 5"/></g>
      <g class="drain${w('wasteC')}" transform="translate(12 215)"><circle r="11"/><path d="M-5 -5 L5 5 M5 -5 L-5 5"/></g>
      <g class="drain${w('wasteD')}" transform="translate(288 215)"><circle r="11"/><path d="M-5 -5 L5 5 M5 -5 L-5 5"/></g>
      <g class="basin${w('left')}${at.hint >= 1 ? ' hl' : ''}" transform="translate(70 300)"><rect x="-38" y="-16" width="76" height="30" rx="12"/><path d="M0 -16 V-36 M0 -36 q-12 -2 -18 6 M0 -36 q12 -2 18 6 M0 -36 q-6 -10 -16 -10 M0 -36 q6 -10 16 -10"/></g>
      <g class="basin${w('right')}${at.hint >= 1 ? ' hl' : ''}" transform="translate(230 300)"><rect x="-38" y="-16" width="76" height="30" rx="12"/><path d="M0 -16 V-36 M0 -36 q-12 -2 -18 6 M0 -36 q12 -2 18 6 M0 -36 q-6 -10 -16 -10 M0 -36 q6 -10 16 -10"/></g>`;
    const net = E('div', { class: 'v5-valves' + (gated ? ' covered' : '') + (L.solved(s, v) ? ' solved' : '') });
    const sv = E('span', { class: 'v5-net', 'aria-hidden': 'true' }); sv.innerHTML = `<svg viewBox="0 0 300 330">${pipes}</svg>`; net.append(sv);
    const at4 = [[150, 70], [150, 150], [70, 215], [230, 215]];
    const outs = [[['→'], ['↓']], [['←'], ['→'], ['←', '→']], [['←'], ['↓']], [['↓'], ['→']]];
    const names = ['البوابة العليا', 'البوابة الوسطى', 'البوابة اليسرى', 'البوابة اليمنى'];
    const ghost = at.hint >= 2 ? [1, 2, 1, 0] : null;
    at4.forEach(([x, y], i) => net.append(E('button', { type: 'button', class: 'v5-gate-btn' + (ghost && ghost[i] !== v[i] ? ' pulse' : ''), disabled: gated, style: `left:${x / 3}%;top:${y / 3.3}%`,
      'aria-label': `${names[i]}: الوضع ${v[i] + 1} من ${t.gates[i]}`,
      onclick: () => { try { tone(330 + i * 50, .1, 'triangle', .04); } catch (er) {} const n = v.slice(); n[i] = (n[i] + 1) % t.gates[i]; moved(ctx, n); } },
      img('tool_water_valve', 'v5-valve-art', { style: `transform:rotate(${v[i] * (360 / t.gates[i])}deg)` }), E('b', { class: 'v5-outs', text: outs[i][v[i]].join(' ') }))));
    b.append(net);
  }


  /* ---------- seas 4–7 ---------- */
  const nextHint = ctx => { const at = attempt(ctx.x, ctx.s, ctx.done()); return at.hint >= 2 ? TreasureLogic.assist(ctx.s, ctx.work()) : null; };
  const SHAPE8 = [null, SHAPES[2], SHAPES[1], SHAPES[3], SHAPES[4], SHAPES[5],
    '<path d="M20 37 V20 M20 22 L9 9 M20 18 L31 7 M20 28 L30 20" fill="none" stroke-width="4.5" stroke-linecap="round"/>', SHAPES[7],
    '<path d="M20 3 L24.7 14.5 L37 15.3 L27.6 23.3 L30.5 35.4 L20 28.8 L9.5 35.4 L12.4 23.3 L3 15.3 L15.3 14.5Z"/>'];
  const pickSwap = (ctx, i, v) => {
    if (sel === null) { sel = i; paint(ctx); return; }
    if (sel === i) { sel = null; paint(ctx); return; }
    const n = v.slice(); [n[sel], n[i]] = [n[i], n[sel]]; sel = null;
    try { tone(470, .06, 'triangle', .04); } catch (er) {}
    moved(ctx, n);
  };
  const diffIdx = (a, b) => b ? a.map((x, i) => x !== b[i] ? i : -1).filter(i => i >= 0) : [];

  // Ice map: 3×3 sliding tiles; each tile keeps its badge; a small key shows the finished map.
  function paintSlide(b, ctx) {
    const { s, E } = ctx, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L0 = L(), nx = nextHint(ctx), z = v.indexOf(0);
    const hl = nx ? nx.indexOf(0) : -1, NM = ['', 'الدائرة', 'المثلث', 'المعين', 'الهلال', 'الموجة', 'الفرع', 'الورقة', 'النجمة'];
    const key = E('div', { class: 'v5-slide-key', 'aria-label': 'الترتيب المطلوب' }, ...[1, 2, 3, 4, 5, 6, 7, 8, 0].map(k => E('i', { class: k ? '' : 'gap' }, k ? svg(SHAPE8[k], 'v5-sb s' + k) : null)));
    const grid = E('div', { class: 'v5-slide' + (L0.solved(s, v) ? ' solved' : '') });
    const go = i => { const n = L0.slideMove(v, i); if (!n) { say(ctx, 'حرّك لوحًا ملاصقًا للفراغ.'); return; } try { tone(380, .05, 'triangle', .04); } catch (er) {} moved(ctx, n); };
    v.forEach((k, i) => {
      const near = Math.abs(i % 3 - z % 3) + Math.abs(Math.floor(i / 3) - Math.floor(z / 3)) === 1;
      if (!k) { grid.append(E('i', { class: 'v5-tile gap' + (at.hint === 1 ? ' pulse' : ''), 'data-drop': 'gap' })); return; }
      grid.append(E('button', { type: 'button', class: 'v5-tile' + (near ? ' near' : '') + (i === hl ? ' pulse' : ''), 'data-k': 't' + k, 'data-drag': i, 'aria-label': `لوح ${NM[k]}${near ? '، ملاصق للفراغ' : ''}`, onclick: () => go(i) },
        img('ch4_s1_piece_map_tile', 'v5-tile-art'), svg(SHAPE8[k], 'v5-sb s' + k)));
    });
    ctx.drop = (src, dst) => { if (dst === 'gap') go(+src); };
    ctx.swipe = src => go(+src);
    b.append(E('div', { class: 'v5-slide-wrap' }, grid, E('figure', { class: 'v5-slide-ref' }, key, E('figcaption', { text: 'الخريطة المطلوبة' }))));
  }

  // Crystal platform: a press flips the crystal and its orthogonal neighbours.
  function paintLights(b, ctx) {
    const { s, E } = ctx, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L0 = L(), nx = nextHint(ctx), n = Math.round(Math.sqrt(v.length));
    const gated = toolGate(b, ctx, 'needle', ['ركّب إبرة المرصد في مركز المنصة لتصل البلورات ببعضها.', 'ضع عدسة المنارة فوق المنصة لترى البارز من الغائر.']);
    const target = nx ? v.findIndex((_, i) => L0.equal(L0.lightsPress(v, i), nx)) : -1;
    const changed = ctx.prev && ctx.prev.length === v.length ? diffIdx(ctx.prev, v) : [];
    const grid = E('div', { class: 'v5-lights' + (gated ? ' covered' : '') + (L0.solved(s, v) ? ' solved' : ''), style: `--n:${n}` });
    const lines = []; for (let k = 0; k < n; k++) { const p = (k + .5) / n * 300; lines.push(`M${300 / n / 2} ${p}H${300 - 300 / n / 2}M${p} ${300 / n / 2}V${300 - 300 / n / 2}`); }
    const net = E('span', { class: 'v5-lnet', 'aria-hidden': 'true' }); net.innerHTML = `<svg viewBox="0 0 300 300"><path d="${lines.join('')}"/></svg>`; grid.append(net);
    const nb = i => { const r = Math.floor(i / n), c = i % n; return [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([dr, dc]) => [r + dr, c + dc]).filter(([R, C]) => R >= 0 && R < n && C >= 0 && C < n).map(([R, C]) => 'c' + (R * n + C)); };
    v.forEach((on, i) => grid.append(E('button', { type: 'button', disabled: gated, class: 'v5-crys' + (on ? ' up' : '') + (i === target ? ' pulse' : '') + (changed.includes(i) ? ' flip' : ''), 'data-pk': 'c' + i, 'data-peek': i,
      'aria-label': `بلورة ${i + 1}: ${on ? 'بارزة' : 'منخفضة'}`,
      onclick: () => { try { tone(on ? 700 : 520, .08, 'sine', .04); } catch (er) {} moved(ctx, L0.lightsPress(v, i)); } },
      img('ch4_s2_piece_ring', 'v5-crys-ring'), on ? img('tool_crystal_weight', 'v5-crys-gem') : E('i', { class: 'v5-crys-low' }))));
    if (!gated) grid.append(img('tool_observatory_needle', 'v5-lneedle'));
    ctx.peek = i => nb(+i);
    const plus = E('div', { class: 'v5-plus' + (at.hint >= 1 ? ' pulse' : '') }, ...Array.from({ length: 9 }, (_, k) => E('i', { class: [1, 3, 4, 5, 7].includes(k) ? (k === 4 ? 'me' : 'on') : '' })));
    b.append(grid, E('div', { class: 'v5-lkey' }, plus, E('span', { text: 'اللمسة تقلب البلورة وجاراتها · اضغط مطولًا للمعاينة' })));
  }

  // Winter scales: a sealed reference on the left pan, a movable piece on the right; swap pieces until all are level.
  const PIECE = ['ch4_s3_piece_feather', 'ch4_s3_piece_wood_leaf', 'tool_crystal_weight'], PNAME = ['الريشة', 'الورقة', 'البلورة'];
  const REFMARK = [BADGE.circle, BADGE.triangle, BADGE.diamond];
  function miniBal(E, left, right, tilt) {
    return E('span', { class: 'v5-mbal', style: `--t:${tilt * 10}deg` }, E('i', { class: 'v5-mbeam' }, E('b', { class: 'l' }, left), E('b', { class: 'r' }, right)), E('i', { class: 'v5-mpost' }));
  }
  function paintScales(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L0 = L(), nx = nextHint(ctx);
    const gated = toolGate(b, ctx, 'weight', 'ضع بلورة الضبط في كفتها لتبدأ الموازنة.');
    const P = k => img(PIECE[k], 'v5-mp', { 'data-k': 'p' + k }), Pc = k => img(PIECE[k], 'v5-mp'), R = k => E('span', { class: 'v5-mref' }, img('ch3_s2_piece_stone', 'v5-mp'), svg(REFMARK[k], 'v5-badge v5-refb'));
    const cards = E('div', { class: 'v5-scards' },
      E('figure', {}, miniBal(E, Pc(1), Pc(0), -1), miniBal(E, Pc(2), Pc(1), -1), E('figcaption', { text: 'الأخف إلى الأثقل: ريشة، ورقة، بلورة' })),
      E('figure', { class: at.hint >= 1 ? 'pulse' : '' }, miniBal(E, R(0), Pc(0), -1), miniBal(E, Pc(2), R(0), -1), E('figcaption', { text: 'ثقل الأعلى بين الريشة والبلورة' })),
      E('figure', {}, miniBal(E, Pc(1), R(1), -1), E('figcaption', { text: 'ثقل الأوسط أخف من الورقة' })),
      E('figure', {}, miniBal(E, R(2), Pc(1), -1), E('figcaption', { text: 'ثقل الأسفل أثقل من الورقة' })));
    const ghost = nx ? diffIdx(v.slice(0, 3), nx.slice(0, 3)) : [], shown = v[3] === 1;
    const rows = E('div', { class: 'v5-scales' + (gated ? ' covered' : '') });
    const tap = k => { if (sel === null) { sel = k; paint(ctx); return; } if (sel === k) { sel = null; paint(ctx); return; } const a = sel; sel = null; try { tone(470, .06, 'triangle', .04); } catch (er) {} moved(ctx, L0.scaleSwap(v, a, k)); };
    [0, 1, 2].forEach(k => {
      const tilt = shown ? L0.scaleTilt(t, v, k) : 0;
      rows.append(E('button', { type: 'button', disabled: gated, class: 'v5-scale' + (sel === k ? ' picked' : '') + (ghost.includes(k) ? ' pulse' : '') + (shown && tilt === 0 ? ' level' : '') + (shown ? ' shown' : ' hidden'), 'data-drag': k, 'data-drop': k,
        'aria-label': `الميزان ${['الأعلى', 'الأوسط', 'الأسفل'][k]}: ${PNAME[v[k]]}${shown ? (tilt === 0 ? '، متزن' : tilt < 0 ? '، القطعة أخف' : '، القطعة أثقل') : ''}${sel === k ? '، محدد' : ''}`, 'aria-pressed': sel === k,
        onclick: () => tap(k) }, miniBal(E, R(k), P(v[k]), tilt), E('small', { text: shown ? (tilt === 0 ? 'متزن' : 'مائل') : 'لم يُوزن' })));
    });
    ctx.drop = (a, c) => { if (+a !== +c) { sel = null; moved(ctx, L0.scaleSwap(v, +a, +c)); } };
    const left = t.limit - v[4], wb = ctx.button(left > 0 ? `زِن (${left === 1 ? 'وزنة واحدة باقية' : 'وزنتان باقيتان'})` : 'لا وزنات باقية', () => { const n = L0.scaleWeigh(t, v); if (!n) return; try { tone(220, .35, 'triangle', .06); } catch (er) {} moved(ctx, n); }, 'primary v5-weighbtn' + (nx && nx[3] === 1 && v[3] === 0 ? ' pulse' : ''));
    wb.disabled = gated || left <= 0;
    b.append(cards, rows, wb);
  }

  // Storm ropes: four loops; a loop drawn over another must leave first. A wrong pull strains the rope until released.
  const LOOPS = [[95, 85], [205, 85], [95, 200], [205, 200], [95, 315], [205, 315]], ZORDER = [0, 1, 3, 2, 4, 5], PINS = [[44, 70], [256, 70], [40, 200], [260, 200], [44, 330], [256, 330]];
  const PINNAME = ['أعلى اليسار', 'أعلى اليمين', 'الوسط الأيسر', 'الوسط الأيمن', 'أسفل اليسار', 'أسفل اليمين'];
  function paintRopes(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), L0 = L(), nx = nextHint(ctx), m = t.cover.length;
    const strained = v[m], hl = nx && strained < 0 ? diffIdx(v.slice(0, m), nx.slice(0, m))[0] : -1;
    let g = '';
    ZORDER.forEach(i => { if (!v[i]) return; const [cx, cy] = LOOPS[i], bad = strained === i || (strained >= 0 && t.cover[strained].includes(i));
      g += `<ellipse class="halo" cx="${cx}" cy="${cy}" rx="78" ry="66"/><ellipse class="rope${bad ? ' strain' : ''}" data-pk="loop${i}" cx="${cx}" cy="${cy}" rx="78" ry="66"/>`; });
    const board = E('div', { class: 'v5-ropes' + (strained >= 0 ? ' tight' : '') + (L0.solved(s, v) ? ' solved' : '') });
    const sv = E('span', { class: 'v5-rsvg', 'aria-hidden': 'true' }); sv.innerHTML = `<svg viewBox="0 0 300 400">${g}</svg>`; board.append(sv);
    PINS.forEach(([x, y], i) => { if (!v[i]) return; board.append(E('button', { type: 'button', class: 'v5-pin' + (i === hl ? ' pulse' : '') + (strained === i ? ' strain' : ''), disabled: strained >= 0, style: `left:${x / 3}%;top:${y / 4}%`, 'data-peek': i, 'data-pk': 'pin' + i,
      'aria-label': `وتد ${PINNAME[i]}`,
      onclick: () => { const n = L0.ropePull(t, v, i); if (!n) return; try { tone(n[m] >= 0 ? 160 : 420, .15, 'triangle', .05); } catch (er) {} if (n[m] >= 0) say(ctx, 'انشد الحبل: حلقة أخرى تمر فوق هذا الوتد. أرخه ثم جرّب غيره.'); moved(ctx, n); } },
      img('ch5_s1_piece_rope_pin', 'v5-pin-art'))); });
    ctx.peek = i => ['loop' + i, ...t.cover[+i].filter(c => v[c]).map(c => 'loop' + c)];
    b.append(board);
    if (strained >= 0) b.append(ctx.button('أرخِ الحبل', () => { try { tone(300, .2, 'sine', .04); } catch (er) {} moved(ctx, L0.ropeRelease(v)); }, 'primary v5-release'));
    b.append(E('p', { class: 'v5-legend' }, E('span', { text: 'الحبل المتصل يمر فوق المقطوع · اضغط مطولًا على وتد لترى ما فوقه' })));
  }

  // Wind gears: motor on top, four swappable gears, output below; the turn travels down until the first gap or overlap.
  function paintGearfit(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L0 = L(), nx = nextHint(ctx);
    const gated = toolGate(b, ctx, 'axle', 'ثبّت محور الرياح في حاملة الآلة لتتصل التروس.');
    const U = 7, top = 2 * t.motor * U / 2 + 10, files = ['small', 'medium', 'large', 'xlarge', 'medium'], NM = ['صغير', 'متوسط', 'كبير', 'أكبر', 'بين الصغير والمتوسط'];
    const run = gated ? 0 : L0.gearRun(t, v), gaps = L0.gearContacts(t, v), ghost = nx ? diffIdx(v, nx) : [];
    const col = E('div', { class: 'v5-gearcol' + (gated ? ' covered' : '') + (run === 5 ? ' solved' : ''), style: `height:${top + t.centers[5] * U + t.output * U + 14}px` });
    const radii = [t.motor, ...v.slice(0, 4).map(g => t.radii[g]), t.output];
    const pick = i => { if (gated) return; if (sel === null) { sel = i; paint(ctx); return; } if (sel === i) { sel = null; paint(ctx); return; } const a = sel; sel = null; swapTo(ctx, a, i, v); };
    radii.forEach((r, k) => {
      const y = top + t.centers[k] * U, d = r * 2 * U * 1.16, file = k === 0 ? 'medium' : k === 5 ? 'small' : files[v[k - 1]];
      const spin = run >= k ? (k % 2 ? ' ccw' : ' cw') : '';
      const gear = img('ch5_s2_piece_gear_' + file, 'v5-gear' + spin + (k > 0 && k < 5 && v[k - 1] === 4 ? ' odd' : ''), { style: `width:${d}px;height:${d}px;top:${y - d / 2}px`, 'data-k': k > 0 && k < 5 ? 'g' + v[k - 1] : 'fix' + k });
      if (k === 0 || k === 5) { col.append(gear); return; }
      const i = k - 1;
      col.append(E('button', { type: 'button', disabled: gated, class: 'v5-gslot' + (sel === i ? ' picked' : '') + (ghost.includes(i) ? ' pulse' : ''), style: `top:${y - 24}px`, 'data-drag': i, 'data-drop': i,
        'aria-label': `الموضع ${i + 1}: ترس ${NM[v[i]]}${sel === i ? '، محدد' : ''}`, 'aria-pressed': sel === i, onclick: () => pick(i) }, E('b', { text: String(i + 1) })), gear);
    });
    gaps.forEach((g, k) => { if (g === 0) return; const y = top + (t.centers[k] + radii[k]) * U; col.append(E('i', { class: 'v5-gmark ' + (g > 0 ? 'gap' : 'over') + (at.hint >= 1 && k === 0 ? ' pulse' : ''), style: `top:${y - 9}px` })); });
    col.append(E('i', { class: 'v5-gtarget' + (run === 5 ? ' on' : ''), style: `top:${top + t.centers[5] * U - 14}px`, 'aria-hidden': 'true' }));
    const trayGear = v[4];
    const tray = E('button', { type: 'button', disabled: gated, class: 'v5-gtray' + (sel === 4 ? ' picked' : '') + (ghost.includes(4) ? ' pulse' : ''), 'data-drag': 4, 'data-drop': 4, 'aria-label': `الدرج: ترس ${NM[trayGear]}${sel === 4 ? '، محدد' : ''}`, onclick: () => pick(4) },
      img('ch5_s2_piece_gear_' + files[trayGear], 'v5-gtray-art' + (trayGear === 4 ? ' odd' : ''), { 'data-k': 'g' + trayGear, style: `width:${t.radii[trayGear] * 2 * U * 1.16}px` }), E('small', { text: 'الدرج' }));
    ctx.drop = (a, c) => swapTo(ctx, +a, +c, v);
    b.append(col, tray, E('p', { class: 'v5-legend' }, E('span', {}, E('i', { class: 'v5-gmark gap sm' }), ' فراغ'), E('span', {}, E('i', { class: 'v5-gmark over sm' }), ' تداخل'), E('span', { text: '↺ يدور الترس الأخير عكس الساعة' })));
  }

  // Volcano drums: three cylinders 0 closed → 1 side → 2 open → 0; a window shows the other drums each needs.
  const PORT = ['<rect x="7" y="7" width="26" height="26" rx="5"/>', '<rect x="7" y="7" width="26" height="26" rx="5" fill="none" stroke-width="3.5"/><path d="M7 12 Q7 7 12 7 H20 V33 H12 Q7 33 7 28Z"/>', '<rect x="7" y="7" width="26" height="26" rx="5" fill="none" stroke-width="3.5"/><circle cx="20" cy="20" r="6" fill="none" stroke-width="3"/>'];
  function paintDrums(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L0 = L(), nx = nextHint(ctx), TAG = ['أ', 'ب', 'ج', 'د', 'هـ'];
    const gated = toolGate(b, ctx, 'heatkey', 'أدخل مفتاح الحرارة في فتحة العزل ليبرد سطح الأقفال.');
    const ghost = nx ? diffIdx(v, nx) : [];
    const box = E('div', { class: 'v5-chest v5-drums' + (gated ? ' covered' : '') + (L0.solved(s, v) ? ' open' : '') });
    t.rules.forEach((rule, i) => {
      const can = L0.drumCan(t, v, i);
      const win = E('div', { class: 'v5-window ' + (can ? 'ok' : 'wait') + (at.hint >= 1 && i === t.rules.length - 1 ? ' pulse' : ''), 'aria-hidden': 'true', 'data-pk': 'w' + i });
      if (!rule.length) win.append(E('b', { class: 'v5-free', text: '✓' }));
      rule.forEach(([j, w]) => win.append(E('span', { class: 'v5-cond' + (v[j] === w ? ' met' : '') }, E('i', { text: TAG[j] }), svg(PORT[w], 'v5-port'))));
      box.append(E('div', { class: 'v5-lockrow' },
        E('button', { type: 'button', disabled: gated, class: 'v5-drum' + (can ? '' : ' blocked') + (ghost.includes(i) ? ' pulse' : ''), 'data-peek': i, 'aria-label': `الأسطوانة ${['العليا', 'الثانية', 'الثالثة', 'الرابعة'][i] || i + 1}: ${['مغلقة', 'جانبية', 'مفتوحة'][v[i]]}${can ? '' : '، محجوبة'}`,
          onclick: () => { const n = L0.drumMove(t, v, i); if (!n) { win.classList.remove('flash'); void win.offsetWidth; win.classList.add('flash'); try { sfx.bad(); } catch (er) {} return; } try { tone(260 + v[i] * 80, .12, 'triangle', .05); } catch (er) {} moved(ctx, n); } },
          E('i', { class: 'v5-dtag', text: TAG[i] }), img('ch5_s3_piece_lock_drum', 'v5-drum-art', { style: `transform:rotate(${v[i] * 90}deg)` }), svg(PORT[v[i]], 'v5-port big s' + v[i])), win));
    });
    ctx.peek = i => ['w' + i];
    b.append(box, E('p', { class: 'v5-legend' }, ...['مغلق', 'جانبي', 'مفتوح'].map((n, k) => E('span', {}, svg(PORT[k], 'v5-port sm s' + k), ' ' + n))));
  }

  // Shadow pass: two stones; pick one, then an arrow. A stone moves only with free cells ahead and behind.
  function paintPush(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L0 = L(), nx = nextHint(ctx), st = L0.stones(v);
    const gated = toolGate(b, ctx, 'lens', 'ضع عدسة المنارة لترى التجويفات ومجرى المكبس.');
    const grid = E('div', { class: 'v5-push' + (gated ? ' covered' : '') + (L0.solved(s, v) ? ' solved' : ''), style: `--n:${t.n}` });
    const at2 = (r, c) => st.findIndex(p => p[0] === r && p[1] === c), goals = L0.stones(t.goal);
    const nxt = nx ? L0.stones(nx) : null, hintStone = nxt ? st.findIndex(p => !nxt.some(q => q[0] === p[0] && q[1] === p[1])) : -1;
    // keep each stone's identity through the sorted encoding, so motion follows the stone that moved
    const prevSt = ctx.prev && ctx.prev.length === v.length ? L0.stones(ctx.prev) : null, idOf = p => { if (!prevSt) return p.join('-'); if (prevSt.some(q => q[0] === p[0] && q[1] === p[1])) return p.join('-'); const gone = prevSt.find(q => !st.some(w => w[0] === q[0] && w[1] === q[1])); return gone ? gone.join('-') : p.join('-'); };
    const push = (k, d) => { const n = L0.pushMove(t, v, k, d); if (!n) { say(ctx, 'يلزم فراغ أمام الحجر وفراغ خلفه ليصل المكبس.'); return; } sel = null; try { tone(200, .12, 'triangle', .05); } catch (er) {} moved(ctx, n); };
    for (let r = 0; r < t.n; r++) for (let c = 0; c < t.n; c++) {
      const wall = t.walls.some(w => w[0] === r && w[1] === c), goal = !gated && goals.some(p => p[0] === r && p[1] === c), k = at2(r, c);
      const cell = E(k >= 0 ? 'button' : 'div', { class: 'v5-pcell' + (wall ? ' wall' : '') + (goal ? ' goal' : '') });
      if (k >= 0) {
        cell.type = 'button'; cell.disabled = gated; cell.classList.add('stone'); if (sel === k) cell.classList.add('picked'); if (k === hintStone) cell.classList.add('pulse');
        cell.setAttribute('aria-label', `حجر في الصف ${r + 1} العمود ${c + 1}${sel === k ? '، محدد' : ''}`); cell.setAttribute('data-drag', k);
        cell.append(img('ch3_s2_piece_stone', 'v5-pstone', { 'data-k': 'st' + idOf([r, c]) }));
        cell.onclick = () => { sel = sel === k ? null : k; paint(ctx); };
      }
      grid.append(cell);
    }
    ctx.swipe = (k, d) => push(+k, d);
    if (sel !== null && sel < st.length && !gated) {
      const [r, c] = st[sel];
      [['↑', -1, 0, 'أعلى'], ['→', 0, 1, 'يمين'], ['↓', 1, 0, 'أسفل'], ['←', 0, -1, 'يسار']].forEach(([ar, dr, dc, nm], d) => {
        const n = L0.pushMove(t, v, sel, d), R = r + dr, C = c + dc;
        if (R < 0 || C < 0 || R >= t.n || C >= t.n) return;
        grid.append(E('button', { type: 'button', class: 'v5-parrow' + (n ? '' : ' no'), style: `left:${(C + .5) / t.n * 100}%;top:${(R + .5) / t.n * 100}%`, 'aria-label': `ادفع نحو ${nm}${n ? '' : '، لا يمكن'}`, onclick: () => push(sel, d) }, ar));
      });
    }
    b.append(grid, E('p', { class: 'v5-legend' }, E('span', {}, E('i', { class: 'v5-pkey goal' }), ' تجويف'), E('span', {}, E('i', { class: 'v5-pkey wall' }), ' صخر'), E('span', { text: 'اسحب الحجر أو اختره ثم سهمًا' })));
    if (at.hint >= 1 && !gated) say(ctx, 'المكبس يأتي من الخلف: انظر إلى الخانة المقابلة لاتجاه الدفع.');
  }

  // Moon crossing: draw every link once from the compass, without lifting the pen.
  function paintStroke(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L0 = L(), nx = nextHint(ctx);
    const gated = toolGate(b, ctx, 'compass', 'ضع البوصلة على اللوحة لتعرف أين يبدأ الرسم.');
    const pen = L0.strokeAt(t, v), W = 300, H = 300 * t.rows / t.cols, P = n => [(n % t.cols + .5) / t.cols * 100, (Math.floor(n / t.cols) + .5) / t.rows * 100];
    const used = new Set(v), nextEdge = nx ? nx[nx.length - 1] : -1, deg = {}, last = v[v.length - 1];
    t.edges.forEach(([a, c]) => { deg[a] = (deg[a] || 0) + 1; deg[c] = (deg[c] || 0) + 1; });
    let lines = '';
    t.edges.forEach(([a, c], e) => { const [x1, y1] = P(a), [x2, y2] = P(c); lines += `<line x1="${x1 * W / 100}" y1="${y1 * H / 100}" x2="${x2 * W / 100}" y2="${y2 * H / 100}" class="${used.has(e) ? 'on' : 'off'}${e === nextEdge ? ' hl' : ''}${e === last && ctx.prev && ctx.prev.length < v.length ? ' new' : ''}"/>`; });
    const board = E('div', { class: 'v5-stroke' + (gated ? ' covered' : '') + (L0.solved(s, v) ? ' solved' : ''), style: `aspect-ratio:${t.cols}/${t.rows};max-width:${t.cols * 84}px` });
    const sv = E('span', { class: 'v5-ssvg', 'aria-hidden': 'true' }); sv.innerHTML = `<svg viewBox="0 0 ${W} ${H}">${lines}</svg>`; board.append(sv);
    const stuck = !gated && !L0.solved(s, v) && !L0.nextStates(s, v).length;
    Object.keys(deg).map(Number).forEach(n => {
      const [x, y] = P(n), e = t.edges.findIndex(([a, c], k) => !used.has(k) && ((a === pen && c === n) || (c === pen && a === n)));
      board.append(E('button', { type: 'button', disabled: gated, class: 'v5-snode' + (n === pen ? ' pen' : '') + (e >= 0 ? ' near' : '') + (at.hint >= 1 && deg[n] % 2 === 1 && n !== t.pen ? ' pulse' : ''), style: `left:${x}%;top:${y}%`,
        'aria-label': `النجمة ${n + 1} ${n === pen ? '، القلم هنا' : e >= 0 ? '، يمكن الوصل إليها' : ''}`,
        onclick: () => { if (e < 0) { say(ctx, n === pen ? 'القلم هنا. المس نجمة متصلة به.' : 'لا وصلة متبقية بين القلم وهذه النجمة.'); return; } try { tone(600 + v.length * 20, .06, 'sine', .04); } catch (er) {} moved(ctx, L0.strokeDraw(t, v, e)); } },
        n === pen ? img('tool_compass', 'v5-spen', { 'data-k': 'pen' }) : E('i', { class: 'v5-sdot' })));
    });
    b.append(board);
    if (stuck) say(ctx, 'لا وصلة متبقية من هنا. تراجع خطوة أو ابدأ محاولة جديدة.');
  }

  // Oath platform (three pegs): tap a peg to lift its top ring, then tap the peg it goes to.
  function paintHanoi(b, ctx) {
    const { s, E } = ctx, v = ctx.work(), L0 = L(), nx = nextHint(ctx), n = v.length;
    const gated = toolGate(b, ctx, 'clapper', 'ركّب مطرقة الجرس في العربة لتصير ذراعًا تلتقط الحلقة العليا.');
    const dk = nx ? diffIdx(v, nx)[0] : -1, from = dk >= 0 ? v[dk] : -1, to = dk >= 0 ? nx[dk] : -1;
    const row = E('div', { class: 'v5-hanoi' + (gated ? ' covered' : '') + (L0.solved(s, v) ? ' solved' : '') });
    const go = (a, c) => { const m = L0.hanoiMove(v, a, c); sel = null; if (!m) { say(ctx, 'لا توضع حلقة فوق حلقة أصغر منها.'); paint(ctx); return; } try { tone(330 + c * 60, .1, 'triangle', .05); } catch (er) {} moved(ctx, m); };
    [0, 1, 2].forEach(p => {
      const discs = Array.from({ length: n }, (_, k) => n - 1 - k).filter(k => v[k] === p), top = L0.hanoiTop(v, p);
      const peg = E('button', { type: 'button', disabled: gated, class: 'v5-peg' + (sel === p ? ' picked' : '') + (p === from && sel === null ? ' pulse' : '') + (p === to && sel !== null ? ' pulse' : '') + (p === 2 ? ' goal' : ''), 'data-drag': p, 'data-drop': p,
        'aria-label': `العمود ${['الأيسر', 'الأوسط', 'الأيمن'][p]}: ${discs.length} حلقات${sel === p ? '، الحلقة العليا مرفوعة' : ''}`,
        onclick: () => { if (sel === null) { if (top < 0) return; sel = p; paint(ctx); return; } if (sel === p) { sel = null; paint(ctx); return; } go(sel, p); } }, E('i', { class: 'v5-rod' }));
      discs.forEach(k => peg.append(img('ch4_s2_piece_ring', 'v5-disc' + (sel === p && k === top ? ' up' : ''), { 'data-k': 'd' + k, style: `width:${46 + (k / Math.max(1, n - 1)) * 50}%` })));
      row.append(peg);
    });
    ctx.drop = (a, c) => go(+a, +c);
    b.append(row, E('p', { class: 'v5-legend' }, E('span', { text: 'الهدف: الحلقات كلها على العمود الأيمن · اسحب من عمود إلى آخر' })));
  }

  // Last sea: ferry Shibl, the fish and the bait; the boat carries Nawfal and one load at most.
  const BAIT = '<path d="M8 30 C8 18 20 22 20 12 C20 5 28 5 30 10" fill="none" stroke-width="5" stroke-linecap="round"/><circle cx="31" cy="11" r="3"/>';
  function paintRiver(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L0 = L(), nx = nextHint(ctx);
    const gated = toolGate(b, ctx, 'heatkey', 'أدخل مفتاح الحرارة في محرك الزورق ليعمل.');
    const art = (k, key) => k === 0 ? img('crew_shibl', 'v5-cargo-art round', key ? { 'data-k': 'c0' } : {}) : k === 1 ? img('ch1_s2_piece_fish', 'v5-cargo-art', key ? { 'data-k': 'c1' } : {}) : svg(BAIT, 'v5-cargo-art bait');
    const load = sel !== null && v[sel + 1] === v[0] ? sel : null;
    const hintItem = nx ? [0, 1, 2].find(k => nx[k + 1] !== v[k + 1]) : undefined;
    const bank = side => E('div', { class: 'v5-bank ' + (side ? 'right' : 'left') }, ...[0, 1, 2].filter(k => v[k + 1] === side && k !== load).map(k =>
      E('button', { type: 'button', disabled: gated || side !== v[0], class: 'v5-cargo' + (nx && hintItem === k ? ' pulse' : ''), 'data-drag': k, 'aria-label': `${t.items[k]}${side === v[0] ? '، المس لتحميله' : ''}`,
        onclick: () => { sel = k; paint(ctx); } }, art(k, true), E('small', { text: t.items[k] }))));
    const boat = E('div', { class: 'v5-ferry ' + (v[0] ? 'right' : 'left'), 'data-drop': 'boat', 'data-k': 'ferry' }, img('crew_nawfal', 'v5-ferry-man'), img('ch3_s1_piece_boat', 'v5-ferry-boat'),
      load !== null ? E('button', { type: 'button', class: 'v5-cargo onboard', 'aria-label': `${t.items[load]} في الزورق، المس لإنزاله`, onclick: () => { sel = null; paint(ctx); } }, art(load, true)) : null);
    const river = E('div', { class: 'v5-river' + (gated ? ' covered' : '') + (L0.solved(s, v) ? ' solved' : '') }, bank(0), E('div', { class: 'v5-water' }, boat), bank(1));
    const cross = () => {
      const n = L0.riverCross(t, v, load === null ? -1 : load); if (!n) return;
      if (!L0.riverSafe(t, n)) { const bad = t.clash.find(([a, c]) => n[a + 1] === n[c + 1] && n[a + 1] !== n[0]); say(ctx, `لا يمكن: سيبقى ${t.items[bad[0]]} مع ${t.items[bad[1]]} دون نوفل.`); return; }
      sel = null; try { tone(260, .2, 'sine', .05); } catch (er) {} moved(ctx, n);
    };
    const go = ctx.button(load !== null ? 'اعبر مع ' + t.items[load] : 'اعبر بالزورق فارغًا', cross, 'primary v5-cross' + (nx && hintItem === undefined ? ' pulse' : ''));
    go.disabled = gated; go.setAttribute('aria-label', 'عبور: ' + go.textContent);
    ctx.drop = (k, dst) => { if (dst === 'boat' && v[+k + 1] === v[0]) { sel = +k; paint(ctx); } };
    const clash = E('div', { class: 'v5-clash' + (at.hint >= 1 ? ' pulse' : '') }, ...t.clash.map(([a, c]) => E('span', {}, art(a), E('b', { text: '✕' }), art(c))));
    b.append(clash, river, go);
  }

  // Dawn channel: boats sail only forward; step into the gap or hop over one boat coming the other way.
  function paintFrogs(b, ctx) {
    const { s, E } = ctx, v = ctx.work(), L0 = L(), nx = nextHint(ctx), n = v.length;
    const hl = nx ? diffIdx(v, nx).find(i => v[i] !== 0) : -1;
    const row = E('div', { class: 'v5-frogs' + (L0.solved(s, v) ? ' solved' : ''), style: `--n:${n}` });
    const seen = { 1: 0, 2: 0 };
    v.forEach((p, i) => {
      if (!p) { row.append(E('i', { class: 'v5-fcell gap' })); return; }
      const id = p + '-' + (seen[p]++);
      row.append(E('button', { type: 'button', class: 'v5-fcell' + (L0.frogMove(v, i) ? ' can' : '') + (i === hl ? ' pulse' : ''), 'data-drag': i, 'aria-label': `زورق في الخانة ${i + 1} يتجه ${p === 1 ? 'شرقًا' : 'غربًا'}`,
        onclick: () => { const m = L0.frogMove(v, i); if (!m) { say(ctx, 'لا يتحرك هذا الزورق الآن: أمامه زورق من اتجاهه أو لا فراغ قريب.'); return; } try { tone(p === 1 ? 500 : 420, .07, 'sine', .04); } catch (er) {} moved(ctx, m); } },
        img('ch3_s1_piece_boat', 'v5-fboat' + (p === 2 ? ' west' : ''), { 'data-k': 'b' + id }), E('i', { class: 'v5-fdir', text: p === 1 ? '→' : '←' })));
    });
    ctx.swipe = i => { const m = L0.frogMove(v, +i); if (m) moved(ctx, m); };
    const goal = E('div', { class: 'v5-frogs goal', 'aria-hidden': 'true', style: `--n:${n}` }, ...L0.frogGoal(s.target).map(p => p ? E('i', { class: 'v5-fcell mini' }, img('ch3_s1_piece_boat', 'v5-fboat' + (p === 2 ? ' west' : ''))) : E('i', { class: 'v5-fcell mini gap' })));
    b.append(row, E('figure', { class: 'v5-fgoal' }, goal, E('figcaption', { text: 'الهدف' })));
  }

  // Final door: seven seals on a fixed light channel; every secret must hold at once.
  const SEALS = ['ch1_seal_coral', 'ch2_seal_echo', 'ch3_seal_oasis', 'ch4_seal_crystal', 'ch5_seal_wind', 'ch6_seal_moon', 'ch7_seal_dawn'];
  const SEALN = ['المرجان', 'الصدى', 'الواحة', 'البلور', 'الرياح', 'القمر', 'الفجر'];
  function paintPath(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic, nx = nextHint(ctx);
    const ghost = nx ? diffIdx(v, nx) : [];
    const solved = L.solved(s, v), C = (r, c) => [(c - .5) * 25, (r - .5) * 25];
    const pts = [[4, 0], ...t.slots.slice(0, 4), t.bend, ...t.slots.slice(4), [2, 5]].map(([r, c]) => C(r, c).map(n => n * 3).join(' ')).join(' L');
    const grid = E('div', { class: 'v5-door' + (solved ? ' solved' : '') });
    const sv = E('span', { class: 'v5-dsvg', 'aria-hidden': 'true' }); sv.innerHTML = `<svg viewBox="0 0 300 300"><path class="chan" d="M${pts}"/><path class="beam" d="M${pts}"/></svg>`; grid.append(sv);
    for (let r = 1; r <= 4; r++) for (let c = 1; c <= 4; c++) {
      const k = t.slots.findIndex(p => p[0] === r && p[1] === c), bend = t.bend[0] === r && t.bend[1] === c;
      if (k < 0) { grid.append(E('i', { class: 'v5-dcell' + (bend ? ' bend' : ' rock'), style: `grid-row:${r};grid-column:${c}` })); continue; }
      grid.append(E('button', { type: 'button', class: 'v5-dcell slot' + (sel === k ? ' picked' : '') + (ghost.includes(k) ? ' pulse' : ''), style: `grid-row:${r};grid-column:${c}`, 'data-drag': k, 'data-drop': k,
        'aria-label': `تجويف ${k + 1}: ختم ${SEALN[v[k]]}${sel === k ? '، محدد' : ''}`, 'aria-pressed': sel === k,
        onclick: () => { say(ctx, ''); pickSwap(ctx, k, v); } }, img(SEALS[v[k]], 'v5-dseal', { 'data-k': 'seal' + v[k] })));
    }
    grid.append(E('i', { class: 'v5-dio in', 'aria-hidden': 'true' }), E('i', { class: 'v5-dio out', 'aria-hidden': 'true' }));
    const CARD = [['→', 0], [0, '→', 1], ['→', 2, '↰'], [3, 2], ['→', 4, '→'], [5, 2], [6, '▮']];
    const cards = E('div', { class: 'v5-dcards' + (at.hint >= 1 ? ' hl' : '') }, ...TreasureData.SECRETS5.map((Q, k) => E('figure', { class: k === 3 ? 'col' : '' },
      E('div', {}, ...CARD[k].map(p => typeof p === 'number' ? img(SEALS[p], 'v5-dcard-art') : E('b', { text: p }))), E('figcaption', { text: Q.title + ': ' + Q.mark }))));
    ctx.drop = (a, c) => swapTo(ctx, +a, +c, v);
    b.append(grid, ctx.button('افحص الباب', () => { if (L.solved(s, v)) return; say(ctx, 'لم يستيقظ الطريق بعد. راجع الأسرار السبعة؛ يجب أن تصدق كلها معًا.'); }, 'v5-check'), cards);
  }

  root.TreasureBoards = { render, v5state, chal, attempt, ART };
})(typeof window === 'undefined' ? globalThis : window);
