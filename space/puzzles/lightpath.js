/* 01 مسار الضوء — قطع تُدار فقط. الشعاع يتبع القنوات.
   د١: مصدر وهدف. د٢: مقسّم (ثلاث فتحات) يغذي هدفين + قطع مقفلة. د٣: لونان، لكل لون هدفه، والتقاطع (+) يمرر اللونين دون خلط. */
(function (G) {
  const SV = G.SV, D = SV.D;
  // الفتحات: بت لكل جهة 1=ش 2=شر 4=ج 8=غ
  const BASE = { I: 5, L: 3, T: 11, X: 15, E: 0 };
  const rot = (m, r) => { let o = 0; for (let i = 0; i < 4; i++) if (m & (1 << i)) o |= 1 << ((i + r) % 4); return o; };
  const period = k => k === 'I' ? 2 : k === 'X' || k === 'E' ? 1 : 4;
  const COL = { w: '#FFE9A8', r: '#FF6B6B', b: '#5CC8FF' };

  function trace(P, rots) {
    const n = P.n, hits = {}, lit = {};
    for (const s of P.src) {
      const seen = new Set(), q = [[s.x, s.y, s.d]];
      while (q.length) {
        const [x, y, d] = q.pop(), key = x + ',' + y + ',' + d;
        if (seen.has(key)) continue; seen.add(key);
        const i = y * n + x, k = P.kind[i], m = rot(BASE[k], rots[i]), entry = (d + 2) % 4;
        if (!(m & (1 << entry))) continue;
        (lit[i] = lit[i] || {})[s.c] = (lit[i][s.c] || 0) | (1 << entry);
        const exits = k === 'X' ? [d] : [0, 1, 2, 3].filter(e => e !== entry && (m & (1 << e)));
        for (const e of exits) {
          lit[i][s.c] |= 1 << e;
          const nx = x + D[e][0], ny = y + D[e][1];
          if (nx < 0 || ny < 0 || nx >= n || ny >= n) { const hk = x + ',' + y + ',' + e; (hits[hk] = hits[hk] || new Set()).add(s.c); }
          else q.push([nx, ny, e]);
        }
      }
    }
    return { hits, lit };
  }
  function solvedBy(P, rots) {
    const { hits } = trace(P, rots);
    return P.tgt.every(t => { const h = hits[t.x + ',' + t.y + ',' + t.d]; return h && h.size === 1 && h.has(t.c); });
  }

  // سير عشوائي غير متقاطع من خلية الدخول حتى الخروج من خلية/جهة الهدف
  function walk(rng, n, sx, sy, sd, goal, blocked, minLen) {
    let budget = 6000; const path = [], used = new Set();
    function dfs(x, y, din) {
      if (--budget < 0) return false;
      used.add(x + ',' + y); path.push({ x, y, din });
      if (x === goal.x && y === goal.y && path.length >= minLen && !blocked(x, y, din, goal.d, true)) { path[path.length - 1].dout = goal.d; return true; }
      for (const e of rng.shuffle([0, 1, 2, 3])) {
        if (e === (din + 2) % 4) continue;
        const nx = x + D[e][0], ny = y + D[e][1];
        if (nx < 0 || ny < 0 || nx >= n || ny >= n || used.has(nx + ',' + ny) || blocked(nx, ny, e, null, false)) continue;
        path[path.length - 1].dout = e;
        if (dfs(nx, ny, e)) return true;
      }
      used.delete(x + ',' + y); path.pop(); return false;
    }
    return dfs(sx, sy, sd) ? path : null;
  }
  const edgeEntry = (rng, n, side) => { // مصدر على حافة: يدخل الشعاع الخلية متجهًا للداخل
    const k = rng.int(n);
    return [{ x: k, y: 0, d: 2 }, { x: n - 1, y: k, d: 3 }, { x: k, y: n - 1, d: 0 }, { x: 0, y: k, d: 1 }][side];
  };
  const edgeExit = (rng, n, side) => { const k = rng.int(n); return [{ x: k, y: 0, d: 0 }, { x: n - 1, y: k, d: 1 }, { x: k, y: n - 1, d: 2 }, { x: 0, y: k, d: 3 }][side]; };
  function shapeOf(din, dout) { // نوع القطعة وتدويرها لربط جهة الدخول بجهة الخروج
    const a = (din + 2) % 4, b = dout, m = (1 << a) | (1 << b);
    for (const k of ['I', 'L']) for (let r = 0; r < 4; r++) if (rot(BASE[k], r) === m) return [k, r];
  }
  const rotFor = (k, m) => { for (let r = 0; r < 4; r++) if (rot(BASE[k], r) === m) return r; return -1; };

  function generate(rng, grade) {
    const n = grade === 1 ? 4 : 5, N = n * n;
    const kind = Array(N).fill(null), sol = Array(N).fill(0), fixed = Array(N).fill(false);
    const P = { n, kind, sol, fixed, src: [], tgt: [], onPath: Array(N).fill(false) };
    const put = (x, y, k, r) => { const i = y * n + x; kind[i] = k; sol[i] = r; P.onPath[i] = true; };
    if (grade === 1) {
      const s = edgeEntry(rng, n, 3), g = edgeExit(rng, n, rng.pick([0, 1, 2]));
      const path = walk(rng, n, s.x, s.y, s.d, g, () => false, n + 2); if (!path) return null;
      path.forEach(c => { const [k, r] = shapeOf(c.din, c.dout); put(c.x, c.y, k, r); });
      P.src.push({ ...s, c: 'w' }); P.tgt.push({ ...g, c: 'w' });
    } else if (grade === 2) {
      const s = edgeEntry(rng, n, 3);
      // جذع حتى خلية المقسّم في الوسط
      const sp = { x: 1 + rng.int(n - 2), y: 1 + rng.int(n - 2) };
      let trunk = null, branches = null;
      for (let t = 0; t < 30 && !branches; t++) {
        trunk = walkTo(rng, n, s, sp); if (!trunk) continue;
        const din = trunk[trunk.length - 1].din, entry = (din + 2) % 4;
        const outs = rng.shuffle([0, 1, 2, 3].filter(e => e !== entry)).slice(0, 2);
        const used = new Set(trunk.map(c => c.x + ',' + c.y));
        const res = [];
        for (const e of outs) {
          const nx = sp.x + D[e][0], ny = sp.y + D[e][1];
          if (nx < 0 || ny < 0 || nx >= n || ny >= n || used.has(nx + ',' + ny)) { res.length = 0; break; }
          const side = rng.pick([0, 1, 2].filter(sd => sd !== 3));
          const g = edgeExit(rng, n, side);
          const b = walk(rng, n, nx, ny, e, g, (x, y) => used.has(x + ',' + y), 2);
          if (!b) { res.length = 0; break; }
          b.forEach(c => used.add(c.x + ',' + c.y)); res.push({ b, g, e });
        }
        if (res.length === 2 && res[0].g.x + ',' + res[0].g.y + ',' + res[0].g.d !== res[1].g.x + ',' + res[1].g.y + ',' + res[1].g.d) { branches = res; trunk.pop(); trunk.din = din; trunk.entry = entry; }
      }
      if (!branches) return null;
      trunk.forEach(c => { const [k, r] = shapeOf(c.din, c.dout); put(c.x, c.y, k, r); });
      put(sp.x, sp.y, 'T', rotFor('T', (1 << trunk.entry) | (1 << branches[0].e) | (1 << branches[1].e)));
      branches.forEach(({ b, g }) => { b.forEach(c => { const [k, r] = shapeOf(c.din, c.dout); put(c.x, c.y, k, r); }); P.tgt.push({ ...g, c: 'w' }); });
      P.src.push({ ...s, c: 'w' });
    } else {
      // لونان: مسار أحمر، ثم أزرق يتجنبه ويُسمح له بالعبور المستقيم المتعامد (يصبح +)
      const sa = edgeEntry(rng, n, 3), ga = edgeExit(rng, n, 1);
      const A = walk(rng, n, sa.x, sa.y, sa.d, ga, () => false, n + 1); if (!A) return null;
      const aMap = {}; A.forEach(c => aMap[c.x + ',' + c.y] = c);
      const straightA = c => c && (c.din === c.dout);
      const sb = edgeEntry(rng, n, 0), gb = edgeExit(rng, n, 2);
      if (aMap[sb.x + ',' + sb.y] || aMap[gb.x + ',' + gb.y]) return null;
      const B = walk(rng, n, sb.x, sb.y, sb.d, gb, (x, y, d, dout, isGoal) => {
        const a = aMap[x + ',' + y]; if (!a) return false;
        return !(straightA(a) && (d % 2) !== (a.din % 2)); // عبور متعامد فقط
      }, n + 1);
      if (!B) return null;
      // يجب أن يستمر الأزرق مستقيمًا داخل خلية التقاطع
      for (const c of B) { const a = aMap[c.x + ',' + c.y]; if (a && c.din !== c.dout) return null; }
      A.forEach(c => { const [k, r] = shapeOf(c.din, c.dout); put(c.x, c.y, k, r); });
      let cross = 0;
      B.forEach(c => { if (aMap[c.x + ',' + c.y]) { put(c.x, c.y, 'X', 0); cross++; } else { const [k, r] = shapeOf(c.din, c.dout); put(c.x, c.y, k, r); } });
      if (!cross && rng() < .7) return null; // نفضّل وجود تقاطع
      P.src.push({ ...sa, c: 'r' }, { ...sb, c: 'b' }); P.tgt.push({ ...ga, c: 'r' }, { ...gb, c: 'b' });
    }
    // بقية الخلايا: قطع مشتتة
    for (let i = 0; i < N; i++) if (!kind[i]) { kind[i] = rng.pick(grade === 3 ? ['I', 'L', 'L', 'T', 'E'] : ['I', 'L', 'L', 'E']); sol[i] = rng.int(4); }
    if (grade === 2) { // قطعتان مقفلتان على الحل (مرساة) + قطعة مقفلة خارجه
      const on = rng.shuffle([...Array(N).keys()].filter(i => P.onPath[i] && kind[i] !== 'T')).slice(0, 2);
      const off = rng.shuffle([...Array(N).keys()].filter(i => !P.onPath[i] && kind[i] !== 'E')).slice(0, 1);
      [...on, ...off].forEach(i => fixed[i] = true);
    }
    // تدوير ابتدائي عشوائي (مع إبقاء المقفل على حله)
    P.start = sol.map((r, i) => fixed[i] ? r : rng.int(4));
    if (solvedBy(P, P.start)) P.start = P.start.map((r, i) => fixed[i] ? r : (r + 1) % 4);
    P.par = sol.reduce((a, r, i) => a + (P.onPath[i] && !fixed[i] ? ((r - P.start[i]) % period(kind[i]) + period(kind[i])) % period(kind[i]) : 0), 0);
    return P;
  }
  function walkTo(rng, n, s, cell) {
    const p = walk(rng, n, s.x, s.y, s.d, { x: cell.x, y: cell.y, d: 0 }, () => false, 3);
    return p; // آخر عنصر هو خلية المقسّم (dout غير مهم)
  }

  const equalRot = (k, a, b) => ((a - b) % period(k) + period(k)) % period(k) === 0;

  function mount(ctx) {
    const P = ctx.P, n = P.n, cs = 64, pad = 46, W = n * cs + pad * 2;
    const wrap = SV.el('div', { class: 'svlp' }); ctx.el.appendChild(wrap);
    let lastTap = -1, marked = -1;
    wrap.addEventListener('click', e => {
      const t = e.target.closest('[data-i]'); if (!t) return; const i = +t.dataset.i;
      if (P.fixed[i]) { ctx.msg('هذه القطعة مثبّتة ولا تدور', ''); ctx.sfx.tap(); return; }
      if (P.kind[i] === 'E' || P.kind[i] === 'X') { ctx.sfx.tap(); return; }
      const ns = ctx.state.slice(); ns[i] = (ns[i] + 1) % 4; lastTap = i; marked = -1; ctx.sfx.turn(); ctx.commit(ns);
    });
    function chan(m, c, w, glow) {
      let s = '';
      for (let e = 0; e < 4; e++) if (m & (1 << e)) { const [dx, dy] = D[e]; s += `<line x1="0" y1="0" x2="${dx * cs / 2}" y2="${dy * cs / 2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${glow ? 'filter="url(#lpg)"' : ''}/>`; }
      return s;
    }
    const posOut = (t) => { const cx = pad + t.x * cs + cs / 2 + D[t.d][0] * (cs / 2 + 18), cy = pad + t.y * cs + cs / 2 + D[t.d][1] * (cs / 2 + 18); return [cx, cy]; };
    function update(rots) {
      const { hits, lit } = trace(P, rots);
      let s = `<svg viewBox="0 0 ${W} ${W}" class="svlp-svg" role="img" aria-label="لوحة مسار الضوء"><defs><filter id="lpg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
      s += `<rect x="${pad - 8}" y="${pad - 8}" width="${n * cs + 16}" height="${n * cs + 16}" rx="16" class="svlp-bed"/>`;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const i = y * n + x, k = P.kind[i], m = rot(BASE[k], rots[i]), cx = pad + x * cs + cs / 2, cy = pad + y * cs + cs / 2;
        s += `<g data-i="${i}" class="svlp-t ${P.fixed[i] ? 'fx' : ''} ${i === lastTap ? 'spin' : ''} ${i === marked ? 'mk' : ''}" transform="translate(${cx} ${cy})"><rect x="${-cs / 2 + 3}" y="${-cs / 2 + 3}" width="${cs - 6}" height="${cs - 6}" rx="11" class="svlp-st"/>`;
        if (k === 'X') { s += chan(5, '#6B5A3A', 12) + chan(10, '#6B5A3A', 12); }
        else s += chan(m, '#6B5A3A', 13);
        if (lit[i]) for (const c in lit[i]) s += chan(lit[i][c], COL[c], 6, true);
        if (k !== 'E' && k !== 'X') s += `<circle r="7" fill="#C9962E" stroke="#6B5A3A" stroke-width="2"/>`;
        if (P.fixed[i]) s += `<path d="M14 -24 h12 v10 h-12z M16 -24 v-4 a4 4 0 0 1 8 0 v4" fill="#C9962E" stroke="#6B5A3A" stroke-width="1.4"/>`;
        s += `</g>`;
      }
      for (const t of P.src) { const [cx, cy] = posOut({ x: t.x, y: t.y, d: (t.d + 2) % 4 }); s += `<g transform="translate(${cx} ${cy})"><circle r="17" fill="#1B2D5A" stroke="#E2A93B" stroke-width="3"/><path d="M0 -11 L8 0 L0 11 L-8 0Z" fill="${COL[t.c]}" filter="url(#lpg)"/></g>`; }
      for (const t of P.tgt) {
        const [cx, cy] = posOut(t), h = hits[t.x + ',' + t.y + ',' + t.d], ok = h && h.size === 1 && h.has(t.c), mix = h && h.size > 1;
        s += `<g transform="translate(${cx} ${cy})" class="svlp-tg ${ok ? 'on' : ''}"><circle r="17" fill="#1B2D5A" stroke="${mix ? '#FF4D6D' : '#E2A93B'}" stroke-width="3"/><circle r="9" fill="${ok ? COL[t.c] : 'none'}" stroke="${COL[t.c]}" stroke-width="3" ${ok ? 'filter="url(#lpg)"' : ''}/></g>`;
      }
      s += '</svg>';
      wrap.innerHTML = s;
      const mixed = P.tgt.some(t => { const h = hits[t.x + ',' + t.y + ',' + t.d]; return h && h.size > 1; });
      if (mixed) ctx.msg('اللونان وصلا إلى هدف واحد فاختلطا. كل هدف يقبل لونه فقط.', 'bad');
      lastTap = -1;
    }
    ctx.markTile = i => { marked = i; update(ctx.state); };
    return { update };
  }

  SV.registerType('lightpath', {
    generate, mount,
    check: P => solvedBy(P, P.sol),
    init: P => P.start.slice(),
    isSolved: (P, s) => solvedBy(P, s),
    solved: P => P.sol.slice(),
    hint(P, s, lv, ctx) {
      if (lv === 1) return { text: 'تتبّع الشعاع من المصدر خطوة خطوة: أين يتوقف؟ القطعة التي يتوقف عندها هي التي تحتاج تدويرًا.' };
      if (lv === 2) return { text: P.grade === 1 ? 'القطعة المستقيمة تمرر الضوء، والزاوية تحرفه ٩٠°. الهدف يحتاج شعاعًا يخرج من الحافة نحوه.' : P.grade === 2 ? 'القطعة ذات الفتحات الثلاث تقسم الشعاع إلى فرعين: وجّه كل فرع إلى هدف.' : 'كل لون يحتاج طريقًا مستقلًا. علامة (+) تسمح بمرور اللونين متقاطعين دون أن يختلطا.' };
      // ٣: أول قطعة على الحل المرجعي ليست في وضعها الصحيح
      const n = P.n;
      for (let i = 0; i < n * n; i++) if (P.onPath[i] && !P.fixed[i] && !equalRot(P.kind[i], s[i], P.sol[i])) return { text: 'القطعة المضيئة ليست في وضعها الصحيح. دوّرها.', mark: () => ctx.markTile(i) };
      return { text: 'المسار الرئيسي صحيح؛ راجع القطع التي تمرر الضوء إلى مكان آخر.' };
    },
    stars(P, S) { let s = 3; if (S.moves > P.par + 4) s--; if (S.moves > P.par * 2 + 8) s--; if (S.hintLv >= 2) s--; return s; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
