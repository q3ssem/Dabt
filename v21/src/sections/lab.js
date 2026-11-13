import { h, fmt, scene, announce, seededRng, confirmDialog } from '../core/ui.js';
import { app, persist } from '../app-state.js';
import { runPuzzle } from '../core/runner.js';
import { ENGINES, TIMED_EXPOSURE } from './lab-engines.js';
import { offlineButton } from '../core/offline.js';
import { sfx } from '../core/audio.js';

const D = () => app.data.lab; const S = () => app.profile.lab;
const A = 'assets/lab/';
const binding = id => D().bindings.find(b => b.gameId === id);
const casesOf = id => D().cases.filter(p => p.gameId === id);

export function labHome(root, go, q = '') {
  const copy = app.data.copy.lab; root.innerHTML = '';
  let filter = 'الكل', query = q;
  const grid = h('ul', { class: 'game-grid' });
  const empty = h('p', { class: 'muted', hidden: true }, copy.noResults);
  const render = () => {
    grid.innerHTML = '';
    const list = D().games.filter(g => (filter === 'الكل' || g.family === filter || (filter === 'مكان' && g.family === 'مكان')) && (!query || (g.title + g.family + g.card + g.id).includes(query)));
    for (const g of list) {
      const b = binding(g.id); const sessions = S().sessions.filter(x => x.gameId === g.id).length;
      const btn = h('button', { type: 'button', class: 'game-card' },
        h('img', { src: A + b.card, alt: '', loading: 'lazy' }), h('b', {}, g.title), h('small', { class: 'chip' }, g.family), h('span', { class: 'desc' }, g.card),
        sessions ? h('small', { class: 'muted' }, `جلسات: ${fmt(sessions)}`) : null, casesOf(g.id).length ? h('small', { class: 'muted' }, `${fmt(casesOf(g.id).length)} حالات مؤلفة`) : null);
      btn.addEventListener('click', () => go(`#/lab/${g.id}`));
      grid.append(h('li', {}, btn));
    }
    empty.hidden = list.length > 0;
  };
  const search = h('input', { type: 'search', class: 'search', placeholder: copy.search, 'aria-label': copy.search, value: query });
  search.addEventListener('input', () => { query = search.value.trim(); render(); });
  const chips = h('div', { class: 'row wrap', role: 'group', 'aria-label': 'تصفية حسب المهارة' }, ...copy.filters.map(f => {
    const b = h('button', { type: 'button', class: 'chip-btn' + (f === filter ? ' on' : ''), 'aria-pressed': String(f === filter) }, f);
    b.addEventListener('click', () => { filter = f; [...chips.children].forEach(c => { c.classList.toggle('on', c === b); c.setAttribute('aria-pressed', String(c === b)); }); render(); });
    return b;
  }));
  root.append(h('header', { class: 'section-hero lab' }, h('h1', {}, copy.title), h('p', { class: 'lead' }, copy.subtitle),
    h('p', { class: 'muted small' }, 'ألعاب المختبر الجديدة السبع لها ٢٨ حالة مؤلفة. الألعاب الأخرى تعمل بمحاولات مولدة من قواعد محددة لكل لعبة، وليست بنكًا غير محدود من حالات مدققة.'), offlineButton('lab')),
    search, chips, grid, empty);
  render();
}

export function labGame(root, go, gid) {
  const g = D().games.find(x => x.id === gid); if (!g) return go('#/lab');
  const b = binding(gid); const copy = app.data.copy.lab; root.innerHTML = '';
  const isCaseGame = casesOf(gid).length > 0;
  const engine = ENGINES[gid];
  const opts = { exposureStep: 900, exposureMs: 1000, altColors: false, intentions: 1 };
  const optBox = h('div', { class: 'card' });
  if (TIMED_EXPOSURE[gid]) {
    const keyName = TIMED_EXPOSURE[gid]; const sel = h('select', { 'aria-label': 'زمن العرض' }, ...[600, 900, 1200, 1500].map(v => h('option', { value: v, selected: v === opts[keyName] || null }, `${fmt(v)} مللي ثانية`)));
    sel.addEventListener('change', () => { opts[keyName] = Number(sel.value); });
    optBox.append(h('label', {}, 'زمن العرض في التدريب: ', sel), h('p', { class: 'muted small' }, 'التحدي يستخدم ٩٠٠ مللي ثانية ثابتة؛ نتائج السرعات المختلفة تُسجل منفصلة.'));
  }
  if (gid === 'stroop') { const c = h('input', { type: 'checkbox' }); c.addEventListener('change', () => opts.altColors = c.checked); optBox.append(h('label', {}, c, ' وضع بديل للألوان (شكل مرافق لكل حبر)')); }
  if (gid === 'prospective-memory') { const s = h('select', {}, h('option', { value: 1 }, 'نية واحدة'), h('option', { value: 2 }, 'نيتان')); s.addEventListener('change', () => opts.intentions = Number(s.value)); optBox.append(h('label', {}, 'عدد النوايا: ', s)); }
  root.append(
    h('header', { class: 'puzzle-head' }, h('button', { type: 'button', class: 'btn ghost back', onclick: () => go('#/lab') }, '→ المكتبة'), h('div', {}, h('small', { class: 'crumb' }, g.family), h('h2', {}, g.title))),
    scene(A + 'backgrounds/' + b.background.split('/').pop().replace('.png', '.webp'), `خلفية عائلة ${g.family} (هادئة، ليست مثيرًا للاختبار)`, 'lab-scene'),
    h('section', { class: 'card' }, h('h3', {}, 'التعليمات'), h('p', {}, fmt(g.instructions)), h('p', { class: 'muted small' }, h('b', {}, 'اللوحة: '), g.layout)),
    h('section', { class: 'card example' }, h('h3', {}, 'مثال غير مسجل'), h('p', {}, fmt(g.example)), engine?.intro ? h('p', {}, engine.intro(opts)) : null),
    optBox.children.length ? optBox : null,
    h('section', { class: 'card' }, h('h3', {}, 'اختر طريقة اللعب'),
      h('div', { class: 'mode-grid' },
        h('button', { type: 'button', class: 'mode-card', onclick: () => start('practice') }, h('b', {}, copy.practice), h('small', {}, copy.practiceDescription)),
        h('button', { type: 'button', class: 'mode-card', onclick: () => start('challenge') }, h('b', {}, copy.challenge), h('small', {}, copy.challengeDescription)))),
    h('section', { class: 'card' }, h('h3', {}, 'ما يُسجل'), h('p', { class: 'muted' }, fmt(g.metrics)), h('p', { class: 'muted small' }, g.sessionPolicy)),
    history(gid));
  function start(mode) {
    if (mode === 'challenge') { opts.exposureStep = 900; opts.exposureMs = 1000; }
    if (isCaseGame) caseSession(root, go, g, mode); else trialSession(root, go, g, mode, { ...opts });
  }
}

function history(gid) {
  const rows = S().sessions.filter(s => s.gameId === gid).slice(0, 6);
  if (!rows.length) return null;
  return h('section', { class: 'card' }, h('h3', {}, 'آخر الجلسات'), h('ul', { class: 'plain' }, ...rows.map(s => h('li', {}, `${s.mode === 'practice' ? 'تدريب' : 'تحدٍّ'} · دقة ${fmt(s.accuracy)}٪ · ${s.correctMeanMs != null ? 'زمن الصحيح ' + fmt(Math.round(s.correctMeanMs)) + ' مللي' : ''}${s.assisted ? ' · بمساعدة' : ''}`))));
}

function rulesKey(gid, mode, opts) {
  const parts = [gid, mode];
  if (TIMED_EXPOSURE[gid]) parts.push(`exp${opts[TIMED_EXPOSURE[gid]]}`);
  if (gid === 'stroop') parts.push(opts.altColors ? 'alt' : 'std');
  if (gid === 'prospective-memory') parts.push(`int${opts.intentions}`);
  return parts.join(':');
}

function saveSession(session) {
  S().sessions.unshift(session); S().sessions = S().sessions.slice(0, 300);
  return persist();
}

function summary(root, go, g, session) {
  const same = S().sessions.filter(s => s.rulesKey === session.rulesKey && s.id !== session.id);
  const prev = same[0];
  root.innerHTML = '';
  root.append(h('header', { class: 'puzzle-head' }, h('button', { type: 'button', class: 'btn ghost back', onclick: () => go(`#/lab/${g.id}`) }, '→ اللعبة'), h('h2', {}, `نتيجة الجلسة: ${g.title}`)),
    h('section', { class: 'card result' },
      h('p', { class: 'big-stat' }, `${fmt(session.correct)} من ${fmt(session.trials)}`),
      h('p', {}, `دقة المهمة ${fmt(session.accuracy)}٪ · ${session.correctMeanMs != null ? 'متوسط زمن الإجابات الصحيحة ' + fmt(Math.round(session.correctMeanMs)) + ' مللي ثانية' : 'لا زمن مسجل'}`),
      session.assisted ? h('p', { class: 'warn' }, 'طُلبت مساعدة؛ سُجلت الجلسة تدريبًا.') : null,
      h('h3', {}, 'حسب نوع المحاولة'), h('ul', { class: 'plain' }, ...Object.entries(session.byTag).map(([t, v]) => h('li', {}, `${tagName(t)}: ${fmt(v.correct)}/${fmt(v.n)}`))),
      Object.keys(session.errors).length ? h('p', {}, 'أخطاء نوعية: ' + Object.entries(session.errors).map(([k, v]) => `${errName(k)} ${fmt(v)}`).join(' · ')) : null,
      session.pm ? h('p', {}, `تنفيذ النية: نجح ${fmt(session.pm.hit)} · فات ${fmt(session.pm.miss)} · ضغط دون إشارة ${fmt(session.pm.false)}`) : null,
      prev ? h('p', { class: 'muted' }, `مقارنة بجلسة سابقة بالشروط نفسها: الدقة ${fmt(prev.accuracy)}٪ ← ${fmt(session.accuracy)}٪`) : h('p', { class: 'muted' }, app.data.copy.profile.noComparable),
      h('p', { class: 'muted small' }, app.data.copy.profile.note),
      session.saved ? null : h('p', { class: 'bad' }, 'لم تُحفظ الجلسة. استخدم «أعد الحفظ».'),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn primary', onclick: () => go(`#/lab/${g.id}`) }, 'جلسة أخرى'), h('button', { type: 'button', class: 'btn', onclick: () => go('#/lab') }, 'المكتبة'))));
}
const tagName = t => {
  const fixed = { switch: 'تحويل', repeat: 'تكرار', congruent: 'متوافق', incongruent: 'متعارض', go: 'مضي', nogo: 'توقف', case: 'حالة مؤلفة', one: 'كيس واحد', two: 'كيسان', noreplace: 'دون إرجاع', add: 'قاعدة جمع', mul: 'قاعدة ضرب', alt: 'قاعدتان متناوبتان', sort: 'فرز', cue: 'بطاقة إشارة', k0: 'دوران ٩٠°', k1: 'دوران ١٨٠°', k2: 'قلب ثم دوران' };
  if (fixed[t]) return fixed[t];
  let m;
  if ((m = /^len(\d+)$/.exec(t))) return `طول ${fmt(m[1])}`;
  if ((m = /^n(\d+)$/.exec(t))) return `${fmt(m[1])} عناصر`;
  if ((m = /^last(\d+)$/.exec(t))) return `آخر ${fmt(m[1])}`;
  if ((m = /^premises(\d+)$/.exec(t))) return `${fmt(m[1])} مقدمات`;
  if ((m = /^f(\d+)$/.exec(t))) return `${fmt(m[1])} عوامل`;
  if ((m = /^(\d+):(\d+)$/.exec(t))) return `نسبة ${fmt(m[1])}:${fmt(m[2])}`;
  return fmt(t);
};
const errName = k => ({ omission: 'إغفال', commission: 'ضغط غير مطلوب', miss: 'سهو', extra: 'إضافة', wrongPositions: 'مواضع خاطئة', revisions: 'مراجعات', misclassified: 'تصنيف خاطئ', controlled: 'عوامل مثبتة' }[k] || k);

function newSession(g, mode, opts) {
  return { id: `${g.id}-${Date.now()}`, gameId: g.id, mode, rulesKey: rulesKey(g.id, mode, opts || {}), startedAt: new Date().toISOString(), trials: 0, correct: 0, rts: [], byTag: {}, errors: {}, assisted: false };
}
function finishSession(s) {
  s.endedAt = new Date().toISOString(); s.accuracy = s.trials ? Math.round(s.correct / s.trials * 100) : 0;
  s.correctMeanMs = s.rts.length ? s.rts.reduce((a, b) => a + b, 0) / s.rts.length : null; delete s.rts;
  if (s.assisted && s.mode === 'challenge') { s.mode = 'practice'; s.rulesKey = s.rulesKey.replace(':challenge', ':practice'); }
  s.saved = saveSession(s); return s;
}

// Legacy-family games: trial engine sessions
function trialSession(root, go, g, mode, opts) {
  const engine = ENGINES[g.id]; const rng = seededRng(Date.now() & 0xffffffff);
  const trials = engine.makeTrials(rng, opts); const session = newSession(g, mode, opts);
  let i = 0; let paused = false;
  root.innerHTML = '';
  const stage = h('div', { class: 'trial-stage', 'aria-live': 'off' });
  const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const prog = h('p', { class: 'meter' });
  const help = h('button', { type: 'button', class: 'btn ghost' }, mode === 'practice' ? 'أحتاج إشارة' : 'أحتاج مساعدة (تتحول الجلسة إلى تدريب)');
  help.addEventListener('click', () => { session.assisted = true; fb.className = 'feedback'; fb.textContent = fmt(g.example) + ' — ' + g.instructions; });
  const quit = h('button', { type: 'button', class: 'btn ghost' }, 'إنهاء الجلسة');
  quit.addEventListener('click', async () => { if (await confirmDialog('إنهاء الجلسة الآن؟ تُسجل المحاولات المكتملة فقط.', 'أنهِ')) { summary(root, go, g, finishSession(session)); } });
  root.append(h('header', { class: 'puzzle-head' }, h('h2', {}, g.title), h('span', { class: 'chip' }, mode === 'practice' ? 'تدريب مرن' : 'تحدٍّ شخصي')), prog, stage, fb, h('div', { class: 'row wrap' }, help, quit));
  const next = () => {
    if (i >= trials.length) { summary(root, go, g, finishSession(session)); return; }
    prog.textContent = `المحاولة ${fmt(i + 1)} من ${fmt(trials.length)}`;
    stage.innerHTML = ''; stage.removeAttribute('inert'); fb.textContent = '';
    const t = trials[i]; let answered = false;
    Promise.resolve(engine.run(stage, t, res => {
      if (answered) return; answered = true; // each trial is scored exactly once
      stage.setAttribute('inert', '');
      session.trials++; if (res.correct) { session.correct++; if (res.rt != null) session.rts.push(res.rt); }
      const tg = session.byTag[res.tag] ||= { n: 0, correct: 0 }; tg.n++; if (res.correct) tg.correct++;
      for (const [k, v] of Object.entries(res.errors || {})) session.errors[k] = (session.errors[k] || 0) + v;
      if (res.pm) { session.pm ||= { hit: 0, miss: 0, false: 0 }; session.pm[res.pm]++; }
      i++;
      if (mode === 'practice') {
        sfx(res.correct ? 'ok' : 'err');
        fb.className = 'feedback ' + (res.correct ? 'good' : 'bad');
        fb.replaceChildren(h('p', {}, res.correct ? g.feedback.correct : g.feedback.wrong), res.explain ? h('p', { class: 'small' }, res.explain) : null,
          h('button', { type: 'button', class: 'btn primary', onclick: next }, i < trials.length ? 'المحاولة التالية' : 'النتيجة'));
        fb.querySelector('button').focus();
      } else {
        fb.className = 'feedback'; fb.textContent = 'سُجلت الإجابة. التغذية الراجعة في نهاية الجلسة.';
        setTimeout(next, g.id === 'go-no-go' ? 200 : 450);
      }
    }, opts));
  };
  next();
}

// New-family games: the four authored cases per game, run with the shared live widgets
function caseSession(root, go, g, mode) {
  const cases = casesOf(g.id); const session = newSession(g, mode); let i = 0;
  const b = binding(g.id);
  const run = () => {
    if (i >= cases.length) { summary(root, go, g, finishSession(session)); return; }
    const p = cases[i];
    const before = S().results[p.id] ? { ...S().results[p.id] } : null;
    const r = runPuzzle(root, {
      section: 'lab', puzzle: p, sectionState: S(), background: A + 'backgrounds/' + b.background.split('/').pop().replace('.png', '.webp'), bgAlt: g.title,
      crumb: `${g.title} · الحالة ${fmt(i + 1)} من ${fmt(cases.length)} · ${mode === 'practice' ? 'تدريب' : 'تحدٍّ'}`,
      hideSceneForMemory: true,
      onExit: () => go(`#/lab/${g.id}`),
      onSolved: ({ assisted }) => {
        session.trials++; const tg = session.byTag.case ||= { n: 0, correct: 0 }; tg.n++;
        if (!assisted) { session.correct++; tg.correct++; } else session.assisted = true;
      },
      onNext: () => { i++; run(); }, nextLabel: i < cases.length - 1 ? 'الحالة التالية' : 'النتيجة',
    });
    if (mode === 'challenge') {
      // fixed rules: hints and reveal are hidden; asking for help converts the session to practice
      root.querySelectorAll('.puzzle-side .btn').forEach(x => { if (/إشارة|اشرح|أعد العرض/.test(x.textContent)) x.hidden = true; });
      const helpBtn = h('button', { type: 'button', class: 'btn ghost' }, 'أحتاج مساعدة (تتحول الجلسة إلى تدريب)');
      helpBtn.addEventListener('click', () => { session.assisted = true; root.querySelectorAll('.puzzle-side .btn').forEach(x => x.hidden = false); helpBtn.remove(); announce('أصبحت الجلسة تدريبًا؛ الإشارات متاحة الآن.'); });
      root.querySelector('.puzzle-side .row')?.prepend(helpBtn);
    }
  };
  run();
}
