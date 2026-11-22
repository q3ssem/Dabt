'use strict';
/* mech.js — مكتبة الآليات التفاعلية. كل آلية تولّد لغزًا قابلًا للحل وتتحقق من الحل بالمحاكاة الفعلية.
   التوليد (gen) منفصل عن العرض ليُختبر في Node. */
(function () {
  const M = DX.M, E = DX.el, AR = DX.AR, shuffle = DX.shuffle;
  const INK = '#2b1d12', GOLD = '#ffd25a', TEAL = '#3fd0e8', CORAL = '#ff7b54', PAPER = '#f6ecd2';
  const svg = (w, h, ...k) => E('svg', { viewBox: `0 0 ${w} ${h}`, class: 'dx-svg' }, ...k);
  const btn = (text, fn, cls = 'dx-tile', extra = {}) => E('button', { class: cls, text, onclick: e => fn(e.currentTarget), ...extra });
  const row = (...k) => E('div', { class: 'dx-row' }, ...k);
  const label = (t, cls = 'dx-label') => E('div', { class: cls, text: t });
  const RI = r => k => Math.floor(r() * k);
  const range = n => Array.from({ length: n }, (_, i) => i);
  DX.G = {};   // مولّدات نقية

  /* ===== 1. المرايا والشعاع ===== */
  DX.G.trace = (mir, row, n) => {
    let x = -1, y = row, dx = 1, dy = 0; const hit = [], pts = [[0, row + .5]];
    for (let g = 0; g < 300; g++) {
      x += dx; y += dy;
      if (x < 0 || y < 0 || x >= n || y >= n) return { exit: x + ',' + y, hit, pts: pts.concat([[x + .5 - dx * .5, y + .5 - dy * .5]]) };
      pts.push([x + .5, y + .5]); const m = mir[y * n + x];
      if (m != null) { hit.push(y * n + x);[dx, dy] = m ? [dy, dx] : [-dy, -dx]; }
    }
    return { exit: '', hit, pts };
  };
  DX.G.mirrors = (lv, r) => {
    const R = RI(r), n = lv <= 2 ? 4 : lv <= 4 ? 5 : 6, need = Math.min(2 + Math.floor(lv / 2), 5); let mir, rw, T;
    for (let t = 0; t < 600; t++) {
      mir = {}; rw = R(n); const k = need + 1 + R(2) + (lv > 3 ? 2 : 0);
      for (let i = 0; i < k; i++) mir[R(n * n)] = R(2);
      T = DX.G.trace(mir, rw, n); if (T.exit && T.exit !== `-1,${rw}` && new Set(T.hit).size >= need) break;
    }
    const cur = { ...mir }, used = [...new Set(T.hit)];
    for (let t = 0; t < 60 && DX.G.trace(cur, rw, n).exit === T.exit; t++) used.forEach(i => { cur[i] = R(2); });
    if (DX.G.trace(cur, rw, n).exit === T.exit) cur[used[0]] ^= 1;
    return { n, row: rw, target: T.exit, start: cur, solution: mir, need: used.length };
  };
  M.mirrors = (lv, o, r) => {
    const p = DX.G.mirrors(lv, r);
    return {
      text: 'اضغط المرايا لتديرها حتى يصل شعاع الضوء إلى البلورة.', hint: `الشعاع ينعكس بزاوية قائمة عند كل مرآة. الحل يمر بـ${AR(p.need)} مرايا؛ تتبّع الطريق من البلورة رجوعًا.`, p,
      mount(board, api) {
        const n = p.n, c = 240 / n, cur = { ...p.start }, X = v => 30 + v * c;
        const [tx, ty] = p.target.split(',').map(Number), gx = Math.max(12, Math.min(288, X(tx + .5))), gy = Math.max(12, Math.min(288, X(ty + .5)));
        const beam = E('polyline', { fill: 'none', stroke: GOLD, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'dx-beam' });
        const cells = E('g'), mg = E('g'), crystal = E('path', { d: `M${gx} ${gy - 13}l10 13-10 13-10-13z`, fill: '#8fe9ff', stroke: INK, 'stroke-width': 2.5, class: 'dx-crystal' });
        range(n * n).forEach(i => cells.append(E('rect', { x: X(i % n) + 2, y: X(Math.floor(i / n)) + 2, width: c - 4, height: c - 4, rx: 7, class: 'dx-cell' })));
        const s = svg(300, 300, cells, E('circle', { cx: 14, cy: X(p.row + .5), r: 11, fill: GOLD, stroke: INK, 'stroke-width': 2.5 }), beam, mg, crystal); board.append(s);
        function draw() {
          const T = DX.G.trace(cur, p.row, n); beam.setAttribute('points', T.pts.map(([a, b]) => `${Math.max(14, Math.min(288, X(a)))},${Math.max(12, Math.min(288, X(b)))}`).join(' '));
          mg.innerHTML = '';
          Object.keys(cur).forEach(k => {
            const i = +k, x = X(i % n), y = X(Math.floor(i / n)), m = cur[i], on = T.hit.includes(i);
            const g = E('g', { class: 'dx-mirror' + (on ? ' on' : ''), role: 'button', tabindex: 0, 'aria-label': 'مرآة', onclick: () => { cur[i] ^= 1; sfx.tick(); draw(); } },
              E('rect', { x, y, width: c, height: c, fill: 'transparent' }),
              E('line', { x1: x + 8, y1: m ? y + 8 : y + c - 8, x2: x + c - 8, y2: m ? y + c - 8 : y + 8, stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }),
              E('line', { x1: x + 9, y1: m ? y + 9 : y + c - 9, x2: x + c - 9, y2: m ? y + c - 9 : y + 9, stroke: on ? '#fff6c9' : '#bfe6ee', 'stroke-width': 4.5, 'stroke-linecap': 'round' }));
            g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.onclick(); } }; mg.append(g);
          });
          if (T.exit === p.target) { crystal.classList.add('lit'); api.win('أضاءت البلورة!'); }
        }
        draw();
      }
    };
  };

  /* ===== 2. ألواح الجسر: املأ كل فجوة بالطول المضبوط ===== */
  DX.G.planks = (lv, r, o = {}) => {
    const R = RI(r), ng = o.gaps || (lv < 3 ? 1 : lv < 5 ? 2 : 3), gaps = [], pool = [], maxp = o.maxp || 4;
    for (let i = 0; i < ng; i++) { let L = 0; const parts = 2 + (lv > 1 ? R(2) : 0); for (let k = 0; k < parts; k++) { const v = 1 + R(maxp); pool.push(v); L += v; } gaps.push(L); }
    const dec = o.decoys != null ? o.decoys : (lv < 4 ? 1 : 2); for (let i = 0; i < dec; i++) pool.push(1 + R(maxp));
    return { gaps, pool: shuffle(pool, r) };
  };
  M.planks = (lv, o, r) => {
    const p = DX.G.planks(lv, r, o);
    return {
      text: o.text || 'اختر الألواح التي تملأ كل فجوة تمامًا، بلا زيادة ولا نقص.', hint: 'ابدأ باللوح الأطول، ثم أكمل الباقي. اضغط اللوح الموضوع لتعيده.', p,
      mount(board, api) {
        const fill = p.gaps.map(() => []), used = new Set(); const gapsBox = E('div', { class: 'dx-gaps' }), tray = row(); board.append(gapsBox, label('الألواح المتاحة'), tray);
        const sum = a => a.reduce((s, i) => s + p.pool[i], 0);
        function draw() {
          gapsBox.innerHTML = ''; tray.innerHTML = '';
          const active = fill.findIndex((f, g) => sum(f) < p.gaps[g]);
          p.gaps.forEach((L, g) => {
            const bar = E('div', { class: 'dx-gap' + (g === active ? ' active' : '') + (sum(fill[g]) === L ? ' full' : ''), style: `--n:${L}` });
            fill[g].forEach(i => bar.append(btn(AR(p.pool[i]), () => { fill[g] = fill[g].filter(x => x !== i); used.delete(i); draw(); }, 'dx-plank', { style: `--w:${p.pool[i]}`, 'aria-label': 'أعد اللوح ' + p.pool[i] })));
            gapsBox.append(E('div', { class: 'dx-gaprow' }, E('span', { class: 'dx-gaplen', text: `فجوة ${AR(L)}` }), bar));
          });
          p.pool.forEach((v, i) => { if (!used.has(i)) tray.append(btn(AR(v), () => { if (active < 0) return; if (sum(fill[active]) + v > p.gaps[active]) return api.miss('هذا اللوح أطول من الفراغ المتبقي.'); fill[active].push(i); used.add(i); sfx.tick(); draw(); }, 'dx-plank free', { style: `--w:${v}` })); });
          if (active < 0) api.win('اكتمل الجسر!');
        }
        draw();
      }
    };
  };

  /* ===== 3. الأحواض: كِل الكمية المطلوبة بوعاءين ===== */
  DX.G.pourDepths = (a, b) => { const d = { '0,0': 0 }, q = [[0, 0]]; while (q.length) { const [x, y] = q.shift(), k = d[x + ',' + y], t = Math.min(x, b - y), u = Math.min(y, a - x); for (const [nx, ny] of [[a, y], [x, b], [0, y], [x, 0], [x - t, y + t], [x + u, y - u]]) { const key = nx + ',' + ny; if (d[key] == null) { d[key] = k + 1; q.push([nx, ny]); } } } return d; };
  DX.G.pour = (lv, r) => {
    const R = RI(r), lo = lv <= 2 ? 2 : lv <= 4 ? 4 : 6, hi = lv >= 6 ? 14 : lo + 2, c = [];
    for (const [a, b] of [[3, 5], [2, 5], [3, 4], [4, 7], [3, 7], [5, 7], [3, 8], [5, 8], [4, 9], [7, 9]]) {
      const d = DX.G.pourDepths(a, b), best = {};
      Object.entries(d).forEach(([k, v]) => k.split(',').map(Number).forEach(t => { if (t && t !== a && t !== b) best[t] = Math.min(best[t] ?? 99, v); }));
      Object.entries(best).forEach(([t, v]) => { if (v >= lo && v <= hi) c.push({ a, b, target: +t, par: v }); });
    }
    return c[R(c.length)];
  };
  M.pour = (lv, o, r) => {
    const p = DX.G.pour(lv, r);
    return {
      text: `اجعل في أحد الوعاءين ${AR(p.target)} وحدات من الماء تمامًا. يمكنك الملء والتفريغ والصب من وعاء إلى آخر.`, hint: `جرّب ملء الوعاء ${AR(p.a)} وصبّه في الوعاء ${AR(p.b)} أكثر من مرة. أقل عدد حركات ممكن: ${AR(p.par)}.`, p,
      mount(board, api) {
        const cap = [p.a, p.b], v = [0, 0]; let moves = 0; const info = label(''), jugs = E('div', { class: 'dx-jugs' }); board.append(info, jugs);
        const act = f => { f(); moves++; sfx.tick(); draw(); };
        function draw() {
          info.textContent = `الهدف ${AR(p.target)} · الحركات ${AR(moves)}`; jugs.innerHTML = '';
          [0, 1].forEach(i => {
            const j = 1 - i, H = 22 * cap[i];
            jugs.append(E('div', { class: 'dx-jug' },
              svg(90, 230, E('rect', { x: 14, y: 220 - H, width: 62, height: H, rx: 8, fill: '#ffffff18', stroke: INK, 'stroke-width': 4 }),
                E('rect', { x: 17, y: 220 - 22 * v[i], width: 56, height: Math.max(0, 22 * v[i] - 3), rx: 5, fill: TEAL, class: 'dx-water' }),
                range(cap[i]).map(k => E('line', { x1: 14, x2: 24, y1: 220 - 22 * (k + 1), y2: 220 - 22 * (k + 1), stroke: INK, 'stroke-width': 2 })),
                E('text', { x: 45, y: 214 - H, 'text-anchor': 'middle', class: 'dx-tx', text: `${AR(v[i])} / ${AR(cap[i])}` })),
              btn('املأ', () => act(() => { v[i] = cap[i]; }), 'dx-btn sm'), btn('أفرغ', () => act(() => { v[i] = 0; }), 'dx-btn sm'),
              btn(i ? 'صبّ في الأيمن ←' : '→ صبّ في الأيسر', () => act(() => { const t = Math.min(v[i], cap[j] - v[j]); v[i] -= t; v[j] += t; }), 'dx-btn sm')));
          });
          if (v.includes(p.target)) api.win(`وصلت للكمية في ${AR(moves)} حركات (الأقل ${AR(p.par)}).`);
        }
        jugs.style.direction = 'ltr'; draw();
      }
    };
  };

  /* ===== 4. التروس المتشابكة: تدوير ترس يدير جاريه عكسه ===== */
  DX.G.gears = (lv, r) => {
    const R = RI(r), n = Math.min(6, 3 + Math.floor(lv / 2)), mod = lv <= 2 ? 2 : lv <= 4 ? 3 : 4, s = Array(n).fill(0), press = [];
    const turn = (st, i, d = 1) => { st[i] = (st[i] + d + mod) % mod; [i - 1, i + 1].forEach(j => { if (j >= 0 && j < n) st[j] = (st[j] - d + mod * 2) % mod; }); };
    do { const i = R(n); turn(s, i); press.push(i); } while (press.length < 2 + lv || s.every(v => !v));
    return { n, mod, start: s, press, turn };
  };
  M.gears = (lv, o, r) => {
    const p = DX.G.gears(lv, r);
    return {
      text: 'اضبط كل التروس حتى تشير علاماتها إلى الأعلى. تدوير ترس يدير الترسين المجاورين في الاتجاه المعاكس.', hint: 'ابدأ من الترس الطرفي، فهو يؤثر في جار واحد فقط. يمكن حل اللغز دائمًا.', p,
      mount(board, api) {
        const n = p.n, st = p.start.slice(), ang = st.map(v => v * 360 / p.mod), w = 300, cx = i => 30 + (i + .5) * (240 / n), rad = Math.min(34, 120 / n - 2), cy = 90, groups = [];
        const tooth = range(10).map(k => { const a = k * 36 * Math.PI / 180; return `M${Math.cos(a) * rad} ${Math.sin(a) * rad}L${Math.cos(a) * (rad + 7)} ${Math.sin(a) * (rad + 7)}`; }).join('');
        const s = svg(w, 170, range(n).map(i => {
          const g = E('g', { style: `transform:rotate(${ang[i]}deg);transform-origin:${cx(i)}px ${cy}px;transition:transform .35s` },
            E('g', { transform: `translate(${cx(i)} ${cy})` }, E('path', { d: tooth, stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }), E('circle', { r: rad, fill: i % 2 ? '#d9a441' : '#c98a3a', stroke: INK, 'stroke-width': 4 }), E('circle', { r: rad * .3, fill: '#5b3a1e', stroke: INK, 'stroke-width': 3 }), E('path', { d: `M0 ${-rad + 3}l6 11h-12z`, fill: '#fff3c4', stroke: INK, 'stroke-width': 2 })));
          groups.push(g);
          return E('g', { class: 'dx-gear', role: 'button', tabindex: 0, 'aria-label': 'ترس ' + (i + 1), onclick: () => { p.turn(st, i); ang[i] += 360 / p.mod;[i - 1, i + 1].forEach(j => { if (j >= 0 && j < n) ang[j] -= 360 / p.mod; }); sfx.tick(); draw(); } },
            E('path', { d: `M${cx(i)} ${cy - rad - 22}l7-10h-14z`, fill: GOLD, stroke: INK, 'stroke-width': 2 }), g, E('circle', { cx: cx(i), cy, r: rad + 9, fill: 'transparent' }));
        })); board.append(s);
        s.querySelectorAll('.dx-gear').forEach(g => g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.onclick(); } });
        function draw() { groups.forEach((g, i) => { g.style.transform = `rotate(${ang[i]}deg)`; }); if (st.every(v => !v)) api.later(() => api.win('دارت الآلية وانفتح القفل!'), 380); }
        draw();
      }
    };
  };

  /* ===== 5. الكوكبة: ارسم كل الخطوط بخط واحد دون تكرار ===== */
  const PENT = range(5).map(k => { const a = (-90 + 72 * k) * Math.PI / 180; return [Math.round(50 + 42 * Math.cos(a)), Math.round(50 + 42 * Math.sin(a))]; });
  DX.GRAPHS = [
    { p: [[20, 20], [80, 20], [80, 80], [20, 80]], e: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]] },
    { p: [[50, 10], [20, 42], [80, 42], [20, 88], [80, 88]], e: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4]] },
    { p: [[50, 50], [14, 20], [14, 80], [86, 20], [86, 80]], e: [[0, 1], [1, 2], [2, 0], [0, 3], [3, 4], [4, 0]] },
    { p: [[50, 8], [20, 40], [80, 40], [20, 88], [80, 88]], e: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [1, 4], [2, 3]] },
    { p: [[20, 26], [80, 26], [80, 86], [20, 86], [50, 56], [50, 6]], e: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4], [0, 5], [1, 5]] },
    { p: PENT, e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2], [2, 4], [4, 1], [1, 3], [3, 0]] }];
  M.stroke = (lv, o, r) => {
    const R = RI(r), g = DX.GRAPHS[Math.min(5, lv - 1)], fx = R(2), rot = R(4);
    const pts = g.p.map(([x, y]) => { if (fx) x = 100 - x; for (let k = 0; k < rot; k++)[x, y] = [100 - y, x]; return [x, y]; });
    const deg = pts.map((_, i) => g.e.filter(e => e.includes(i)).length), odd = deg.filter(d => d % 2).length;
    return {
      text: 'صِل نجوم الكوكبة بخط واحد متصل: ارسم كل الخطوط، ولا تمرّ على الخط نفسه مرتين.', hint: odd ? 'ابدأ من نجمة يخرج منها عدد فردي من الخطوط، وستنتهي عند النجمة الفردية الأخرى.' : 'كل النجوم زوجية الخطوط: ابدأ من أي نجمة وستعود إليها في النهاية.', p: { pts, edges: g.e },
      mount(board, api) {
        const P = pts.map(([x, y]) => [30 + x * 2.4, 22 + y * 2.4]); let path = [], used = [];
        const lines = g.e.map(([a, b]) => E('line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], class: 'dx-edge' }));
        const nodes = P.map(([x, y], i) => { const n = E('g', { class: 'dx-star', role: 'button', tabindex: 0, 'aria-label': 'نجمة ' + (i + 1), onclick: () => tap(i) }, E('circle', { cx: x, cy: y, r: 22, fill: 'transparent' }), E('circle', { cx: x, cy: y, r: 12, class: 'dot' })); n.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(i); } }; return n; });
        const info = label('');
        board.append(svg(300, 284, lines, nodes), info, row(btn('تراجع', () => { if (path.length > 1) { path.pop(); used.pop(); } else path = []; draw(); }, 'dx-btn sm'), btn('إعادة', () => { path = []; used = []; draw(); }, 'dx-btn sm')));
        const free = i => g.e.map((e, k) => ({ e, k })).filter(({ e, k }) => e.includes(i) && !used.includes(k));
        function tap(i) {
          if (!path.length) { path = [i]; sfx.tick(); return draw(); }
          const cur = path[path.length - 1], f = free(cur).find(({ e }) => e.includes(i) && i !== cur);
          if (!f) return api.miss('لا يوجد خط غير مرسوم بين هاتين النجمتين.');
          used.push(f.k); path.push(i); sfx.tick(); draw();
          if (used.length === g.e.length) return api.win('اكتملت الكوكبة بخط واحد!');
          if (!free(i).length) { api.miss('انقطع الطريق وبقيت خطوط. نعيد المحاولة من البداية.'); path = []; used = []; draw(); }
        }
        function draw() { lines.forEach((l, k) => l.classList.toggle('on', used.includes(k))); nodes.forEach((n, i) => n.classList.toggle('cur', path[path.length - 1] === i)); info.textContent = path.length ? `الخطوط المرسومة ${AR(used.length)} من ${AR(g.e.length)}` : 'اختر نجمة البداية'; }
        draw();
      }
    };
  };

  /* ===== 6. الأختام: رتّبها بحسب الأدلة (حل وحيد مضمون) ===== */
  const perms = n => { const out = [], go = (a, rest) => rest.length ? rest.forEach((x, i) => go(a.concat(x), rest.filter((_, j) => j !== i))) : out.push(a); go([], range(n)); return out; };
  DX.G.seals = (lv, r) => {
    const n = Math.min(5, 3 + Math.floor((lv - 1) / 2)), NAMES = ['الشمس', 'القمر', 'المرساة', 'الجوهرة', 'النجمة'], sol = shuffle(range(n), r), pos = []; sol.forEach((s, i) => { pos[s] = i; });
    const P = a => { const q = []; a.forEach((s, i) => { q[s] = i; }); return q; }, soft = [], hard = [];
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) if (a !== b) {
        if (pos[a] < pos[b]) soft.push({ t: `ختم ${NAMES[a]} قبل ختم ${NAMES[b]} (رقم خانته أصغر).`, f: q => q[a] < q[b] });
        if (a < b && Math.abs(pos[a] - pos[b]) === 1) soft.push({ t: `ختم ${NAMES[a]} وختم ${NAMES[b]} متجاوران.`, f: q => Math.abs(q[a] - q[b]) === 1 });
        if (a < b && Math.abs(pos[a] - pos[b]) > 1) soft.push({ t: `ختم ${NAMES[a]} وختم ${NAMES[b]} غير متجاورين.`, f: q => Math.abs(q[a] - q[b]) > 1 });
      }
      if (pos[a] === 0 || pos[a] === n - 1) soft.push({ t: `ختم ${NAMES[a]} في أحد الطرفين.`, f: q => q[a] === 0 || q[a] === n - 1 });
      for (let k = 0; k < n; k++) if (k !== pos[a]) soft.push({ t: `ختم ${NAMES[a]} ليس في الخانة ${AR(k + 1)}.`, f: q => q[a] !== k });
      hard.push({ t: `ختم ${NAMES[a]} في الخانة ${AR(pos[a] + 1)}.`, f: q => q[a] === pos[a] });
    }
    const all = perms(n).map(P), count = cl => all.filter(q => cl.every(c => c.f(q))).length; let clues = [];
    for (const c of shuffle(soft, r).concat(shuffle(hard, r))) { if (count(clues) === 1) break; if (count(clues.concat(c)) < count(clues)) clues.push(c); }
    for (let i = clues.length - 1; i >= 0; i--) { const rest = clues.filter((_, j) => j !== i); if (count(rest) === 1) clues = rest; }
    return { n, sol, clues, count: () => count(clues) };
  };
  M.seals = (lv, o, r) => {
    const p = DX.G.seals(lv, r), SY = ['☀', '☾', '⚓', '◆', '✦'];
    return {
      text: 'ضع كل ختم في خانته الصحيحة بحسب الأدلة. الخانات مرقمة، ولكل لغز حل واحد.', hint: 'ابدأ بالدليل الذي يحدد أقل عدد من الخانات، واستبعد المستحيل.', p,
      mount(board, api) {
        const slots = Array(p.n).fill(null), sb = E('div', { class: 'dx-slots' }), tray = row(); let check;
        board.append(E('ul', { class: 'dx-clues' }, p.clues.map(c => E('li', { text: c.t }))), sb, tray, check = btn('تحقق من الترتيب', () => {
          const q = []; slots.forEach((s, i) => { q[s] = i; }); const bad = p.clues.find(c => !c.f(q));
          bad ? api.miss('دليل لم يتحقق: ' + bad.t) : api.win('انفتح قفل الأختام!');
        }, 'dx-btn primary'));
        function draw() {
          sb.innerHTML = ''; tray.innerHTML = '';
          slots.forEach((s, i) => sb.append(E('button', { class: 'dx-slot' + (s != null ? ' filled' : ''), 'aria-label': 'الخانة ' + (i + 1), onclick: () => { if (s != null) { slots[i] = null; draw(); } } }, E('small', { text: AR(i + 1) }), E('b', { text: s != null ? SY[s] : '' }))));
          range(p.n).forEach(s => { if (!slots.includes(s)) tray.append(btn(SY[s], () => { const i = slots.indexOf(null); if (i >= 0) { slots[i] = s; sfx.tick(); draw(); } }, 'dx-tile big', { 'aria-label': 'ختم' })); });
          check.disabled = slots.includes(null);
        }
        draw();
      }
    };
  };

  /* ===== 7. أطوار القمر (القمر) ===== */
  const PH = ['المحاق', 'الهلال المتزايد', 'التربيع الأول', 'الأحدب المتزايد', 'البدر', 'الأحدب المتناقص', 'التربيع الأخير', 'الهلال المتناقص'];
  DX.phase = (i, cls = 'dx-phase') => {
    const th = (i <= 4 ? i : 8 - i) * 45, rx = Math.abs(Math.cos(th * Math.PI / 180)) * 26;
    const d = i === 0 ? '' : i === 4 ? 'M0-26A26 26 0 1 1 0 26A26 26 0 1 1 0-26' : `M0-26A26 26 0 0 1 0 26A${rx.toFixed(1)} 26 0 0 ${th < 90 ? 0 : 1} 0-26`;
    return E('svg', { viewBox: '-32 -32 64 64', class: cls }, E('circle', { r: 26, fill: '#27304e', stroke: INK, 'stroke-width': 3 }), d ? E('path', { d, fill: '#f6efd6', transform: i > 4 ? 'scale(-1 1)' : null }) : null);
  };
  M.moon = (lv, o, r) => {
    const R = RI(r), set = lv <= 1 ? [0, 2, 4, 6] : range(8), ask = set[R(set.length)], pic = lv >= 3 && R(2) === 1;
    return {
      text: pic ? 'القمر في الموضع المضيء على مداره. اختر شكله كما نراه من الأرض.' : `ضع القمر على مداره في الموضع الذي نراه فيه من الأرض «${PH[ask]}».`,
      hint: 'ضوء الشمس يأتي من اليمين، ونصف القمر المواجه لها مضيء دائمًا. في البدر تكون الأرض بين الشمس والقمر، والقمر يدور عكس عقارب الساعة.', p: { ask, pic, at: set.indexOf(ask), label: PH[ask] },
      mount(board, api) {
        const cx = 128, cy = 128, RR = 86, pos = i => [cx + RR * Math.cos(i * Math.PI / 4), cy - RR * Math.sin(i * Math.PI / 4)];
        const s = svg(300, 256, E('circle', { cx: 318, cy, r: 62, fill: GOLD, stroke: INK, 'stroke-width': 3 }), range(5).map(k => E('line', { x1: 250, x2: 232, y1: cy - 44 + k * 22, y2: cy - 44 + k * 22, stroke: GOLD, 'stroke-width': 3, 'stroke-linecap': 'round' })),
          E('circle', { cx, cy, r: RR, fill: 'none', stroke: '#ffffff40', 'stroke-width': 2, 'stroke-dasharray': '4 6' }),
          E('circle', { cx, cy, r: 22, fill: '#4aa3d8', stroke: INK, 'stroke-width': 3 }), E('path', { d: `M${cx - 9} ${cy - 8}q9-8 14 2t-6 12q-10 2-8-14`, fill: '#6cc076' }), E('text', { x: cx, y: cy + 40, 'text-anchor': 'middle', class: 'dx-tx sm', text: 'الأرض' }),
          set.map(i => {
            const [x, y] = pos(i), hot = pic && i === ask;
            return E('g', { class: 'dx-moonpos' + (hot ? ' hot' : ''), role: pic ? null : 'button', tabindex: pic ? null : 0, 'aria-label': 'موضع ' + (i + 1), onclick: pic ? null : () => i === ask ? api.win(`صحيح: ${PH[ask]}.`) : api.miss(`في هذا الموضع نرى «${PH[i]}».`) },
              E('circle', { cx: x, cy: y, r: 21, fill: 'transparent' }), E('circle', { cx: x, cy: y, r: 13, fill: '#27304e', stroke: INK, 'stroke-width': 2.5 }), E('path', { d: `M${x} ${y - 13}a13 13 0 0 1 0 26z`, fill: '#f6efd6' }));
          })); board.append(s);
        if (!pic) board.prepend(E('div', { class: 'dx-ask' }, DX.phase(ask), E('b', { text: PH[ask] })));
        else { const opts = shuffle([ask, ...shuffle(range(8).filter(i => i !== ask), r).slice(0, 3)], r); board.append(row(opts.map(i => E('button', { class: 'dx-tile big', 'aria-label': PH[i], onclick: () => i === ask ? api.win(`صحيح: ${PH[ask]}.`) : api.miss('انظر أي جهة من القمر تواجه الشمس، وأي جزء منها نراه من الأرض.') }, DX.phase(i), E('small', { text: PH[i] }))))); }
      }
    };
  };

  /* ===== 8. المسار على الشبكة (خطوات محدودة أو رصيد حماية حرارية) ===== */
  DX.G.grid = (lv, r, o = {}) => {
    const R = RI(r), n = o.n || Math.min(6, 3 + Math.ceil(lv / 2)), heat = !!o.heat, goal = n * n - 1;
    for (let t = 0; t < 400; t++) {
      const walls = new Set(), cost = range(n * n).map(i => heat ? (R(100) < 45 ? 1 : 3) : 1);
      range(n * n).forEach(i => { if (i && i !== goal && R(100) < (heat ? 12 : 24 + lv * 2)) walls.add(i); });
      const dist = Array(n * n).fill(Infinity); dist[0] = 0; const q = [0];
      while (q.length) { q.sort((a, b) => dist[a] - dist[b]); const u = q.shift(), x = u % n, y = Math.floor(u / n); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, v = ny * n + nx; if (nx < 0 || ny < 0 || nx >= n || ny >= n || walls.has(v)) continue; if (dist[u] + cost[v] < dist[v]) { dist[v] = dist[u] + cost[v]; q.push(v); } } }
      if (dist[goal] === Infinity) continue; if (!heat && lv >= 3 && dist[goal] === 2 * n - 2 && t < 200) continue;
      const slack = o.free ? 99 : lv < 3 ? 3 : lv < 5 ? 1 : 0; return { n, heat, walls: [...walls], cost, best: dist[goal], budget: dist[goal] + slack, goal };
    }
  };
  M.gridpath = (lv, o, r) => {
    const p = DX.G.grid(lv, r, o), heat = p.heat;
    return {
      text: o.text || (heat ? 'أوصل العربة إلى النجمة. خانة الظل تكلف وحدة حماية واحدة، وخانة الشمس ثلاثًا. لا تتجاوز رصيد الحماية.' : 'أوصل المستكشف إلى النجمة قبل أن تنتهي الخطوات. تحرّك إلى الخانات المجاورة وتجنب الصخور.'),
      hint: heat ? `أرخص طريق يكلف ${AR(p.best)} وحدات. فضّل خانات الظل ولو طال الطريق.` : `أقصر طريق طوله ${AR(p.best)} خطوات. خطط له قبل أن تتحرك.`, p,
      mount(board, api) {
        let pos = 0, spent = 0; const info = label(''), grid = E('div', { class: 'dx-grid', style: `--n:${p.n}` }), cells = []; board.append(info, grid);
        const go = i => {
          if (p.walls.includes(i) || Math.abs(i % p.n - pos % p.n) + Math.abs(Math.floor(i / p.n) - Math.floor(pos / p.n)) !== 1) return;
          pos = i; spent += p.cost[i]; sfx.tick();
          if (pos === p.goal && spent <= p.budget) { draw(); return api.win(`وصلت بتكلفة ${AR(spent)}. الأفضل ${AR(p.best)}.`); }
          if (spent >= p.budget) { api.miss(heat ? 'انتهت الحماية الحرارية. نعود لنقطة البداية.' : 'انتهت الخطوات. نعود لنقطة البداية.'); pos = 0; spent = 0; }
          draw();
        };
        range(p.n * p.n).forEach(i => { const b = E('button', { class: 'dx-cellb', 'aria-label': 'خانة', onclick: () => go(i) }); cells.push(b); grid.append(b); });
        api.on(document, 'keydown', e => { const d = { ArrowUp: -p.n, ArrowDown: p.n, ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (!d || !board.isConnected) return; const t = pos + d; if (t < 0 || t >= p.n * p.n || (Math.abs(d) === 1 && Math.floor(t / p.n) !== Math.floor(pos / p.n))) return; e.preventDefault(); go(t); });
        function draw() {
          cells.forEach((b, i) => { b.className = 'dx-cellb' + (i === pos ? ' me' : '') + (p.walls.includes(i) ? ' wall' : '') + (heat && !p.walls.includes(i) ? (p.cost[i] > 1 ? ' sun' : ' shade') : ''); b.textContent = i === pos ? (o.token || '🧭') : i === p.goal ? '★' : p.walls.includes(i) ? '🪨' : heat ? (p.cost[i] > 1 ? '☀' : '') : ''; });
          info.textContent = (heat ? 'رصيد الحماية: ' : 'الخطوات المتبقية: ') + (p.budget > 90 ? '∞' : AR(p.budget - spent));
        }
        grid.style.direction = 'ltr'; draw();
      }
    };
  };

  /* ===== 9. منطاد الزهرة: اثبت في الطبقة المعتدلة ===== */
  M.hover = (lv, o, r) => ({
    text: 'أبقِ المنطاد داخل الطبقة المعتدلة (بين ٥٠ و٥٥ كم) حتى يكتمل القياس. اضغط مطولًا ليرتفع، واترك ليهبط.',
    hint: 'ضغطات قصيرة متكررة أفضل من ضغطة طويلة. عند ارتفاع ٥٠–٥٥ كم يقارب الضغط ودرجة الحرارة ما نعرفه على الأرض.',
    mount(board, api) {
      const half = [3.6, 2.9, 2.3, 2, 1.8, 1.6][lv - 1], need = 5 + lv, lo = 52.5 - half, hi = 52.5 + half, Y = km => 250 - (km - 40) * 9.2;
      let y = 44, v = 0, hold = false, prog = 0, gust = 0, gt = 0;
      const probe = E('g', {}, E('ellipse', { rx: 20, ry: 24, fill: '#ffe2a8', stroke: INK, 'stroke-width': 3 }), E('path', { d: 'M-9 22l5 12h8l5-12', fill: 'none', stroke: INK, 'stroke-width': 2.5 }), E('rect', { x: -8, y: 34, width: 16, height: 10, rx: 3, fill: TEAL, stroke: INK, 'stroke-width': 2.5 }));
      const bar = E('rect', { x: 20, y: 262, width: 0, height: 10, rx: 5, fill: '#7be08a' }), alt = E('text', { x: 286, y: 30, 'text-anchor': 'end', class: 'dx-tx' });
      const s = svg(300, 280, E('rect', { x: 0, y: 0, width: 300, height: 256, rx: 14, fill: '#e9a94a' }), E('rect', { x: 0, y: 150, width: 300, height: 106, fill: '#c9772f' }), E('rect', { x: 0, y: Y(hi), width: 300, height: Y(lo) - Y(hi), fill: '#fff6cf', opacity: .55 }),
        E('text', { x: 14, y: Y(hi) - 6, class: 'dx-tx sm dark', text: '٥٥ كم' }), E('text', { x: 14, y: Y(lo) + 16, class: 'dx-tx sm dark', text: '٥٠ كم' }), probe, alt, E('rect', { x: 20, y: 262, width: 260, height: 10, rx: 5, fill: '#00000040' }), bar);
      const b = E('button', { class: 'dx-btn primary dx-hold', text: 'اضغط مطولًا للارتفاع ▲' });
      const down = e => { e.preventDefault(); hold = true; }, up = () => { hold = false; };
      b.onpointerdown = down; b.onpointerup = b.onpointercancel = b.onpointerleave = up;
      api.on(document, 'keydown', e => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); hold = true; } }); api.on(document, 'keyup', e => { if (e.key === ' ' || e.key === 'ArrowUp') hold = false; });
      board.append(s, b);
      api.loop(dt => {
        gt -= dt; if (gt <= 0) { gt = .9 + r() * .9; gust = (r() - .5) * (3 + lv * 1.6); }
        v += ((hold ? 15 : -9) + gust) * dt; v *= 1 - 1.2 * dt; y += v * dt; if (y < 40) { y = 40; v = 0; } if (y > 66) { y = 66; v = 0; }
        const inside = y >= lo && y <= hi; prog = Math.max(0, prog + (inside ? dt : -dt * .5));
        probe.setAttribute('transform', `translate(150 ${Y(y) - 10})`); bar.setAttribute('width', Math.min(260, 260 * prog / need)); bar.setAttribute('fill', inside ? '#7be08a' : CORAL); alt.textContent = AR(y.toFixed(0)) + ' كم';
        if (prog >= need) api.win('اكتمل القياس داخل الطبقة المعتدلة!');
      });
    }
  });

  /* ===== 10. الترتيب (سلسلة أو دورة) ===== */
  M.order = (lv, o, r) => {
    const items = (typeof o.items === 'function' ? o.items(lv, r, o) : o.items).map(x => Array.isArray(x) ? x : [x, '']), mixed = (() => { let m; do m = shuffle(items, r); while (items.length > 1 && m.every((x, i) => x === items[i])); return m; })();
    return {
      text: o.text || 'رتّب العناصر من الأول إلى الأخير.', hint: `البداية: ${items[0][0]}، ثم ${items[1][0]}.`, p: { items },
      mount(board, api) {
        const slots = Array(items.length).fill(null), sb = E('div', { class: 'dx-chain' + (o.ring ? ' ring' : '') }), tray = row(); board.append(sb, tray);
        function draw() {
          sb.innerHTML = ''; tray.innerHTML = '';
          slots.forEach((s, i) => sb.append(E('button', { class: 'dx-link' + (s ? ' filled' : ''), onclick: () => { if (s) { slots[i] = null; draw(); } } }, E('small', { text: AR(i + 1) }), s ? E('span', { text: (s[1] ? s[1] + ' ' : '') + s[0] }) : null)));
          mixed.forEach(it => { if (!slots.includes(it)) tray.append(E('button', { class: 'dx-tile wide', onclick: () => { slots[slots.indexOf(null)] = it; sfx.tick(); draw(); } }, it[1] ? E('i', { text: it[1] }) : null, E('span', { text: it[0] }))); });
          if (!slots.includes(null)) {
            if (slots.every((s, i) => s === items[i])) return api.win(o.ring ? 'اكتملت الدورة!' : 'الترتيب صحيح!');
            api.miss('بعض العناصر في غير مكانها. أعدنا الخاطئ منها.'); slots.forEach((s, i) => { if (s !== items[i]) slots[i] = null; }); api.later(draw, 500);
          }
        }
        draw();
      }
    };
  };

  /* ===== 11. برمجة العربة (المريخ) ===== */
  DX.G.rover = (lv, r) => {
    const R = RI(r), n = 4 + (lv > 2) + (lv > 4), D = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (let t = 0; t < 500; t++) {
      const rocks = new Set(); while (rocks.size < n + lv - 1) rocks.add(R(n * n)); const start = (n - 1) * n, goal = R(n * n); if (rocks.has(start) || rocks.has(goal) || goal === start) continue;
      const key = (x, y, d) => (y * n + x) * 4 + d, seen = new Map([[key(0, n - 1, 0), 0]]), q = [[0, n - 1, 0]]; let best = null;
      while (q.length && best == null) { const [x, y, d] = q.shift(), k = seen.get(key(x, y, d)); if (y * n + x === goal) { best = k; break; } const nx = x + D[d][0], ny = y + D[d][1]; for (const s of [[x, y, (d + 3) % 4], [x, y, (d + 1) % 4], ...(nx >= 0 && ny >= 0 && nx < n && ny < n && !rocks.has(ny * n + nx) ? [[nx, ny, d]] : [])]) if (!seen.has(key(...s))) { seen.set(key(...s), k + 1); q.push(s); } }
      if (best != null && best >= 3 + lv && best <= 8 + lv * 2) return { n, rocks: [...rocks], start, goal, best, limit: best + (lv < 3 ? 2 : lv < 5 ? 1 : 0), D };
    }
  };
  DX.G.runRover = (p, prog) => { let x = 0, y = p.n - 1, d = 0; const trail = [[x, y, d]]; for (const c of prog) { if (c === 'L') d = (d + 3) % 4; else if (c === 'R') d = (d + 1) % 4; else { x += p.D[d][0]; y += p.D[d][1]; if (x < 0 || y < 0 || x >= p.n || y >= p.n || p.rocks.includes(y * p.n + x)) return { ok: false, crash: true, trail: trail.concat([[x, y, d]]) }; } trail.push([x, y, d]); if (y * p.n + x === p.goal) return { ok: true, trail }; } return { ok: false, trail }; };
  M.rover = (lv, o, r) => {
    const p = DX.G.rover(lv, r);
    return {
      text: `اكتب برنامج العربة كاملًا ثم أرسله: إشارة الراديو تحتاج دقائق لتصل المريخ، فلا يمكن قيادتها لحظيًا. الحد الأقصى ${AR(p.limit)} أوامر.`, hint: `يمكن الوصول بـ${AR(p.best)} أوامر. تذكّر: الدوران يغيّر الاتجاه فقط ولا يحرّك العربة.`, p,
      mount(board, api) {
        let prog = [], busy = false, at = [0, p.n - 1, 0]; const grid = E('div', { class: 'dx-grid', style: `--n:${p.n};direction:ltr` }), cells = [], strip = E('div', { class: 'dx-prog', dir: 'ltr' }), ic = { F: '↑', L: '↶', R: '↷' };
        range(p.n * p.n).forEach(() => { const c = E('div', { class: 'dx-cellb' }); cells.push(c); grid.append(c); });
        const add = c => () => { if (busy) return; if (prog.length >= p.limit) return api.miss('وصلت للحد الأقصى من الأوامر. احذف أمرًا أو أرسل البرنامج.'); prog.push(c); sfx.tick(); draw(); };
        const send = () => {
          if (busy || !prog.length) return; busy = true; const res = DX.G.runRover(p, prog);
          res.trail.forEach((s, i) => api.later(() => { at = s; draw(); }, i * 330));
          api.later(() => { busy = false; if (res.ok) return api.win(`وصلت العربة للعينة بـ${AR(prog.length)} أوامر.`); api.miss(res.crash ? 'اصطدمت العربة! عدّل البرنامج وأعد الإرسال.' : 'انتهت الأوامر قبل الوصول للعينة.'); at = [0, p.n - 1, 0]; draw(); }, res.trail.length * 330 + 150);
        };
        board.append(grid, strip, row(btn('↶ يسار', add('L'), 'dx-btn sm'), btn('↑ تقدّم', add('F'), 'dx-btn sm'), btn('↷ يمين', add('R'), 'dx-btn sm')), row(btn('⌫ حذف', () => { if (!busy) { prog.pop(); draw(); } }, 'dx-btn sm'), btn('▶ أرسل البرنامج', send, 'dx-btn primary')));
        function draw() {
          cells.forEach((c, i) => { const me = at[1] * p.n + at[0] === i; c.className = 'dx-cellb mars' + (p.rocks.includes(i) ? ' wall' : '') + (me ? ' me' : ''); c.innerHTML = me ? `<b style="display:inline-block;transform:rotate(${at[2] * 90}deg)">▲</b>` : i === p.goal ? '💎' : p.rocks.includes(i) ? '🪨' : ''; });
          strip.innerHTML = ''; range(p.limit).forEach(i => strip.append(E('span', { class: prog[i] ? 'on' : '', text: prog[i] ? ic[prog[i]] : '' })));
        }
        draw();
      }
    };
  };

  /* ===== 12. لقاء المدار (المشتري): أطلق المسبار ليلاقي القمر ===== */
  M.orbit = (lv, o, r) => {
    const moons = [['غانيميد', 8, '#b9a58c'], ['أوروبا', 4, '#e8dcc0'], ['آيو', 2, '#f2d15c']], [name, period, col] = moons[Math.min(2, lv - 1)], tol = [24, 20, 17][Math.min(2, lv - 1)], travel = 1.3;
    return {
      text: `أطلق المسبار ليصل نقطة اللقاء مع القمر «${name}» في اللحظة نفسها. المسبار يحتاج ${AR(travel)} ثانية ليصل.`, hint: 'أطلق قبل أن يصل القمر إلى نقطة اللقاء، لا عند وصوله. الأقمار الأقرب إلى المشتري أسرع دورانًا.', p: { period, travel },
      mount(board, api) {
        const cx = 150, cy = 118, RR = 86; let ang = r() * 360, shot = null, t = 0;
        const moon = E('circle', { r: 11, fill: col, stroke: INK, 'stroke-width': 2.5 }), probe = E('path', { d: 'M0-9l7 16h-14z', fill: TEAL, stroke: INK, 'stroke-width': 2 });
        board.append(svg(300, 262, E('circle', { cx, cy, r: RR, fill: 'none', stroke: '#ffffff45', 'stroke-width': 2, 'stroke-dasharray': '4 6' }),
          E('circle', { cx, cy, r: 40, fill: '#d9a777', stroke: INK, 'stroke-width': 3 }), E('path', { d: `M${cx - 38} ${cy - 10}h76M${cx - 39} ${cy + 6}h78M${cx - 32} ${cy + 22}h64`, stroke: '#a8643c', 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }), E('ellipse', { cx: cx + 12, cy: cy + 8, rx: 10, ry: 6, fill: '#c2452d' }),
          E('circle', { cx, cy: cy + RR, r: 15, fill: 'none', stroke: GOLD, 'stroke-width': 2.5, 'stroke-dasharray': '3 4' }), moon, probe, E('rect', { x: cx - 16, y: 246, width: 32, height: 12, rx: 4, fill: '#8b93b5', stroke: INK, 'stroke-width': 2.5 })),
          btn('🚀 أطلق المسبار', () => { if (shot == null) { shot = t; sfx.go(); } }, 'dx-btn primary'));
        api.loop(dt => {
          t += dt; ang = (ang + 360 / period * dt) % 360; const a = ang * Math.PI / 180; moon.setAttribute('cx', cx + RR * Math.cos(a)); moon.setAttribute('cy', cy - RR * Math.sin(a));
          let py = 240; if (shot != null) { const k = (t - shot) / travel; py = 240 - k * (240 - (cy + RR)); if (k >= 1) { const diff = Math.abs(((ang - 270 + 540) % 360) - 180); shot = null; if (diff <= tol) return api.win(`لقاء ناجح مع ${name}!`); api.miss(((ang - 270 + 360) % 360) < 180 ? 'تأخرت: القمر تجاوز نقطة اللقاء. أطلق أبكر.' : 'بكّرت: القمر لم يصل بعد. أطلق بعد قليل.'); } }
          probe.setAttribute('transform', `translate(${cx} ${py})`);
        });
      }
    };
  };

  /* ===== 13. فجوات الحلقات (زحل) / نافذة الإشارة ===== */
  M.rings = (lv, o, r) => {
    const k = Math.min(5, 2 + Math.ceil(lv / 2)), gap = Math.max(28, 54 - lv * 4);
    return {
      text: o.text || 'اعبر الحلقات من الخارج إلى الداخل. اضغط «اعبر» فقط حين تكون فجوة الحلقة التالية أمام المسبار.', hint: 'راقب الحلقة التالية فقط. الحلقات الداخلية أسرع دورانًا من الخارجية، كما في حلقات زحل الحقيقية.',
      mount(board, api) {
        const cx = 150, cy = 128, rad = range(k).map(i => 38 + i * (64 / Math.max(1, k - 1))), ph = rad.map(() => r() * 360), sp = rad.map((R, i) => (i % 2 ? -1 : 1) * 26 * Math.pow(rad[k - 1] / R, 1.5) * (1 + lv * .08)); let at = k;
        const rings = rad.map((R, i) => { const C = 2 * Math.PI * R, g = gap / 360 * C; return E('circle', { cx, cy, r: R, fill: 'none', stroke: i % 2 ? '#e8cb86' : '#cfae6b', 'stroke-width': 11, 'stroke-dasharray': `${C - g} ${g}`, style: `transform-origin:${cx}px ${cy}px` }); });
        const probe = E('circle', { r: 8, fill: TEAL, stroke: INK, 'stroke-width': 2.5 });
        board.append(svg(300, 262, E('circle', { cx, cy, r: 24, fill: '#e9d29a', stroke: INK, 'stroke-width': 3 }), rings, probe), btn('اعبر ▲', () => {
          const i = at - 1, a = ((90 - ph[i]) % 360 + 360) % 360;   // موضع المسبار (أسفل) في إحداثيات الحلقة
          if (a >= 360 - gap) { at--; sfx.ok(1); if (!at) return api.win('عبرت كل الحلقات بسلام!'); } else { api.miss('الفجوة لم تكن أمامك. نعود إلى خارج الحلقات.'); at = k; }
        }, 'dx-btn primary'));
        api.loop(dt => { rings.forEach((c, i) => { ph[i] = (ph[i] + sp[i] * dt + 360) % 360; c.style.transform = `rotate(${ph[i]}deg)`; c.setAttribute('opacity', i === at - 1 ? 1 : .55); }); const y = at >= k ? cy + rad[k - 1] + 18 : at === 0 ? cy + 30 : cy + (rad[at] + rad[at - 1]) / 2; probe.setAttribute('cx', cx); probe.setAttribute('cy', y); });
      }
    };
  };

  /* ===== 14. فصول أورانوس: محور مائل ٩٨° ===== */
  M.season = (lv, o, r) => {
    const R = RI(r), set = lv <= 1 ? [0, 2, 4, 6] : range(8), Q = [['القطب الشمالي في نهار دائم', [4]], ['القطب الشمالي في ليل دائم', [0]], ['اعتدال: الشمس فوق خط الاستواء', [2, 6]], ...(lv >= 2 ? [['القطب الجنوبي في نهار دائم', [0]]] : [])];
    const rev = lv >= 3 && R(2) === 1, q = Q[R(Q.length)], shown = q[1][R(q[1].length)];
    return {
      text: rev ? 'أورانوس في الموضع المضيء على مداره. اختر الوصف الصحيح لحاله.' : `ضع أورانوس على مداره حيث يكون: ${q[0]}. السهم يشير إلى قطبه الشمالي واتجاهه ثابت في الفضاء.`,
      hint: 'محور أورانوس مائل ٩٨° فيكاد يدور على جنبه. سنته ٨٤ سنة أرضية، فيبقى القطب المتجه نحو الشمس في نهار متصل نحو ٤٢ سنة.', p: { rev, at: set.indexOf(q[1][0]), right: Q.find(z => z[1].includes(shown))[0] },
      mount(board, api) {
        const cx = 150, cy = 128, RR = 92, pos = i => [cx + RR * Math.cos(i * Math.PI / 4), cy - RR * Math.sin(i * Math.PI / 4)];
        board.append(svg(300, 256, E('circle', { cx, cy, r: RR, fill: 'none', stroke: '#ffffff40', 'stroke-width': 2, 'stroke-dasharray': '4 6' }), E('circle', { cx, cy, r: 24, fill: GOLD, stroke: INK, 'stroke-width': 3 }), E('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', class: 'dx-tx sm dark', text: 'الشمس' }),
          set.map(i => {
            const [x, y] = pos(i), toSun = Math.atan2(cy - y, cx - x) * 180 / Math.PI, hot = rev && i === shown;
            return E('g', { class: 'dx-moonpos' + (hot ? ' hot' : ''), role: rev ? null : 'button', tabindex: rev ? null : 0, 'aria-label': 'موضع ' + (i + 1), onclick: rev ? null : () => q[1].includes(i) ? api.win('صحيح!') : api.miss('انظر إلى السهم: هل يتجه القطب الشمالي نحو الشمس أم بعيدًا عنها أم جانبيًا؟') },
              E('circle', { cx: x, cy: y, r: 22, fill: 'transparent' }), E('circle', { cx: x, cy: y, r: 15, fill: '#2c5560', stroke: INK, 'stroke-width': 2.5 }), E('path', { d: `M${x} ${y - 15}a15 15 0 0 1 0 30z`, fill: '#8fe3e6', transform: `rotate(${toSun} ${x} ${y})` }),
              E('path', { d: `M${x - 20} ${y}h40m-7-5l7 5-7 5`, fill: 'none', stroke: '#fff', 'stroke-width': 2.5, 'stroke-linecap': 'round' }), E('text', { x: x + 23, y: y - 7, class: 'dx-tx sm', text: 'ش' }));
          })));
        if (rev) { const right = Q.find(z => z[1].includes(shown))[0], opts = shuffle([...new Set([right, ...Q.map(z => z[0]), 'القطبان مضيئان معًا طوال السنة'])].slice(0, 4), r); board.append(E('div', { class: 'dx-col' }, opts.map(t => btn(t, () => t === right || (shown === 0 && /الجنوبي في نهار|الشمالي في ليل/.test(t)) ? api.win('صحيح!') : api.miss('قارن اتجاه السهم باتجاه الشمس.'), 'dx-tile wide')))); }
      }
    };
  };

  /* ===== 15. رياح نبتون: محصلة الدفع والرياح ===== */
  DX.G.wind = (lv, r) => {
    const R = RI(r), n = 5 + (lv > 3), T = Math.min(6, 2 + lv), V = [[0, -1], [1, 0], [0, 1], [-1, 0], [0, 0]];
    for (let t = 0; t < 400; t++) {
      const winds = range(T).map(() => { const d = V[R(4)], m = lv >= 3 && R(3) === 0 ? 2 : 1; return [d[0] * m, d[1] * m]; }); let x = R(n), y = R(n); const start = [x, y]; let ok = true; const sol = [];
      for (const w of winds) { const th = R(5); sol.push(th); x += w[0] + V[th][0]; y += w[1] + V[th][1]; if (x < 0 || y < 0 || x >= n || y >= n) { ok = false; break; } }
      if (ok && (x !== start[0] || y !== start[1]) && Math.abs(x - start[0]) + Math.abs(y - start[1]) >= 2) return { n, T, winds, start, target: [x, y], sol, V };
    }
  };
  M.wind = (lv, o, r) => {
    const p = DX.G.wind(lv, r), AW = (x, y) => (x > 0 ? '→' : x < 0 ? '←' : y > 0 ? '↓' : '↑') + (Math.abs(x) + Math.abs(y) > 1 ? '×٢' : '');
    return {
      text: `أوصل المسبار إلى المنارة خلال ${AR(p.T)} جولات. في كل جولة تدفعه الريح كما في النشرة، وتضيف أنت دفعة واحدة أو لا شيء.`, hint: 'الحركة الفعلية = الريح + دفعتك. ادفع عكس الريح لتبقى مكانك، ومعها لتقفز خانتين.', p,
      mount(board, api) {
        let x, y, turn; const grid = E('div', { class: 'dx-grid', style: `--n:${p.n};direction:ltr` }), cells = [], fc = E('div', { class: 'dx-prog', dir: 'ltr' }); range(p.n * p.n).forEach(() => { const c = E('div', { class: 'dx-cellb sea' }); cells.push(c); grid.append(c); });
        const reset = () => { [x, y] = p.start; turn = 0; draw(); };
        const push = th => () => { if (turn >= p.T) return; const w = p.winds[turn]; x += w[0] + p.V[th][0]; y += w[1] + p.V[th][1]; turn++; sfx.tick(); if (x < 0 || y < 0 || x >= p.n || y >= p.n) { api.miss('جرفت الريح المسبار خارج المنطقة. نعيد المحاولة.'); return reset(); } draw(); if (x === p.target[0] && y === p.target[1]) return api.win('وصل المسبار إلى المنارة!'); if (turn >= p.T) { api.miss('انتهت الجولات قبل الوصول. نعيد المحاولة.'); reset(); } };
        board.append(label('نشرة الرياح'), fc, grid, row(btn('←', push(3), 'dx-tile'), btn('↑', push(0), 'dx-tile'), btn('↓', push(2), 'dx-tile'), btn('→', push(1), 'dx-tile'), btn('بلا دفع', push(4), 'dx-tile wide')));
        board.lastChild.style.direction = 'ltr';
        function draw() { cells.forEach((c, i) => { const me = y * p.n + x === i, tg = p.target[1] * p.n + p.target[0] === i; c.className = 'dx-cellb sea' + (me ? ' me' : ''); c.textContent = me ? '🛰' : tg ? '🗼' : ''; }); fc.innerHTML = ''; p.winds.forEach((w, i) => fc.append(E('span', { class: i === turn ? 'on cur' : i < turn ? 'past' : 'on', text: AW(w[0], w[1]) }))); }
        reset();
      }
    };
  };

  /* ===== ألعاب العقل ===== */
  M.heading = (lv, o, r) => {
    const R = RI(r), k = o.k || Math.min(7, 1 + lv), T = [['يمين', 1, '↷'], ['يسار', 3, '↶'], ...(lv >= 3 && !o.simple ? [['للخلف', 2, '⟲']] : [])], seq = range(k).map(() => T[R(T.length)]), start = lv >= 4 && !o.simple ? R(4) : 0, ans = (start + seq.reduce((s, t) => s + t[1], 0)) % 4, DIR = ['الشمال', 'الشرق', 'الجنوب', 'الغرب'], hidden = lv >= 3 && !o.simple;
    return {
      text: o.text || (hidden ? `المستكشف يتجه نحو ${DIR[start]}. احفظ الدورانات التي تظهر واحدة بعد أخرى، ثم اختر اتجاهه الأخير.` : `المستكشف يتجه نحو ${DIR[start]}، ثم يدور كما في القائمة. إلى أين يتجه في النهاية؟`), hint: 'دوران لليمين ثم لليسار يلغي أحدهما الآخر. يمينان متتاليان يساويان دورة للخلف.', p: { ans },
      mount(board, api) {
        const arrow = E('div', { class: 'dx-arrow', text: '⬆', style: `transform:rotate(${start * 90}deg)` }), list = E('div', { class: 'dx-prog' }), opts = row((o.simple ? ['↑', '→', '↓', '←'] : ['↑ الشمال', '→ الشرق', '↓ الجنوب', '← الغرب']).map((t, i) => btn(t, () => { arrow.style.transform = `rotate(${ans * 90}deg)`; i === ans ? api.win('اتجاه صحيح!') : api.fail(`الاتجاه الأخير: ${DIR[ans]}.`); }, o.simple ? 'dx-tile big' : 'dx-tile wide', { 'aria-label': DIR[i] })));
        board.append(arrow, list, opts);
        if (!hidden) seq.forEach(t => list.append(E('span', { class: 'on wide', text: t[2] + ' ' + t[0] })));
        else { opts.hidden = true; seq.forEach((t, i) => { api.later(() => { list.innerHTML = ''; list.append(E('span', { class: 'on wide cur', text: `${AR(i + 1)}. ${t[2]} ${t[0]}` })); sfx.tick(); }, 500 + i * 1100); }); api.later(() => { list.innerHTML = ''; list.append(E('span', { class: 'wide', text: 'إلى أين يتجه الآن؟' })); opts.hidden = false; }, 500 + k * 1100); }
      }
    };
  };
  M.cargo = (lv, o, r) => {
    const R = RI(r), k = Math.min(5, 1 + Math.ceil(lv * .8)), ms = 1500 - lv * 140; let n = 3 + R(5); const first = n, ev = range(k).map(() => { let d = (R(2) ? 1 : -1) * (1 + R(Math.min(4, 1 + lv))); if (n + d < 0) d = -d; n += d; return d; });
    return {
      text: `احفظ عدد الصناديق في السفينة، ثم تابع ${AR(k)} عمليات تحميل وتنزيل وحدّث العدد في ذهنك.`, hint: 'لا تحفظ العمليات كلها: حدّث الناتج فورًا بعد كل عملية واحتفظ برقم واحد فقط.', p: { ans: n },
      mount(board, api) {
        const big = E('div', { class: 'dx-big', text: AR(first) }), note = label('صناديق في السفينة الآن'), ship = E('div', { class: 'dx-ship', text: '⛵' }); board.append(ship, big, note);
        ev.forEach((d, i) => api.later(() => { big.textContent = (d > 0 ? '+' : '−') + AR(Math.abs(d)); big.className = 'dx-big ' + (d > 0 ? 'in' : 'out'); note.textContent = d > 0 ? 'صناديق دخلت' : 'صناديق خرجت'; sfx.tick(); }, 1700 + i * ms));
        api.later(() => { big.textContent = '؟'; big.className = 'dx-big'; note.textContent = 'كم صندوقًا في السفينة الآن؟'; const opts = shuffle([...new Set([n, n + 1, n - 1, n + 2, n - 2, n + 3].filter(v => v >= 0))].slice(0, 6), r); board.append(row(opts.map(v => btn(AR(v), () => v === n ? api.win('حساب صحيح!') : api.fail(`العدد الصحيح ${AR(n)}.`), 'dx-tile big')))); }, 1700 + k * ms);
      }
    };
  };
  M.sorter = (lv, o, r) => {
    const R = RI(r), total = 8, limit = 3300 - lv * 380;
    return {
      text: 'صنّف كل قطعة بحسب القاعدة الظاهرة أعلى اللوحة. القاعدة تتبدل فجأة بين «اللون» و«الشكل»، فانتبه لها قبل كل قطعة.', hint: 'اقرأ القاعدة أولًا ثم انظر إلى القطعة. اللون: الذهبي يمين والسماوي يسار. الشكل: الدائرة يمين والمثلث يسار.',
      mount(board, api) {
        let rule = R(2), i = 0, bad = 0, item, timer, open = false; const cue = E('div', { class: 'dx-cue' }), piece = E('div', { class: 'dx-piece' }), bar = E('div', { class: 'dx-timebar' }, E('i')), legend = label('');
        const ans = d => { if (!open) return; open = false; clearTimeout(timer); const want = (rule ? item.shape : item.color) === 0 ? 'R' : 'L'; if (d !== want) { bad++; sfx.bad(); piece.classList.add('wrong'); } else sfx.ok(1); api.later(next, 380); };
        function next() {
          if (i >= total) return bad <= 1 ? api.win(`صنّفت ${AR(total - bad)} من ${AR(total)} صحيحًا.`) : api.fail(`${AR(bad)} أخطاء من ${AR(total)}. المطلوب خطأ واحد على الأكثر.`);
          i++; if (i > 1 && R(100) < 30 + lv * 6) rule ^= 1; item = { shape: R(2), color: R(2) };
          cue.textContent = 'القاعدة: ' + (rule ? 'الشكل' : 'اللون'); cue.className = 'dx-cue ' + (rule ? 'shape' : 'color'); legend.textContent = rule ? 'مثلث ← يسار · يمين → دائرة' : 'سماوي ← يسار · يمين → ذهبي';
          piece.className = 'dx-piece'; piece.textContent = item.shape ? '▲' : '●'; piece.style.color = item.color ? TEAL : GOLD; bar.firstChild.style.transition = 'none'; bar.firstChild.style.width = '100%'; void bar.offsetWidth; bar.firstChild.style.transition = `width ${limit}ms linear`; bar.firstChild.style.width = '0%';
          open = true; timer = api.later(() => { if (open) { open = false; bad++; sfx.bad(); piece.classList.add('wrong'); api.later(next, 380); } }, limit);
        }
        api.on(document, 'keydown', e => { if (e.key === 'ArrowRight') ans('R'); if (e.key === 'ArrowLeft') ans('L'); });
        const r2 = row(btn('← يسار', () => ans('L'), 'dx-tile wide'), btn('يمين →', () => ans('R'), 'dx-tile wide')); r2.style.direction = 'ltr';
        board.append(cue, piece, bar, legend, r2); api.later(next, 600);
      }
    };
  };
  M.seq = (lv, o, r) => {
    const R = RI(r), n = lv <= 2 ? 4 : lv <= 4 ? 5 : 6, len = o.len || Math.min(8, 2 + lv), rev = o.reverse != null ? o.reverse : lv >= 4, seq = []; while (seq.length < len) { const v = R(n); if (v !== seq[seq.length - 1]) seq.push(v); }
    const want = rev ? seq.slice().reverse() : seq, COL = [GOLD, TEAL, CORAL, '#8be36a', '#a595ff', '#ff5fa8'];
    return {
      text: o.text || (rev ? 'راقب ومضات المنارة، ثم أعدها بالعكس: من الأخيرة إلى الأولى.' : 'راقب ومضات المنارة، ثم أعدها بالترتيب نفسه.'), hint: 'قسّم الومضات إلى مجموعات من اثنتين أو ثلاث، وسمِّ الألوان في ذهنك.', p: { seq, want },
      mount(board, api) {
        let input = [], open = false, replays = 1; const lamps = range(n).map(i => E('button', { class: 'dx-lampb', style: `--c:${COL[i]}`, 'aria-label': 'مصباح ' + (i + 1), onclick: () => tap(i) })), info = label('راقب…');
        const flash = (i, ms = 420) => { lamps[i].classList.add('lit'); sfx.tick(); api.later(() => lamps[i].classList.remove('lit'), ms); };
        function show() { open = false; input = []; info.textContent = 'راقب…'; seq.forEach((v, i) => api.later(() => flash(v), 600 + i * 720)); api.later(() => { open = true; info.textContent = rev ? 'دورك: أعدها بالعكس' : 'دورك: أعدها بالترتيب'; }, 700 + len * 720); }
        function tap(i) { if (!open) return; flash(i, 200); input.push(i); if (want[input.length - 1] !== i) { open = false; return api.fail('ترتيب غير صحيح. التسلسل كان من ' + AR(len) + ' ومضات.'); } if (input.length === want.length) { open = false; api.win('أعدت الشفرة كاملة!'); } }
        board.append(E('div', { class: 'dx-lamps' }, lamps), info, btn('أعد العرض مرة واحدة', b => { if (open && replays) { replays--; api.miss('شاهد العرض مرة أخرى.'); show(); } }, 'dx-btn sm')); show();
      }
    };
  };
  M.balance = (lv, o, r) => {
    const R = RI(r), mx = o.max || 9, cnt = o.count || Math.min(7, 4 + Math.floor(lv / 2)), ws = shuffle(range(mx).map(i => i + 1), r).slice(0, cnt), take = o.take || (lv > 3 ? 3 : 2), target = shuffle(ws, r).slice(0, take).reduce((a, b) => a + b, 0);
    return {
      text: o.text || `وازن الميزان: اختر أوزانًا مجموعها ${AR(target)} تمامًا.`, hint: `الحل يحتاج ${AR(take)} أوزان. ابدأ بالأكبر الذي لا يتجاوز الهدف.`, p: { ws, target },
      mount(board, api) {
        const on = new Set(), beam = E('g', { style: 'transform-origin:150px 62px;transition:transform .4s' }, E('rect', { x: 40, y: 57, width: 220, height: 10, rx: 5, fill: '#c98a3a', stroke: INK, 'stroke-width': 3 }),
          E('path', { d: 'M62 67v26m-26 0h52l-8 16h-36z', fill: '#e2b458', stroke: INK, 'stroke-width': 3 }), E('path', { d: 'M238 67v26m-26 0h52l-8 16h-36z', fill: '#e2b458', stroke: INK, 'stroke-width': 3 }), E('circle', { cx: 62, cy: 36, r: 19, fill: '#58d6d0', stroke: INK, 'stroke-width': 3 }), E('text', { x: 62, y: 42, 'text-anchor': 'middle', class: 'dx-tx dark', style: 'font-size:18px', text: AR(target) }), E('circle', { cx: 238, cy: 36, r: 19, fill: GOLD, stroke: INK, 'stroke-width': 3 }), E('text', { x: 238, y: 42, 'text-anchor': 'middle', class: 'dx-tx dark', style: 'font-size:18px', id: 'dxSum', text: '٠' }));
        board.append(svg(300, 160, E('path', { d: 'M150 62v80m-34 6h68', stroke: INK, 'stroke-width': 8, 'stroke-linecap': 'round' }), beam, E('circle', { cx: 150, cy: 62, r: 8, fill: GOLD, stroke: INK, 'stroke-width': 3 })), row(ws.map((w, i) => btn(o.dots ? '●'.repeat(w) : AR(w), b => {
          on.has(i) ? on.delete(i) : on.add(i); b.classList.toggle('selected', on.has(i)); sfx.tick(); const sum = [...on].reduce((s, k) => s + ws[k], 0); beam.querySelector('#dxSum').textContent = AR(sum); beam.style.transform = `rotate(${Math.max(-12, Math.min(12, (sum - target) * 3))}deg)`;
          if (sum === target) api.later(() => api.win('توازن الميزان!'), 450); else if (sum > target) api.note('الكفة أثقل من المطلوب. أزل وزنًا.');
        }, 'dx-tile' + (o.dots ? ' wide' : '')))));
        beam.style.transform = 'rotate(-12deg)';
      }
    };
  };
  M.search = (lv, o, r) => {
    const R = RI(r), N = 9 + lv * 5, limit = 13 - lv, target = R(N), tShape = R(2), tCol = R(2), SH = ['▲', '●'], COL = [GOLD, TEAL];
    return {
      text: `جد القطعة الوحيدة المطابقة للنموذج خلال ${AR(limit)} ثانية. بقية القطع تشبهها في اللون أو الشكل فقط.`, hint: 'امسح اللوحة صفًا صفًا وابحث عن اللون أولًا ثم تحقق من الشكل.', p: { target },
      mount(board, api) {
        const grid = E('div', { class: 'dx-field', style: `--n:${N > 24 ? 7 : 6}` }), bar = E('div', { class: 'dx-timebar' }, E('i', { style: `transition:width ${limit}s linear` }));
        range(N).forEach(i => { const same = i === target, sh = same ? tShape : R(2), col = same ? tCol : (sh === tShape ? 1 - tCol : R(2)), fix = !same && sh === tShape && col === tCol; grid.append(E('button', { class: 'dx-dot', style: `color:${COL[fix ? 1 - tCol : col]}`, text: SH[sh], 'aria-label': 'قطعة', onclick: () => same ? api.win('وجدتها!') : api.miss('ليست المطابقة: انظر للون والشكل معًا.') })); });
        board.append(E('div', { class: 'dx-ask' }, E('b', { text: SH[tShape], style: `color:${COL[tCol]};font-size:34px` }), E('span', { text: 'النموذج المطلوب' })), bar, grid);
        api.later(() => { bar.firstChild.style.width = '0%'; }, 30); api.later(() => api.fail('انتهى الوقت.'), limit * 1000);
      }
    };
  };

  /* ===== عالم الطفل ===== */
  M.quiz = (lv, o, r) => {
    const q = o.make(o.age ?? 2, r, lv);
    return {
      text: q.q, hint: q.hint, p: q,
      mount(board, api) {
        if (q.pic) board.append(E('div', { class: 'dx-pic', text: q.pic }));
        board.append(E('div', { class: 'dx-opts' + (q.opts.length > 3 ? ' two' : '') }, shuffle(q.opts, r).map(v => { const [t, e] = Array.isArray(v) ? v : [v, '']; return E('button', { class: 'dx-opt' + (/[\u0600-\u06FF0-9]/.test(t) ? '' : ' emo'), 'data-v': t, onclick: () => t === q.ans ? api.win(q.yes || 'إجابة صحيحة!') : api.miss(q.no || 'فكّر مرة أخرى.') }, e ? E('i', { text: e }) : null, E('span', { text: t })); })));
      }
    };
  };
  M.word = (lv, o, r) => {
    const [w, pic] = o.pick(o.age ?? 2, r), letters = [...w], extra = (o.age ?? 2) >= 3 ? shuffle([...'بتسلمنرو'].filter(c => !letters.includes(c)), r).slice(0, 2) : [], tiles = shuffle(letters.concat(extra), r), model = (o.age ?? 2) === 0;
    return {
      text: (o.say && o.say[o.age]) || 'رتّب الحروف لتكتب اسم الصورة.', hint: `الكلمة تبدأ بحرف «${letters[0]}» وتنتهي بحرف «${letters[letters.length - 1]}».`, p: { w },
      mount(board, api) {
        let out = ''; const used = new Set(), box = E('div', { class: 'dx-word' }), tray = row(); board.append(E('div', { class: 'dx-pic', text: pic })); if (model) board.append(label('الكلمة: ' + w, 'dx-label model')); board.append(box, tray);
        function draw() {
          box.textContent = out || '…'; tray.innerHTML = '';
          tiles.forEach((c, i) => { if (!used.has(i)) tray.append(btn(c, () => { if (letters[[...out].length] !== c) return api.miss('ليس هذا الحرف التالي.'); out += c; used.add(i); sfx.tick(); draw(); if (out === w) { DX.speak(w, true); api.win('كتبت: ' + w); } }, 'dx-tile big')); });
        }
        draw();
      }
    };
  };
})();
