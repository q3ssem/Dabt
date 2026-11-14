'use strict';
/* Treasure Island 5.0 · Sea 1 (بحر المرجان) — puzzle boards, three challenges, tools and visual hints.
   Rules and answers live in data.js / logic.js; this file only draws and records attempts. */
(function (root) {
  const $ = q => DX.$(q), later = (f, ms) => root.__T7_SYNC ? f() : setTimeout(f, ms);
  const ART = 'treasure/art/sea1/';
  const CH = ['الحل', 'أقل حركات', 'بدون تلميح'];

  function v5state(x) {
    const v = x.v5 || (x.v5 = {});
    for (const k of ['ch', 'att', 'tools']) if (!v[k] || typeof v[k] !== 'object' || Array.isArray(v[k])) v[k] = {};
    return v;
  }
  function chal(x, id) { const v = v5state(x); return v.ch[id] || (v.ch[id] = [false, false, false]); }
  function firstOpen(x, id, done) { const c = chal(x, id); if (!done) return 0; const i = c.findIndex((d, k) => !d && (k === 0 || c[k - 1])); return i < 0 ? 0 : i; }
  function attempt(x, s, done) {
    const v = v5state(x);
    if (!v.att[s.id] || ![0, 1, 2].includes(v.att[s.id].c)) v.att[s.id] = { c: firstOpen(x, s.id, done), moves: 0, hint: 0, tool: !s.needs };
    return v.att[s.id];
  }
  function solution(s) { let v = TreasureLogic.initial(s), n = 0; while (!TreasureLogic.solved(s, v) && n++ < 40) v = TreasureLogic.assist(s, v); return v; }
  function img(name, cls = '', extra = {}) { return DX.el('img', { src: ART + name + '.webp', alt: '', class: cls, draggable: 'false', ...extra }); }

  /* ctx: {s, x, done, E, button, A, save, work(), setWork(v), onFirstWin(), map(), notebook(), rerender()} */
  function render(host, ctx) {
    const { s, x, E, button } = ctx;
    const at = attempt(x, s, ctx.done());
    const c = chal(x, s.id);
    host.innerHTML = '';
    host.dataset.kind = s.kind;

    // Challenge chips
    const chips = E('div', { class: 'v5-chips', role: 'tablist' });
    CH.forEach((name, k) => {
      const open = k === 0 || (ctx.done() && c[k - 1]);
      chips.append(E('button', {
        type: 'button', class: 'v5-chip' + (at.c === k ? ' on' : '') + (c[k] ? ' won' : ''), disabled: !open, role: 'tab', 'aria-selected': at.c === k,
        'aria-label': `التحدي ${k + 1}: ${name}${c[k] ? '، مكتمل' : open ? '' : '، مقفل'}`,
        onclick: () => { if (at.c !== k) startAttempt(ctx, k); }
      }, E('span', { class: 'v5-star', text: c[k] ? '★' : '☆' }), E('b', { text: name })));
    });
    const limit = at.c === 1 ? s.target.min : null;
    const counter = E('div', { class: 'v5-counter' },
      E('span', { text: 'الحركات' }), E('b', { id: 'v5-moves', text: String(at.moves) }),
      limit ? E('small', { text: '/ ' + limit }) : null,
      at.c === 2 ? E('small', { class: 'v5-nohint', text: at.hint ? 'استُعمل تلميح' : 'بلا تلميح' }) : null);
    host.append(E('div', { class: 'v5-head' }, chips, counter), E('p', { class: 'v5-goal', text: s.goal }));

    const board = E('div', { class: 'v5-board v5-' + s.kind, id: 'v5-board' });
    host.append(board);
    const hintBox = E('div', { class: 'v5-hint', id: 'v5-hint', role: 'status', 'aria-live': 'polite' });
    host.append(hintBox);
    if (at.hint) showHint(ctx, hintBox, at.hint, false);

    const bar = E('div', { class: 'v5-bar' },
      button(at.hint >= 2 ? 'التلميحان معروضان' : at.hint ? 'التلميح الثاني' : 'تلميح', () => useHint(ctx), 'v5-hintbtn'),
      button('محاولة جديدة', () => startAttempt(ctx, at.c)),
      button('دفتر الرحلة', () => ctx.notebook()),
      button('الخريطة', () => ctx.map()));
    if (at.hint >= 2) bar.firstChild.disabled = true;
    host.append(bar);

    paint(ctx);
  }

  function startAttempt(ctx, k) {
    const { s, x } = ctx;
    v5state(x).att[s.id] = { c: k, moves: 0, hint: 0, tool: !s.needs };
    ctx.setWork(TreasureLogic.initial(s));
    ctx.save();
    ctx.rerender();
  }

  function useHint(ctx) {
    const { s, x } = ctx, at = attempt(x, s, ctx.done());
    if (at.hint >= 2) return;
    at.hint++;
    x.hints[s.id] = (x.hints[s.id] || 0) + 1;
    ctx.save();
    ctx.rerender();
  }

  function showHint(ctx, box, level) {
    const { s, E } = ctx;
    box.innerHTML = '';
    box.append(E('b', { text: level === 1 ? 'التلميح الأول' : 'التلميح الثاني' }), E('p', { text: s.hints[0] }));
    if (level >= 2) box.append(E('p', { text: s.hints[1] }));
    box.classList.add('on');
  }

  function moved(ctx, next) {
    const { s, x } = ctx, at = attempt(x, s, ctx.done());
    ctx.setWork(next);
    at.moves++;
    x.moves[s.id] = (x.moves[s.id] || 0) + 1;
    ctx.save();
    const m = $('#v5-moves');
    if (m) { m.textContent = String(at.moves); m.parentElement.classList.toggle('over', at.c === 1 && at.moves > s.target.min); }
    paint(ctx);
    if (TreasureLogic.solved(s, next)) later(() => solvedNow(ctx), 650);
    else if (at.c === 1 && at.moves === s.target.min + 1) say(ctx, 'تجاوزت الحد الأدنى. يمكنك إكمال الحل، أو بدء محاولة جديدة لنيل نجمة هذا التحدي.');
  }

  function say(ctx, t) { const f = $('#v5-say'); if (f) { f.textContent = t; f.classList.add('on'); } }

  function solvedNow(ctx) {
    const { s, x, E, button } = ctx, at = attempt(x, s, ctx.done()), c = chal(x, s.id);
    const firstWin = !ctx.done();
    const earned = at.c === 0 || (at.c === 1 && at.moves <= s.target.min) || (at.c === 2 && !at.hint);
    if (earned) c[at.c] = true;
    if (at.c === 0) c[0] = true;
    ctx.save();
    if (firstWin) return ctx.onFirstWin({ moves: at.moves, hints: at.hint });
    const host = $('#v5-board');
    if (!host) return;
    const why = earned ? (at.c === 0 ? 'أعدت حل اللغز.' : at.c === 1 ? `نجمة «أقل حركات»: ${at.moves} حركات.` : 'نجمة «بدون تلميح».')
      : at.c === 1 ? `حللته في ${at.moves} حركة؛ الحد ${s.target.min}. حاول من جديد.` : 'استعملت تلميحًا في هذه المحاولة؛ حاول من جديد دون تلميح.';
    const next = c.findIndex((d, k) => !d && (k === 0 || c[k - 1]));
    host.append(E('div', { class: 'v5-done' }, E('b', { text: earned ? '★ تحقق التحدي' : 'انحل اللغز' }), E('p', { text: why }),
      E('div', { class: 'v5-bar' }, next >= 0 ? button('التحدي التالي: ' + CH[next], () => startAttempt(ctx, next), 'primary') : null,
        button('محاولة جديدة', () => startAttempt(ctx, at.c)), button('الخريطة', () => ctx.map()))));
  }

  /* ---------- painters ---------- */
  function paint(ctx) {
    const b = $('#v5-board');
    if (!b) return;
    b.innerHTML = '';
    b.append(ctx.E('p', { id: 'v5-say', class: 'v5-say', role: 'status', 'aria-live': 'polite' }));
    ({ locks: paintLocks, cipher: paintCipher, mirrors: paintMirrors })[ctx.s.kind](b, ctx);
  }

  function toolGate(b, ctx, tool, label) {
    const { s, x, E } = ctx, at = attempt(x, s, ctx.done()), T = TreasureData.SEA1_TOOLS[tool];
    if (at.tool) return false;
    const has = !!v5state(x).tools[tool];
    b.append(E('div', { class: 'v5-gate' }, img(T.art, 'v5-gate-art'), E('p', { text: has ? label : 'تحتاج ' + T.name + ' من ' + T.from + ' أولًا.' }),
      ctx.button(has ? 'ضع ' + T.name : 'غير متاحة', () => {
        if (!has) return;
        at.tool = true; v5state(x).tools[tool] = 'used'; ctx.save(); paint(ctx);
      }, 'primary')));
    return true;
  }

  // Locks: four sliders; a window beside each shows which other locks must be out/in before it can move.
  function paintLocks(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), L = TreasureLogic, at = attempt(ctx.x, s, ctx.done());
    const box = E('div', { class: 'v5-chest' });
    t.rules.forEach((rule, i) => {
      const can = L.locksCan(t, v, i);
      const win = E('div', { class: 'v5-window ' + (can ? 'ok' : 'wait'), id: 'v5-win-' + i, 'aria-hidden': 'true' });
      for (let r = 0; r < t.rules.length; r++) {
        const need = rule.find(([j]) => j === r);
        const line = E('i', { class: 'v5-mini' + (r === i ? ' self' : '') + (need ? ' need' : '') });
        if (need) line.append(E('u', { class: 'v5-mini-knob ' + (need[1] ? 'out' : 'in') + (v[r] === need[1] ? ' met' : '') }));
        if (r === i) line.append(E('u', { class: 'v5-mini-self' }));
        win.append(line);
      }
      if (at.hint >= 1 && rule.some(([, w]) => w === 0)) win.classList.add('pulse');
      const slider = E('button', {
        type: 'button', class: 'v5-track' + (v[i] ? ' out' : '') + (can ? '' : ' blocked') + (at.hint >= 2 && i < 2 ? ' pulse' : ''),
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
  let picked = null;
  function paintCipher(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done());
    const name = { shell: 'صدفة', anchor: 'مرساة', fish: 'سمكة', sail: 'شراع' }, pos = ['أعلى', 'يمين', 'أسفل', 'يسار'];
    const clues = E('div', { class: 'v5-clues' },
      E('figure', {}, E('div', { class: 'v5-c1' }, img('tool_compass', 'v5-c1-compass'), img('ch1_s2_piece_shell', 'v5-c1-shell')), E('figcaption', { text: 'الصدفة عند طرف الشمال' })),
      E('figure', {}, E('div', { class: 'v5-c2' }, E('i', { class: 'v5-ring' }), E('i', { class: 'v5-diam' }), img('ch1_s2_piece_anchor', 'v5-c2-a'), img('ch1_s2_piece_sail', 'v5-c2-b')), E('figcaption', { text: 'المرساة تقابل الشراع' })),
      E('figure', {}, E('div', { class: 'v5-c3' }, E('i', { class: 'v5-ring' }), img('ch1_s2_piece_anchor', 'v5-c3-a'), img('ch1_s2_piece_fish', 'v5-c3-f'), E('i', { class: 'v5-arc' })), E('figcaption', { text: 'السمكة بعد المرساة مع عقارب الساعة' })));
    const ring = E('div', { class: 'v5-cring' });
    const gated = toolGate(b, ctx, 'compass', 'ضع البوصلة في تجويفها لتعرف أين الشمال.');
    v.forEach((sym, p) => {
      const ghost = at.hint >= 2 && ((p === 3 && sym !== 0) || (p === 0 && sym !== 1));
      ring.append(E('button', {
        type: 'button', class: 'v5-socket p' + p + (picked === p ? ' picked' : '') + (at.hint >= 1 && p === 3 ? ' pulse' : ''), disabled: gated,
        'aria-label': `${pos[p]}: ${name[t.symbols[sym]]}${picked === p ? '، محدد' : ''}`, 'aria-pressed': picked === p,
        onclick: () => {
          if (picked === null) { picked = p; paint(ctx); return; }
          if (picked === p) { picked = null; paint(ctx); return; }
          const n = v.slice();[n[picked], n[p]] = [n[p], n[picked]]; picked = null;
          try { tone(520, .07, 'sine', .05); } catch (e) {}
          moved(ctx, n);
        }
      }, img('ch1_s2_piece_' + t.symbols[sym], 'v5-sym'), ghost ? img('ch1_s2_piece_' + (p === 3 ? 'shell' : 'anchor'), 'v5-ghost') : null));
    });
    ring.append(E('div', { class: 'v5-cslot' + (at.tool ? ' set' : '') + (at.hint >= 1 ? ' pulse' : '') }, at.tool ? img('tool_compass', 'v5-needle') : null));
    b.append(clues, ring);
    if (TreasureLogic.solved(s, v)) ring.classList.add('solved');
  }

  // Mirrors: 5×5 board, source left of row 4, lens at row 5 col 1; tap a mirror to turn it a quarter.
  function paintMirrors(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic;
    const gated = toolGate(b, ctx, 'key', 'ضع المفتاح لفتح غطاء آلة الضوء.');
    const tr = at.tool ? L.mirrorTrace(t, v) : { path: [], hit: false };
    const ghost = at.hint >= 2 ? L.mirrorTrace(t, solution(s)) : null;
    const grid = E('div', { class: 'v5-grid' + (gated ? ' covered' : '') + (tr.hit ? ' lit' : ''), style: `--n:${t.n}` });
    const side = (dr, dc) => dr === -1 ? 't' : dr === 1 ? 'b' : dc === -1 ? 'l' : 'r';
    const back = (dr, dc) => side(-dr, -dc);
    const segs = (trace, cls) => { const m = new Map(); trace.path.slice(1).forEach(p => { const k = p[0] + ',' + p[1]; const a = m.get(k) || []; a.push(back(p[2], p[3])); if (p.length > 4) a.push(side(p[4], p[5])); m.set(k, a); }); return m; };
    const beam = segs(tr), ghostSeg = ghost ? segs(ghost) : new Map();
    for (let r = 1; r <= t.n; r++) for (let c = 1; c <= t.n; c++) {
      const m = t.mirrors.findIndex(p => p[0] === r && p[1] === c), lens = r === t.lens[0] && c === t.lens[1];
      const cell = E(m >= 0 ? 'button' : 'div', { class: 'v5-cell' + (m >= 0 ? ' mirror' : '') + (lens ? ' lens' : '') });
      (ghostSeg.get(r + ',' + c) || []).forEach(sd => cell.append(E('i', { class: 'v5-ray ghost ' + sd })));
      (beam.get(r + ',' + c) || []).forEach(sd => cell.append(E('i', { class: 'v5-ray ' + sd })));
      if (m >= 0) {
        cell.type = 'button'; cell.disabled = gated;
        cell.setAttribute('aria-label', `مرآة في الصف ${r} العمود ${c}: ${v[m] ? 'مائلة إلى اليمين' : 'مائلة إلى اليسار'}`);
        if (at.hint >= 1 && (m === 5 || m === 1)) cell.classList.add('pulse');
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

  root.TreasureSea1 = { render, v5state, chal, attempt, ART };
})(typeof window === 'undefined' ? globalThis : window);
