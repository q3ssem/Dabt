// Live interaction widgets, one per constraint family. Text, numbers, grids and
// stimuli are DOM/SVG elements independent of the scene images.
import { h, fmt, token, announce, shuffle } from './ui.js';
import * as V from './validators.js';
import { sfx } from './audio.js';

const clone = x => JSON.parse(JSON.stringify(x ?? null));

function stateful(initial, render, onChange) {
  let cur = clone(initial); let hist = [];
  const api = {
    get: () => clone(cur),
    commit(n) { hist.push(clone(cur)); cur = clone(n); render(); onChange?.(api.get()); },
    set(n) { cur = clone(n); hist = []; render(); },
    undo() { if (!hist.length) return false; cur = hist.pop(); render(); onChange?.(api.get()); return true; },
    reset() { hist.push(clone(cur)); cur = clone(initial); render(); onChange?.(api.get()); },
    canUndo: () => hist.length > 0,
  };
  return api;
}

const DIR_AR = { N: 'شمال', E: 'شرق', S: 'جنوب', W: 'غرب' };

// ---------------------------------------------------------------- slot board
function slotBoard({ slotLabels, pieces, reusable = false, prefix = [], initial, onChange, caption }) {
  const el = h('div', { class: 'slotboard' });
  let selected = null;
  const st = stateful(initial ?? slotLabels.map(() => null), render, onChange);
  const pieceById = Object.fromEntries(pieces.map(p => [p.id, p]));
  function place(slotIdx, pid) {
    const cur = st.get();
    if (!reusable) { const prev = cur.indexOf(pid); if (prev >= 0) cur[prev] = cur[slotIdx]; }
    cur[slotIdx] = pid; selected = null; st.commit(cur); sfx('tap');
    announce(`وُضعت ${pieceById[pid].label} في الخانة ${fmt(slotIdx + 1)}`);
  }
  function render() {
    const cur = st.get(); el.innerHTML = '';
    if (caption) el.append(h('p', { class: 'board-caption' }, caption));
    const row = h('ol', { class: 'slots', 'aria-label': 'الخانات المرقمة' });
    prefix.forEach((g, i) => row.append(h('li', { class: 'slot given' }, h('span', { class: 'slot-n' }, 'معطى'), token(g.label))));
    slotLabels.forEach((lab, i) => {
      const pid = cur[i];
      const b = h('button', { class: 'slot' + (pid != null ? ' filled' : ''), type: 'button', 'data-slot': i, 'aria-label': `الخانة ${lab}${pid != null ? '، فيها ' + pieceById[pid].label : '، فارغة'}` },
        h('span', { class: 'slot-n' }, fmt(lab)), pid != null ? token(pieceById[pid].name, { display: pieceById[pid].label }) : h('span', { class: 'slot-empty' }, '—'));
      b.addEventListener('click', () => {
        if (selected != null) place(i, selected);
        else if (pid != null) { const c = st.get(); c[i] = null; st.commit(c); }
      });
      if (pid != null) enableDrag(b, pid, i);
      row.append(h('li', {}, b));
    });
    const tray = h('div', { class: 'tray', role: 'group', 'aria-label': 'القطع' });
    pieces.forEach(p => {
      if (!reusable && cur.includes(p.id)) return;
      const b = h('button', { class: 'piece' + (selected === p.id ? ' selected' : ''), type: 'button', 'aria-pressed': String(selected === p.id), 'data-piece': p.id }, token(p.name, { display: p.label }));
      b.addEventListener('click', () => { selected = selected === p.id ? null : p.id; render(); el.querySelector(`[data-piece="${CSS.escape(p.id)}"]`)?.focus(); if (selected) announce(`اخترت ${p.label}. اختر الخانة الآن.`); });
      enableDrag(b, p.id, null);
      tray.append(b);
    });
    if (!tray.children.length) tray.append(h('span', { class: 'muted' }, 'وُضعت جميع القطع. يمكنك النقر على خانة لإرجاع قطعتها.'));
    el.append(row, tray);
  }
  function enableDrag(node, pid, fromSlot) {
    node.addEventListener('pointerdown', e => {
      if (e.button) return;
      const sx = e.clientX, sy = e.clientY; let ghost = null;
      const move = ev => {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
        if (!ghost) { ghost = node.cloneNode(true); ghost.classList.add('drag-ghost'); document.body.append(ghost); }
        ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
      };
      const up = ev => {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        if (!ghost) return; ghost.remove();
        const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-slot]');
        if (t && el.contains(t)) { const to = Number(t.dataset.slot); if (fromSlot != null && !reusable) { const c = st.get(); const tmp = c[to]; c[to] = pid; c[fromSlot] = tmp; selected = null; st.commit(c); } else place(to, pid); }
        else if (fromSlot != null) { const c = st.get(); c[fromSlot] = null; st.commit(c); }
        node.addEventListener('click', e2 => { e2.stopImmediatePropagation(); e2.preventDefault(); }, { capture: true, once: true });
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
  }
  render();
  return { el, ...st };
}

// ---------------------------------------------------------------- per-type builders
const W = {};

W.sequence = (p, ctx) => {
  const s = p.setup;
  const pieceIds = V.sequencePieces(s);
  const pieces = pieceIds.map(id => ({ id: String(id), name: String((s.display && s.display[id]) || id), label: fmt((s.display && s.display[id]) || id) }));
  const n = V.sequenceSlotCount(s, p.answer);
  const prefix = (s.given || []).map(g => ({ label: fmt(g) }));
  const b = slotBoard({ slotLabels: Array.from({ length: n }, (_, i) => i + 1), pieces, reusable: V.sequenceReusable(s), prefix, onChange: ctx.onChange,
    caption: s.before ? 'رتب القطع في الخانات المرقمة من ١. اختر القطعة ثم خانتها، أو اسحبها.' : null });
  const conv = r => r.map(x => x == null ? null : (typeof pieceIds[0] === 'number' ? Number(x) : x));
  return { ...b, get: () => conv(b.get()), set: r => b.set((r || []).map(x => x == null ? null : String(x))) };
};
W.schedule = (p, ctx) => p.setup.durations ? W.numeric(p, ctx) : W.sequence(p, ctx);

W.assignment = (p, ctx) => {
  const s = p.setup;
  const slots = s.slots || s.items.map((_, i) => i + 1);
  return slotBoard({ slotLabels: slots, pieces: s.items.map(i => ({ id: i, name: i, label: i })), onChange: ctx.onChange,
    caption: s.slots ? 'ضع قطعة واحدة في كل موضع. لا تتكرر القطعة.' : 'رتب القطع في الخانات المرقمة.' });
};

W.numeric = (p, ctx) => {
  const s = p.setup;
  const el = h('div', { class: 'numeric' });
  if (s.dots) { // live dots generated from setup, never counted from the background
    const box = h('div', { class: 'dots', role: 'img', 'aria-label': 'دوائر للعد' });
    for (let i = 0; i < s.dots; i++) box.append(h('span', { class: 'dot', 'aria-hidden': 'true' }));
    el.append(box);
  }
  if (s.text) el.append(h('p', { class: 'big-word', dir: 'rtl' }, s.text));
  const input = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', class: 'num-input', 'aria-label': 'إجابتك العددية' + (s.unit ? ' بوحدة ' + s.unit : '') });
  let hist = [];
  input.addEventListener('focus', () => hist.push(input.value));
  input.addEventListener('input', () => ctx.onChange?.(input.value));
  el.append(h('label', { class: 'num-row' }, input, s.unit ? h('span', { class: 'unit' }, s.unit) : null),
    h('p', { class: 'muted small' }, 'يقبل الحقل الأرقام العربية ١٢ واللاتينية 12.'));
  return { el, get: () => input.value, set: v => { input.value = v ?? ''; }, undo: () => { if (!hist.length) return false; input.value = hist.pop(); return true; }, reset: () => { hist.push(input.value); input.value = ''; }, canUndo: () => hist.length > 0 };
};

W.single = (p, ctx) => {
  const el = h('div', { class: 'choices', role: 'radiogroup', 'aria-label': 'الخيارات' });
  const st = stateful(null, render, ctx.onChange);
  function render() {
    el.innerHTML = '';
    p.setup.options.forEach((o, i) => {
      const on = String(st.get()) === String(o);
      const extra = p.setup.readings ? `القراءة ${fmt(p.setup.readings[i])}` : p.setup.density ? `الكثافة ${fmt(p.setup.density[i])}` : null;
      const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(on), class: 'choice' + (on ? ' on' : '') }, token(String(o), { display: fmt(o) }), extra ? h('small', {}, extra) : null);
      b.addEventListener('click', () => { st.commit(o); sfx('tap'); });
      el.append(b);
    });
    if (p.setup.safeRange) el.append(h('p', { class: 'muted small' }, `المدى الآمن في النموذج: ${fmt(p.setup.safeRange[0])}–${fmt(p.setup.safeRange[1])}`));
    if (p.setup.max != null) el.append(h('p', { class: 'muted small' }, `الحد الأقصى في النموذج: ${fmt(p.setup.max)}`));
  }
  render();
  return { el, ...st };
};

W['choice-story'] = (p, ctx) => {
  const w = W.single(p, ctx); w.el.classList.add('story-choices');
  w.el.prepend(h('p', { class: 'muted' }, 'كل الخيارات صالحة. اختر ما يناسبك ثم أكّد؛ لا يوجد جواب صحيح مفروض.'));
  return w;
};

W.multiselect = (p, ctx) => {
  const s = p.setup; const el = h('div', { class: 'cards-select', role: 'group', 'aria-label': 'بطاقات قابلة للتحديد' });
  const entries = s.cards ? Object.entries(s.cards).map(([k, v]) => [k, Array.isArray(v) ? v.join('، ') : v])
    : s.records ? Object.entries(s.records).map(([k, [pr, q]]) => [k, `ضغط ${fmt(pr)} · جودة ${fmt(q)}`])
      : s.options.map(o => [String(o), null]);
  const st = stateful([], render, ctx.onChange);
  function render() {
    el.innerHTML = '';
    if (s.records) el.append(h('p', { class: 'filters' }, `مرشحات: ضغط ≤ ${fmt(s.maxPressure)} و جودة ≥ ${fmt(s.minSignal)}`));
    if (s.requiredFeatures) el.append(h('p', { class: 'filters' }, `الصفات المطلوبة معًا: ${s.requiredFeatures.join(' + ')}`));
    for (const [k, desc] of entries) {
      const on = st.get().includes(k);
      const b = h('button', { type: 'button', 'aria-pressed': String(on), class: 'selcard' + (on ? ' on' : '') }, h('span', { class: 'check', 'aria-hidden': 'true' }, on ? '✓' : ''), token(k, { display: fmt(k) }), desc ? h('small', {}, desc) : null);
      b.addEventListener('click', () => { const c = st.get(); st.commit(on ? c.filter(x => x !== k) : [...c, k]); sfx('tap'); });
      el.append(b);
    }
  }
  render();
  const conv = r => r.map(x => typeof (s.options || [])[0] === 'number' ? Number(x) : x);
  return { el, ...st, get: () => conv(st.get()), set: r => st.set((r || []).map(String)) };
};

W.subset = (p, ctx) => {
  const s = p.setup; const el = h('div', { class: 'cards-select' });
  const st = stateful([...(s.required || [])].filter(() => false), render, ctx.onChange);
  function render() {
    el.innerHTML = '';
    const total = st.get().reduce((a, k) => a + s.items[k], 0);
    el.append(h('p', { class: 'meter', 'aria-live': 'polite' }, 'target' in s ? `المجموع ${fmt(total)} من الهدف ${fmt(s.target)}` : `المستخدم ${fmt(total)} من السعة ${fmt(s.capacity)} · المتبقي ${fmt(s.capacity - total)}`));
    for (const [k, w] of Object.entries(s.items)) {
      const on = st.get().includes(k); const req = (s.required || []).includes(k);
      const b = h('button', { type: 'button', 'aria-pressed': String(on), class: 'selcard' + (on ? ' on' : '') }, h('span', { class: 'check', 'aria-hidden': 'true' }, on ? '✓' : ''), token(k, { display: fmt(k) }), h('small', {}, `القيمة ${fmt(w)}${req ? ' · إلزامي' : ''}`));
      b.addEventListener('click', () => { const c = st.get(); st.commit(on ? c.filter(x => x !== k) : [...c, k]); sfx('tap'); });
      el.append(b);
    }
  }
  render(); return { el, ...st };
};

W.allocation = (p, ctx) => {
  const s = p.setup; const el = h('div', { class: 'alloc' });
  const st = stateful(s.slots.map(() => 0), render, ctx.onChange);
  function render() {
    el.innerHTML = ''; const v = st.get(); const used = v.reduce((a, b) => a + b, 0);
    el.append(h('p', { class: 'meter', 'aria-live': 'polite' }, `الإجمالي ${fmt(s.total)} · الموزع ${fmt(used)} · المتبقي ${fmt(s.total - used)}`));
    s.slots.forEach((slot, i) => {
      const set = n => { const c = st.get(); c[i] = Math.max(0, n); st.commit(c); sfx('tap'); };
      el.append(h('div', { class: 'counter' }, h('span', { class: 'counter-name' }, `الموضع ${slot}`),
        h('button', { type: 'button', class: 'btn round', 'aria-label': `أنقص ${slot}`, onclick: () => set(v[i] - 1) }, '−'),
        h('output', { class: 'counter-val', 'aria-label': `قيمة ${slot}` }, fmt(v[i])),
        h('button', { type: 'button', class: 'btn round', 'aria-label': `زد ${slot}`, onclick: () => set(v[i] + 1) }, '+')));
    });
  }
  render(); return { el, ...st };
};

W.balance = (p, ctx) => {
  const s = p.setup; const el = h('div', { class: 'balance' });
  const st = stateful(0, render, ctx.onChange); let revealed = false;
  function render() {
    el.innerHTML = ''; const n = st.get();
    const tilt = revealed ? Math.max(-12, Math.min(12, (s.target - n * s.unitWeight) * 2)) : 0;
    el.append(h('div', { class: 'scale', role: 'img', 'aria-label': revealed ? (tilt === 0 ? 'الكفتان متزنتان' : 'الكفتان غير متزنتين') : 'الميزان قبل التحقق' },
      h('div', { class: 'beam', style: { transform: `rotate(${tilt}deg)` } },
        h('div', { class: 'pan' }, h('b', {}, `الهدف ${fmt(s.target)}`)),
        h('div', { class: 'pan' }, h('b', {}, `${fmt(n)} × ${fmt(s.unitWeight)}`))),
      h('div', { class: 'pivot' })),
      h('div', { class: 'counter' }, h('span', {}, `قطع وزن كل منها ${fmt(s.unitWeight)} (المتاح ${fmt(s.available)})`),
        h('button', { type: 'button', class: 'btn round', 'aria-label': 'أزل قطعة', onclick: () => { revealed = false; st.commit(Math.max(0, n - 1)); } }, '−'),
        h('output', { class: 'counter-val' }, fmt(n)),
        h('button', { type: 'button', class: 'btn round', 'aria-label': 'أضف قطعة', onclick: () => { revealed = false; st.commit(Math.min(s.available, n + 1)); } }, '+')));
  }
  render();
  return { el, ...st, afterCheck: () => { revealed = true; render(); } };
};

W.rotate = (p, ctx) => {
  const s = p.setup; const el = h('div', { class: 'rotate' });
  if (s.directions) {
    const order = ['N', 'E', 'S', 'W'];
    const st = stateful(s.start, render, ctx.onChange);
    function render() {
      el.innerHTML = ''; const d = st.get(); const deg = order.indexOf(d) * 90;
      el.append(h('div', { class: 'compass', role: 'img', 'aria-label': `المؤشر يتجه ${DIR_AR[d]}` },
        h('img', { src: 'assets/treasure/design/production/compass-live.svg', alt: '', class: 'compass-base' }),
        h('div', { class: 'needle', style: { transform: `rotate(${deg}deg)` } }),
        ...order.map((o, i) => h('span', { class: 'cdir cdir-' + o }, DIR_AR[o]))),
        h('p', { class: 'meter', 'aria-live': 'polite' }, `الاتجاه الحالي: ${DIR_AR[d]}`),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn', onclick: () => st.commit(order[(order.indexOf(d) + 1) % 4]) }, '↻ ربع دورة مع الساعة'),
          h('button', { type: 'button', class: 'btn', onclick: () => st.commit(order[(order.indexOf(d) + 3) % 4]) }, '↺ ربع دورة عكس الساعة')));
    }
    render(); return { el, ...st };
  }
  const st = stateful(s.start, render, ctx.onChange);
  function render() {
    el.innerHTML = ''; const v = st.get(); const R = 96;
    const svg = `<svg viewBox="-120 -120 240 240" class="dial" role="img" aria-label="قرص من ${s.size} مواضع، المؤشر على ${v}">
      <circle r="110" fill="#0D2632" stroke="#D1A354" stroke-width="5"/><circle r="84" fill="#17665D"/>
      ${Array.from({ length: s.size }, (_, i) => { const a = (i / s.size) * 2 * Math.PI - Math.PI / 2; return `<text x="${R * Math.cos(a)}" y="${R * Math.sin(a) + 6}" text-anchor="middle" font-size="18" fill="${i + 1 === v ? '#D1A354' : '#F4F0E7'}" font-weight="${i + 1 === v ? 700 : 400}">${fmt(i + 1)}</text>`; }).join('')}
      <g style="transform:rotate(${((v - 1) / s.size) * 360}deg);transition:transform .22s"><path d="M0 -76 L10 0 L0 -12 L-10 0Z" fill="#F4F0E7"/></g><circle r="8" fill="#D1A354"/></svg>`;
    el.append(h('div', { html: svg }), h('p', { class: 'meter', 'aria-live': 'polite' }, `المؤشر على الموضع ${fmt(v)}`),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn', onclick: () => st.commit(v % s.size + 1) }, '↻ خطوة مع الساعة'),
        h('button', { type: 'button', class: 'btn', onclick: () => st.commit((v - 2 + s.size) % s.size + 1) }, '↺ خطوة عكس الساعة')));
  }
  render(); return { el, ...st };
};

function gridLabels(rows, cols, cellFn, caption) {
  // Grids are isolated LTR: row 1 on top, column 1 on the left, labels always visible.
  const g = h('div', { class: 'grid-wrap', dir: 'ltr' });
  const t = h('table', { class: 'grid', 'aria-label': caption });
  const head = h('tr', {}, h('th', { scope: 'col' }, ''), ...Array.from({ length: cols }, (_, c) => h('th', { scope: 'col' }, h('span', { dir: 'rtl' }, 'عمود ' + fmt(c + 1)))));
  t.append(head);
  for (let r = 1; r <= rows; r++) t.append(h('tr', {}, h('th', { scope: 'row' }, h('span', { dir: 'rtl' }, 'صف ' + fmt(r))), ...Array.from({ length: cols }, (_, c) => h('td', {}, cellFn(r, c + 1)))));
  g.append(t); return g;
}
const cellName = (r, c) => `الصف ${fmt(r)} العمود ${fmt(c)}`;

W.path = (p, ctx) => {
  const s = p.setup; const el = h('div', { class: 'pathgame' });
  const st = stateful([s.start], render, ctx.onChange);
  const isB = (r, c) => (s.blocked || []).some(([a, b]) => a === r && b === c);
  function render() {
    el.innerHTML = ''; const path = st.get(); const last = path[path.length - 1];
    el.append(h('p', { class: 'meter' }, `البداية ${fmt(s.start.join('،'))} · النهاية ${fmt(s.end.join('،'))} · عدد الخطوات ${fmt(path.length - 1)}`));
    el.append(gridLabels(s.grid[0], s.grid[1], (r, c) => {
      const idx = path.findIndex(([a, b]) => a === r && b === c);
      const start = r === s.start[0] && c === s.start[1], end = r === s.end[0] && c === s.end[1], bl = isB(r, c);
      const label = bl ? 'حاجز' : start ? 'بداية' : end ? 'نهاية' : idx >= 0 ? fmt(idx) : '';
      const b = h('button', { type: 'button', class: 'cell' + (bl ? ' blocked' : '') + (idx >= 0 ? ' on' : '') + (end ? ' end' : '') + (start ? ' start' : ''), disabled: bl || null, 'aria-label': `${cellName(r, c)}${bl ? '، حاجز' : ''}${start ? '، بداية' : ''}${end ? '، نهاية' : ''}${idx >= 0 ? '، في المسار' : ''}` }, h('span', { class: 'cell-mark', 'aria-hidden': 'true' }, bl ? '✕' : start ? '◆' : end ? '★' : idx >= 0 ? '●' : ''), h('small', {}, label));
      b.addEventListener('click', () => {
        const cur = st.get(); const li = cur.length - 1;
        if (idx === li && li > 0) { st.commit(cur.slice(0, -1)); return; }
        if (idx >= 0) { st.commit(cur.slice(0, idx + 1)); return; }
        if (Math.abs(r - last[0]) + Math.abs(c - last[1]) !== 1) { announce('اختر خلية مجاورة لآخر خلية في المسار.'); return; }
        st.commit([...cur, [r, c]]); sfx('tap');
      });
      return b;
    }, 'شبكة المسار'));
    el.append(h('p', { class: 'muted small' }, 'انقر خلية مجاورة لتمديد المسار، وانقر آخر خلية لإزالتها.'));
  }
  render(); return { el, ...st };
};

W.coordinate = (p, ctx) => {
  const s = p.setup; const el = h('div', { class: 'coordgame' });
  const st = stateful(null, render, ctx.onChange);
  function render() {
    el.innerHTML = ''; const sel = st.get();
    if (s.moves) el.append(h('ol', { class: 'moves' }, ...s.moves.map(([d, n]) => h('li', {}, `${DIR_AR[d]} ${fmt(n)}`))));
    el.append(gridLabels(s.grid[0], s.grid[1], (r, c) => {
      const start = s.start && r === s.start[0] && c === s.start[1];
      const obs = (s.observations || []).findIndex(([a, b]) => a === r && b === c);
      const on = sel && sel[0] === r && sel[1] === c;
      const b = h('button', { type: 'button', class: 'cell' + (on ? ' on' : '') + (start ? ' start' : ''), 'aria-pressed': String(!!on), 'aria-label': `${cellName(r, c)}${start ? '، نقطة البداية' : ''}${obs >= 0 ? '، رصد ' + fmt(obs + 1) : ''}` },
        h('span', { class: 'cell-mark', 'aria-hidden': 'true' }, on ? '★' : start ? '◆' : obs >= 0 ? '◉' : ''), h('small', {}, start ? 'بداية' : obs >= 0 ? 'رصد ' + fmt(obs + 1) : ''));
      b.addEventListener('click', () => { st.commit([r, c]); sfx('tap'); });
      return b;
    }, 'شبكة الإحداثيات'));
    el.append(h('p', { class: 'meter', 'aria-live': 'polite' }, sel ? `اخترت ${cellName(sel[0], sel[1])}` : 'لم تختر موضعًا بعد'));
  }
  render(); return { el, ...st };
};

W.mirror = (p, ctx) => {
  const s = p.setup; const el = h('div', { class: 'mirrorgame' });
  const st = stateful(s.mirrorSlots.map(() => null), render, ctx.onChange); let trace = null;
  function render() {
    el.innerHTML = ''; const m = st.get();
    const onPath = new Map((trace?.path || []).map(([r, c, d]) => [`${r},${c}`, d]));
    const arrow = { N: '↑', S: '↓', E: '→', W: '←' };
    el.append(h('p', { class: 'meter' }, `المصدر ${fmt(s.source[0])}،${fmt(s.source[1])} باتجاه ${DIR_AR[s.source[2]]} · المستقبل ${fmt(s.receiver[0])}،${fmt(s.receiver[1])} باتجاه ${DIR_AR[s.receiver[2]]}`));
    el.append(gridLabels(s.grid[0], s.grid[1], (r, c) => {
      const mi = s.mirrorSlots.findIndex(([a, b]) => a === r && b === c);
      const src = s.source[0] === r && s.source[1] === c, rec = s.receiver[0] === r && s.receiver[1] === c;
      const beam = onPath.get(`${r},${c}`);
      const parts = [];
      if (src) parts.push(h('small', { class: 'tag' }, 'مصدر'));
      if (rec) parts.push(h('small', { class: 'tag' }, 'مستقبل'));
      if (mi >= 0) {
        const b = h('button', { type: 'button', class: 'mirror-slot', 'aria-label': `مرآة في ${cellName(r, c)}: ${m[mi] === '/' ? 'مائلة /' : m[mi] === '\\' ? 'مائلة \\' : 'غير مضبوطة'}. انقر للتبديل` }, m[mi] ? h('img', { src: `assets/treasure/design/production/mirror-${m[mi] === '/' ? 'slash' : 'backslash'}.svg`, alt: '' }) : '؟', h('span', { class: 'mirror-txt' }, m[mi] || ''));
        b.addEventListener('click', () => { const c2 = st.get(); const opts = s.options; c2[mi] = opts[(opts.indexOf(c2[mi]) + 1) % opts.length]; trace = null; st.commit(c2); sfx('tap'); });
        parts.push(b);
      }
      if (beam) parts.push(h('span', { class: 'beam-mark', 'aria-hidden': 'true' }, arrow[beam]));
      return h('div', { class: 'cell static' + (beam ? ' lit' : ''), 'aria-label': cellName(r, c) }, ...parts);
    }, 'شبكة المرايا'));
    el.append(h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: () => {
      if (st.get().some(x => !x)) { announce('اضبط كل المرايا قبل تشغيل الشعاع.'); return; }
      trace = V.traceBeam(s, st.get()); render();
      announce({ receiver: 'وصل الشعاع إلى المستقبل.', edge: 'خرج الشعاع من حافة الشبكة.', loop: 'دخل الشعاع في حلقة وتوقف.' }[trace.end]);
    } }, 'شغّل الشعاع وتتبع خلاياه')),
    trace ? h('p', { class: 'meter', 'aria-live': 'polite' }, { receiver: 'وصل الشعاع إلى المستقبل.', edge: 'توقف الشعاع عند حافة الشبكة.', loop: 'توقف الشعاع لأنه دخل حلقة.' }[trace.end]) : null);
  }
  render(); return { el, ...st };
};

W.toggle = (p, ctx) => {
  const s = p.setup; const el = h('div', { class: 'togglegame' });
  const st = stateful([], render, ctx.onChange);
  function render() {
    el.innerHTML = ''; const pressed = st.get(); const state = V.toggleState(s, pressed);
    const lamps = (arr, label) => h('div', { class: 'lamps', role: 'list', 'aria-label': label }, ...arr.map((v, i) => h('div', { class: 'lamp ' + (v ? 'on' : 'off'), role: 'listitem' }, h('img', { src: `assets/treasure/design/production/lamp-${v ? 'on' : 'off'}.svg`, alt: '' }), h('span', {}, `${fmt(i + 1)}: ${v ? 'مضاء' : 'مطفأ'}`))));
    el.append(h('p', { class: 'muted small' }, 'الحالة الآن'), lamps(state, 'حالة المصابيح الآن'), h('p', { class: 'muted small' }, 'الهدف'), lamps(s.target, 'الحالة المطلوبة'));
    el.append(h('div', { class: 'switches' }, ...Object.entries(s.buttons).map(([b, idx]) => {
      const on = pressed.includes(b);
      const btn = h('button', { type: 'button', class: 'switch' + (on ? ' on' : ''), 'aria-pressed': String(on) }, h('b', {}, b), h('small', {}, 'يقلب ' + idx.map(i => fmt(i + 1)).join('، ')), h('small', {}, on ? 'مستخدم' : 'غير مستخدم'));
      btn.addEventListener('click', () => { st.commit(on ? pressed.filter(x => x !== b) : [...pressed, b]); sfx('tap'); });
      return btn;
    })), h('p', { class: 'muted small' }, 'كل مفتاح يقلب المصابيح المذكورة (التبديل لا التشغيل الدائم). الضغط مرة ثانية يلغي أثره.'));
  }
  render(); return { el, ...st };
};

W.graph = (p, ctx) => {
  const s = p.setup; const el = h('div', { class: 'graphgame' });
  const nodes = V.graphNodes(s); const pos = {};
  nodes.forEach((n, i) => { const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2; pos[n] = [150 + 110 * Math.cos(a), 130 + 100 * Math.sin(a)]; });
  const st = stateful([s.start], render, ctx.onChange);
  function render() {
    el.innerHTML = ''; const path = st.get(); const cost = V.pathCost(s, path);
    const onEdge = (a, b) => path.some((x, i) => i && ((path[i - 1] === a && x === b) || (path[i - 1] === b && x === a)));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 300 260'); svg.setAttribute('class', 'graph'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = s.edges.map(([a, b, w]) => { const [x1, y1] = pos[a], [x2, y2] = pos[b]; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="edge${onEdge(a, b) ? ' on' : ''}"/><rect x="${(x1 + x2) / 2 - 13}" y="${(y1 + y2) / 2 - 12}" width="26" height="22" rx="6" class="wbox"/><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + 5}" text-anchor="middle" class="wtext">${fmt(w)}</text>`; }).join('');
    const wrap = h('div', { class: 'graph-wrap' }, svg);
    nodes.forEach(n => {
      const on = path.includes(n);
      const b = h('button', { type: 'button', class: 'node' + (on ? ' on' : '') + (n === s.start ? ' start' : '') + (n === s.end ? ' end' : ''), style: { left: (pos[n][0] / 300 * 100) + '%', top: (pos[n][1] / 260 * 100) + '%' }, 'aria-label': `العقدة ${n}${n === s.start ? '، البداية' : ''}${n === s.end ? '، الوجهة' : ''}${on ? '، في المسار' : ''}` }, n);
      b.addEventListener('click', () => {
        const cur = st.get(); const last = cur[cur.length - 1];
        if (n === last && cur.length > 1) { st.commit(cur.slice(0, -1)); return; }
        if (cur.includes(n)) { announce('العقدة موجودة في المسار. استخدم التراجع لإزالتها.'); return; }
        if (V.pathCost(s, [last, n]) == null) { announce(`لا توجد وصلة مباشرة بين ${last} و${n}.`); return; }
        st.commit([...cur, n]); sfx('tap');
      });
      wrap.append(b);
    });
    el.append(wrap,
      h('ul', { class: 'edge-list', 'aria-label': 'الوصلات وأوزانها' }, ...s.edges.map(([a, b, w]) => h('li', {}, `${a} – ${b}: ${fmt(w)}`))),
      h('p', { class: 'meter', 'aria-live': 'polite' }, `المسار: ${path.join(' ← ')} · التكلفة ${cost == null ? '—' : fmt(cost)}${s.visitAll ? ' · زر كل العقد مرة واحدة' : ''}`));
  }
  render(); return { el, ...st };
};

// Memory: watch → real hide (removed from DOM, so screen readers cannot reach it) → respond.
W.memory = (p, ctx) => {
  const s = p.setup; const el = h('div', { class: 'memorygame' });
  const target = V.memoryTarget(s, p.answer);
  const palette = [...new Set([...s.sequence, ...(s.after || [])])];
  let phase = 'ready'; let board = null; let timer = null; let afterChoice = null;
  const changed = () => ctx.onChange?.(api.get());
  function show() {
    phase = 'watch'; ctx.onPhase?.('watch'); el.innerHTML = '';
    el.append(h('p', { class: 'meter' }, 'شاهد الآن. ستختفي العناصر بعد قليل.'),
      h('ol', { class: 'mem-show', 'aria-label': 'العناصر المعروضة' }, ...s.sequence.map((x, i) => h('li', {}, h('span', { class: 'slot-n' }, fmt(i + 1)), token(x, { big: true })))));
    const bar = h('div', { class: 'exposure' }, h('i', { style: { animationDuration: (ctx.exposureMs || s.exposureMs) + 'ms' } }));
    el.append(bar);
    timer = setTimeout(hide, ctx.exposureMs || s.exposureMs);
  }
  function hide() {
    clearTimeout(timer); phase = 'respond'; ctx.onPhase?.('respond'); el.innerHTML = '';
    if (s.after) {
      el.append(h('p', { class: 'meter' }, 'هذه الأغلفة الآن. أي موضع تغيّر؟'),
        h('ol', { class: 'mem-show' }, ...s.after.map((x, i) => h('li', {}, h('span', { class: 'slot-n' }, fmt(i + 1)), token(x, { big: true })))));
      const row = h('div', { class: 'choices', role: 'radiogroup', 'aria-label': 'الموضع المتغير' });
      s.after.forEach((_, i) => { const b = h('button', { type: 'button', role: 'radio', class: 'choice', 'aria-checked': 'false' }, 'الموضع ' + fmt(i + 1)); b.addEventListener('click', () => { afterChoice = i + 1; [...row.children].forEach((c, j) => { c.setAttribute('aria-checked', String(j === i)); c.classList.toggle('on', j === i); }); changed(); }); row.append(b); });
      el.append(row);
    } else {
      const n = target.length;
      board = slotBoard({ slotLabels: Array.from({ length: n }, (_, i) => i + 1), pieces: palette.map(x => ({ id: x, name: x, label: x })), reusable: true, onChange: changed,
        caption: s.recall === 'reverse' ? 'أعد العناصر بالعكس: من الأخير إلى الأول.' : /^last/.test(s.recall || '') ? `أعد آخر ${fmt(n)} عناصر فقط بترتيب ظهورها.` : 'أعد العناصر بالترتيب نفسه.' });
      el.append(board.el);
    }
  }
  function ready() {
    phase = 'ready'; el.innerHTML = '';
    el.append(h('p', {}, `ستظهر ${fmt(s.sequence.length)} عناصر لمدة ${fmt(Math.round((ctx.exposureMs || s.exposureMs) / 100) / 10)} ثانية ثم تُحجب تمامًا.`),
      h('button', { type: 'button', class: 'btn primary', onclick: show }, 'جاهز للمشاهدة'));
  }
  ready();
  const api = {
    el,
    get: () => s.after ? afterChoice : board ? board.get() : null,
    set: r => { if (phase !== 'respond') hide(); if (s.after) afterChoice = r; else board.set(r); },
    undo: () => board?.undo() || false, reset: () => board?.reset(), canUndo: () => !!board?.canUndo(),
    replay: () => { board = null; afterChoice = null; show(); },
    phase: () => phase,
    destroy: () => clearTimeout(timer),
    afterSuccess: () => el.append(h('div', { class: 'mem-compare' }, h('p', {}, 'الأصل للمقارنة بعد الحل:'), h('ol', { class: 'mem-show small' }, ...s.sequence.map((x, i) => h('li', {}, h('span', { class: 'slot-n' }, fmt(i + 1)), token(x)))))),
  };
  return api;
};

// Free build: place, move, rotate and delete pieces; multiple canvases; optional title.
W.freebuild = (p, ctx) => {
  const s = p.setup; const el = h('div', { class: 'freebuild' });
  const n = s.canvases || 1;
  const initial = ctx.savedWork || { canvases: Array.from({ length: n }, () => ({ pieces: [] })), title: '', updatedAt: null };
  let cur = clone(initial); let active = 0; let sel = null; let hist = [];
  const save = () => { cur.updatedAt = new Date().toISOString(); ctx.onWork?.(clone(cur)); };
  const commit = fn => { hist.push(clone(cur)); fn(); save(); render(); };
  function render() {
    el.innerHTML = ''; const cv = cur.canvases[active];
    if (n > 1) el.append(h('div', { class: 'tabs', role: 'tablist' }, ...cur.canvases.map((_, i) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(i === active), class: 'tab' + (i === active ? ' on' : ''), onclick: () => { active = i; sel = null; render(); } }, `اللوحة ${fmt(i + 1)}`))));
    el.append(h('p', { class: 'meter', 'aria-live': 'polite' }, `القطع ${fmt(cv.pieces.length)} من ${fmt(s.maxPieces)}`));
    const board = h('div', { class: 'canvas', 'aria-label': `لوحة الرسم ${fmt(active + 1)}`, role: 'group' });
    cv.pieces.forEach((pc, i) => {
      const b = h('button', { type: 'button', class: 'placed' + (sel === i ? ' sel' : ''), style: { left: pc.x + '%', top: pc.y + '%', transform: `translate(-50%,-50%) rotate(${pc.r}deg) scale(${pc.s || 1})` }, 'aria-label': `${pc.name}، القطعة ${fmt(i + 1)}${sel === i ? '، محددة' : ''}`, 'aria-pressed': String(sel === i) }, token(pc.name));
      b.addEventListener('click', () => { sel = sel === i ? null : i; render(); });
      b.addEventListener('pointerdown', e => {
        const rect = board.getBoundingClientRect(); let moved = false; const before = clone(cur);
        const mv = ev => { moved = true; pc.x = Math.max(4, Math.min(96, (ev.clientX - rect.left) / rect.width * 100)); pc.y = Math.max(4, Math.min(96, (ev.clientY - rect.top) / rect.height * 100)); b.style.left = pc.x + '%'; b.style.top = pc.y + '%'; };
        const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (moved) { hist.push(before); save(); } };
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      });
      board.append(b);
    });
    el.append(board);
    const tools = h('div', { class: 'row wrap' });
    const move = (dx, dy) => sel != null && commit(() => { const q = cv.pieces[sel]; q.x = Math.max(4, Math.min(96, q.x + dx)); q.y = Math.max(4, Math.min(96, q.y + dy)); });
    if (sel != null) tools.append(
      h('button', { type: 'button', class: 'btn', onclick: () => move(0, -6) }, '↑'), h('button', { type: 'button', class: 'btn', onclick: () => move(0, 6) }, '↓'),
      h('button', { type: 'button', class: 'btn', onclick: () => move(6, 0) }, '→'), h('button', { type: 'button', class: 'btn', onclick: () => move(-6, 0) }, '←'),
      h('button', { type: 'button', class: 'btn', onclick: () => commit(() => { cv.pieces[sel].r = (cv.pieces[sel].r + 45) % 360; }) }, 'دوّر ٤٥°'),
      h('button', { type: 'button', class: 'btn', onclick: () => commit(() => { cv.pieces[sel].s = Math.min(2, (cv.pieces[sel].s || 1) + .25); }) }, 'كبّر'),
      h('button', { type: 'button', class: 'btn', onclick: () => commit(() => { cv.pieces[sel].s = Math.max(.5, (cv.pieces[sel].s || 1) - .25); }) }, 'صغّر'),
      h('button', { type: 'button', class: 'btn', onclick: () => commit(() => { cv.pieces.splice(sel, 1); sel = null; }) }, 'احذف القطعة'));
    el.append(tools);
    el.append(h('div', { class: 'tray', 'aria-label': 'أضف قطعة' }, ...s.pieces.map(name => h('button', { type: 'button', class: 'piece', disabled: cv.pieces.length >= s.maxPieces || null, onclick: () => commit(() => { cv.pieces.push({ name, x: 30 + Math.random() * 40, y: 30 + Math.random() * 40, r: 0, s: 1 }); sel = cv.pieces.length - 1; }) }, token(name), h('small', {}, 'أضف')))));
    if (s.optionalTitle || s.saveOutput) {
      const inp = h('input', { type: 'text', class: 'title-input', value: cur.title || '', placeholder: s.optionalTitle ? 'عنوان اختياري' : 'اسم اختياري للعمل', 'aria-label': 'عنوان العمل' });
      inp.addEventListener('change', () => commit(() => { cur.title = inp.value.trim(); }));
      el.append(h('label', { class: 'num-row' }, 'العنوان: ', inp));
    }
    el.append(h('p', { class: 'muted small' }, cur.updatedAt ? `حُفظ العمل تلقائيًا في هذا الجهاز (${new Date(cur.updatedAt).toLocaleTimeString('ar')})` : 'يُحفظ العمل تلقائيًا عند كل تعديل. لا يوجد شكل صحيح واحد.'));
  }
  render();
  return { el, get: () => clone(cur), set: () => {}, undo: () => { if (!hist.length) return false; cur = hist.pop(); save(); render(); return true; }, reset: () => { hist.push(clone(cur)); cur.canvases[active].pieces = []; save(); render(); }, canUndo: () => hist.length > 0 };
};

export function buildWidget(puzzle, ctx) {
  const f = W[puzzle.type]; if (!f) throw new Error('No widget for ' + puzzle.type);
  return f(puzzle, ctx);
}
export const TYPE_LABEL = { sequence: 'ترتيب', assignment: 'توزيع', balance: 'ميزان', rotate: 'تدوير', path: 'مسار', memory: 'ذاكرة', subset: 'حمولة', single: 'استنتاج', allocation: 'توزيع كميات', schedule: 'جدولة', multiselect: 'تحديد مجموعة', graph: 'شبكة طرق', numeric: 'حساب', mirror: 'مرايا', toggle: 'مصابيح', coordinate: 'إحداثيات', 'choice-story': 'قرار قصصي', freebuild: 'رسم حر' };
