/* أطلس النجوم — محرك الألغاز (مستقل عن جزيرة الكنز)
   التخزين: spaceVoyage.v1 + نسخة احتياطية spaceVoyage.v1.bak
   كل نوع لغز يسجّل نفسه عبر SV.registerType(type, impl):
     impl.generate(rng, grade) -> P          بيانات اللغز (مع الحل المرجعي)
     impl.check(P) -> bool                   تحقق الحلّال من وجود حل (يُرفض التوليد إن فشل)
     impl.init(P) -> state                   الحالة الابتدائية (قابلة للتسلسل JSON)
     impl.isSolved(P, state) -> bool
     impl.mount(ctx) -> {update(state)}      الرسم والتفاعل
     impl.hint(P, state, level, ctx) -> {text, mark?}
     impl.stars(P, stats) -> 1..3            (اختياري)
     impl.solved(P) -> state                 حالة محلولة (للاختبارات الآلية)
     impl.noUndo                             لألغاز الذاكرة (التراجع يكشف المخفي) */
(function (G) {
  const SV = G.SV = G.SV || {};
  SV.version = 1;

  /* ---------- أدوات ---------- */
  SV.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    r.int = n => Math.floor(r() * n);
    r.pick = arr => arr[r.int(arr.length)];
    r.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = r.int(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    return r;
  };
  SV.hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  SV.clone = o => JSON.parse(JSON.stringify(o));
  SV.ar = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  SV.D = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // ش، شر، ج، غ
  SV.base = SV.base || 'space/';
  SV.asset = p => SV.base + 'assets/' + p;
  SV.el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; };

  /* ---------- أنواع الألغاز ---------- */
  SV.types = {};
  SV.registerType = (type, impl) => { SV.types[type] = impl; };

  /* توليد مع تحقق: لا يُعرض لغز إلا بعد أن يجد الحلّال حلًا */
  SV.make = function (type, seed, grade) {
    const impl = SV.types[type];
    for (let v = 0; v < 5; v++) { // بذرة مشتقة احتياطية حتى لا يتعطل اللاعب أبدًا
      const s = v ? SV.hash(seed + ':' + v) : seed, rng = SV.rng(s);
      for (let tries = 0; tries < 60; tries++) {
        const P = impl.generate(rng, grade);
        if (P && impl.check(P) && !impl.isSolved(P, impl.init(P))) { P.seed = s; P.grade = grade; P.type = type; return P; }
      }
    }
    throw new Error('generator failed: ' + type + ' g' + grade + ' seed ' + seed);
  };

  /* ---------- الحفظ ---------- */
  const KEY = 'spaceVoyage.v1', BAK = 'spaceVoyage.v1.bak';
  const fresh = () => ({ v: 1, planet: 'nowara', intro: false, puz: {}, inv: { stars: 0, shards: 0, keys: [], artifacts: [] }, journal: [], beacon: { charge: 0, lit: false }, settings: { sfx: true }, savedAt: 0 });
  const valid = s => s && s.v === 1 && typeof s.puz === 'object' && typeof s.inv === 'object';
  SV.store = {
    st: null, restored: false,
    load() {
      let s = null; this.restored = false;
      for (const k of [KEY, BAK]) {
        try { const v = localStorage.getItem(k); if (!v) continue; const p = JSON.parse(v); if (valid(p)) { s = p; this.restored = k === BAK; break; } } catch (e) { /* تالف: نجرب النسخة الاحتياطية */ }
      }
      const f = fresh();
      this.st = Object.assign(f, s || {});
      this.st.inv = Object.assign(fresh().inv, this.st.inv || {});
      this.st.beacon = Object.assign(fresh().beacon, this.st.beacon || {});
      return this.st;
    },
    save() {
      const s = this.st; if (!s) return; s.savedAt = Date.now();
      try { const prev = localStorage.getItem(KEY); if (prev && valid(JSON.parse(prev))) localStorage.setItem(BAK, prev); localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { }
    },
    reset() { this.st = fresh(); this.save(); }
  };
  SV.rec = id => { const st = SV.store.st; return st.puz[id] || (st.puz[id] = { status: 'new', g: {} }); };

  /* ---------- الصوت (يُولَّد بالكود) ---------- */
  let AC = null;
  function tone(f, d = .12, type = 'sine', vol = .07, at = 0) {
    if (!SV.store.st || !SV.store.st.settings.sfx) return;
    try {
      AC = AC || new (G.AudioContext || G.webkitAudioContext)();
      const t = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + .02);
    } catch (e) { }
  }
  SV.sfx = {
    tap: () => tone(620, .05, 'triangle', .05),
    turn: () => tone(480, .06, 'square', .025),
    place: () => tone(740, .08, 'triangle', .06),
    bad: () => { tone(200, .18, 'triangle', .07); tone(150, .22, 'triangle', .05, .08); },
    ok: () => tone(880, .1, 'sine', .07),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, 'triangle', .07, i * .09)),
    shard: () => [1175, 1568].forEach((f, i) => tone(f, .18, 'sine', .06, i * .07)),
    key: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .32, 'triangle', .06, i * .11))
  };

  /* ---------- قواعد المكافآت ----------
     النجوم: تقيس جودة الأداء، ونجمتان في الدرجة ٢ تفتحان الدرجة ٣.
     شظايا الطاقة: تُكسب أول مرة تُكمل فيها كل درجة (١/٢/٣) وتشحن المنارة.
     مفاتيح المنارات: مفتاح لكل فصل مكتمل؛ مفتاح الفصل يفتح المنطقة التالية.
     القطعة الأثرية: تُمنح عند تفعيل منارة الكوكب. */
  SV.rules = {
    gradeOpen(id, grade) {
      const g = SV.rec(id).g;
      if (grade === 1) return { ok: true };
      if (grade === 2) return g[1] && g[1].done ? { ok: true } : { ok: false, why: 'تُفتح بإكمال الدرجة ١' };
      return g[2] && g[2].done && g[2].stars >= 2 ? { ok: true } : { ok: false, why: g[2] && g[2].done ? 'تحتاج نجمتين في الدرجة ٢' : 'تُفتح بإكمال الدرجة ٢' };
    },
    shardsFor: grade => grade
  };

  SV.recountStars = function () {
    const st = SV.store.st; let n = 0;
    for (const id in st.puz) for (const k in st.puz[id].g) n += st.puz[id].g[k].stars || 0;
    st.inv.stars = n; return n;
  };

  /* ---------- جلسة اللغز ---------- */
  SV.play = function (host, def, grade, hooks = {}) {
    const impl = SV.types[def.puzzleType];
    const rec = SV.rec(def.puzzleId);
    const gr = rec.g[grade] || (rec.g[grade] = { done: false, stars: 0, plays: 0 });
    if (!gr.seed) gr.seed = SV.hash(def.puzzleId + ':' + grade + ':' + (gr.plays || 0) + ':' + Date.now()) % 2147483647;
    if (rec.status === 'new') rec.status = 'active';
    SV.store.save();

    const P = SV.make(def.puzzleType, gr.seed, grade);
    const S = { def, grade, P, impl, state: impl.init(P), hist: [], moves: 0, hintLv: 0, mistakes: 0, resets: 0, done: false };
    SV._session = S;

    const root = SV.el('div', { class: 'svp', 'data-type': def.puzzleType });
    root.innerHTML = `
      <header class="svp-h">
        <button class="svp-ib" data-a="exit" aria-label="خروج">✕</button>
        <div class="svp-t"><small>${def.chapterName} · لغز ${SV.ar(def.n)}</small><b>${def.name}</b></div>
        <div class="svp-gr" aria-label="الدرجة">${[1, 2, 3].map(k => `<i class="${k === grade ? 'on' : ''} ${rec.g[k] && rec.g[k].done ? 'ok' : ''}">${SV.ar(k)}</i>`).join('')}</div>
      </header>
      <div class="svp-goal"><p>${def.goal}</p><button class="svp-rl" data-a="rules">القواعد</button></div>
      <ol class="svp-rules" hidden>${(def.rules[grade] || def.rules[1]).map(r => `<li>${r}</li>`).join('')}</ol>
      <div class="svp-board"></div>
      <div class="svp-msg" role="status" aria-live="polite"></div>
      <footer class="svp-f">
        <button data-a="hint"><b>💡</b>تلميح <small class="svp-hl"></small></button>
        ${impl.noUndo ? '' : '<button data-a="undo"><b>↶</b>تراجع</button>'}
        <button data-a="reset"><b>⟲</b>إعادة</button>
      </footer>`;
    host.innerHTML = ''; host.appendChild(root);
    const board = root.querySelector('.svp-board'), msgEl = root.querySelector('.svp-msg');
    let msgT = 0;
    const ctx = {
      el: board, P, S, sfx: SV.sfx, grade,
      get state() { return S.state; },
      commit(ns, opt = {}) {
        if (S.done) return;
        if (!impl.noUndo) S.hist.push(JSON.stringify(S.state));
        S.state = ns; if (opt.move !== false) S.moves++;
        view.update(S.state); updateBtns();
        if (impl.isSolved(P, S.state)) win();
      },
      msg(text, kind = '') { msgEl.textContent = text; msgEl.className = 'svp-msg ' + kind; clearTimeout(msgT); if (text) msgT = setTimeout(() => { msgEl.textContent = ''; msgEl.className = 'svp-msg'; }, kind === 'bad' ? 4200 : 3200); },
      mistake(text) { S.mistakes++; SV.sfx.bad(); ctx.msg(text, 'bad'); board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake'); }
    };
    S.ctx = ctx;
    const view = impl.mount(ctx);
    view.update(S.state);

    function updateBtns() {
      const u = root.querySelector('[data-a=undo]'); if (u) u.disabled = !S.hist.length || S.done;
      root.querySelector('.svp-hl').textContent = S.hintLv ? SV.ar(S.hintLv) + '/٣' : '';
    }
    updateBtns();

    function stars() {
      let s = impl.stars ? impl.stars(P, S) : 3 - (S.mistakes > 2 ? 1 : 0);
      if (S.hintLv >= 3) s -= 1;
      return Math.max(1, Math.min(3, s));
    }

    function win() {
      S.done = true; const st = SV.store.st;
      const s = stars(), first = !gr.done;
      gr.done = true; gr.stars = Math.max(gr.stars || 0, s); gr.plays = (gr.plays || 0) + 1; gr.seed = 0; // اللعبة القادمة بلغز جديد
      if (grade === 1 && rec.status !== 'done') rec.status = 'done';
      let shards = 0;
      if (first) { shards = SV.rules.shardsFor(grade); st.inv.shards += shards; st.journal.push({ t: Date.now(), k: 'puz', id: def.puzzleId, g: grade, s }); }
      SV.recountStars();
      const extra = hooks.onWin ? hooks.onWin(def, grade, s, first) : null;
      SV.store.save();
      SV.sfx.win(); if (shards) setTimeout(SV.sfx.shard, 450);
      updateBtns();
      const nextOpen = grade < 3 && SV.rules.gradeOpen(def.puzzleId, grade + 1);
      const ov = SV.el('div', { class: 'svp-win' });
      ov.innerHTML = `<div class="svp-wc">
        <div class="svp-stars">${[1, 2, 3].map(k => `<i class="${k <= s ? 'on' : ''}" style="animation-delay:${k * .15}s">★</i>`).join('')}</div>
        <h3>أحسنت!</h3><p>${def.name} — الدرجة ${SV.ar(grade)}</p>
        <ul class="svp-rw">${shards ? `<li><span class="svshard"></span>+${SV.ar(shards)} شظايا طاقة</li>` : '<li>أعدت حل الدرجة؛ النجوم تُحفظ بالأفضل</li>'}${extra && extra.html ? extra.html : ''}</ul>
        <div class="svp-wb">${nextOpen && nextOpen.ok ? `<button data-a="next" class="pri">الدرجة ${SV.ar(grade + 1)}</button>` : (grade < 3 && nextOpen ? `<small>${nextOpen.why}</small>` : '')}
        <button data-a="replay">لغز جديد</button><button data-a="exit">العودة</button></div></div>`;
      root.appendChild(ov);
    }

    root.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'exit') { close(); }
      else if (a === 'rules') { const r = root.querySelector('.svp-rules'); r.hidden = !r.hidden; }
      else if (a === 'undo') { if (S.hist.length && !S.done) { S.state = JSON.parse(S.hist.pop()); view.update(S.state); updateBtns(); SV.sfx.tap(); ctx.msg(''); } }
      else if (a === 'reset') { if (S.done) return; S.state = impl.init(P); S.hist = []; S.resets++; view.update(S.state); updateBtns(); SV.sfx.tap(); ctx.msg('بدأت من جديد', ''); }
      else if (a === 'hint') { if (S.done) return; S.hintLv = Math.min(3, S.hintLv + 1); const h = impl.hint(P, S.state, S.hintLv, ctx); ctx.msg(h.text, 'hint'); if (h.mark) h.mark(); updateBtns(); }
      else if (a === 'next') { close(true); hooks.onOpen && hooks.onOpen(def, grade + 1); }
      else if (a === 'replay') { close(true); hooks.onOpen && hooks.onOpen(def, grade); }
    });
    function close(silent) { if (view.destroy) view.destroy(); root.remove(); SV._session = null; if (!silent && hooks.onExit) hooks.onExit(); else if (silent && hooks.onExitSilent) hooks.onExitSilent(); }
    return S;
  };
})(typeof window !== 'undefined' ? window : globalThis);
