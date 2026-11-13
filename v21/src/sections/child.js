import { h, fmt, scene, toast } from '../core/ui.js';
import { app, persist } from '../app-state.js';
import { runPuzzle, dialogueBox, readButton } from '../core/runner.js';
import { TYPE_LABEL } from '../core/widgets.js';
import { offlineButton } from '../core/offline.js';
import { sprite } from '../core/character.js';

const D = () => app.data.child; const S = () => app.profile.child;
const bgOf = w => `assets/child/backgrounds/${w.id}.webp`;

function agePicker(go, after) {
  const bands = D().story.ageBands; const cur = S().ageBand;
  return h('section', { class: 'card' }, h('h2', {}, 'اختر الفئة'), h('p', { class: 'muted' }, 'الفئة تنظيم للمحتوى فقط، وليست نتيجة أو معيار نمو. يمكن تغييرها في أي وقت. لا نطلب تاريخ ميلاد أو بريدًا.'),
    h('div', { class: 'row wrap age-row' }, ...Object.entries(bands).map(([k, v]) => h('button', { type: 'button', class: 'btn big' + (cur === k ? ' primary' : ''), 'aria-pressed': String(cur === k), onclick: () => { S().ageBand = k; persist(); after(); } }, fmt(v) + ' سنوات'))));
}

export function childHome(root, go) {
  const d = D().story; const s = S(); root.innerHTML = '';
  root.classList.add('child-mode');
  root.append(h('header', { class: 'section-hero child' }, h('div', { class: 'char-hero' }, sprite('luma', 'idle')), h('div', {}, h('h1', {}, d.title), h('p', { class: 'muted small' }, d.note), h('p', { class: 'muted small' }, d.audioStatus), offlineButton('child'))));
  root.append(agePicker(go, () => childHome(root, go)));
  if (!s.ageBand) return;
  root.append(h('ol', { class: 'world-grid' }, ...d.worlds.map((w, i) => {
    const act = w.activities.find(a => a.ageBand === s.ageBand); const r = act && s.results[act.id];
    const b = h('button', { type: 'button', class: 'world-card' + (r ? ' done' : '') },
      h('img', { src: bgOf(w), alt: '', loading: 'lazy' }), h('b', {}, w.title), h('small', {}, act ? act.title : ''), r ? h('span', { class: 'chip done' }, 'أنجزته') : null);
    b.addEventListener('click', () => go(`#/child/${w.id}`));
    return h('li', {}, b);
  })));
}

export function childWorld(root, go, wid) {
  const d = D().story; const w = d.worlds.find(x => x.id === wid); if (!w) return go('#/child');
  const s = S(); if (!s.ageBand) return go('#/child');
  root.innerHTML = ''; root.classList.add('child-mode');
  const act = w.activities.find(a => a.ageBand === s.ageBand);
  root.append(h('header', { class: 'puzzle-head' }, h('button', { type: 'button', class: 'btn ghost back', onclick: () => go('#/child') }, '→ العوالم'), h('h2', {}, w.title)),
    scene(bgOf(w), `خلفية ${w.title} (زينة وليست جزءًا من السؤال)`),
    dialogueBox([['لُمى', w.intro]], { fallbackChar: 'luma' }),
    h('section', { class: 'card' }, h('h3', {}, `نشاط فئة ${fmt(d.ageBands[s.ageBand])}`),
      h('button', { type: 'button', class: 'btn primary big', onclick: () => go(`#/child/${w.id}/${act.id}`) }, `${act.title} · ${TYPE_LABEL[act.type]}`)),
    h('details', { class: 'card' }, h('summary', {}, 'أنشطة الفئات الأخرى في هذا العالم'),
      h('ul', { class: 'plain' }, ...w.activities.filter(a => a !== act).map(a => h('li', {}, h('button', { type: 'button', class: 'btn', onclick: () => go(`#/child/${w.id}/${a.id}`) }, `${fmt(a.ageLabel)}: ${a.title}`), s.results[a.id] ? ' ✓' : '')))));
}

export function childActivity(root, go, wid, aid) {
  const d = D().story; const w = d.worlds.find(x => x.id === wid); const a = w?.activities.find(x => x.id === aid);
  if (!a) return go('#/child');
  const b = D().bindings[a.id]; const s = S();
  root.classList.add('child-mode');
  app.profile.last = { hash: `#/child/${w.id}/${a.id}`, label: `${w.title} · ${a.title}` };
  const endButtons = (b?.sessionEnd || ['أكمل نشاطًا آخر', 'آخذ استراحة']);
  runPuzzle(root, {
    section: 'child', puzzle: { ...a, failure: a.feedback, success: a.solution }, sectionState: s, background: bgOf(w), bgAlt: w.title, character: 'luma', child: true,
    crumb: `${w.title} · ${fmt(a.ageLabel)}`, responsePrompt: b?.hidePromptDuringRecall ? b.responsePrompt : null,
    assistOnReplay: false, hideSceneForMemory: true,
    storyEffect: a.type === 'choice-story' ? ch => `اخترت «${ch}». هذه طريقة لطيفة للتعاون، والخيار الآخر لطيف أيضًا.` : null,
    savedWork: s.works[a.id], onWork: work => { s.works[a.id] = work; persist(); },
    onExit: () => go(`#/child/${w.id}`),
    nextLabel: endButtons[0], onNext: () => go('#/child'),
    afterButtons: [h('button', { type: 'button', class: 'btn', onclick: () => { toast('استراحة سعيدة! عملك محفوظ.'); go('#/'); } }, endButtons[1])],
  });
  root.querySelector('.panel')?.classList.add('child-panel');
}
