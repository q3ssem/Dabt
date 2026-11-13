// Trial engines for the 17 lab games that carry specifications and introductory
// examples in the design pack but no authored case bank. Trials are produced from
// explicit, computable rules (seeded per session); a few small item sets
// (deduction, evidence, analogy) were authored for this build and are listed in the report.
import { h, fmt, token, shuffle, announce } from '../core/ui.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const pick = (a, rng) => a[Math.floor(rng() * a.length)];
const now = () => performance.now();
function choiceRow(options, onPick, { label = 'الخيارات', render = o => fmt(o) } = {}) {
  const row = h('div', { class: 'choices', role: 'group', 'aria-label': label });
  options.forEach((o, i) => row.append(h('button', { type: 'button', class: 'choice', onclick: () => { [...row.children].forEach(b => b.disabled = true); onPick(o, i); } }, render(o))));
  return row;
}

// ------------------------------------------------------------ rule switch
const SHAPES = [['مثلث', '▲'], ['مربع', '■'], ['دائرة', '●'], ['نجمة', '★']];
const ruleSwitch = {
  makeTrials(rng) {
    const out = []; let rule = 'شكل';
    for (let i = 0; i < 13; i++) {
      if (i >= 4 && (i - 4) % 3 === 0) rule = rule === 'شكل' ? 'عدد' : 'شكل';
      let s, n; do { s = Math.floor(rng() * 4); n = Math.floor(rng() * 4); } while (s === n); // avoid trials where both rules give the same seat
      out.push({ rule, shape: s, count: n + 1, tag: i === 0 ? 'repeat' : out[i - 1].rule === rule ? 'repeat' : 'switch' });
    }
    return out;
  },
  async run(el, t, finish) {
    el.append(h('div', { class: 'rule-panels' }, ...['شكل', 'عدد'].map(r => h('div', { class: 'rule-panel' + (t.rule === r ? ' lit' : '') }, `قاعدة ${r}`, t.rule === r ? h('b', {}, ' ← مضاءة') : null))));
    announce(`القاعدة الآن: ${t.rule}`);
    await wait(1200);
    const [nm, gl] = SHAPES[t.shape];
    el.append(h('div', { class: 'stimulus big', 'aria-label': `${nm} يحمل العدد ${t.count}` }, h('span', { class: 'glyph' }, gl), h('b', {}, fmt(t.count))));
    const seats = SHAPES.map(([n, g], i) => ({ n, g, num: i + 1 }));
    const t0 = now();
    el.append(choiceRow(seats, s => {
      const correct = t.rule === 'شكل' ? s.n === nm : s.num === t.count;
      finish({ correct, rt: now() - t0, tag: t.tag, explain: t.rule === 'شكل' ? `القاعدة شكل: المقعد ${nm}.` : `القاعدة عدد: المقعد ${fmt(t.count)}.` });
    }, { label: 'المقاعد', render: s => h('span', { class: 'seat' }, h('span', { class: 'glyph' }, s.g), ` ${s.n} · ${fmt(s.num)}`) }));
  },
};

// ------------------------------------------------------------ conjunction search
const PATTERNS = ['مخطط', 'منقط', 'مصمت'];
function shapeSvg(shape, pattern, id) {
  const fill = pattern === 'مصمت' ? '#17665D' : `url(#p-${pattern === 'مخطط' ? 's' : 'd'}-${id})`;
  const defs = `<defs><pattern id="p-s-${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#FFFCF6"/><rect width="4" height="8" fill="#17665D"/></pattern><pattern id="p-d-${id}" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#FFFCF6"/><circle cx="4.5" cy="4.5" r="2.2" fill="#17665D"/></pattern></defs>`;
  const body = shape === 'دائرة' ? `<circle cx="24" cy="24" r="19" fill="${fill}" stroke="#162E36" stroke-width="3"/>` : `<rect x="6" y="6" width="36" height="36" rx="3" fill="${fill}" stroke="#162E36" stroke-width="3"/>`;
  return `<svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">${defs}${body}</svg>`;
}
const conjunction = {
  makeTrials(rng) {
    return [6, 6, 9, 9, 12, 12, 16, 16].map(n => {
      const target = { shape: pick(['دائرة', 'مربع'], rng), pattern: pick(['مخطط', 'منقط'], rng) };
      const k = 1 + Math.floor(rng() * 3); const items = [];
      for (let i = 0; i < k; i++) items.push({ ...target });
      while (items.length < n) {
        const c = rng() < .5 ? { shape: target.shape, pattern: pick(PATTERNS.filter(p => p !== target.pattern), rng) } : { shape: target.shape === 'دائرة' ? 'مربع' : 'دائرة', pattern: target.pattern };
        items.push(c);
      }
      return { target, items: shuffle(items, rng), tag: 'n' + n };
    });
  },
  run(el, t, finish) {
    const isT = x => x.shape === t.target.shape && x.pattern === t.target.pattern;
    const chosen = new Set(); const t0 = now();
    el.append(h('div', { class: 'ref-card' }, h('span', { html: shapeSvg(t.target.shape, t.target.pattern, 'ref') }), h('b', {}, `ابحث عن كل: ${t.target.shape} ${t.target.pattern}`)));
    const grid = h('div', { class: 'search-grid', style: { '--cols': Math.ceil(Math.sqrt(t.items.length)) } });
    t.items.forEach((x, i) => {
      const b = h('button', { type: 'button', class: 'search-item', 'aria-pressed': 'false', 'aria-label': `${x.shape} ${x.pattern}`, html: shapeSvg(x.shape, x.pattern, i) });
      b.addEventListener('click', () => { chosen.has(i) ? chosen.delete(i) : chosen.add(i); b.setAttribute('aria-pressed', String(chosen.has(i))); b.classList.toggle('on', chosen.has(i)); });
      grid.append(b);
    });
    el.append(grid, h('button', { type: 'button', class: 'btn primary', onclick: () => {
      const miss = t.items.filter((x, i) => isT(x) && !chosen.has(i)).length; const extra = [...chosen].filter(i => !isT(t.items[i])).length;
      finish({ correct: !miss && !extra, rt: now() - t0, tag: t.tag, errors: { miss, extra }, explain: `سهو ${fmt(miss)} · إضافة ${fmt(extra)}` });
    } }, 'انتهيت من التحديد'));
  },
};

// ------------------------------------------------------------ corsi
const ISLANDS = [[18, 20], [52, 12], [82, 24], [12, 52], [46, 46], [80, 56], [22, 84], [55, 80], [86, 88]];
const ISL_SHAPE = ['▲', '■', '●', '◆', '★', '⬟', '✚', '⬢', '▼'];
const corsi = {
  makeTrials(rng) { return [3, 3, 4, 4, 5, 5].map(n => ({ seq: shuffle([...Array(9).keys()], rng).slice(0, n), tag: 'len' + n })); },
  async run(el, t, finish, opts) {
    const map = h('div', { class: 'islands', dir: 'ltr' }); const btns = ISLANDS.map(([x, y], i) => h('button', { type: 'button', class: 'island', disabled: true, style: { left: x + '%', top: y + '%' }, 'aria-label': `جزيرة ${i + 1}` }, h('span', { 'aria-hidden': 'true' }, ISL_SHAPE[i]), h('small', {}, fmt(i + 1))));
    btns.forEach(b => map.append(b)); el.append(h('p', { class: 'meter' }, 'شاهد الإضاءة.'), map);
    const step = opts.exposureStep || 900;
    for (const i of t.seq) { await wait(250); btns[i].classList.add('lit'); await wait(step); btns[i].classList.remove('lit'); }
    // hidden: nothing of the sequence remains in the DOM
    el.querySelector('.meter').textContent = `أعد المسار: ${fmt(t.seq.length)} جزر بالترتيب.`;
    const resp = []; const t0 = now(); btns.forEach(b => b.disabled = false);
    const out = h('p', { class: 'meter', 'aria-live': 'polite' }, 'اخترت ٠');
    const done = () => { btns.forEach(b => b.disabled = true); finish({ correct: resp.join() === t.seq.join(), rt: now() - t0, tag: t.tag, explain: `الطول ${fmt(t.seq.length)}` }); };
    btns.forEach((b, i) => b.addEventListener('click', () => { resp.push(i); b.classList.add('picked'); setTimeout(() => b.classList.remove('picked'), 300); out.textContent = `اخترت ${fmt(resp.length)} من ${fmt(t.seq.length)}`; if (resp.length === t.seq.length) done(); }));
    el.append(out, h('button', { type: 'button', class: 'btn', onclick: () => { resp.pop(); out.textContent = `اخترت ${fmt(resp.length)} من ${fmt(t.seq.length)}`; } }, 'تراجع خطوة'));
  },
};

// ------------------------------------------------------------ stroop
const INKS = [['أحمر', '#B3261E', '●'], ['أزرق', '#1F5FB4', '▲'], ['أخضر', '#1E7A44', '■'], ['بنفسجي', '#6B3FA0', '◆']];
const stroop = {
  makeTrials(rng) {
    const out = [];
    [[2, 4], [3, 4], [4, 4]].forEach(([k, n]) => { for (let i = 0; i < n; i++) { const pal = INKS.slice(0, k); const ink = Math.floor(rng() * k); const cong = i % 2 === 0; let word = ink; if (!cong) do { word = Math.floor(rng() * k); } while (word === ink); out.push({ k, ink, word, tag: cong ? 'congruent' : 'incongruent' }); } });
    return shuffle(out, rng);
  },
  run(el, t, finish, opts) {
    const [wname] = INKS[t.word]; const [iname, icol, ishape] = INKS[t.ink];
    el.append(h('div', { class: 'stroop-word', style: { color: icol }, 'aria-label': `كلمة ${wname}` }, wname, opts.altColors ? h('span', { class: 'alt-mark', 'aria-hidden': 'true' }, ' ' + ishape) : null),
      h('p', { class: 'muted small' }, opts.altColors ? 'وضع بديل: كل حبر له شكل مرافق. يُسجل منفصلًا.' : 'اختر لون الحبر، لا معنى الكلمة.'));
    const t0 = now();
    el.append(choiceRow(INKS.slice(0, t.k), c => finish({ correct: c[0] === iname, rt: now() - t0, tag: t.tag, explain: `الحبر ${iname}` }), { render: c => h('span', {}, h('i', { class: 'swatch', style: { background: c[1] } }), opts.altColors ? ' ' + c[2] : '', ' ' + c[0]) }));
  },
};

// ------------------------------------------------------------ go / no-go
const goNoGo = {
  makeTrials(rng) {
    for (; ;) {
      const arr = shuffle([...Array(18).fill('go'), ...Array(6).fill('nogo')], rng);
      let run = 0, ok = true; for (const x of arr) { run = x === 'go' ? run + 1 : 0; if (run > 4) { ok = false; break; } }
      if (ok) return arr.map(x => ({ kind: x, tag: x }));
    }
  },
  async run(el, t, finish) {
    const stim = h('div', { class: 'gng-stim', 'aria-live': 'assertive' });
    const btn = h('button', { type: 'button', class: 'btn primary huge' }, 'اضغط');
    el.append(stim, btn, h('p', { class: 'muted small' }, 'دائرة مفتوحة = اضغط (أو مفتاح المسافة). مربع متقاطع = انتظر.'));
    await wait(600);
    stim.innerHTML = t.kind === 'go' ? '<span class="gng go" aria-label="دائرة مفتوحة: اضغط">◯</span>' : '<span class="gng nogo" aria-label="مربع متقاطع: انتظر">⊠</span>';
    const t0 = now(); let pressed = false;
    const press = () => { if (pressed) return; pressed = true; cleanup(); const rt = now() - t0; finish(t.kind === 'go' ? { correct: true, rt, tag: 'go' } : { correct: false, rt: null, tag: 'nogo', errors: { commission: 1 }, explain: 'ضغط عند علامة التوقف' }); };
    const key = e => { if (e.code === 'Space') { e.preventDefault(); press(); } };
    btn.addEventListener('click', press); window.addEventListener('keydown', key);
    const cleanup = () => { window.removeEventListener('keydown', key); clearTimeout(hide); clearTimeout(end); };
    const hide = setTimeout(() => { stim.innerHTML = ''; }, 800);
    const end = setTimeout(() => { if (pressed) return; pressed = true; cleanup(); finish(t.kind === 'go' ? { correct: false, rt: null, tag: 'go', errors: { omission: 1 }, explain: 'لم تضغط عند علامة المضي' } : { correct: true, rt: null, tag: 'nogo', explain: 'امتناع صحيح' }); }, 1200);
  },
};

// ------------------------------------------------------------ temporal order
const TEMP_ITEMS = ['قمر', 'مفتاح', 'ورقة', 'قارب', 'نجمة', 'شمس', 'صدفة', 'جسر', 'تفاحة'];
const temporal = {
  makeTrials(rng) { return [3, 3, 4, 4, 5, 5].map(n => ({ seq: shuffle(TEMP_ITEMS, rng).slice(0, n), tag: 'len' + n })); },
  async run(el, t, finish, opts) {
    const box = h('div', { class: 'temporal-show', 'aria-live': 'polite' }); el.append(h('p', { class: 'meter' }, 'تظهر البطاقات واحدة واحدة.'), box);
    for (const x of t.seq) { box.replaceChildren(token(x, { big: true })); await wait(opts.exposureStep || 900); box.replaceChildren(); await wait(200); }
    box.remove(); el.querySelector('.meter').textContent = 'رتب البطاقات بحسب ظهورها.';
    const order = shuffle(t.seq); const slots = Array(t.seq.length).fill(null); let sel = null; const t0 = now();
    const area = h('div'); el.append(area);
    const render = () => {
      area.innerHTML = '';
      area.append(h('ol', { class: 'slots' }, ...slots.map((x, i) => h('li', {}, h('button', { type: 'button', class: 'slot' + (x ? ' filled' : ''), onclick: () => { if (sel) { const j = slots.indexOf(sel); if (j >= 0) slots[j] = slots[i]; slots[i] = sel; sel = null; } else slots[i] = null; render(); } }, h('span', { class: 'slot-n' }, fmt(i + 1)), x ? token(x) : '—')))),
        h('div', { class: 'tray' }, ...order.filter(x => !slots.includes(x)).map(x => h('button', { type: 'button', class: 'piece' + (sel === x ? ' selected' : ''), 'aria-pressed': String(sel === x), onclick: () => { sel = sel === x ? null : x; render(); } }, token(x)))),
        h('button', { type: 'button', class: 'btn primary', disabled: slots.includes(null) || null, onclick: () => { const pos = slots.filter((x, i) => x === t.seq[i]).length; finish({ correct: pos === t.seq.length, rt: now() - t0, tag: t.tag, errors: { wrongPositions: t.seq.length - pos }, explain: `مواضع صحيحة ${fmt(pos)} من ${fmt(t.seq.length)}` }); } }, 'تحقق'));
    };
    render();
  },
};

// ------------------------------------------------------------ number sense
const numberSense = {
  makeTrials(rng) {
    const out = [];
    for (const [a, b] of [[1, 2], [2, 3], [4, 5]]) for (let i = 0; i < 4; i++) {
      const maxMul = Math.floor(20 / b); const m = 1 + Math.floor(rng() * maxMul); let small = a * m, big = b * m;
      if (small < 4) { const f = Math.ceil(4 / small); small *= f; big *= f; }
      const leftBig = rng() < .5; out.push({ left: leftBig ? big : small, right: leftBig ? small : big, equalArea: i % 2 === 0, tag: `${a}:${b}` });
    }
    return out;
  },
  async run(el, t, finish, opts) {
    const field = (n, other) => {
      const d = h('div', { class: 'dotfield', 'aria-hidden': 'true' });
      // equalArea: total ink area equal across fields, so dot size is not a reliable cue
      const r = t.equalArea ? 7 * Math.sqrt(Math.max(n, other) / n) : 7;
      const placed = [];
      for (let i = 0; i < n; i++) { let x, y, tries = 0; do { x = 8 + Math.random() * 84; y = 8 + Math.random() * 84; tries++; } while (tries < 60 && placed.some(([a, b]) => Math.hypot(a - x, b - y) < 11)); placed.push([x, y]); d.append(h('i', { style: { left: x + '%', top: y + '%', width: r * 2 + 'px', height: r * 2 + 'px' } })); }
      return d;
    };
    const wrap = h('div', { class: 'dotfields' }, h('div', {}, h('b', {}, 'الحقل أ'), field(t.left, t.right)), h('div', {}, h('b', {}, 'الحقل ب'), field(t.right, t.left)));
    el.append(wrap); await wait(opts.exposureMs || 1000); wrap.remove();
    const t0 = now();
    el.append(h('p', { class: 'meter' }, 'أي حقل كان فيه نقاط أكثر؟'), choiceRow(['الحقل أ', 'الحقل ب'], (c, i) => finish({ correct: (i === 0) === (t.left > t.right), rt: now() - t0, tag: t.tag, explain: `أ ${fmt(t.left)} · ب ${fmt(t.right)}` })));
  },
};

// ------------------------------------------------------------ deduction (authored templates)
const NAMES = ['س', 'ص', 'ع', 'ل'];
const deduction = {
  makeTrials(rng) {
    const x = () => pick(NAMES, rng);
    const T = [
      () => { const n = x(); return { premises: ['كل بطاقات «أ» مختومة.', `${n} بطاقة من نوع «أ».`], options: [`${n} مختومة.`, `${n} ليست مختومة.`, 'كل البطاقات المختومة من نوع «أ».', 'بعض بطاقات «أ» غير مختومة.'], answer: 0, why: 'كل «أ» مختومة، و' + n + ' من «أ»، فيلزم أنها مختومة. أما «كل المختوم من أ» فلا تذكره المقدمات.', tag: '2' }; },
      () => { const n = x(); return { premises: ['كل الخرائط في الصندوق الأزرق.', 'لا شيء في الصندوق الأزرق مبلل.', `${n} خريطة.`], options: [`${n} ليست مبللة.`, `${n} في الصندوق الأحمر.`, 'بعض الخرائط مبللة.', `${n} ليست خريطة.`], answer: 0, why: `${n} خريطة، فهي في الأزرق، ولا شيء فيه مبلل.`, tag: '3' }; },
      () => ({ premises: ['إذا أضاء المصباح أ أضاء ب.', 'إذا أضاء ب أضاء ج.', 'المصباح أ مضاء.', 'المصباح د مطفأ.'], options: ['ج مضاء.', 'د مضاء.', 'ج مطفأ.', 'ب مطفأ.'], answer: 0, why: 'أ مضاء ⇒ ب مضاء ⇒ ج مضاء. حالة د لا تؤثر.', tag: '4' }),
    ];
    return [0, 0, 1, 1, 2, 2].map(i => { const q = T[i](); const order = shuffle(q.options.map((o, k) => k), rng); return { ...q, options: order.map(k => q.options[k]), answer: order.indexOf(q.answer) }; });
  },
  run(el, t, finish) {
    const t0 = now();
    el.append(h('ol', { class: 'premises' }, ...t.premises.map(p => h('li', {}, p))), h('p', { class: 'meter' }, 'اختر الاستنتاج اللازم من المقدمات وحدها:'),
      choiceRow(t.options, (o, i) => finish({ correct: i === t.answer, rt: now() - t0, tag: 'premises' + t.tag, explain: t.why })));
  },
};

// ------------------------------------------------------------ planning
const ACTIONS = ['مولد', 'برج', 'مفتاح', 'جسر', 'بوابة', 'مصباح', 'خريطة'];
const planning = {
  makeTrials(rng) {
    const mk = (n, branched, limit) => {
      const acts = shuffle(ACTIONS, rng).slice(0, n + (limit ? 1 : 0)); const req = acts.slice(0, n);
      const before = []; for (let i = 1; i < n; i++) before.push([req[branched && i > 1 ? Math.floor(rng() * i) : i - 1], req[i]]);
      const cost = Object.fromEntries(acts.map(a => [a, 1 + Math.floor(rng() * 3)]));
      const budget = req.reduce((s, a) => s + cost[a], 0);
      return { acts, req, before, cost, budget, decoy: limit ? acts[n] : null, tag: `${n} إجراءات${branched ? ' متفرعة' : ' خطية'}${limit ? ' مع حد مورد' : ''}` };
    };
    return [mk(3, false, false), mk(3, false, false), mk(4, true, false), mk(4, true, false), mk(5, true, true), mk(5, true, true)];
  },
  run(el, t, finish) {
    const t0 = now(); let revisions = 0;
    el.append(h('ul', { class: 'deps' }, ...t.before.map(([a, b]) => h('li', {}, `${a} قبل ${b}`))),
      h('p', { class: 'meter' }, `الميزانية ${fmt(t.budget)} وحدة طاقة. ${t.decoy ? 'ليست كل البطاقات لازمة للهدف.' : 'استخدم كل الإجراءات.'}`));
    const n = t.req.length; const slots = Array(n).fill(null); let sel = null; const area = h('div'); el.append(area);
    const used = () => slots.filter(Boolean).reduce((s, a) => s + t.cost[a], 0);
    const render = () => {
      area.innerHTML = '';
      area.append(h('p', { class: 'meter', 'aria-live': 'polite' }, `المستخدم ${fmt(used())} من ${fmt(t.budget)}`),
        h('ol', { class: 'slots' }, ...slots.map((x, i) => h('li', {}, h('button', { type: 'button', class: 'slot' + (x ? ' filled' : ''), onclick: () => { if (x) revisions++; if (sel) { const j = slots.indexOf(sel); if (j >= 0) slots[j] = slots[i]; slots[i] = sel; sel = null; } else slots[i] = null; render(); } }, h('span', { class: 'slot-n' }, fmt(i + 1)), x ? `${x} (${fmt(t.cost[x])})` : '—')))),
        h('div', { class: 'tray' }, ...t.acts.filter(a => !slots.includes(a)).map(a => h('button', { type: 'button', class: 'piece' + (sel === a ? ' selected' : ''), 'aria-pressed': String(sel === a), onclick: () => { sel = sel === a ? null : a; render(); } }, `${a} · كلفة ${fmt(t.cost[a])}`))),
        h('button', { type: 'button', class: 'btn primary', disabled: slots.includes(null) || null, onclick: () => {
          const okDeps = t.before.every(([a, b]) => slots.indexOf(a) >= 0 && slots.indexOf(a) < slots.indexOf(b));
          const okSet = t.req.every(a => slots.includes(a)); const okBudget = used() <= t.budget;
          finish({ correct: okDeps && okSet && okBudget, rt: now() - t0, tag: t.tag, errors: { revisions }, explain: !okSet ? 'ينقص إجراء لازم للهدف.' : !okDeps ? 'علاقة سبق غير محققة.' : !okBudget ? 'تجاوزت الميزانية.' : 'خطة صالحة؛ كل ترتيب يحقق العلاقات مقبول.' });
        } }, 'نفّذ الخطة افتراضيًا'));
    };
    render();
  },
};

// ------------------------------------------------------------ visual rotation
const BASE = [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]]; // F-pentomino: no rotational or mirror symmetry
const rot = cells => cells.map(([r, c]) => [c, -r]);
const mirror = cells => cells.map(([r, c]) => [r, -c]);
const norm = cells => { const mr = Math.min(...cells.map(x => x[0])), mc = Math.min(...cells.map(x => x[1])); return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
const key = c => JSON.stringify(norm(c));
function shapeGrid(cells, label) {
  const n = norm(cells); const g = h('div', { class: 'mini-grid', dir: 'ltr', role: 'img', 'aria-label': label });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) g.append(h('i', { class: n.some(([a, b]) => a === r && b === c) ? 'on' : '' }));
  return g;
}
const rotation = {
  makeTrials(rng) {
    const T = [];
    const kinds = [['٩٠° مع الساعة', c => rot(c)], ['١٨٠°', c => rot(rot(c))], ['قلب أفقي ثم ٩٠° مع الساعة', c => rot(mirror(c))]];
    kinds.forEach(([label, f], li) => { for (let i = 0; i < 3; i++) T.push({ label, f, li, start: [rot, x => x, c => rot(rot(rot(c)))][i](BASE), tag: 'k' + li }); });
    return T;
  },
  run(el, t, finish) {
    const target = t.f(t.start);
    const cands = [target, rot(t.start), rot(rot(t.start)), mirror(t.start), rot(rot(rot(t.start))), mirror(rot(t.start))];
    const uniq = []; for (const c of cands) if (!uniq.some(u => key(u) === key(c))) uniq.push(c);
    const opts = shuffle(uniq.slice(0, 4)); const t0 = now();
    el.append(h('div', { class: 'rot-src' }, shapeGrid(t.start, 'الشكل الأصلي'), h('b', { class: 'rot-arrow' }, `→ ${t.label}`)),
      h('p', { class: 'muted small' }, 'الدوران يحافظ على الشكل؛ القلب انعكاس منفصل عن الدوران.'),
      choiceRow(opts, o => finish({ correct: key(o) === key(target), rt: now() - t0, tag: t.tag, explain: `التحويل: ${t.label}` }), { render: o => shapeGrid(o, 'خيار') }));
  },
};

// ------------------------------------------------------------ prospective memory
const SEA = ['قارب', 'صدفة', 'مرساة', 'موجة'], LAND = ['شجرة', 'جسر', 'حجر', 'تفاحة', 'كرسي'];
const prospective = {
  makeTrials(rng, opts) {
    const n = 16; const cues = opts.intentions === 2 ? ['مرساة', 'نجمة'] : ['مرساة'];
    const cueIdx = new Set(shuffle([...Array(n - 2).keys()].map(i => i + 2), rng).slice(0, cues.length * 2));
    let ci = 0;
    return [...Array(n)].map((_, i) => { const sea = rng() < .5; return { item: pick(sea ? SEA : LAND, rng), sea, stamp: cueIdx.has(i) ? cues[(ci++) % cues.length] : null, tag: cueIdx.has(i) ? 'cue' : 'sort' }; });
  },
  intro: opts => `النية: حين يظهر ختم ${opts.intentions === 2 ? 'المرساة أو النجمة' : 'المرساة'} على بطاقة اضغط «تذكرت» قبل فرزها، ثم أكمل الفرز.`,
  run(el, t, finish) {
    let remembered = false; const t0 = now();
    el.append(h('div', { class: 'pm-card' }, token(t.item, { big: true }), t.stamp ? h('span', { class: 'stamp' }, h('img', { src: `assets/shared/symbols/${t.stamp === 'مرساة' ? 'object-03' : 'object-07'}.svg`, alt: '' }), `ختم ${t.stamp}`) : null),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn', onclick: e => { remembered = true; e.target.disabled = true; e.target.textContent = 'سُجل التذكر'; } }, 'تذكرت'),
        ...['بحري', 'بري'].map(k => h('button', { type: 'button', class: 'btn primary', onclick: () => {
          const sortOk = (k === 'بحري') === t.sea;
          finish({ correct: sortOk, rt: now() - t0, tag: 'sort', pm: t.stamp ? (remembered ? 'hit' : 'miss') : (remembered ? 'false' : null), explain: `${t.item}: ${t.sea ? 'بحري' : 'بري'}${t.stamp ? (remembered ? ' · نُفذت النية' : ' · فاتت النية') : ''}` });
        } }, k))));
  },
};

// ------------------------------------------------------------ pattern matrix
const patternMatrix = {
  makeTrials(rng) {
    const T = [];
    for (let i = 0; i < 3; i++) { const a = 1 + Math.floor(rng() * 6), k = 2 + Math.floor(rng() * 4); T.push({ rule: `زد ${fmt(k)}`, seq: [a, a + k, a + 2 * k, a + 3 * k], tag: 'add' }); }
    for (let i = 0; i < 3; i++) { const a = 1 + Math.floor(rng() * 3); T.push({ rule: 'اضرب في ٢', seq: [a, a * 2, a * 4, a * 8], tag: 'mul' }); }
    for (let i = 0; i < 3; i++) { const a = 1 + Math.floor(rng() * 5), p = 1 + Math.floor(rng() * 3), q = 3 + Math.floor(rng() * 3); T.push({ rule: `تناوب: زد ${fmt(p)} ثم زد ${fmt(q)}`, seq: [a, a + p, a + p + q, a + 2 * p + q, a + 2 * p + 2 * q], tag: 'alt' }); }
    return T.map(t => ({ ...t, missing: t.seq.length - 1 }));
  },
  run(el, t, finish) {
    const t0 = now(); const input = h('input', { type: 'text', inputmode: 'numeric', class: 'num-input', 'aria-label': 'العنصر الناقص' });
    el.append(h('p', { class: 'meter' }, `القاعدة المعلنة: ${t.rule}`), h('div', { class: 'series', dir: 'ltr' }, ...t.seq.map((v, i) => h('span', { class: 'cellnum' }, i === t.missing ? '؟' : fmt(v)))),
      h('label', { class: 'num-row' }, 'العنصر الناقص: ', input),
      h('button', { type: 'button', class: 'btn primary', onclick: () => { const v = Number(String(input.value).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))); if (!input.value.trim()) return; finish({ correct: v === t.seq[t.missing], rt: now() - t0, tag: t.tag, explain: `الجواب ${fmt(t.seq[t.missing])}` }); } }, 'تحقق'));
  },
};

// ------------------------------------------------------------ probability
const probability = {
  makeTrials(rng) {
    const T = [];
    for (let i = 0; i < 3; i++) { const r = 1 + Math.floor(rng() * 5), b = 1 + Math.floor(rng() * 5); T.push({ bags: [[r, b]], q: 'أيهما أرجح عند سحب قطعة واحدة؟', opts: ['أحمر', 'أزرق', 'متساويان'], ans: r > b ? 0 : r < b ? 1 : 2, tag: 'one' }); }
    const pairs = [[[2, 2], [4, 4]], [[3, 1], [5, 3]], [[1, 3], [2, 4]]];
    pairs.forEach(([A, B]) => { const pa = A[0] / (A[0] + A[1]), pb = B[0] / (B[0] + B[1]); T.push({ bags: [A, B], q: 'من أي كيس فرصة سحب الأحمر أكبر؟', opts: ['كيس أ', 'كيس ب', 'متساوية'], ans: Math.abs(pa - pb) < 1e-9 ? 2 : pa > pb ? 0 : 1, tag: 'two' }); });
    for (let i = 0; i < 3; i++) { const r = 2 + i, b = 3; T.push({ bags: [[r, b]], noReplace: true, q: 'سحبنا قطعة حمراء ولم نرجعها. في السحبة التالية أيهما أرجح؟', opts: ['أحمر', 'أزرق', 'متساويان'], ans: r - 1 > b ? 0 : r - 1 < b ? 1 : 2, tag: 'noreplace' }); }
    return T;
  },
  run(el, t, finish) {
    const bag = ([r, b], name) => h('div', { class: 'bag' }, h('b', {}, name), h('div', { class: 'bag-items' }, ...Array(r).fill(0).map(() => h('span', { class: 'red', 'aria-hidden': 'true' }, '●')), ...Array(b).fill(0).map(() => h('span', { class: 'blue', 'aria-hidden': 'true' }, '▲'))), h('small', {}, `أحمر ● ${fmt(r)} · أزرق ▲ ${fmt(b)}`));
    const t0 = now();
    el.append(h('div', { class: 'bags' }, ...t.bags.map((b, i) => bag(b, t.bags.length > 1 ? (i ? 'كيس ب' : 'كيس أ') : 'الكيس'))),
      h('p', { class: 'muted small' }, `كل القطع متساوية الفرص. ${t.noReplace ? 'السحب دون إرجاع.' : 'السحب بإرجاع.'}`),
      h('p', { class: 'meter' }, t.q), choiceRow(t.opts, (o, i) => finish({ correct: i === t.ans, rt: now() - t0, tag: t.tag, explain: `الجواب: ${t.opts[t.ans]}` })));
  },
};

// ------------------------------------------------------------ working update
const workingUpdate = {
  makeTrials(rng) { const T = []; for (const n of [1, 1, 1, 2, 2, 2, 3, 3, 3]) { const len = 4 + Math.floor(rng() * 4); T.push({ n, stream: [...Array(len)].map(() => 1 + Math.floor(rng() * 9)), tag: 'last' + n }); } return T; },
  async run(el, t, finish, opts) {
    const win = h('div', { class: 'stream-window', 'aria-live': 'polite' }); el.append(h('p', { class: 'meter' }, `احتفظ بآخر ${fmt(t.n)} ${t.n === 1 ? 'رقم' : 'أرقام'}.`), win);
    for (const v of t.stream) { win.textContent = fmt(v); await wait(opts.exposureStep || 800); win.textContent = ''; await wait(200); }
    win.remove();
    const want = t.stream.slice(-t.n); const got = []; const t0 = now(); const out = h('p', { class: 'meter', 'aria-live': 'polite' }, '—');
    const pad = h('div', { class: 'keypad', dir: 'ltr' }, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => h('button', { type: 'button', class: 'btn', onclick: () => { if (got.length < t.n) { got.push(d); out.textContent = got.map(fmt).join(' '); } if (got.length === t.n) finish({ correct: got.join() === want.join(), rt: now() - t0, tag: t.tag, explain: `آخر ${fmt(t.n)}: ${want.map(fmt).join(' ')}` }); } }, fmt(d))));
    el.append(h('p', {}, `أدخل آخر ${fmt(t.n)} بترتيب ظهورها:`), out, pad, h('button', { type: 'button', class: 'btn', onclick: () => { got.pop(); out.textContent = got.map(fmt).join(' ') || '—'; } }, 'تراجع'));
  },
};

// ------------------------------------------------------------ evidence check (authored files)
const FILES = [
  [['قرأ الميزان ٢٢ درجة في الغرفة.', 'obs'], ['ربما فُتحت النافذة صباحًا.', 'int'], ['الغرفة تريح الجميع دائمًا.', 'uns']],
  [['نبتت ٦ بذور من ١٠ في الصندوق.', 'obs'], ['قد تكون التربة رطبة أكثر في الزاوية.', 'int'], ['هذه أفضل تربة في العالم.', 'uns']],
  [['سُجل صوت طرق ثلاث مرات قرب الباب.', 'obs'], ['ربما كان الطرق من الريح على الخشب.', 'int'], ['الطرق دليل قاطع على وجود زائر.', 'uns'], ['استمر كل طرق ثانية تقريبًا.', 'obs'], ['ربما تكرر الطرق لأن الباب غير مثبت.', 'int']],
  [['ارتفع مستوى الماء في الوعاء ٢ سم بعد المطر.', 'obs'], ['قد يكون المطر سبب الارتفاع.', 'int'], ['كل الأوعية في المدينة امتلأت.', 'uns'], ['الوعاء أزرق اللون.', 'obs'], ['المطر يملأ أي وعاء خلال دقيقة.', 'uns']],
];
const BINS = { obs: 'ملاحظة', int: 'تفسير ممكن', uns: 'غير مدعوم' };
const evidence = {
  makeTrials(rng) { return FILES.map((f, i) => ({ items: shuffle(f, rng), tag: f.length > 3 ? '5' : '3' })); },
  run(el, t, finish) {
    const ans = t.items.map(() => null); const t0 = now(); const list = h('ol', { class: 'evidence' });
    t.items.forEach(([s], i) => list.append(h('li', {}, h('p', {}, s), h('div', { class: 'row wrap', role: 'radiogroup', 'aria-label': 'تصنيف الجملة' }, ...Object.entries(BINS).map(([k, v]) => { const b = h('button', { type: 'button', role: 'radio', class: 'btn small', 'aria-checked': 'false', onclick: () => { ans[i] = k; [...b.parentNode.children].forEach(x => { x.setAttribute('aria-checked', String(x === b)); x.classList.toggle('primary', x === b); }); } }, v); return b; })))));
    el.append(h('p', { class: 'muted small' }, 'الملاحظة قياس أو مشاهدة مباشرة؛ التفسير شرح ممكن؛ غير المدعوم تعميم يتجاوز الملف.'), list,
      h('button', { type: 'button', class: 'btn primary', onclick: () => { if (ans.includes(null)) { announce('صنّف كل الجمل أولًا.'); return; } const right = ans.filter((a, i) => a === t.items[i][1]).length; finish({ correct: right === ans.length, rt: now() - t0, tag: 'n' + t.tag, errors: { misclassified: ans.length - right }, explain: t.items.map(([s, k]) => `${BINS[k]}: ${s}`).join(' · ') }); } }, 'تحقق من التصنيف'));
  },
};

// ------------------------------------------------------------ causal reasoning
const FACT = { 'الضوء': ['مضاء', 'معتم'], 'الماء': ['كثير', 'قليل'], 'التربة': ['رملية', 'طينية'] };
const causal = {
  makeTrials(rng) {
    const T = [];
    for (const n of [2, 2, 2, 3, 3, 3]) { const fs = Object.keys(FACT).slice(0, n); T.push({ factors: fs, target: pick(fs, rng), base: Object.fromEntries(fs.map(f => [f, Math.floor(rng() * 2)])), tag: 'f' + n }); }
    return T;
  },
  run(el, t, finish) {
    const b = { ...t.base }; const t0 = now(); const area = h('div');
    const render = () => { area.innerHTML = ''; area.append(h('div', { class: 'experiments' },
      h('div', { class: 'exp' }, h('b', {}, 'التجربة أ (ثابتة)'), ...t.factors.map(f => h('p', {}, `${f}: ${FACT[f][t.base[f]]}`))),
      h('div', { class: 'exp' }, h('b', {}, 'التجربة ب (اضبطها)'), ...t.factors.map(f => h('div', { class: 'row' }, h('span', {}, f + ': '), ...FACT[f].map((v, i) => h('button', { type: 'button', class: 'btn small' + (b[f] === i ? ' primary' : ''), 'aria-pressed': String(b[f] === i), onclick: () => { b[f] = i; render(); } }, v)))))),
      h('button', { type: 'button', class: 'btn primary', onclick: () => { const diff = t.factors.filter(f => b[f] !== t.base[f]); finish({ correct: diff.length === 1 && diff[0] === t.target, rt: now() - t0, tag: t.tag, errors: { controlled: t.factors.filter(f => f !== t.target && b[f] === t.base[f]).length }, explain: `لفحص ${t.target} غيّره وحده وثبّت ${t.factors.filter(f => f !== t.target).join(' و')}. النتيجة افتراضية لا ادعاء علمي.` }); } }, 'اعتمد المقارنة')); };
    el.append(h('p', { class: 'meter' }, `صمم مقارنة تختبر أثر ${t.target}.`), area); render();
  },
};

// ------------------------------------------------------------ analogy (authored)
const ANALOGIES = [
  ['قلم', 'كتابة', 'مقص', ['قص', 'ورق', 'حديد', 'لون'], 'أداة : وظيفتها'],
  ['فرشاة', 'رسم', 'مطرقة', ['دق', 'خشب', 'ثقيل', 'صندوق'], 'أداة : وظيفتها'],
  ['عجلة', 'دراجة', 'صفحة', ['كتاب', 'قلم', 'قراءة', 'ورق'], 'جزء : كل'],
  ['إصبع', 'يد', 'غصن', ['شجرة', 'ورقة', 'جذر', 'أخضر'], 'جزء : كل'],
  ['طبيب', 'مستشفى', 'معلم', ['مدرسة', 'كتاب', 'طالب', 'سبورة'], 'شخص : مكان عمله'],
  ['خباز', 'مخبز', 'بحار', ['سفينة', 'بحر', 'سمك', 'ميناء'], 'شخص : مكان عمله'],
  ['مطر', 'بلل', 'نار', ['حرارة', 'خشب', 'أحمر', 'دخان'], 'سبب : نتيجة مباشرة'],
  ['بذرة', 'شجرة', 'بيضة', ['طائر', 'عش', 'قشرة', 'أبيض'], 'مرحلة أولى : مرحلة لاحقة'],
  ['قطرة', 'محيط', 'حبة رمل', ['صحراء', 'حجر', 'شاطئ', 'ذهب'], 'وحدة صغيرة : مجموع كبير'],
];
const analogy = {
  makeTrials(rng) { return ANALOGIES.map(([a, b, c, opts, rel]) => ({ a, b, c, opts: shuffle(opts, rng), ans: opts[0], rel, tag: rel.split(' ')[0] })); },
  run(el, t, finish) {
    const t0 = now();
    el.append(h('div', { class: 'analogy' }, h('span', { class: 'pairbox' }, `${t.a} : ${t.b}`), h('span', {}, ' كما '), h('span', { class: 'pairbox' }, `${t.c} : ؟`)),
      choiceRow(t.opts, o => finish({ correct: o === t.ans, rt: now() - t0, tag: t.tag, explain: `العلاقة: ${t.rel}. الجواب ${t.ans}.` })));
  },
};

export const ENGINES = {
  'rule-switch': ruleSwitch, 'conjunction-search': conjunction, corsi, stroop, 'go-no-go': goNoGo, 'temporal-order': temporal,
  'number-sense': numberSense, deduction, planning, 'visual-rotation': rotation, 'prospective-memory': prospective,
  'pattern-matrix': patternMatrix, 'probability-lab': probability, 'working-update': workingUpdate, 'evidence-check': evidence,
  'causal-reasoning': causal, 'analogy-relations': analogy,
};
export const TIMED_EXPOSURE = { corsi: 'exposureStep', 'temporal-order': 'exposureStep', 'working-update': 'exposureStep', 'number-sense': 'exposureMs' };
