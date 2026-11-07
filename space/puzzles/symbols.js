/* 02 ترتيب الرموز — استنتاج قاعدة تسلسل.
   د١: شكل يتكرر بدورة. د٢: الشكل والدورة اللونية بدورتين مختلفتين. د٣: حجر «المرآة» في منتصف الصف يعكس ترتيب الأشكال بعده. */
(function (G) {
  const SV = G.SV;
  const SH = ['circle', 'tri', 'square', 'diamond', 'star', 'moon'];
  const SHN = { circle: 'دائرة', tri: 'مثلث', square: 'مربع', diamond: 'معيّن', star: 'نجمة', moon: 'هلال' };
  const CO = [['gold', '#E2A93B', 'ذهبي'], ['blue', '#3E8EEA', 'أزرق'], ['green', '#3FAF6A', 'أخضر'], ['pink', '#E25C9A', 'وردي']];
  const glyph = (s, c) => {
    const f = `fill="${c}" stroke="#3A2616" stroke-width="2.4" stroke-linejoin="round"`;
    return ({
      circle: `<circle cx="20" cy="20" r="11" ${f}/>`,
      tri: `<path d="M20 7 L33 31 H7Z" ${f}/>`,
      square: `<rect x="9" y="9" width="22" height="22" rx="3" ${f}/>`,
      diamond: `<path d="M20 6 L33 20 L20 34 L7 20Z" ${f}/>`,
      star: `<path d="M20 5l4.2 9.2 10 1-7.5 6.8 2.2 9.8L20 26.8 11.1 31.8l2.2-9.8L5.8 15.2l10-1z" ${f}/>`,
      moon: `<path d="M25 6a14 14 0 1 0 4 26a11 11 0 1 1-4-26z" ${f}/>`
    })[s];
  };
  const stoneSVG = (st) => st.gate ? `<svg viewBox="0 0 40 40"><rect x="4" y="4" width="32" height="32" rx="8" fill="#2B3C73" stroke="#E2A93B" stroke-width="2.5"/><path d="M20 8v24M13 14l-5 6 5 6M27 14l5 6-5 6" stroke="#BFF3FF" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`
    : `<svg viewBox="0 0 40 40">${glyph(st.s, CO.find(c => c[0] === st.c)[1])}</svg>`;

  function generate(rng, grade) {
    const shapes = rng.shuffle(SH.slice()), cols = rng.shuffle(CO.map(c => c[0]));
    const p = grade === 1 ? 2 + rng.int(2) : 2 + rng.int(2);
    let q = grade === 1 ? 1 : (p === 2 ? 3 : 2);
    if (grade === 3) q = 2;
    const seq = [];
    let L, gateAt = -1;
    if (grade < 3) {
      L = Math.max(p, q) * 3 + 1 + rng.int(2);
      for (let i = 0; i < L; i++) seq.push({ s: shapes[i % p], c: cols[i % q] });
    } else {
      const pre = p * 2 + 1 + rng.int(p), post = p + 3;
      for (let i = 0; i < pre; i++) seq.push({ s: shapes[i % p], c: cols[i % q] });
      gateAt = seq.length; seq.push({ gate: true });
      // بعد المرآة: الأشكال تعود بالترتيب المعكوس (نفس الأحجار قبل البوابة بالعكس)، واللون يستمر بدورته
      for (let j = 0; j < post; j++) { const src = seq[pre - 1 - j]; seq.push({ s: src.s, c: cols[(pre + j) % q] }); }
      L = seq.length;
    }
    // الفراغات: بعد ظهور دورتين كاملتين على الأقل
    const minIdx = Math.max(p, q) * 2;
    let cand = [...Array(L).keys()].filter(i => i >= minIdx && !seq[i].gate);
    if (grade === 3) { const before = cand.filter(i => i < gateAt), after = cand.filter(i => i > gateAt + 2); cand = [...rng.shuffle(before).slice(0, 1), ...rng.shuffle(after).slice(0, 2)]; }
    else cand = rng.shuffle(cand).slice(0, grade === 1 ? 2 : 3);
    const blanks = cand.sort((a, b) => a - b);
    if (blanks.length < 2) return null;
    const need = blanks.map(i => seq[i]);
    // أحجار مضللة: قريبة من الصحيح (نفس الشكل بلون آخر، أو نفس اللون بشكل آخر). في د٣: الحجر الذي كان صحيحًا لولا الانعكاس
    const decoys = [];
    const same = (a, b) => a.s === b.s && a.c === b.c;
    const addD = d => { if (!need.some(x => same(x, d)) && !decoys.some(x => same(x, d))) decoys.push(d); };
    if (grade === 3) for (const i of blanks.filter(i => i > gateAt)) addD({ s: shapes[(i - 1) % p], c: seq[i].c }); // الاستمرار دون انعكاس
    for (const nd of need) { addD({ s: nd.s, c: rng.pick(cols.filter(c => c !== nd.c)) }); addD({ s: rng.pick(shapes.slice(0, Math.max(p, 3)).filter(s => s !== nd.s)), c: nd.c }); }
    const nd = grade === 1 ? 2 : grade === 2 ? 3 : 4;
    const tray = rng.shuffle([...need.map(x => ({ ...x })), ...decoys.slice(0, nd)]);
    return { p, q, seq, blanks, tray, gateAt, cols, shapes };
  }

  const answerOf = (P) => P.blanks.map(i => P.seq[i]);
  function solvedMap(P) { // لكل فراغ: فهرس حجر صحيح من الصينية (دون تكرار)
    const used = new Set(), m = {};
    P.blanks.forEach(b => { const want = P.seq[b]; const k = P.tray.findIndex((t, j) => !used.has(j) && t.s === want.s && t.c === want.c); used.add(k); m[b] = k; });
    return m;
  }

  function mount(ctx) {
    const P = ctx.P; let sel = -1, mark = -1;
    const wrap = SV.el('div', { class: 'svsy' }); ctx.el.appendChild(wrap);
    wrap.addEventListener('click', e => {
      const t = e.target.closest('[data-k]'); if (!t) return;
      const [kind, v] = t.dataset.k.split(':'), i = +v, st = ctx.state;
      if (kind === 'tray') { if (Object.values(st.place).includes(i)) return; sel = sel === i ? -1 : i; mark = -1; ctx.sfx.tap(); update(st); return; }
      if (kind === 'slot') {
        if (st.place[i] != null) { const ns = { place: { ...st.place } }; delete ns.place[i]; ctx.sfx.tap(); sel = -1; ctx.commit(ns); return; }
        if (sel < 0) { ctx.msg('اختر حجرًا من الأسفل أولًا، ثم المكان الفارغ.', ''); return; }
        const ns = { place: { ...st.place, [i]: sel } }; sel = -1; ctx.sfx.place();
        // عند امتلاء كل الفراغات: تحقق وشرح الخطأ
        if (P.blanks.every(b => ns.place[b] != null)) {
          const bad = P.blanks.find(b => { const t = P.tray[ns.place[b]], w = P.seq[b]; return t.s !== w.s || t.c !== w.c; });
          if (bad != null) {
            const t = P.tray[ns.place[bad]], w = P.seq[bad];
            let why = t.s !== w.s && t.c !== w.c ? 'الشكل واللون كلاهما لا يتبعان النمط' : t.s !== w.s ? `الشكل لا يتبع النمط (${SHN[t.s]})` : `اللون لا يتبع دورته (${CO.find(c => c[0] === t.c)[2]})`;
            if (P.gateAt >= 0 && bad > P.gateAt && t.s !== w.s) why += ' — تذكّر: بعد حجر المرآة ينعكس الترتيب';
            ctx.commit(ns); // ليرى اللاعب ما وضعه
            const back = { place: { ...ns.place } }; P.blanks.forEach(b => { const tt = P.tray[back.place[b]], ww = P.seq[b]; if (tt.s !== ww.s || tt.c !== ww.c) delete back.place[b]; });
            ctx.mistake(`الحجر في الخانة ${SV.ar(bad + 1)}: ${why}.`);
            setTimeout(() => ctx.commit(back, { move: false }), 700);
            return;
          }
        }
        ctx.commit(ns);
      }
    });
    function update(st) {
      const placed = new Set(Object.values(st.place));
      wrap.innerHTML = `<div class="svsy-row" role="list">${P.seq.map((x, i) => {
        if (x.gate) return `<div class="svsy-c gate" role="listitem" aria-label="حجر المرآة">${stoneSVG(x)}</div>`;
        if (!P.blanks.includes(i)) return `<div class="svsy-c" role="listitem">${stoneSVG(x)}</div>`;
        const k = st.place[i];
        return `<button class="svsy-c slot ${k != null ? 'full' : ''}" data-k="slot:${i}" aria-label="خانة ${i + 1}">${k != null ? stoneSVG(P.tray[k]) : '<span>؟</span>'}</button>`;
      }).join('')}</div>
      <div class="svsy-tray">${P.tray.map((t, j) => `<button class="svsy-c tr ${placed.has(j) ? 'used' : ''} ${sel === j ? 'sel' : ''} ${mark === j ? 'mk' : ''}" data-k="tray:${j}" aria-label="حجر">${stoneSVG(t)}</button>`).join('')}</div>`;
    }
    ctx.markTray = j => { mark = j; update(ctx.state); };
    return { update };
  }

  SV.registerType('symbols', {
    generate, mount,
    check: P => Object.values(solvedMap(P)).every(k => k >= 0),
    init: () => ({ place: {} }),
    isSolved: (P, s) => P.blanks.every(b => { const k = s.place[b]; if (k == null) return false; const t = P.tray[k], w = P.seq[b]; return t.s === w.s && t.c === w.c; }),
    solved: P => ({ place: solvedMap(P) }),
    hint(P, s, lv, ctx) {
      if (lv === 1) return { text: 'افصل الشكل عن اللون: تابع تسلسل الأشكال وحده، ثم تسلسل الألوان وحده.' };
      if (lv === 2) return { text: P.gateAt >= 0 ? `الأشكال تتكرر كل ${SV.ar(P.p)}، واللون كل ${SV.ar(P.q)}. بعد حجر المرآة تعود الأشكال بالترتيب المعكوس.` : P.q > 1 ? `الشكل يتكرر كل ${SV.ar(P.p)} أحجار، واللون يتكرر كل ${SV.ar(P.q)}.` : `الأشكال تتكرر كل ${SV.ar(P.p)} أحجار.` };
      const m = solvedMap(P), b = P.blanks.find(b => { const k = s.place[b]; if (k == null) return true; const t = P.tray[k], w = P.seq[b]; return t.s !== w.s || t.c !== w.c; });
      return { text: `الحجر المضيء يناسب الخانة ${SV.ar(b + 1)}.`, mark: () => ctx.markTray(m[b]) };
    },
    stars(P, S) { return 3 - Math.min(2, S.mistakes) - (S.hintLv >= 2 ? 1 : 0); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
