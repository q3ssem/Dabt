'use strict';
/* مختبر العقل — طبقة التطوير (الإصدار 2)
   core.js: ساعة قابلة للإيقاف لكل الألعاب، أدوات الرسم، مشغّل المهام الموحد، الحفظ والترحيل. */
const DX = window.DX = { ver: 2, M: {}, back: null };

/* ---------- 1. ساعة افتراضية: توقف كل المؤقتات والحركة عند «إيقاف مؤقت» في أي لعبة قديمة أو جديدة ---------- */
(function () {
  const nST = window.setTimeout.bind(window), nCT = window.clearTimeout.bind(window);
  const nRAF = window.requestAnimationFrame.bind(window), nCAF = window.cancelAnimationFrame.bind(window);
  const nNow = performance.now.bind(performance);
  let off = 0, pausedAt = null, seq = 1e7;
  const T = new Map(), F = new Map();
  const vnow = () => (pausedAt ?? nNow()) - off;
  const arm = t => { t.h = nST(() => fire(t), Math.max(0, t.due - vnow())); };
  function fire(t) {
    if (pausedAt != null || !T.has(t.id)) return;
    if (t.every) { t.due = vnow() + t.every; arm(t); } else T.delete(t.id);
    t.fn(...t.args);
  }
  const frame = f => { f.h = nRAF(() => { if (pausedAt != null || !F.has(f.id)) return; F.delete(f.id); f.fn(vnow()); }); };
  window.setTimeout = (fn, ms = 0, ...args) => { if (typeof fn !== 'function') return nST(fn, ms); const t = { id: ++seq, fn, args, due: vnow() + (+ms || 0) }; T.set(t.id, t); if (pausedAt == null) arm(t); return t.id; };
  window.setInterval = (fn, ms = 0, ...args) => { const t = { id: ++seq, fn, args, every: Math.max(4, +ms || 0) }; t.due = vnow() + t.every; T.set(t.id, t); if (pausedAt == null) arm(t); return t.id; };
  window.clearTimeout = window.clearInterval = id => { const t = T.get(id); if (t) { nCT(t.h); T.delete(id); } else nCT(id); };
  window.requestAnimationFrame = fn => { const f = { id: ++seq, fn }; F.set(f.id, f); if (pausedAt == null) frame(f); return f.id; };
  window.cancelAnimationFrame = id => { const f = F.get(id); if (f) { nCAF(f.h); F.delete(id); } else nCAF(id); };
  try { Object.defineProperty(performance, 'now', { value: vnow, configurable: true, writable: true }); } catch (e) { /* يبقى توقيت المتصفح */ }
  DX.clock = {
    paused: () => pausedAt != null, real: nNow,
    pause() { if (pausedAt != null) return; pausedAt = nNow(); T.forEach(t => nCT(t.h)); F.forEach(f => nCAF(f.h)); },
    resume() { if (pausedAt == null) return; off += nNow() - pausedAt; pausedAt = null; T.forEach(arm); F.forEach(frame); },
  };
})();

/* ---------- 2. أدوات صغيرة ---------- */
DX.$ = s => document.querySelector(s);
DX.el = (tag, attrs = {}, ...kids) => {
  const svg = /^(svg|g|path|circle|rect|line|polyline|polygon|ellipse|text|defs|linearGradient|radialGradient|stop|clipPath|use|tspan)$/.test(tag);
  const n = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k.startsWith('on')) n[k] = v; else if (k === 'html') n.innerHTML = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v); }
  kids.flat(9).forEach(c => c != null && c !== false && n.append(c)); return n;
};
DX.AR = v => String(v).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
DX.rng = (seed) => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
DX.shuffle = (a, r = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
DX.prefs = () => { const p = S.st.discoveryPrefs || (S.st.discoveryPrefs = {}); if (p.rounds == null) p.rounds = 6; if (p.motion == null) p.motion = true; if (p.speech == null) p.speech = false; return p; };
DX.motion = () => DX.prefs().motion && !matchMedia('(prefers-reduced-motion: reduce)').matches;
DX.toast = t => { const e = DX.el('div', { class: 'dx-toast', role: 'status', text: t }); document.body.append(e); setTimeout(() => e.remove(), 2800); };
DX.speak = (t, force) => { if (!(force || DX.prefs().speech) || !('speechSynthesis' in window)) return; try { const u = new SpeechSynthesisUtterance(t); u.lang = 'ar-SA'; u.rate = .85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { } };
DX.hush = () => { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { } };

/* ---------- 3. واجهة مهمة واحدة: تُستخدم في ألعاب العقل، عالم الطفل، الجزيرة والكواكب ----------
   M[kind](lv, opts, rnd) → { text, hint, mount(board, api) }
   api.win(msg) يحل المهمة · api.miss(msg) خطأ قابل للتصحيح · api.fail(msg) خسارة الجولة */
DX.mountTask = (host, task, hooks, theme = 'night') => {
  const E = DX.el; let over = false; const timers = [], loops = [], offs = [];
  const fb = E('p', { class: 'dx-fb', role: 'status', 'aria-live': 'polite' });
  const board = E('div', { class: 'dx-board th-' + theme });
  host.append(board, fb);
  const say = (t, cls) => { fb.textContent = t || ''; fb.className = 'dx-fb ' + (cls || ''); };
  const api = {
    board, alive: () => !over && board.isConnected,
    later(fn, ms) { const id = setTimeout(() => { if (api.alive()) fn(); }, ms); timers.push(id); return id; },
    loop(fn) { let id, last = performance.now(); const step = ts => { if (!api.alive()) return; const dt = Math.min(.05, (ts - last) / 1000); last = ts; fn(dt, ts); id = requestAnimationFrame(step); }; id = requestAnimationFrame(step); loops.push(() => cancelAnimationFrame(id)); },
    on(target, ev, fn, opt) { target.addEventListener(ev, fn, opt); offs.push(() => target.removeEventListener(ev, fn, opt)); },
    say, note: t => say(t, ''),
    win(msg) { if (over) return; over = true; sfx.ok(2); say(msg || 'أحسنت! اكتملت المهمة.', 'good'); board.classList.add('done'); hooks.win && hooks.win(); },
    miss(msg) { if (over) return; sfx.bad(); say(msg || 'ليست هذه. جرّب مرة أخرى.', 'bad'); board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake'); hooks.miss && hooks.miss(); },
    fail(msg) { if (over) return; over = true; sfx.bad(); say(msg || 'لم تنجح هذه المرة.', 'bad'); board.classList.add('done'); hooks.fail && hooks.fail(); },
  };
  task.mount(board, api); DX.last = { task, board, api, over: () => over };
  return { api, hint() { if (!over) say('💡 ' + task.hint, 'hint'); }, dispose() { over = true; timers.forEach(clearTimeout); loops.forEach(f => f()); offs.forEach(f => f()); } };
};

/* مشغّل جلسة من عدة مهام داخل شاشة اللعب الأصلية (#stage) — يُرجع نتيجة للتطبيق الأصلي عبر finish */
DX.session = cfg => () => done => {
  const E = DX.el, host = DX.$('#stage'), g = curGame(), kid = !!g.kid, age = kid ? DX.age() : null;
  const N = cfg.rounds || (kid ? age.rounds : DX.prefs().rounds);
  const lv0 = kid ? kidLvGet(g.id) : clamp(S.st.lv[g.id] || 1, 1, 6);
  let round = 0, first = 0, errors = 0, hints = 0, t0 = 0, secs = 0, cur = null, closed = false, dirty = false;
  cleanup.push(() => { closed = true; cur && cur.dispose(); DX.hush(); });
  function end() {
    closed = true; cur && cur.dispose();
    const acc = first / N, nl = acc >= .8 ? Math.min(g.maxLv || 6, lv0 + 1) : acc < .5 ? Math.max(1, lv0 - 1) : lv0;
    if (kid) kidLvSet(g.id, nl); else S.st.lv[g.id] = nl;
    const st = kid ? kidCur() : S.st; if (st) { st.discoveryMetrics = (st.discoveryMetrics || []).concat({ id: g.id, ts: Date.now(), first, total: N, errors, hints, seconds: Math.round(secs), level: lv0 }).slice(-200); }
    S.save();
    done({ pts: first * 20 + Math.max(0, N - errors), metric: Math.round(acc * 1000), detail: `${DX.AR(first)} من ${DX.AR(N)} من المحاولة الأولى · ${DX.AR(errors)} أخطاء · ${DX.AR(hints)} تلميحات · ${DX.AR(Math.round(secs))} ثانية.` });
  }
  function next() {
    if (closed) return; cur && cur.dispose(); if (round >= N) return end();
    round++; dirty = false; const lv = kid ? lv0 : lv0;
    const task = DX.M[cfg.type](lv, { ...cfg, ...(kid && cfg.byAge ? cfg.byAge[age.i] : {}), age: age ? age.i : null, round }, Math.random);
    const text = (kid && cfg.say && cfg.say[age.i]) || cfg.text || task.text;
    host.innerHTML = '';
    const bar = E('div', { class: 'dx-progress' }, E('i', { style: `width:${(round - 1) / N * 100}%` }));
    const meta = E('div', { class: 'dx-meta' }, E('span', { text: `المهمة ${DX.AR(round)} من ${DX.AR(N)}` }), E('span', { class: 'dx-lv', text: kid ? age.label : `المستوى ${DX.AR(lv)} من ٦` }));
    const inst = E('p', { class: 'dx-inst' + (kid ? ' kid' : ''), text });
    const body = E('div', { class: 'dx-body' });
    const nextB = E('button', { class: 'dx-btn primary', hidden: true, text: round === N ? 'عرض النتيجة' : 'المهمة التالية', onclick: next });
    const acts = E('div', { class: 'dx-acts' }, nextB,
      E('button', { class: 'dx-btn', text: '💡 تلميح', onclick: () => { if (!dirty) { dirty = true; } hints++; cur.hint(); } }),
      E('button', { class: 'dx-btn', 'aria-label': 'استمع للتعليمات', text: '🔊', onclick: () => ('speechSynthesis' in window) ? DX.speak(text, true) : DX.toast('القراءة الصوتية غير متاحة في هذا المتصفح') }));
    host.append(E('section', { class: 'dx-game' + (kid ? ' kid' : '') }, bar, meta, inst, body, acts));
    t0 = performance.now();
    const closeRound = ok => { secs += (performance.now() - t0) / 1000; if (ok && !dirty) first++; bar.firstChild.style.width = (round / N * 100) + '%'; nextB.hidden = false; nextB.focus({ preventScroll: true }); };
    cur = DX.mountTask(body, task, { win: () => closeRound(true), miss: () => { dirty = true; errors++; if (kid && age.i < 2) cur.hint(); }, fail: () => { dirty = true; errors++; closeRound(false); } }, kid ? 'kid' : 'night');
    if (kid && age.i < 2) DX.speak(text, age.i === 0); else DX.speak(text);
  }
  next();
};

/* تسجيل لعبة جديدة في كتالوج التطبيق الأصلي */
DX.register = cfg => {
  const cat = cfg.cat || 'log';
  const g = { id: cfg.id, name: cfg.name, cat, col: cfg.col || [CATS[cat].hex, '#a595ff'], lab: cfg.lab || 'عوالم الاكتشاف', how: cfg.how, why: cfg.why, run: DX.session(cfg), norm: x => x, nocd: 1, discovery: true, maxLv: 6 };
  if (cfg.child) { Object.assign(g, { kid: 'a', hidden: 1, noIndex: 1, emo: cfg.emo || '✦', lab: '', why: '' }); Object.defineProperty(g, 'band', { get: () => (kidCur() || {}).band || 'a', enumerable: true }); KID_GAMES.push(g); I[g.id] = `<span class="kemo">${g.emo}</span>`; }
  else I[g.id] = cfg.icon || '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 34V14h10v20h10V9h10v30H9z"/><circle cx="14" cy="10" r="3"/></svg>';
  G.push(g); GM[g.id] = g; return g;
};

/* ---------- 4. الفئات العمرية الأربع ---------- */
DX.ages = [
  { i: 0, id: '4-5', label: '٤–٥ سنوات', band: 'a', floor: 1, cap: 2, rounds: 4 },
  { i: 1, id: '6-7', label: '٦–٧ سنوات', band: 'a', floor: 2, cap: 3, rounds: 5 },
  { i: 2, id: '8-10', label: '٨–١٠ سنوات', band: 'b', floor: 3, cap: 5, rounds: 6 },
  { i: 3, id: '11-12', label: '١١–١٢ سنة', band: 'b', floor: 4, cap: 6, rounds: 6 }];
DX.age = () => { const k = kidCur(); return DX.ages.find(a => a.id === (k && k.ageGroup)) || DX.ages[k && k.band === 'b' ? 2 : 0]; };

/* ---------- 5. شاشة اللعب: زر إيقاف مؤقت + تعليمات داخل كل لعبة ---------- */
DX.pause = () => {
  const play = DX.$('#play'); if (play.hidden || DX.clock.paused() || !RUN) return;
  const g = curGame(); DX.clock.pause(); DX.hush(); play.classList.add('dx-paused');
  const E = DX.el, resume = () => { cover.remove(); play.classList.remove('dx-paused'); DX.clock.resume(); };
  const cover = E('div', { class: 'dx-pause', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'إيقاف مؤقت' },
    E('div', { class: 'dx-pause-card' }, E('h2', { text: 'إيقاف مؤقت' }), E('p', { class: 'dx-muted', text: g.name + ' · الوقت متوقف، ولن تُحسب عليك هذه المدة.' }),
      (g.how && g.how.length) ? E('ol', { class: 'dx-how' }, g.how.map(h => E('li', { html: h }))) : null,
      E('button', { class: 'dx-btn primary', id: 'dxResume', text: 'استئناف', onclick: resume }),
      E('button', { class: 'dx-btn', text: 'خروج من اللعبة', onclick: () => { resume(); closePlay(); } })));
  DX.$('#play .pin').append(cover); cover.querySelector('#dxResume').focus();
};
(function () {
  const bar = DX.$('#play .pbar'); if (!bar) return;
  const b = DX.el('button', { class: 'x dx-pausebtn', id: 'dxPauseBtn', 'aria-label': 'إيقاف مؤقت', html: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>', onclick: DX.pause });
  bar.append(b);
  document.addEventListener('visibilitychange', () => { if (document.hidden && DX.inRound()) DX.pause(); });
})();
DX.inRound = () => { const p = DX.$('#play'); return !!(RUN && p && !p.hidden && !DX.$('#stage .intro') && !DX.$('#stage .res') && !DX.$('#stage .cd')); };

/* ---------- 6. نسخ احتياطي واستعادة ---------- */
DX.KEYS = ['discoveryJourney', 'discoveryCampaign', 'discoveryIsland', 'discoveryFavorites', 'discoveryPrefs', 'discoveryMetrics'];
DX.backupData = () => ({ format: 'dabt-original-discovery', version: 1, created: new Date().toISOString(), state: S.st, mode: S_MODE() });
DX.validateBackup = data => {
  if (data && data.app === 'dabt' && data.st) data = { format: 'dabt-original-discovery', version: 1, state: data.st };   // نسخة التطبيق الأصلي
  if (!data || data.format !== 'dabt-original-discovery' || data.version !== 1 || !data.state || Array.isArray(data.state)) throw Error('الملف ليس نسخة احتياطية متوافقة.');
  const st = data.state; if (!Array.isArray(st.hist) || !st.best || !st.lv || !st.days) throw Error('بيانات السجل غير مكتملة.');
  const walk = o => { if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (['__proto__', 'prototype', 'constructor'].includes(k)) throw Error('بيانات غير صالحة.'); walk(o[k]); } }; walk(st);
  if (st.kids && (!Array.isArray(st.kids.list) || st.kids.list.some(k => !k.id || !['a', 'b'].includes(k.band)))) throw Error('ملفات الأطفال غير صالحة.');
  for (const k of ['discoveryJourney', 'discoveryCampaign']) if (st[k] && (typeof st[k] !== 'object' || !st[k].done || typeof st[k].done !== 'object')) throw Error('سجل المغامرة غير مكتمل.');
  return st;
};
DX.download = () => { const blob = new Blob([JSON.stringify(DX.backupData(), null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = DX.el('a', { href: url, download: 'MindLab_Progress.json' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); };
DX.restore = st => { try { localStorage.setItem('dabt:before-restore', JSON.stringify(S.st)); } catch (e) { } Object.keys(S.st).forEach(k => delete S.st[k]); Object.assign(S.st, st); DX.migrate(); S.save(); };

/* ---------- 7. ترحيل الحفظ: لقطة حماية ثم إكمال الحقول الناقصة دون حذف أي تقدم ---------- */
DX.world = key => { const d = S.st[key] || (S.st[key] = { version: 2 }); for (const k of ['done', 'clues', 'secrets', 'tools', 'position', 'notes']) if (!d[k] || typeof d[k] !== 'object') d[k] = {}; return d; };
DX.migrate = () => {
  const st = S.st, from = st.dxv || (st.discoveryPrefs || st.discoveryJourney || st.discoveryCampaign ? 1 : 0);
  if (from < 2) { try { if (!localStorage.getItem('dabt:before-v2')) localStorage.setItem('dabt:before-v2', JSON.stringify(st)); } catch (e) { } }
  DX.prefs(); DX.world('discoveryJourney'); const c = DX.world('discoveryCampaign');
  // حفظ قديم أكمل تفاعلات فصل: يملك أداته، حتى لا يُحجب عنه طريق فتحه سابقًا
  for (let ch = 0; ch < 6; ch++) if (!c.tools['t' + ch] && Object.keys(c.done).some(k => k.startsWith(`dx_p_story_${ch}_`) && !/_0_0$/.test(k))) c.tools['t' + ch] = true;
  if (st.kids && Array.isArray(st.kids.list)) st.kids.list.forEach(k => { if (!DX.ages.some(a => a.id === k.ageGroup)) k.ageGroup = k.band === 'b' ? '8-10' : '4-5'; });
  st.dxv = 2;
};
const dxMerge0 = S.merge.bind(S);
S.merge = function (r) { const at = S.st.savedAt || 0; dxMerge0(r); if (r && (r.savedAt || 0) > at) for (const k of DX.KEYS.concat('dxv')) if (r[k] != null) S.st[k] = r[k]; DX.migrate(); };
DX.migrate();
