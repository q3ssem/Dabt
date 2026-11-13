import { h, fmt, scene, toast } from '../core/ui.js';
import { app, persist } from '../app-state.js';
import { runPuzzle, dialogueBox, readButton } from '../core/runner.js';
import { TYPE_LABEL } from '../core/widgets.js';
import { offlineButton } from '../core/offline.js';

const A = 'assets/planets/';
const D = () => app.data.planets; const S = () => app.profile.planets;
const bind = id => D().bindings[id];
const bg = st => `${A}backgrounds/${st.id}.webp`;
const done = id => !!S().results[id];
const stationDone = st => st.puzzles.filter(p => p.required !== false).every(p => done(p.id));
const unlocked = i => i === 0 || stationDone(D().story.stations[i - 1]);

export function planetsHome(root, go) {
  const d = D().story; const s = S(); root.innerHTML = '';
  root.append(
    h('header', { class: 'section-hero planets' }, h('h1', {}, d.title), h('p', { class: 'lead' }, d.subtitle), h('p', {}, fmt(d.opening)),
      h('p', { class: 'muted small' }, d.routeNote), h('p', { class: 'muted small' }, d.numericModelNote), h('div', { class: 'row wrap' }, offlineButton('planets'))),
    h('ol', { class: 'route', 'aria-label': 'مسار المحطات (سردي، لا يمثل مسافات حقيقية)' }, ...d.stations.map((st, i) => {
      const open = unlocked(i); const n = st.puzzles.filter(p => done(p.id)).length;
      const b = h('button', { type: 'button', class: 'station' + (open ? '' : ' locked') + (stationDone(st) ? ' done' : ''), disabled: !open || null, style: { '--accent': st.color } },
        h('span', { class: 'num' }, fmt(i + 1)), h('b', {}, st.name), h('small', {}, st.subtitle), h('small', {}, open ? `المهمات ${fmt(n)}/${fmt(st.puzzles.length)}` : 'أكمل المحطة السابقة'),
        s.cardsAwarded.includes(st.id) ? h('span', { class: 'chip done' }, 'بطاقة السجل') : null);
      b.addEventListener('click', () => go(`#/planets/${st.id}`));
      return h('li', {}, b);
    })));
  if (s.finalChoice) root.append(h('section', { class: 'card' }, h('h2', {}, 'رسالتك إلى الأرض'), h('p', {}, fmt(d.endings[s.finalChoice]))));
}

export function planetStation(root, go, sid) {
  const d = D().story; const i = d.stations.findIndex(x => x.id === sid); const st = d.stations[i];
  if (!st) return go('#/planets');
  if (!unlocked(i)) { toast('أكمل المحطة السابقة أولًا.'); return go('#/planets'); }
  const s = S(); root.innerHTML = '';
  root.append(
    h('header', { class: 'puzzle-head' }, h('button', { type: 'button', class: 'btn ghost back', onclick: () => go('#/planets') }, '→ المسار'), h('div', {}, h('small', { class: 'crumb' }, `المحطة ${fmt(i + 1)} · ${st.location}`), h('h2', {}, `${st.name} — ${st.subtitle}`))),
    scene(bg(st), `مشهد قصصي لمحطة ${st.name} (رسم وليس صورة علمية)`),
    h('section', { class: 'card story' }, h('p', {}, fmt(st.opening)), readButton(() => st.opening)),
    dialogueBox(st.dialogue, { fallbackChar: 'yara' }),
    h('ol', { class: 'node-list' }, ...st.puzzles.map((p, k) => {
      const r = s.results[p.id];
      const b = h('button', { type: 'button', class: 'node-card' + (r ? ' done' : ''), style: { '--accent': st.color } }, h('span', { class: 'num' }, fmt(k + 1)), h('b', {}, p.title), h('small', {}, `${p.id} · ${TYPE_LABEL[p.type]}`),
        r ? h('span', { class: 'chip done' }, r.status === 'assisted' ? 'اكتمل بالمساعدة' : 'محلول') : s.drafts[p.id] ? h('span', { class: 'chip' }, 'مسودة محفوظة') : null);
      b.addEventListener('click', () => go(`#/planets/${st.id}/${p.id}`));
      return h('li', {}, b);
    })));
  if (stationDone(st)) {
    const first = !s.cardsAwarded.includes(st.id); if (first) { s.cardsAwarded.push(st.id); persist(); }
    const next = d.stations[i + 1];
    root.append(h('section', { class: 'card science' + (first ? ' fresh' : '') },
      h('h3', {}, `بطاقة السجل العلمي: ${st.name}`), h('p', {}, fmt(st.fact)),
      h('p', { class: 'small' }, 'المصدر: ', h('a', { href: st.source, target: '_blank', rel: 'noopener' }, st.source)),
      h('p', { class: 'muted small' }, 'قيم الطاقة والضغط والمهل داخل المهمات قيم لنموذج اللعبة، وليست قياسات للكوكب.')),
      h('section', { class: 'card story' }, h('p', {}, fmt(st.ending))),
      next ? h('button', { type: 'button', class: 'btn primary', onclick: () => go(`#/planets/${next.id}`) }, `تابع إلى ${next.name}`) : h('button', { type: 'button', class: 'btn primary', onclick: () => go('#/planets') }, 'عد إلى المسار'));
  }
}

export function planetMission(root, go, sid, pid) {
  const d = D().story; const i = d.stations.findIndex(x => x.id === sid); const st = d.stations[i];
  const p = st?.puzzles.find(x => x.id === pid);
  if (!p || !unlocked(i)) return go('#/planets');
  const b = bind(p.id); const s = S();
  app.profile.last = { hash: `#/planets/${st.id}/${p.id}`, label: `${st.name} · ${p.title}` };
  const k = st.puzzles.indexOf(p); const nextP = st.puzzles[k + 1];
  runPuzzle(root, {
    section: 'planets', puzzle: p, sectionState: s, background: bg(st), bgAlt: `مشهد ${st.name}`, character: 'tayf',
    crumb: `${st.name} · ${p.id}`, successText: b?.successText, hideSceneForMemory: true,
    storyEffect: p.type === 'choice-story' ? ch => { s.finalChoice = ch; return d.endings[ch]; } : null,
    onExit: () => go(`#/planets/${st.id}`),
    onNext: () => go(nextP ? `#/planets/${st.id}/${nextP.id}` : `#/planets/${st.id}`),
    nextLabel: nextP ? `المهمة التالية: ${nextP.title}` : 'عد إلى المحطة',
    successExtra: () => {
      if (!stationDone(st) || s.cardsAwarded.includes(st.id)) return null;
      s.cardsAwarded.push(st.id);
      return h('section', { class: 'card science fresh' }, h('h3', {}, `اكتملت بطاقة السجل العلمي: ${st.name}`), h('p', {}, fmt(st.fact)),
        h('p', { class: 'small' }, 'المصدر: ', h('a', { href: st.source, target: '_blank', rel: 'noopener' }, st.source)),
        h('p', { class: 'muted small' }, 'قيم المهمات قيم لنموذج اللعبة، وليست قياسات للكوكب.'), h('p', {}, fmt(st.ending)));
    },
  });
}
