import { h, fmt, toast, confirmDialog, setDigitMode } from '../core/ui.js';
import { app, persist } from '../app-state.js';
import { exportBackup, restoreBackup, undoRestore, defaultProfile, PREMIGRATION_KEY } from '../core/store.js';
import { setAudioSettings, speechInfo } from '../core/audio.js';
import { offlineButton } from '../core/offline.js';

export function applySettings() {
  const s = app.profile.settings; const r = document.documentElement;
  r.classList.toggle('reduce-motion', !!s.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches);
  r.classList.toggle('high-contrast', !!s.highContrast);
  r.style.setProperty('--scale', s.textSize);
  setDigitMode(s.digits); setAudioSettings(s);
}

export function profileView(root, go) {
  const P = app.profile; const copy = app.data.copy.profile; root.innerHTML = '';
  const T = app.data.treasure.story, PL = app.data.planets.story, C = app.data.child.story;
  const count = (sec, ids) => { const r = P[sec].results; const s = ids.filter(i => r[i]?.status === 'solved').length; const a = ids.filter(i => r[i]?.status === 'assisted').length; return `${fmt(s + a)} من ${fmt(ids.length)} (منها ${fmt(a)} بالمساعدة)`; };
  const tIds = T.chapters.flatMap(c => c.puzzles.map(p => p.id)), pIds = PL.stations.flatMap(s => s.puzzles.map(p => p.id)), cIds = C.worlds.flatMap(w => w.activities.map(a => a.id)), lIds = app.data.lab.cases.map(c => c.id);
  const status = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  file.addEventListener('change', async () => {
    const f = file.files[0]; if (!f) return;
    if (!await confirmDialog(copy.restoreConfirm, 'استعد النسخة')) return;
    const res = restoreBackup(await f.text(), app.profile);
    if (res.ok) { app.profile = res.profile; applySettings(); toast(copy.restoreDone); profileView(root, go); }
    else status.textContent = { json: 'الملف ليس نسخة صالحة.', schema: 'الملف ليس نسخة من هذا الإصدار أو ينقصه جزء.', 'rollback-backup': 'تعذر إنشاء نسخة رجوع، لذلك لم تُستبدل البيانات.', save: 'تعذر الحفظ بعد الاستعادة.' }[res.reason];
  });
  const works = Object.entries(P.child.works);
  root.append(
    h('header', { class: 'section-hero' }, h('h1', {}, copy.title), h('p', { class: 'muted' }, copy.localNote)),
    h('section', { class: 'card' }, h('h2', {}, 'التقدم'),
      h('ul', { class: 'plain' },
        h('li', {}, `جزيرة الكنز: ${count('treasure', tIds)} · الأختام ${fmt(P.treasure.sealsAwarded.length)}/٦`),
        h('li', {}, `رحلة الكواكب: ${count('planets', pIds)} · بطاقات السجل ${fmt(P.planets.cardsAwarded.length)}/٩`),
        h('li', {}, `مختبر العقل: الحالات المؤلفة ${count('lab', lIds)} · الجلسات ${fmt(P.lab.sessions.length)}`),
        h('li', {}, `عالم الطفل: ${count('child', cIds)} · أعمال محفوظة ${fmt(works.length)}`)),
      h('p', { class: 'muted small' }, copy.note)),
    labCompare(),
    works.length ? h('section', { class: 'card' }, h('h2', {}, 'أعمال عالم الطفل'), h('ul', { class: 'plain' }, ...works.map(([id, w]) => h('li', {}, `${id}: ${w.title || 'بلا عنوان'} · ${fmt(w.canvases.reduce((a, c) => a + c.pieces.length, 0))} قطع · آخر تعديل ${w.updatedAt ? new Date(w.updatedAt).toLocaleString('ar') : '—'}`)))) : null,
    h('section', { class: 'card' }, h('h2', {}, 'النسخ الاحتياطي'),
      h('div', { class: 'row wrap' },
        h('button', { type: 'button', class: 'btn', onclick: () => { const blob = new Blob([exportBackup(app.profile)], { type: 'application/json' }); const a = h('a', { href: URL.createObjectURL(blob), download: `dabt21-backup-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(a); a.click(); a.remove(); status.textContent = copy.exportDone; } }, copy.export),
        h('button', { type: 'button', class: 'btn', onclick: () => file.click() }, copy.restore),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => { const p = undoRestore(); if (p) { app.profile = p; applySettings(); toast('عادت البيانات إلى ما قبل الاستعادة.'); profileView(root, go); } else status.textContent = 'لا توجد نسخة رجوع من استعادة سابقة.'; } }, 'تراجع عن آخر استعادة')), file, status),
    h('section', { class: 'card' }, h('h2', {}, 'دون اتصال'), h('p', { class: 'muted small' }, 'واجهة التطبيق والنصوص تُخزن عند أول فتح. صور كل قسم تُنزّل بطلبك.'), ...['treasure', 'planets', 'lab', 'child'].map(s => h('div', { class: 'row' }, h('b', {}, { treasure: 'جزيرة الكنز', planets: 'رحلة الكواكب', lab: 'مختبر العقل', child: 'عالم الطفل' }[s]), offlineButton(s)))),
    legacyBox(),
    settingsBox(root, go),
    h('section', { class: 'card danger' }, h('h2', {}, app.data.copy.settings.delete),
      h('button', { type: 'button', class: 'btn', onclick: async () => { if (!await confirmDialog(app.data.copy.settings.deleteConfirm, 'احذف التقدم', app.data.copy.settings.cancel)) return; const keep = app.profile.settings; const legacy = app.profile.legacy; app.profile = defaultProfile(); app.profile.settings = keep; app.profile.legacy = legacy; if (persist()) { toast('حُذف تقدم هذا الملف.'); profileView(root, go); } } }, app.data.copy.settings.delete)));
}

function labCompare() {
  const by = {}; for (const s of app.profile.lab.sessions) (by[s.rulesKey] ||= []).push(s);
  const rows = Object.entries(by).filter(([, v]) => v.length >= 2);
  if (!app.profile.lab.sessions.length) return null;
  return h('section', { class: 'card' }, h('h2', {}, 'مقارنة الجلسات بالشروط نفسها'),
    rows.length ? h('ul', { class: 'plain' }, ...rows.map(([k, v]) => { const g = app.data.lab.games.find(x => x.id === v[0].gameId); return h('li', {}, `${g?.title} (${v[0].mode === 'practice' ? 'تدريب' : 'تحدٍّ'}): ${v.slice(0, 5).reverse().map(s => fmt(s.accuracy) + '٪').join(' ← ')}`); })) : h('p', { class: 'muted' }, app.data.copy.profile.noComparable));
}

function legacyBox() {
  const L = app.profile.legacy; if (!L) return null;
  return h('section', { class: 'card' }, h('h2', {}, 'أرشيف الإصدار السابق'), h('p', { class: 'muted small' }, L.note),
    h('ul', { class: 'plain' }, h('li', {}, `مفاتيح محفوظة: ${fmt(L.keys.length)}`), h('li', {}, `ألغاز جزيرة قديمة: ${fmt(L.treasureSolvedOld)}`), h('li', {}, `مهمات كواكب قديمة: ${fmt(L.planetsSolvedOld)}`), h('li', {}, `أنشطة طفل قديمة: ${fmt(L.childCompletedOld)}`), h('li', {}, `جلسات مختبر قديمة: ${fmt(L.labSessions.length)} (قواعد سابقة، لا تُقارن بجلسات V21)`)),
    h('p', { class: 'small' }, 'البيانات القديمة لم تُحذف من الجهاز، ونسخة منها محفوظة باسم ', h('code', {}, PREMIGRATION_KEY), '. ملفات الإصدار السابق محفوظة في سجل المستودع.'));
}

function settingsBox(root, go) {
  const S = app.profile.settings; const c = app.data.copy.settings;
  const set = (k, v) => { S[k] = v; applySettings(); persist(); };
  const chk = (k, label) => { const i = h('input', { type: 'checkbox', checked: S[k] || null }); i.addEventListener('change', () => set(k, i.checked)); return h('label', { class: 'setting' }, i, ' ', label); };
  const size = h('input', { type: 'range', min: '0.9', max: '1.4', step: '0.1', value: S.textSize, 'aria-label': c.textSize });
  size.addEventListener('input', () => set('textSize', Number(size.value)));
  const digits = h('div', { class: 'row', role: 'radiogroup', 'aria-label': c.digits }, ...[['arabic', c.digitsArabic], ['latin', c.digitsLatin]].map(([v, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(S.digits === v), class: 'btn small' + (S.digits === v ? ' primary' : ''), onclick: () => { set('digits', v); profileView(root, go); } }, l)));
  const sp = speechInfo();
  return h('section', { class: 'card' }, h('h2', {}, c.title),
    chk('reduceMotion', c.reduceMotion), chk('highContrast', c.highContrast), h('label', { class: 'setting' }, c.textSize + ' ', size),
    chk('sound', c.sound + ' (نغمات مولدة قصيرة؛ لا تسجيلات صوتية في هذا الإصدار)'),
    chk('narration', c.narration), h('p', { class: 'muted small' }, sp.available ? `صوت عربي متاح في المتصفح: ${sp.voice.name}` : 'لم يُعثر على صوت عربي في هذا المتصفح الآن؛ زر «اقرأ» يعرض البديل النصي. لا توجد تسجيلات صوت بشرية مرفقة.'),
    h('div', { class: 'setting' }, c.digits + ': ', digits), chk('timeFree', c.timeFree));
}
