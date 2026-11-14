'use strict';
/* Treasure Island 5.0 · the 21 puzzle boards: three challenges, tool gates and visual hints.
   Rules and answers live in data.js / logic.js; this file only draws and records attempts. */
(function (root) {
  const $ = q => DX.$(q), later = (f, ms) => root.__T7_SYNC ? f() : setTimeout(f, ms);
  const ART = 'treasure/art/story5/';
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
    if (lastId !== s.id) { sel = null; picked = null; lastId = s.id; }

    // Challenge chips
    const chips = E('div', { class: 'v5-chips', role: 'tablist' });
    (s.challenges || CH).forEach((name, k) => {
      const open = k === 0 || (ctx.done() && c[k - 1]);
      chips.append(E('button', {
        type: 'button', class: 'v5-chip' + (at.c === k ? ' on' : '') + (c[k] ? ' won' : ''), disabled: !open, role: 'tab', 'aria-selected': at.c === k,
        'aria-label': `التحدي ${k + 1}: ${name}${c[k] ? '، مكتمل' : open ? '' : '، مقفل'}`,
        onclick: () => { if (at.c !== k) startAttempt(ctx, k); }
      }, E('span', { class: 'v5-star', text: c[k] ? '★' : '☆' }), E('b', { text: name })));
    });
    const limit = s.kind === 'tide' ? s.target.budget : at.c === 1 && s.kind !== 'weigh' ? s.target.min : null;
    const counter = E('div', { class: 'v5-counter' },
      E('span', { text: s.kind === 'weigh' ? 'الوزنات' : s.kind === 'chime' ? 'الضربات' : s.kind === 'tide' ? 'الأفعال' : s.kind === 'river' ? 'العبور' : s.kind === 'slide' ? 'الانزلاقات' : ['scales', 'gearfit', 'path'].includes(s.kind) ? 'التبديلات' : 'الحركات' }), E('b', { id: 'v5-moves', text: String(at.moves) }),
      limit ? E('small', { text: '/ ' + limit }) : null,
      at.c === 2 ? E('small', { class: 'v5-nohint', text: at.hint ? 'استُعمل تلميح' : 'بلا تلميح' }) : null);
    host.append(E('div', { class: 'v5-head' }, chips, counter), E('p', { class: 'v5-goal', text: s.goal }));

    const board = E('div', { class: 'v5-board v5-k-' + s.kind, id: 'v5-board' });
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
    v5state(x).att[s.id] = { c: k, moves: 0, hint: 0, tool: !s.needs, wrong: 0 };
    sel = null;
    const w = TreasureLogic.initial(s);
    if (s.random && s.kind === 'weigh') w[0] = Math.floor(Math.random() * 9);
    ctx.setWork(w);
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

  function free(ctx, next) { ctx.setWork(next); ctx.save(); paint(ctx); }
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
    else if (s.kind === 'tide' && at.moves >= s.target.budget) { say(ctx, 'انتهت الأفعال الثمانية قبل الوصول. ابدأ محاولة جديدة.'); }
    else if (at.c === 1 && s.kind !== 'weigh' && at.moves === s.target.min + 1) say(ctx, 'تجاوزت الحد الأدنى. يمكنك إكمال الحل، أو بدء محاولة جديدة لنيل نجمة هذا التحدي.');
  }

  function say(ctx, t) { const f = $('#v5-say'); if (f) { f.textContent = t; f.classList.add('on'); } }

  function solvedNow(ctx) {
    const { s, x, E, button } = ctx, at = attempt(x, s, ctx.done()), c = chal(x, s.id);
    const firstWin = !ctx.done();
    const earned = at.c === 0 || (at.c === 1 && (s.kind === 'weigh' ? !at.wrong : at.moves <= s.target.min)) || (at.c === 2 && !at.hint);
    if (earned) c[at.c] = true;
    if (at.c === 0) c[0] = true;
    ctx.save();
    if (firstWin) return ctx.onFirstWin({ moves: at.moves, hints: at.hint });
    const host = $('#v5-board');
    if (!host) return;
    const why = earned ? (at.c === 0 ? 'أعدت حل اللغز.' : at.c === 1 ? `نجمة «أقل حركات»: ${at.moves} حركات.` : 'نجمة «بدون تلميح».')
      : at.c === 1 ? (s.kind === 'weigh' ? 'اخترت حجرًا خاطئًا في هذه المحاولة؛ حاول من جديد.' : `حللته في ${at.moves} حركة؛ الحد ${s.target.min}. حاول من جديد.`) : 'استعملت تلميحًا في هذه المحاولة؛ حاول من جديد دون تلميح.';
    const next = c.findIndex((d, k) => !d && (k === 0 || c[k - 1]));
    host.append(E('div', { class: 'v5-done' }, E('b', { text: earned ? '★ تحقق التحدي' : 'انحل اللغز' }), E('p', { text: why }),
      E('div', { class: 'v5-bar' }, next >= 0 ? button('التحدي التالي: ' + (s.challenges || CH)[next], () => startAttempt(ctx, next), 'primary') : null,
        button('محاولة جديدة', () => startAttempt(ctx, at.c)), button('الخريطة', () => ctx.map()))));
  }

  /* ---------- painters ---------- */
  function paint(ctx) {
    const b = $('#v5-board');
    if (!b) return;
    b.innerHTML = '';
    b.append(ctx.E('p', { id: 'v5-say', class: 'v5-say', role: 'status', 'aria-live': 'polite' }));
    ({ locks: paintLocks, cipher: paintCipher, mirrors: paintMirrors, torn: paintTorn, chime: paintChime, linked: paintLinked, tide: paintTide, weigh: paintWeigh, valves: paintValves, slide: paintSlide, lights: paintLights, scales: paintScales, ropes: paintRopes, gearfit: paintGearfit, drums: paintDrums, push: paintPush, stroke: paintStroke, hanoi: paintHanoi, river: paintRiver, frogs: paintFrogs, path: paintPath })[ctx.s.kind](b, ctx);
  }

  function toolGate(b, ctx, tool, label) {
    const { s, x, E } = ctx, at = attempt(x, s, ctx.done());
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
        ctx.save(); paint(ctx);
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
  let picked = null, sel = null, lastId = null;
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
      const frag = E('button', { type: 'button', class: 'v5-frag' + (sel === pos ? ' picked' : '') + (at.hint >= 2 && piece === 0 ? ' pulse' : '') + (at.hint >= 2 && pos === 0 && piece !== 0 ? ' pulse' : ''),
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
    b.append(grid);
  }

  // Bells: fit the clapper, strike four bells; the strip is checked after the fourth strike.
  function paintChime(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic;
    const badge = (i, cls = 'v5-badge') => svg(BADGE[t.badges[i]], cls);
    const clues = E('div', { class: 'v5-clues v5-bclues' },
      E('figure', {}, E('div', { class: 'v5-pair' + (at.hint >= 1 ? ' pulse' : '') }, badge(0), E('b', { text: '→' }), badge(2)), E('figcaption', { text: 'الدائرة ثم المعين مباشرة' })),
      E('figure', {}, E('div', { class: 'v5-slots4' }, ...[0, 1, 2, 3].map(k => E('i', { class: k === 0 || k === 3 ? 'no' : (at.hint >= 1 ? 'pulse' : '') }, k === 0 || k === 3 ? badge(3, 'v5-badge sm') : null))), E('figcaption', { text: 'الموجة ليست أولًا ولا أخيرًا' })),
      E('figure', {}, E('div', { class: 'v5-time' }, E('i', { class: 'v5-start' }), badge(1), E('b', { text: '…→' }), badge(3)), E('figcaption', { text: 'المثلث قبل الموجة' })));
    const gated = toolGate(b, ctx, 'clapper', 'ركّب المطرقة في الجرس الناقص لتعود الأجراس إلى العمل.');
    const strip = E('div', { class: 'v5-strip' + (v.length === 0 && at.moves > 0 && at.moves % 4 === 0 && !L.solved(s, v) ? ' shake' : '') });
    for (let k = 0; k < 4; k++) {
      const slot = E('i', { class: 'v5-slot' });
      if (v[k] !== undefined) slot.append(badge(v[k]));
      else if (at.hint >= 2 && k < 2) slot.append(badge([1, 3][k], 'v5-badge ghost'));
      strip.append(slot);
    }
    const row = E('div', { class: 'v5-bells' });
    t.badges.forEach((name, i) => row.append(E('button', {
      type: 'button', class: 'v5-bell' + (v.includes(i) ? ' used' : ''), disabled: gated || v.includes(i),
      'aria-label': `جرس ${['الدائرة', 'المثلث', 'المعين', 'الموجة'][i]}`,
      onclick: () => {
        const n = L.chimeStrike(t, v, i); if (!n) return;
        try { tone([523, 659, 784, 988][i], .3, 'sine', .06); } catch (er) {}
        if (n.length === 0) { say(ctx, 'ليس هذا النداء. تبقى الضربات محسوبة؛ أعد الترتيب من البداية.'); }
        moved(ctx, n);
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
        E('button', { type: 'button', disabled: gated, class: 'v5-base' + (sel === i ? ' picked' : '') + (turning.includes(i) ? ' turning' : '') + (at.hint >= 1 && i === 0 ? ' pulse' : '') + (v[i] === t.goal[i] ? ' match' : ''),
          'aria-label': `تمثال ${['الأيسر', 'الأوسط', 'الأيمن'][i]}${sel === i ? '، المس مرة ثانية للتدوير' : ''}`,
          onclick: () => {
            if (sel !== i) { sel = i; paint(ctx); return; }
            try { tone(180 + i * 40, .25, 'triangle', .05); } catch (er) {}
            moved(ctx, L.linkedTurn(t, v, i));
          } }, bird),
        E('div', { class: 'v5-goalshadow' }, goal)));
    });
    if (!gated) { row.append(E('i', { class: 'v5-rope r1' }), E('i', { class: 'v5-rope r2' })); }
    const key = E('div', { class: 'v5-linkkey' + (at.hint >= 2 ? ' pulse' : '') }, E('span', {}, '◉◉○'), E('span', {}, '○◉◉'), E('span', {}, '○○◉'));
    b.append(row, key);
  }

  // Tide: tap a neighbouring station to cross an open channel, or pull the tide lever; eight actions at most.
  function paintTide(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic;
    const out = at.moves >= t.budget && !L.solved(s, v);
    const W = 300, H = 400, P = n => [(t.nodes[n][1] - .5) * 100, (t.nodes[n][0] - .5) * 100];
    const hl = at.hint >= 2 ? [[0, 1], [1, 3], [3, 4]] : at.hint >= 1 ? [[3, 4], [4, 5]] : [];
    let lines = '';
    t.edges.forEach(([a, c, lv]) => {
      const [x1, y1] = P(a), [x2, y2] = P(c), open = lv === v[1], mid = [(x1 + x2) / 2, (y1 + y2) / 2], h = hl.some(([p, q]) => (p === a && q === c) || (p === c && q === a));
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="ch ${open ? 'open' : 'shut'} ${lv ? 'hi' : 'lo'}${h ? ' hl' : ''}"/>` +
        `<g transform="translate(${mid[0]} ${mid[1]})" class="tag ${lv ? 'hi' : 'lo'}"><circle r="13"/><path d="M-8 ${lv ? -3 : 4} q4 -5 8 0 t8 0" /><rect x="-8" y="${lv ? 4 : -7}" width="16" height="3" rx="1"/></g>`;
    });
    const map = E('div', { class: 'v5-tide ' + (v[1] ? 'high' : 'low') + (out ? ' out' : '') });
    const svgEl = E('span', { class: 'v5-tide-svg', 'aria-hidden': 'true' }); svgEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}">${lines}</svg>`;
    map.append(svgEl);
    t.nodes.forEach((n, i) => {
      const [x, y] = P(i), here = v[0] === i, near = !here && L.tideOpen(t, v[0], i, v[1]);
      map.append(E('button', { type: 'button', class: 'v5-node' + (here ? ' here' : '') + (near ? ' near' : '') + (i === t.goal[0] ? ' goal' : '') + (i === t.start[0] ? ' start' : ''),
        style: `left:${x / W * 100}%;top:${y / H * 100}%`, disabled: out || here || gated(), 'aria-label': `${t.names[i]}${here ? '، الزورق هنا' : near ? '، قناة مفتوحة' : ''}`,
        onclick: () => {
          if (!L.tideOpen(t, v[0], i, v[1])) { say(ctx, 'لا قناة مفتوحة بين المحطتين الآن.'); return; }
          try { tone(392, .08, 'sine', .04); } catch (er) {}
          moved(ctx, [i, v[1]]);
        } }, here ? img('ch3_s1_piece_boat', 'v5-boat') : E('i', { class: 'v5-dot' }), E('small', { text: t.names[i] })));
    });
    function gated() { return false; }
    const pips = E('div', { class: 'v5-pips', 'aria-label': `الأفعال المستعملة ${at.moves} من ${t.budget}` });
    for (let k = 0; k < t.budget; k++) pips.append(E('i', { class: k < at.moves ? 'used' : '' }));
    const lever = E('button', { type: 'button', class: 'v5-lever ' + (v[1] ? 'high' : 'low') + (at.hint >= 2 ? ' pulse' : ''), disabled: out,
      'aria-label': `ذراع المد: ${v[1] ? 'مد' : 'جزر'}، المس للتبديل`,
      onclick: () => { try { tone(v[1] ? 300 : 360, .2, 'triangle', .05); } catch (er) {} moved(ctx, [v[0], 1 - v[1]]); } },
      img('ch3_s1_piece_tide_lever', 'v5-lever-art'), E('b', { text: v[1] ? 'مد' : 'جزر' }));
    const legend = E('div', { class: 'v5-tkey' },
      E('span', {}, svg('<circle cx="20" cy="20" r="16" class="lo"/><path d="M12 24 q4 -5 8 0 t8 0" fill="none" stroke-width="3"/><rect x="12" y="13" width="16" height="3"/>', 'v5-tkeyic lo'), ' تفتح في الجزر'),
      E('span', {}, svg('<circle cx="20" cy="20" r="16" class="hi"/><path d="M12 17 q4 -5 8 0 t8 0" fill="none" stroke-width="3"/><rect x="12" y="24" width="16" height="3"/>', 'v5-tkeyic hi'), ' تفتح في المد'));
    b.append(E('div', { class: 'v5-tide-top' }, lever, pips), map, legend);
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
        holds.append(i === undefined ? E('i', { class: 'v5-hold' }) : E('button', { type: 'button', class: 'v5-stone on-pan', 'aria-label': `حجر ${i + 1} في الكفة ${side === 1 ? 'اليسرى' : 'اليمنى'}`, disabled: gated || o.stage === 3, onclick: () => tap(i) }, img('ch3_s2_piece_stone', 'v5-st')));
      }
      p.append(holds); return p;
    };
    const bal = E('div', { class: 'v5-bal', style: `--tilt:${tilt}deg` }, img('ch3_s2_piece_balance_stand', 'v5-stand'), E('div', { class: 'v5-beam' }, img('ch3_s2_piece_balance_beam', 'v5-beam-art')), pan(1), pan(2));
    const tray = E('div', { class: 'v5-tray' });
    o.p.forEach((x, i) => {
      const deduced = o.stage === 2;
      tray.append(x === 1 || x === 2 ? E('i', { class: 'v5-hold empty' }) : E('button', { type: 'button', class: 'v5-stone' + (x === 3 ? ' out' : '') + (at.hint >= 2 && o.stage === 0 && i < 6 ? ' pulse' : ''),
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
    const { s, E } = ctx, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic, nx = nextHint(ctx), z = v.indexOf(0);
    const hl = nx ? nx.indexOf(0) : -1;
    const key = E('div', { class: 'v5-slide-key', 'aria-label': 'الترتيب المطلوب' }, ...[1, 2, 3, 4, 5, 6, 7, 8, 0].map(k => E('i', { class: k ? '' : 'gap' }, k ? svg(SHAPE8[k], 'v5-sb s' + k) : null)));
    const grid = E('div', { class: 'v5-slide' + (L.solved(s, v) ? ' solved' : '') });
    v.forEach((k, i) => {
      const near = Math.abs(i % 3 - z % 3) + Math.abs(Math.floor(i / 3) - Math.floor(z / 3)) === 1;
      if (!k) { grid.append(E('i', { class: 'v5-tile gap' + (at.hint === 1 ? ' pulse' : '') })); return; }
      grid.append(E('button', { type: 'button', class: 'v5-tile' + (near ? ' near' : '') + (i === hl ? ' pulse' : ''), 'aria-label': `لوح ${['', 'الدائرة', 'المثلث', 'المعين', 'الهلال', 'الموجة', 'الفرع', 'الورقة', 'النجمة'][k]}${near ? '، ملاصق للفراغ' : ''}`,
        onclick: () => { const n = L.slideMove(v, i); if (!n) { say(ctx, 'حرّك لوحًا ملاصقًا للفراغ.'); return; } try { tone(380, .05, 'triangle', .04); } catch (er) {} moved(ctx, n); } },
        img('ch4_s1_piece_map_tile', 'v5-tile-art'), svg(SHAPE8[k], 'v5-sb s' + k)));
    });
    b.append(E('div', { class: 'v5-slide-wrap' }, grid, E('figure', { class: 'v5-slide-ref' }, key, E('figcaption', { text: 'الخريطة المطلوبة' }))));
  }

  // Crystal platform: a press flips the crystal and its orthogonal neighbours.
  function paintLights(b, ctx) {
    const { s, E } = ctx, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic, nx = nextHint(ctx);
    const gated = toolGate(b, ctx, 'needle', ['ركّب إبرة المرصد في مركز المنصة لتصل البلورات ببعضها.', 'ضع عدسة المنارة فوق المنصة لترى البارز من الغائر.']);
    const target = nx ? v.findIndex((_, i) => L.equal(L.lightsPress(v, i), nx)) : -1;
    const grid = E('div', { class: 'v5-lights' + (gated ? ' covered' : '') + (L.solved(s, v) ? ' solved' : '') });
    const net = E('span', { class: 'v5-lnet', 'aria-hidden': 'true' }); net.innerHTML = '<svg viewBox="0 0 300 300"><path d="M50 50H250M50 150H250M50 250H250M50 50V250M150 50V250M250 50V250"/></svg>'; grid.append(net);
    v.forEach((on, i) => grid.append(E('button', { type: 'button', disabled: gated, class: 'v5-crys' + (on ? ' up' : '') + (i === target ? ' pulse' : ''),
      'aria-label': `بلورة ${i + 1}: ${on ? 'بارزة' : 'منخفضة'}`,
      onclick: () => { try { tone(on ? 700 : 520, .08, 'sine', .04); } catch (er) {} moved(ctx, L.lightsPress(v, i)); } },
      img('ch4_s2_piece_ring', 'v5-crys-ring'), on ? img('tool_crystal_weight', 'v5-crys-gem') : E('i', { class: 'v5-crys-low' }))));
    if (!gated) grid.append(img('tool_observatory_needle', 'v5-lneedle'));
    const plus = E('div', { class: 'v5-plus' + (at.hint >= 1 ? ' pulse' : '') }, ...Array.from({ length: 9 }, (_, k) => E('i', { class: [1, 3, 4, 5, 7].includes(k) ? (k === 4 ? 'me' : 'on') : '' })));
    b.append(grid, E('div', { class: 'v5-lkey' }, plus, E('span', { text: 'اللمسة تقلب البلورة وجاراتها الأربع' })));
  }

  // Winter scales: a sealed reference on the left pan, a movable piece on the right; swap pieces until all are level.
  const PIECE = ['ch4_s3_piece_feather', 'ch4_s3_piece_wood_leaf', 'tool_crystal_weight'], PNAME = ['الريشة', 'الورقة', 'البلورة'];
  const REFMARK = [BADGE.circle, BADGE.triangle, BADGE.diamond];
  function miniBal(E, left, right, tilt) {
    return E('span', { class: 'v5-mbal', style: `--t:${tilt * 10}deg` }, E('i', { class: 'v5-mbeam' }, E('b', { class: 'l' }, left), E('b', { class: 'r' }, right)), E('i', { class: 'v5-mpost' }));
  }
  function paintScales(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic, nx = nextHint(ctx);
    const gated = toolGate(b, ctx, 'weight', 'ضع بلورة الضبط في كفتها لتبدأ الموازنة.');
    const P = k => img(PIECE[k], 'v5-mp'), R = k => E('span', { class: 'v5-mref' }, img('ch3_s2_piece_stone', 'v5-mp'), svg(REFMARK[k], 'v5-badge v5-refb'));
    const cards = E('div', { class: 'v5-scards' },
      E('figure', {}, miniBal(E, P(1), P(0), -1), miniBal(E, P(2), P(1), -1), E('figcaption', { text: 'الأخف إلى الأثقل: ريشة، ورقة، بلورة' })),
      E('figure', { class: at.hint >= 1 ? 'pulse' : '' }, miniBal(E, R(0), P(0), -1), miniBal(E, P(2), R(0), -1), E('figcaption', { text: 'ثقل الأعلى بين الريشة والبلورة' })),
      E('figure', {}, miniBal(E, P(1), R(1), -1), E('figcaption', { text: 'ثقل الأوسط أخف من الورقة' })),
      E('figure', {}, miniBal(E, R(2), P(1), -1), E('figcaption', { text: 'ثقل الأسفل أثقل من الورقة' })));
    const ghost = nx ? diffIdx(v, nx) : [];
    const rows = E('div', { class: 'v5-scales' + (gated ? ' covered' : '') });
    v.forEach((piece, k) => {
      const tilt = L.scaleTilt(t, v, k);
      rows.append(E('button', { type: 'button', disabled: gated, class: 'v5-scale' + (sel === k ? ' picked' : '') + (ghost.includes(k) ? ' pulse' : '') + (tilt === 0 ? ' level' : ''),
        'aria-label': `الميزان ${['الأعلى', 'الأوسط', 'الأسفل'][k]}: ${PNAME[piece]}، ${tilt === 0 ? 'متزن' : tilt < 0 ? 'القطعة أخف' : 'القطعة أثقل'}${sel === k ? '، محدد' : ''}`, 'aria-pressed': sel === k,
        onclick: () => pickSwap(ctx, k, v) }, miniBal(E, R(k), P(piece), tilt), E('small', { text: tilt === 0 ? 'متزن' : 'مائل' })));
    });
    b.append(cards, rows);
  }

  // Storm ropes: four loops; a loop drawn over another must leave first. A wrong pull strains the rope until released.
  const LOOPS = [[92, 92, 74, 52], [210, 104, 70, 56], [96, 222, 74, 50], [212, 214, 70, 54]], ZORDER = [0, 1, 3, 2];
  function paintRopes(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic, nx = nextHint(ctx);
    const strained = v[4], hl = nx && strained < 0 ? diffIdx(v.slice(0, 4), nx.slice(0, 4))[0] : -1;
    let g = '';
    ZORDER.forEach(i => { if (!v[i]) return; const [cx, cy, rx, ry] = LOOPS[i], bad = strained === i || (strained >= 0 && t.cover[strained] === i);
      g += `<ellipse class="halo" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/><ellipse class="rope${bad ? ' strain' : ''}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`; });
    const board = E('div', { class: 'v5-ropes' + (strained >= 0 ? ' tight' : '') + (L.solved(s, v) ? ' solved' : '') });
    const sv = E('span', { class: 'v5-rsvg', 'aria-hidden': 'true' }); sv.innerHTML = `<svg viewBox="0 0 300 300">${g}</svg>`; board.append(sv);
    const pins = [[70, 70], [232, 84], [74, 240], [234, 236]], names = ['أعلى اليسار', 'أعلى اليمين', 'أسفل اليسار', 'أسفل اليمين'];
    pins.forEach(([x, y], i) => { if (!v[i]) return; board.append(E('button', { type: 'button', class: 'v5-pin' + (i === hl ? ' pulse' : '') + (strained === i ? ' strain' : ''), disabled: strained >= 0, style: `left:${x / 3}%;top:${y / 3}%`,
      'aria-label': `وتد ${names[i]}`,
      onclick: () => { const n = L.ropePull(t, v, i); if (!n) return; try { tone(n[4] >= 0 ? 160 : 420, .15, 'triangle', .05); } catch (er) {} if (n[4] >= 0) say(ctx, 'انشد الحبل: حلقة أخرى تمر فوق هذا الوتد. أرخه ثم جرّب غيره.'); moved(ctx, n); } },
      img('ch5_s1_piece_rope_pin', 'v5-pin-art'))); });
    b.append(board);
    if (strained >= 0) b.append(ctx.button('أرخِ الحبل', () => { try { tone(300, .2, 'sine', .04); } catch (er) {} moved(ctx, L.ropeRelease(v)); }, 'primary v5-release'));
    b.append(E('p', { class: 'v5-legend' }, E('span', { text: 'الحبل المتصل فوق الحبل المقطوع عند التقاطع' })));
  }

  // Wind gears: motor on top, four swappable gears, output below; the turn travels down until the first gap or overlap.
  function paintGearfit(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic, nx = nextHint(ctx);
    const gated = toolGate(b, ctx, 'axle', 'ثبّت محور الرياح في حاملة الآلة لتتصل التروس.');
    const U = 14, top = 2 * U + 6, files = ['small', 'medium', 'large', 'xlarge'], run = gated ? 0 : L.gearRun(t, v), gaps = L.gearContacts(t, v);
    const ghost = nx ? diffIdx(v, nx) : [];
    const col = E('div', { class: 'v5-gearcol' + (gated ? ' covered' : '') + (run === 5 ? ' solved' : ''), style: `height:${top + t.centers[5] * U + 2 * U + 10}px` });
    const radii = [t.motor, ...v.map(g => t.radii[g]), t.output];
    radii.forEach((r, k) => {
      const y = top + t.centers[k] * U, d = r * 2 * U * 1.16, file = k === 0 ? 'medium' : k === 5 ? 'small' : files[v[k - 1]];
      const spin = run >= k ? (k % 2 ? ' ccw' : ' cw') : '';
      const gear = img('ch5_s2_piece_gear_' + file, 'v5-gear' + spin, { style: `width:${d}px;height:${d}px;top:${y - d / 2}px` });
      if (k === 0 || k === 5) { col.append(gear); return; }
      const i = k - 1;
      col.append(E('button', { type: 'button', disabled: gated, class: 'v5-gslot' + (sel === i ? ' picked' : '') + (ghost.includes(i) ? ' pulse' : ''), style: `top:${y - 24}px`,
        'aria-label': `الموضع ${i + 1}: ترس ${['صغير', 'متوسط', 'كبير', 'أكبر'][v[i]]}${sel === i ? '، محدد' : ''}`, 'aria-pressed': sel === i,
        onclick: () => pickSwap(ctx, i, v) }, E('b', { text: String(i + 1) })), gear);
    });
    gaps.forEach((g, k) => { if (g === 0) return; const y = top + (t.centers[k] + radii[k]) * U; col.append(E('i', { class: 'v5-gmark ' + (g > 0 ? 'gap' : 'over') + (at.hint >= 1 && k === 0 ? ' pulse' : ''), style: `top:${y - 9}px`, title: g > 0 ? 'فراغ' : 'تداخل' })); });
    col.append(E('i', { class: 'v5-gtarget' + (run === 5 ? ' on' : ''), style: `top:${top + t.centers[5] * U - 14}px`, 'aria-hidden': 'true' }));
    b.append(col, E('p', { class: 'v5-legend' }, E('span', {}, E('i', { class: 'v5-gmark gap sm' }), ' فراغ'), E('span', {}, E('i', { class: 'v5-gmark over sm' }), ' تداخل'), E('span', { text: '↺ المطلوب: يدور الترس الأخير عكس الساعة' })));
  }

  // Volcano drums: three cylinders 0 closed → 1 side → 2 open → 0; a window shows the other drums each needs.
  const PORT = ['<rect x="7" y="7" width="26" height="26" rx="5"/>', '<rect x="7" y="7" width="26" height="26" rx="5" fill="none" stroke-width="3.5"/><path d="M7 12 Q7 7 12 7 H20 V33 H12 Q7 33 7 28Z"/>', '<rect x="7" y="7" width="26" height="26" rx="5" fill="none" stroke-width="3.5"/><circle cx="20" cy="20" r="6" fill="none" stroke-width="3"/>'];
  function paintDrums(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic, nx = nextHint(ctx);
    const gated = toolGate(b, ctx, 'heatkey', 'أدخل مفتاح الحرارة في فتحة العزل ليبرد سطح الأقفال.');
    const ghost = nx ? diffIdx(v, nx) : [];
    const box = E('div', { class: 'v5-chest v5-drums' + (gated ? ' covered' : '') + (L.solved(s, v) ? ' open' : '') });
    t.rules.forEach((rule, i) => {
      const can = L.drumCan(t, v, i);
      const win = E('div', { class: 'v5-window ' + (can ? 'ok' : 'wait') + (at.hint >= 1 && i === 2 ? ' pulse' : ''), 'aria-hidden': 'true' });
      if (!rule.length) win.append(E('b', { class: 'v5-free', text: '✓' }));
      rule.forEach(([j, w]) => win.append(E('span', { class: 'v5-cond' + (v[j] === w ? ' met' : '') }, E('i', { text: ['أ', 'ب', 'ج'][j] }), svg(PORT[w], 'v5-port'))));
      box.append(E('div', { class: 'v5-lockrow' },
        E('button', { type: 'button', disabled: gated, class: 'v5-drum' + (can ? '' : ' blocked') + (ghost.includes(i) ? ' pulse' : ''), 'aria-label': `الأسطوانة ${['العليا', 'الوسطى', 'السفلى'][i]}: ${['مغلقة', 'جانبية', 'مفتوحة'][v[i]]}${can ? '' : '، محجوبة'}`,
          onclick: () => { const n = L.drumMove(t, v, i); if (!n) { win.classList.remove('flash'); void win.offsetWidth; win.classList.add('flash'); try { sfx.bad(); } catch (er) {} return; } try { tone(260 + v[i] * 80, .12, 'triangle', .05); } catch (er) {} moved(ctx, n); } },
          E('i', { class: 'v5-dtag', text: ['أ', 'ب', 'ج'][i] }), img('ch5_s3_piece_lock_drum', 'v5-drum-art', { style: `transform:rotate(${v[i] * 90}deg)` }), svg(PORT[v[i]], 'v5-port big s' + v[i])), win));
    });
    b.append(box, E('p', { class: 'v5-legend' }, ...['مغلق', 'جانبي', 'مفتوح'].map((n, k) => E('span', {}, svg(PORT[k], 'v5-port sm s' + k), ' ' + n))));
  }

  // Shadow pass: two stones; pick one, then an arrow. A stone moves only with free cells ahead and behind.
  function paintPush(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic, nx = nextHint(ctx);
    const gated = toolGate(b, ctx, 'lens', 'ضع عدسة المنارة لترى التجويفين ومجرى المكبس.');
    const grid = E('div', { class: 'v5-push' + (gated ? ' covered' : '') + (L.solved(s, v) ? ' solved' : ''), style: `--n:${t.n}` });
    const stoneAt = (r, c) => v[0] === r && v[1] === c ? 0 : v[2] === r && v[3] === c ? 1 : -1;
    const hintStone = nx ? [0, 1].find(k => ![nx[0] === v[k * 2] && nx[1] === v[k * 2 + 1], nx[2] === v[k * 2] && nx[3] === v[k * 2 + 1]].some(Boolean)) : -1;
    for (let r = 0; r < t.n; r++) for (let c = 0; c < t.n; c++) {
      const wall = t.walls.some(w => w[0] === r && w[1] === c), goal = !gated && t.goal.some((_, k) => k % 2 === 0 && t.goal[k] === r && t.goal[k + 1] === c), k = stoneAt(r, c);
      const cell = E(k >= 0 ? 'button' : 'div', { class: 'v5-pcell' + (wall ? ' wall' : '') + (goal ? ' goal' : '') });
      if (k >= 0) {
        cell.type = 'button'; cell.disabled = gated; cell.classList.add('stone'); if (sel === k) cell.classList.add('picked'); if (k === hintStone) cell.classList.add('pulse');
        cell.setAttribute('aria-label', `حجر في الصف ${r + 1} العمود ${c + 1}${sel === k ? '، محدد' : ''}`);
        cell.append(img('ch3_s2_piece_stone', 'v5-pstone'));
        cell.onclick = () => { sel = sel === k ? null : k; paint(ctx); };
      }
      grid.append(cell);
    }
    if (sel !== null && !gated) {
      const r = v[sel * 2], c = v[sel * 2 + 1];
      [['↑', -1, 0, 'أعلى'], ['→', 0, 1, 'يمين'], ['↓', 1, 0, 'أسفل'], ['←', 0, -1, 'يسار']].forEach(([ar, dr, dc, nm], d) => {
        const n = L.pushMove(t, v, sel, d), R = r + dr, C = c + dc;
        if (R < 0 || C < 0 || R >= t.n || C >= t.n) return;
        grid.append(E('button', { type: 'button', class: 'v5-parrow' + (n ? '' : ' no'), style: `left:${(C + .5) / t.n * 100}%;top:${(R + .5) / t.n * 100}%`, 'aria-label': `ادفع نحو ${nm}${n ? '' : '، لا يمكن'}`,
          onclick: () => { if (!n) { say(ctx, 'يلزم فراغ أمام الحجر وفراغ خلفه ليصل المكبس.'); return; } sel = null; try { tone(200, .12, 'triangle', .05); } catch (er) {} moved(ctx, n); } }, ar));
      });
    }
    b.append(grid, E('p', { class: 'v5-legend' }, E('span', {}, E('i', { class: 'v5-pkey goal' }), ' تجويف'), E('span', {}, E('i', { class: 'v5-pkey wall' }), ' صخر')));
    if (at.hint >= 1 && !gated) say(ctx, 'المكبس يأتي من الخلف: انظر إلى الخانة المقابلة لاتجاه الدفع.');
  }

  // Moon crossing: draw every link once from the compass, without lifting the pen.
  function paintStroke(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic, nx = nextHint(ctx);
    const gated = toolGate(b, ctx, 'compass', 'ضع البوصلة على اللوحة لتعرف أين يبدأ الرسم.');
    const pen = L.strokeAt(t, v), P = n => [(n % t.cols + .5) / t.cols * 100, (Math.floor(n / t.cols) + .5) / t.rows * 100];
    const used = new Set(v), nextEdge = nx ? nx[nx.length - 1] : -1, deg = {};
    t.edges.forEach(([a, c]) => { deg[a] = (deg[a] || 0) + 1; deg[c] = (deg[c] || 0) + 1; });
    let lines = '';
    t.edges.forEach(([a, c], e) => { const [x1, y1] = P(a), [x2, y2] = P(c); lines += `<line x1="${x1 * 3}" y1="${y1 * 4}" x2="${x2 * 3}" y2="${y2 * 4}" class="${used.has(e) ? 'on' : 'off'}${e === nextEdge ? ' hl' : ''}"/>`; });
    const board = E('div', { class: 'v5-stroke' + (gated ? ' covered' : '') + (L.solved(s, v) ? ' solved' : '') });
    const sv = E('span', { class: 'v5-ssvg', 'aria-hidden': 'true' }); sv.innerHTML = `<svg viewBox="0 0 300 400">${lines}</svg>`; board.append(sv);
    const stuck = !gated && !L.solved(s, v) && !L.nextStates(s, v).length;
    Object.keys(deg).map(Number).forEach(n => {
      const [x, y] = P(n), e = t.edges.findIndex(([a, c], k) => !used.has(k) && ((a === pen && c === n) || (c === pen && a === n)));
      board.append(E('button', { type: 'button', disabled: gated, class: 'v5-snode' + (n === pen ? ' pen' : '') + (e >= 0 ? ' near' : '') + (at.hint >= 1 && deg[n] === 1 ? ' pulse' : ''), style: `left:${x}%;top:${y}%`,
        'aria-label': `النجمة ${n + 1} ${n === pen ? '، القلم هنا' : e >= 0 ? '، يمكن الوصل إليها' : ''}`,
        onclick: () => { if (e < 0) { say(ctx, n === pen ? 'القلم هنا. المس نجمة متصلة به.' : 'لا وصلة متبقية بين القلم وهذه النجمة.'); return; } try { tone(600 + v.length * 20, .06, 'sine', .04); } catch (er) {} moved(ctx, L.strokeDraw(t, v, e)); } },
        n === pen ? img('tool_compass', 'v5-spen') : E('i', { class: 'v5-sdot' })));
    });
    b.append(board);
    if (stuck) say(ctx, 'لا وصلة متبقية من هنا. تراجع خطوة أو ابدأ محاولة جديدة.');
    if (!gated && v.length) b.append(ctx.button('تراجع خطوة', () => moved(ctx, v.slice(0, -1)), 'v5-undo'));
  }

  // Oath platform (three pegs): tap a peg to lift its top ring, then tap the peg it goes to.
  function paintHanoi(b, ctx) {
    const { s, E } = ctx, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic, nx = nextHint(ctx);
    const gated = toolGate(b, ctx, 'clapper', 'ركّب مطرقة الجرس في العربة لتصير ذراعًا تلتقط الحلقة العليا.');
    const from = nx ? v[diffIdx(v, nx)[0]] : -1, to = nx ? nx[diffIdx(v, nx)[0]] : -1;
    const row = E('div', { class: 'v5-hanoi' + (gated ? ' covered' : '') + (L.solved(s, v) ? ' solved' : '') });
    [0, 1, 2].forEach(p => {
      const discs = [2, 1, 0].filter(k => v[k] === p), top = L.hanoiTop(v, p);
      const peg = E('button', { type: 'button', disabled: gated, class: 'v5-peg' + (sel === p ? ' picked' : '') + (p === from && sel === null ? ' pulse' : '') + (p === to && sel !== null ? ' pulse' : '') + (p === 2 ? ' goal' : ''),
        'aria-label': `العمود ${['الأيسر', 'الأوسط', 'الأيمن'][p]}: ${discs.length} حلقات${sel === p ? '، الحلقة العليا مرفوعة' : ''}`,
        onclick: () => {
          if (sel === null) { if (top < 0) return; sel = p; paint(ctx); return; }
          if (sel === p) { sel = null; paint(ctx); return; }
          const n = L.hanoiMove(v, sel, p);
          if (!n) { say(ctx, 'لا توضع حلقة فوق حلقة أصغر منها.'); sel = null; paint(ctx); return; }
          sel = null; try { tone(330 + p * 60, .1, 'triangle', .05); } catch (er) {} moved(ctx, n);
        } }, E('i', { class: 'v5-rod' }));
      discs.forEach(k => peg.append(img('ch4_s2_piece_ring', 'v5-disc d' + k + (sel === p && k === top ? ' up' : ''))));
      row.append(peg);
    });
    b.append(row, E('p', { class: 'v5-legend' }, E('span', { text: 'الهدف: الحلقات كلها على العمود الأيمن، الكبرى أسفل' })));
  }

  // Last sea: ferry Shibl, the fish and the bait; the boat carries Nawfal and one load at most.
  const BAIT = '<path d="M8 30 C8 18 20 22 20 12 C20 5 28 5 30 10" fill="none" stroke-width="5" stroke-linecap="round"/><circle cx="31" cy="11" r="3"/>';
  function paintRiver(b, ctx) {
    const { s, E } = ctx, t = s.target, v = ctx.work(), at = attempt(ctx.x, s, ctx.done()), L = TreasureLogic, nx = nextHint(ctx);
    const gated = toolGate(b, ctx, 'heatkey', 'أدخل مفتاح الحرارة في محرك الزورق ليعمل.');
    const art = k => k === 0 ? img('crew_shibl', 'v5-cargo-art round') : k === 1 ? img('ch1_s2_piece_fish', 'v5-cargo-art') : svg(BAIT, 'v5-cargo-art bait');
    const load = sel !== null && v[sel + 1] === v[0] ? sel : null;
    const hintItem = nx ? [0, 1, 2].find(k => nx[k + 1] !== v[k + 1]) : undefined;
    const bank = side => E('div', { class: 'v5-bank ' + (side ? 'right' : 'left') }, ...[0, 1, 2].filter(k => v[k + 1] === side && k !== load).map(k =>
      E('button', { type: 'button', disabled: gated || side !== v[0], class: 'v5-cargo' + (nx && hintItem === k ? ' pulse' : ''), 'aria-label': `${t.items[k]}${side === v[0] ? '، المس لتحميله' : ''}`,
        onclick: () => { sel = k; paint(ctx); } }, art(k), E('small', { text: t.items[k] }))));
    const boat = E('div', { class: 'v5-ferry ' + (v[0] ? 'right' : 'left') }, img('crew_nawfal', 'v5-ferry-man'), img('ch3_s1_piece_boat', 'v5-ferry-boat'),
      load !== null ? E('button', { type: 'button', class: 'v5-cargo onboard', 'aria-label': `${t.items[load]} في الزورق، المس لإنزاله`, onclick: () => { sel = null; paint(ctx); } }, art(load)) : null);
    const river = E('div', { class: 'v5-river' + (gated ? ' covered' : '') + (L.solved(s, v) ? ' solved' : '') }, bank(0), E('div', { class: 'v5-water' }, boat), bank(1));
    const go = ctx.button(load !== null ? 'اعبر مع ' + t.items[load] : 'اعبر بالزورق فارغًا', () => {
      const n = L.riverCross(t, v, load === null ? -1 : load); if (!n) return;
      if (!L.riverSafe(t, n)) { const bad = t.clash.find(([a, c]) => n[a + 1] === n[c + 1] && n[a + 1] !== n[0]); say(ctx, `لا يمكن: سيبقى ${t.items[bad[0]]} مع ${t.items[bad[1]]} دون نوفل.`); return; }
      sel = null; try { tone(260, .2, 'sine', .05); } catch (er) {} moved(ctx, n);
    }, 'primary v5-cross' + (nx && hintItem === undefined ? ' pulse' : ''));
    go.disabled = gated; go.setAttribute('aria-label', 'عبور: ' + go.textContent);
    const clash = E('div', { class: 'v5-clash' + (at.hint >= 1 ? ' pulse' : '') }, ...t.clash.map(([a, c]) => E('span', {}, art(a), E('b', { text: '✕' }), art(c))));
    b.append(clash, river, go);
  }

  // Dawn channel: boats sail only forward; step into the gap or hop over one boat coming the other way.
  function paintFrogs(b, ctx) {
    const { s, E } = ctx, v = ctx.work(), L = TreasureLogic, nx = nextHint(ctx);
    const hl = nx ? diffIdx(v, nx).find(i => v[i] !== 0) : -1;
    const row = E('div', { class: 'v5-frogs' + (L.solved(s, v) ? ' solved' : '') });
    v.forEach((p, i) => {
      if (!p) { row.append(E('i', { class: 'v5-fcell gap' })); return; }
      row.append(E('button', { type: 'button', class: 'v5-fcell' + (L.frogMove(v, i) ? ' can' : '') + (i === hl ? ' pulse' : ''), 'aria-label': `زورق في الخانة ${i + 1} يتجه ${p === 1 ? 'شرقًا' : 'غربًا'}`,
        onclick: () => { const n = L.frogMove(v, i); if (!n) { say(ctx, 'لا يتحرك هذا الزورق الآن: أمامه زورق من اتجاهه أو لا فراغ قريب.'); return; } try { tone(p === 1 ? 500 : 420, .07, 'sine', .04); } catch (er) {} moved(ctx, n); } },
        img('ch3_s1_piece_boat', 'v5-fboat' + (p === 2 ? ' west' : '')), E('i', { class: 'v5-fdir', text: p === 1 ? '→' : '←' })));
    });
    const goal = E('div', { class: 'v5-frogs goal', 'aria-hidden': 'true' }, ...s.target.goal.map(p => p ? E('i', { class: 'v5-fcell mini' }, img('ch3_s1_piece_boat', 'v5-fboat' + (p === 2 ? ' west' : ''))) : E('i', { class: 'v5-fcell mini gap' })));
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
      grid.append(E('button', { type: 'button', class: 'v5-dcell slot' + (sel === k ? ' picked' : '') + (ghost.includes(k) ? ' pulse' : ''), style: `grid-row:${r};grid-column:${c}`,
        'aria-label': `تجويف ${k + 1}: ختم ${SEALN[v[k]]}${sel === k ? '، محدد' : ''}`, 'aria-pressed': sel === k,
        onclick: () => { say(ctx, ''); pickSwap(ctx, k, v); } }, img(SEALS[v[k]], 'v5-dseal')));
    }
    grid.append(E('i', { class: 'v5-dio in', 'aria-hidden': 'true' }), E('i', { class: 'v5-dio out', 'aria-hidden': 'true' }));
    const CARD = [['→', 0], [0, '→', 1], ['→', 2, '↰'], [3, 2], ['→', 4, '→'], [5, 2], [6, '▮']];
    const cards = E('div', { class: 'v5-dcards' + (at.hint >= 1 ? ' hl' : '') }, ...TreasureData.SECRETS5.map((Q, k) => E('figure', { class: k === 3 ? 'col' : '' },
      E('div', {}, ...CARD[k].map(p => typeof p === 'number' ? img(SEALS[p], 'v5-dcard-art') : E('b', { text: p }))), E('figcaption', { text: Q.title + ': ' + Q.mark }))));
    b.append(grid, ctx.button('افحص الباب', () => { if (L.solved(s, v)) return; say(ctx, 'لم يستيقظ الطريق بعد. راجع الأسرار السبعة؛ يجب أن تصدق كلها معًا.'); }, 'v5-check'), cards);
  }

  root.TreasureBoards = { render, v5state, chal, attempt, ART };
})(typeof window === 'undefined' ? globalThis : window);
