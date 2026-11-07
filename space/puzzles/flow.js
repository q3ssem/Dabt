/* 05 توصيل الطاقة — وصل كل زوج بلورات بمسار لا يقطع غيره، وتمتلئ كل الخانات.
   التوليد: مسار هاميلتوني عشوائي (backbite) يغطي اللوحة، يُقطّع إلى K مقاطع؛ فوجود الحل مضمون.
   د١: ٥×٥ وثلاثة أزواج. د٢: ٦×٦ وأربعة أزواج + جدران. د٣: ٦×٦ وخمسة أزواج + جدران + خانات بوابة لا يعبرها إلا لونها. */
(function (G) {
  const SV = G.SV, D = SV.D;
  const PAL = ['#FF6B6B', '#5CC8FF', '#FFD45A', '#7BE07B', '#C38BFF', '#FF9F4D'];

  function hamilton(rng, n) {
    let p = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) p.push(y * n + (y % 2 ? n - 1 - x : x));
    const adj = (a, b) => Math.abs(a % n - b % n) + Math.abs((a / n | 0) - (b / n | 0)) === 1;
    for (let it = 0; it < n * n * 60; it++) {
      if (rng() < .5) p.reverse();
      const end = p[p.length - 1], ex = end % n, ey = end / n | 0;
      const nbs = D.map(([dx, dy]) => [ex + dx, ey + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < n && y < n).map(([x, y]) => y * n + x);
      const q = rng.pick(nbs), i = p.indexOf(q);
      if (i === p.length - 2) continue;
      p = p.slice(0, i + 1).concat(p.slice(i + 1).reverse());
      if (!adj(p[i], p[i + 1])) return null;
    }
    return p;
  }

  function generate(rng, grade) {
    const n = grade === 1 ? 5 : 6, K = grade === 1 ? 3 : grade === 2 ? 4 : 5;
    const H = hamilton(rng, n); if (!H) return null;
    // قص إلى K مقاطع، طول كل مقطع ≥ ٣
    const L = H.length; let cuts;
    for (let t = 0; t < 50; t++) {
      cuts = rng.shuffle([...Array(L - 1).keys()].map(i => i + 1)).slice(0, K - 1).sort((a, b) => a - b);
      const b = [0, ...cuts, L]; if (b.every((v, i) => i === 0 || v - b[i - 1] >= 3)) break; cuts = null;
    }
    if (!cuts) return null;
    const bnd = [0, ...cuts, L], segs = bnd.slice(1).map((e, i) => H.slice(bnd[i], e));
    const ends = segs.map(s => [s[0], s[s.length - 1]]);
    // رفض المقاطع التي طرفاها متجاوران (لغز بديهي)
    const adj = (a, b) => Math.abs(a % n - b % n) + Math.abs((a / n | 0) - (b / n | 0)) === 1;
    if (ends.some(([a, b]) => adj(a, b))) return null;
    const wallSet = new Set();
    if (grade >= 2) {
      const used = new Set(); segs.forEach(s => s.forEach((c, i) => { if (i) used.add(Math.min(c, s[i - 1]) + '-' + Math.max(c, s[i - 1])); }));
      const pairs = []; for (let i = 0; i < n * n; i++) { if (i % n < n - 1) pairs.push(i + '-' + (i + 1)); if (i < n * n - n) pairs.push(i + '-' + (i + n)); }
      rng.shuffle(pairs.filter(p => !used.has(p))).slice(0, grade === 2 ? 6 : 8).forEach(p => wallSet.add(p));
    }
    const gate = {};
    if (grade === 3) {
      const inner = []; segs.forEach((s, k) => s.slice(1, -1).forEach(c => inner.push([c, k])));
      rng.shuffle(inner).slice(0, 3).forEach(([c, k]) => gate[c] = k);
    }
    return { n, K, ends, segs, walls: [...wallSet], gate };
  }

  function validate(P, st) {
    const n = P.n, own = Array(n * n).fill(-1), walls = new Set(P.walls), errs = [];
    for (let k = 0; k < P.K; k++) {
      const p = st.paths[k] || [];
      if (p.length < 2) { errs.push('open'); continue; }
      const [a, b] = P.ends[k];
      if (!((p[0] === a && p[p.length - 1] === b) || (p[0] === b && p[p.length - 1] === a))) errs.push('open');
      for (let i = 0; i < p.length; i++) {
        const c = p[i]; if (own[c] >= 0) errs.push('cross'); own[c] = k;
        if (P.gate[c] != null && P.gate[c] !== k) errs.push('gate');
        if (i) { const q = p[i - 1]; if (Math.abs(q % n - c % n) + Math.abs((q / n | 0) - (c / n | 0)) !== 1 || walls.has(Math.min(q, c) + '-' + Math.max(q, c))) errs.push('step'); }
      }
    }
    if (own.some(v => v < 0)) errs.push('empty');
    return errs;
  }

  function mount(ctx) {
    const P = ctx.P, n = P.n, cs = 60, W = n * cs;
    const wrap = SV.el('div', { class: 'svfl' }); ctx.el.appendChild(wrap);
    const walls = new Set(P.walls), endOf = {}; P.ends.forEach(([a, b], k) => { endOf[a] = k; endOf[b] = k; });
    let live = null, drag = null, ghost = null;
    const cellAt = e => { const r = wrap.querySelector('svg').getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * n), y = Math.floor((e.clientY - r.top) / r.height * n); return x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x; };
    const ownerOf = (paths, c) => { for (let k = 0; k < P.K; k++) if ((paths[k] || []).includes(c)) return k; return -1; };
    wrap.addEventListener('pointerdown', e => {
      const c = cellAt(e); if (c < 0) return;
      const paths = SV.clone(ctx.state.paths);
      let k = endOf[c] != null ? endOf[c] : ownerOf(paths, c);
      if (k < 0) return;
      if (endOf[c] === k) paths[k] = [c]; else paths[k] = paths[k].slice(0, paths[k].indexOf(c) + 1);
      drag = { k }; live = paths; e.preventDefault(); wrap.setPointerCapture(e.pointerId); ctx.sfx.tap(); draw(live);
    });
    wrap.addEventListener('pointermove', e => {
      if (!drag) return; const c = cellAt(e); if (c < 0) return;
      const k = drag.k, p = live[k], last = p[p.length - 1]; if (c === last) return;
      const i = p.indexOf(c); if (i >= 0) { live[k] = p.slice(0, i + 1); draw(live); return; }
      if (Math.abs(last % n - c % n) + Math.abs((last / n | 0) - (c / n | 0)) !== 1) return;
      if (walls.has(Math.min(last, c) + '-' + Math.max(last, c))) return;
      const [a, b] = P.ends[k]; if (p.length > 1 && (last === a || last === b) && last !== p[0]) return; // وصل للطرف الآخر
      if (endOf[c] != null && endOf[c] !== k) return;
      if (P.gate[c] != null && P.gate[c] !== k) { ctx.msg('هذه البوابة لا يعبرها إلا لونها.', 'bad'); return; }
      const o = ownerOf(live, c); if (o >= 0 && o !== k) live[o] = live[o].slice(0, live[o].indexOf(c)); // قطع المسار الآخر
      live[k] = [...p, c]; ctx.sfx.turn(); draw(live);
    });
    const end = () => {
      if (!drag) return; drag = null; const ns = { paths: live }; live = null;
      ctx.commit(ns);
      if (!ctx.S.done) {
        const errs = validate(P, ns);
        if (!errs.includes('open') && errs.includes('empty')) ctx.mistake('كل الأزواج موصولة، لكن بقيت خانات فارغة. كل خانة يجب أن يمر بها مسار.');
      }
    };
    wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
    function draw(paths) {
      let s = `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="لوحة توصيل الطاقة" style="touch-action:none">`;
      for (let i = 0; i < n * n; i++) { const x = (i % n) * cs, y = (i / n | 0) * cs; s += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${cs - 3}" height="${cs - 3}" rx="8" class="svfl-c"/>`; if (P.gate[i] != null) s += `<rect x="${x + 6}" y="${y + 6}" width="${cs - 12}" height="${cs - 12}" rx="6" fill="none" stroke="${PAL[P.gate[i]]}" stroke-width="3" stroke-dasharray="5 4"/>`; }
      for (const w of walls) { const [a, b] = w.split('-').map(Number); const ax = a % n, ay = a / n | 0; if (b === a + 1) s += `<line x1="${(ax + 1) * cs}" y1="${ay * cs + 4}" x2="${(ax + 1) * cs}" y2="${(ay + 1) * cs - 4}" class="svfl-w"/>`; else s += `<line x1="${ax * cs + 4}" y1="${(ay + 1) * cs}" x2="${(ax + 1) * cs - 4}" y2="${(ay + 1) * cs}" class="svfl-w"/>`; }
      const pt = c => `${(c % n) * cs + cs / 2},${(c / n | 0) * cs + cs / 2}`;
      paths.forEach((p, k) => { if (p && p.length > 1) s += `<polyline points="${p.map(pt).join(' ')}" fill="none" stroke="${PAL[k]}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity=".88"/>`; });
      if (ghost) s += `<polyline points="${ghost.p.map(pt).join(' ')}" fill="none" stroke="${PAL[ghost.k]}" stroke-width="6" stroke-dasharray="6 6" stroke-linecap="round" class="svfl-gh"/>`;
      P.ends.forEach(([a, b], k) => [a, b].forEach(c => { s += `<g transform="translate(${pt(c).replace(',', ' ')})"><circle r="19" fill="${PAL[k]}" stroke="#2A1A0E" stroke-width="3"/><path d="M0 -10 L7 0 L0 10 L-7 0Z" fill="#fff" opacity=".85"/></g>`; }));
      s += '</svg>'; wrap.innerHTML = s;
    }
    ctx.ghost = k => { ghost = { k, p: P.segs[k] }; draw(ctx.state.paths); setTimeout(() => { ghost = null; draw(ctx.state.paths); }, 2600); };
    return { update: st => draw(st.paths) };
  }

  SV.registerType('flow', {
    generate, mount,
    check: P => validate(P, { paths: P.segs }).length === 0,
    init: P => ({ paths: Array(P.K).fill(null).map(() => []) }),
    isSolved: (P, s) => validate(P, s).length === 0,
    solved: P => ({ paths: SV.clone(P.segs) }),
    hint(P, s, lv, ctx) {
      if (lv === 1) return { text: 'ابدأ بالأزواج القريبة من الحواف والزوايا؛ طرقها أقل خيارات.' };
      if (lv === 2) return { text: Object.keys(P.gate).length ? 'كل خانة يجب أن يمر بها مسار، والخانات المحاطة بلون لا يعبرها إلا ذلك اللون.' : 'كل خانة يجب أن يمر بها مسار. إذا بقيت فجوة، فأحد المسارات يجب أن يلتف ليملأها.' };
      // أول لون غير موصول أو يختلف عن الحل المرجعي
      let k = P.segs.findIndex((seg, i) => { const p = s.paths[i] || []; return p.length !== seg.length || !(p.every((c, j) => c === seg[j]) || p.every((c, j) => c === seg[seg.length - 1 - j])); });
      if (k < 0) k = 0;
      return { text: 'هذا المسار المتقطع يُظهر طريق أحد الألوان لثوانٍ.', mark: () => ctx.ghost(k) };
    },
    stars(P, S) { let s = 3; if (S.moves > P.K + 4) s--; if (S.moves > P.K * 2 + 8) s--; if (S.hintLv >= 2) s--; return s; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
