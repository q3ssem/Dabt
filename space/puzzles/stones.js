/* 03 تحريك الأحجار — دفع فقط (بلا سحب) داخل مساحة محدودة.
   د١: حجر واحد. د٢: حجران وعوائق. د٣: حجران + بلاط جليدي: الحجر المدفوع على الجليد ينزلق حتى يصطدم أو يقف على أرض عادية.
   التوليد عكسي (سحب الأحجار من الأهداف) ثم تحقق BFS أمامي يعطي أقل عدد حركات. */
(function (G) {
  const SV = G.SV, D = SV.D;
  const AR = ['↑', '→', '↓', '←'], AN = ['أعلى', 'يمين', 'أسفل', 'يسار'];

  function step(P, st, d) {
    const w = P.w, h = P.h, x = st.p % w + D[d][0], y = (st.p / w | 0) + D[d][1];
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    const ni = y * w + x; if (P.wall[ni]) return null;
    const k = st.s.indexOf(ni); let slid = false;
    if (k < 0) return { p: ni, s: st.s, pushed: false };
    const free = i => { const xx = i % w, yy = i / w | 0; return true && !P.wall[i] && !st.s.includes(i); };
    let bx = x + D[d][0], by = y + D[d][1];
    if (bx < 0 || by < 0 || bx >= w || by >= h) return null;
    let b = by * w + bx; if (!free(b)) return null;
    while (P.ice[b]) { const cx = b % w + D[d][0], cy = (b / w | 0) + D[d][1]; if (cx < 0 || cy < 0 || cx >= w || cy >= h) break; const nb = cy * w + cx; if (!free(nb)) break; b = nb; slid = true; }
    const s = st.s.slice(); s[k] = b;
    return { p: ni, s, pushed: true, slid };
  }
  const keyOf = st => st.p + '|' + st.s.slice().sort((a, b) => a - b).join(',');
  const won = (P, s) => s.every(i => P.goal[i]);

  function bfs(P, start, limit = 150000) {
    const q = [start], prev = new Map([[keyOf(start), null]]);
    let head = 0;
    while (head < q.length) {
      const st = q[head++];
      if (won(P, st.s)) { const path = []; let k = keyOf(st); while (prev.get(k)) { const [pk, d] = prev.get(k); path.unshift(d); k = pk; } return path; }
      if (q.length > limit) return null;
      for (let d = 0; d < 4; d++) { const ns = step(P, st, d); if (!ns) continue; const k = keyOf(ns); if (!prev.has(k)) { prev.set(k, [keyOf(st), d]); q.push({ p: ns.p, s: ns.s }); } }
    }
    return null;
  }

  function generate(rng, grade) {
    const w = grade === 1 ? 5 : 6, h = grade === 1 ? 5 : 6, N = w * h;
    const nStones = grade === 1 ? 1 : 2, nWalls = grade === 1 ? 2 : grade === 2 ? 4 : 3, nIce = grade === 3 ? 5 : 0;
    const wall = Array(N).fill(false), goal = Array(N).fill(false), ice = Array(N).fill(false);
    rng.shuffle([...Array(N).keys()]).slice(0, nWalls).forEach(i => wall[i] = true);
    // ترابط الأرض
    const floor = [...Array(N).keys()].filter(i => !wall[i]);
    const seen = new Set([floor[0]]), q = [floor[0]];
    while (q.length) { const c = q.pop(); for (const [dx, dy] of D) { const x = c % w + dx, y = (c / w | 0) + dy; if (x < 0 || y < 0 || x >= w || y >= h) continue; const i = y * w + x; if (!wall[i] && !seen.has(i)) { seen.add(i); q.push(i); } } }
    if (seen.size !== floor.length) return null;
    // الأهداف بعيدة عن الزوايا الميتة
    const corner = i => { const x = i % w, y = i / w | 0; const b = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= w || yy >= h || wall[yy * w + xx]; }; return (b(0, -1) || b(0, 1)) && (b(-1, 0) || b(1, 0)); };
    const goals = rng.shuffle(floor.filter(i => !corner(i))).slice(0, nStones); if (goals.length < nStones) return null;
    goals.forEach(i => goal[i] = true);
    const P = { w, h, wall, goal, ice };
    // سحب عكسي
    let st = { p: rng.pick(floor.filter(i => !goal[i])), s: goals.slice() };
    for (let t = 0; t < 260; t++) {
      const d = rng.int(4), x = st.p % w + D[d][0], y = (st.p / w | 0) + D[d][1];
      if (x < 0 || y < 0 || x >= w || y >= h) continue; const ni = y * w + x;
      if (wall[ni] || st.s.includes(ni)) continue;
      const bx = st.p % w - D[d][0], by = (st.p / w | 0) - D[d][1], bi = by * w + bx, k = (bx >= 0 && by >= 0 && bx < w && by < h) ? st.s.indexOf(bi) : -1;
      if (k >= 0 && rng() < .62) { const s = st.s.slice(); s[k] = st.p; st = { p: ni, s }; } else st = { p: ni, s: st.s };
    }
    if (st.s.some(i => goal[i])) return null;
    // في د٣ نجرب عدة توزيعات للجليد على نفس المستوى، ونقبل فقط ما يستعمل الحل الأمثل فيه الانزلاق
    const iceCand = floor.filter(i => !goal[i] && !st.s.includes(i) && i !== st.p);
    for (let t = 0; t < (nIce ? 14 : 1); t++) {
      ice.fill(false);
      if (nIce) rng.shuffle(iceCand.slice()).slice(0, nIce).forEach(i => ice[i] = true);
      const sol = bfs(P, st); if (!sol) continue;
      let cur = st, pushes = 0, slides = 0; for (const d of sol) { const ns = step(P, cur, d); if (ns.pushed) pushes++; if (ns.slid) slides++; cur = { p: ns.p, s: ns.s }; }
      if (pushes < (grade === 1 ? 3 : 6)) continue;
      if (grade === 3 && !slides) continue;
      P.start = st; P.sol = sol; P.opt = sol.length;
      return P;
    }
    return null;
  }

  function mount(ctx) {
    const P = ctx.P, w = P.w, h = P.h, cs = 56, W = w * cs, H = h * cs;
    const wrap = SV.el('div', { class: 'svst' }); ctx.el.appendChild(wrap);
    wrap.innerHTML = `<div class="svst-b"></div><div class="svst-pad">${[0, 3, 2, 1].map(d => `<button data-d="${d}" class="d${d}" aria-label="${AN[d]}">${AR[d]}</button>`).join('')}</div>`;
    const bEl = wrap.querySelector('.svst-b'); let hintDir = -1;
    function go(d) {
      const ns = step(P, ctx.state, d);
      if (!ns) { ctx.sfx.tap(); return; }
      hintDir = -1; ns.pushed ? ctx.sfx.place() : ctx.sfx.tap();
      const nst = { p: ns.p, s: ns.s };
      ctx.commit(nst);
      // خطأ مفيد: حجر علق في زاوية خارج الهدف
      const moved = ns.pushed ? nst.s.filter(i => !ctx.S.hist.length || !JSON.parse(ctx.S.hist[ctx.S.hist.length - 1]).s.includes(i)) : [];
      const dead = moved.find(i => { if (P.goal[i]) return false; const x = i % w, y = i / w | 0, b = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= w || yy >= h || P.wall[yy * w + xx]; }; return (b(0, -1) || b(0, 1)) && (b(-1, 0) || b(1, 0)) && !P.ice[i]; });
      if (dead != null && !ctx.S.done) ctx.mistake('هذا الحجر علق في زاوية ولن يتحرك بعد الآن. استعمل «تراجع».');
    }
    wrap.querySelector('.svst-pad').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) go(+b.dataset.d); });
    let sx = 0, sy = 0;
    bEl.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    bEl.addEventListener('pointerup', e => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.hypot(dx, dy) > 24) { go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); return; }
      const t = e.target.closest('[data-c]'); if (!t) return; const c = +t.dataset.c, p = ctx.state.p;
      const ddx = c % w - p % w, ddy = (c / w | 0) - (p / w | 0);
      if (Math.abs(ddx) + Math.abs(ddy) === 1) go(ddx === 1 ? 1 : ddx === -1 ? 3 : ddy === 1 ? 2 : 0);
    });
    const onKey = e => { const m = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key]; if (m != null) { e.preventDefault(); go(m); } };
    document.addEventListener('keydown', onKey);
    function update(st) {
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="لوحة الأحجار">`;
      for (let i = 0; i < w * h; i++) {
        const x = (i % w) * cs, y = (i / w | 0) * cs;
        if (P.wall[i]) { s += `<g data-c="${i}"><rect x="${x + 2}" y="${y + 2}" width="${cs - 4}" height="${cs - 4}" rx="10" class="svst-w"/><path d="M${x + 12} ${y + 20}q8-8 16 0M${x + 26} ${y + 36}q8-8 16 0" class="svst-wl"/></g>`; continue; }
        s += `<rect data-c="${i}" x="${x + 1}" y="${y + 1}" width="${cs - 2}" height="${cs - 2}" rx="6" class="${P.ice[i] ? 'svst-ice' : 'svst-f'}"/>`;
        if (P.ice[i]) s += `<path d="M${x + 12} ${y + 40}l14-22M${x + 28} ${y + 44}l12-18" class="svst-shine"/>`;
        if (P.goal[i]) s += `<circle cx="${x + cs / 2}" cy="${y + cs / 2}" r="${cs * .32}" class="svst-g"/><path d="M${x + cs / 2} ${y + cs / 2 - 9}l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z" class="svst-gs"/>`;
      }
      for (const b of st.s) { const x = (b % w) * cs + cs / 2, y = (b / w | 0) * cs + cs / 2; s += `<g class="svst-s ${P.goal[b] ? 'on' : ''}" transform="translate(${x} ${y})"><circle r="${cs * .4}"/><path d="M-9 -4q9-8 18 0M-7 6q7-5 14 0"/></g>`; }
      const px = (st.p % w) * cs + cs / 2, py = (st.p / w | 0) * cs + cs / 2;
      s += `<g transform="translate(${px} ${py})"><circle r="${cs * .42}" class="svst-pl"/><image href="${SV.asset('img/wamd-face-0.webp')}" x="${-cs * .38}" y="${-cs * .4}" width="${cs * .76}" height="${cs * .76}" clip-path="circle(48%)"/></g>`;
      s += '</svg>';
      bEl.innerHTML = s;
      wrap.querySelectorAll('.svst-pad button').forEach(b => b.classList.toggle('mk', +b.dataset.d === hintDir));
    }
    ctx.markDir = d => { hintDir = d; update(ctx.state); };
    return { update, destroy() { document.removeEventListener('keydown', onKey); } };
  }

  SV.registerType('stones', {
    generate, mount,
    check: P => !!P.sol,
    init: P => SV.clone(P.start),
    isSolved: (P, s) => won(P, s.s),
    solved(P) { let st = SV.clone(P.start); for (const d of P.sol) { const ns = step(P, st, d); st = { p: ns.p, s: ns.s }; } return st; },
    hint(P, s, lv, ctx) {
      if (lv === 1) return { text: 'فكّر من الهدف للخلف: من أي جهة يجب أن يُدفع الحجر ليصل؟ وأين يجب أن يقف وَمْض؟' };
      if (lv === 2) return { text: P.ice.some(Boolean) ? 'الحجر على الجليد ينزلق حتى يصطدم أو يقف على أرض عادية. استخدم الانزلاق لتختصر الطريق، وانتبه أن لا يتجاوز الهدف.' : 'لا تدفع حجرًا إلى زاوية أو إلى جانب جدار بعيد عن الهدف؛ لن تستطيع سحبه.' };
      const path = bfs(P, { p: s.p, s: s.s });
      if (!path) return { text: 'الوضع الحالي لا حل له. استعمل «تراجع» أو «إعادة».' };
      if (!path.length) return { text: 'أنت على الحل.' };
      return { text: `الخطوة التالية: ${AN[path[0]]}. بقي ${SV.ar(path.length)} حركة على الأقل.`, mark: () => ctx.markDir(path[0]) };
    },
    stars(P, S) { let s = 3; if (S.moves > P.opt + 2) s--; if (S.moves > P.opt * 1.6 + 4) s--; if (S.hintLv >= 2) s--; return s; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
