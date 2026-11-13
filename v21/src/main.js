import './styles.css';
import { h, fmt, setSymbolMap, announce } from './core/ui.js';
import { app, initProfile, loadJSON, persist } from './app-state.js';
import { registerCharacters, sprite } from './core/character.js';
import { treasureHome, treasureChapter, treasurePuzzle, treasureJournal } from './sections/treasure.js';
import { planetsHome, planetStation, planetMission } from './sections/planets.js';
import { labHome, labGame } from './sections/lab.js';
import { childHome, childWorld, childActivity } from './sections/child.js';
import { profileView, applySettings } from './sections/profile.js';
import { stopSpeech } from './core/audio.js';

const view = () => document.getElementById('view');
export function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

async function loadData() {
  const [t, tb, tf, p, pb, pf, lg, lb, ln, c, cb, cf, cs, copy] = await Promise.all([
    'data/treasure/treasure.json', 'data/treasure/scene-bindings.json', 'data/treasure/character-frames.json',
    'data/planets/planets.json', 'data/planets/mission-bindings.json', 'data/planets/character-frames.json',
    'data/lab/games.json', 'data/lab/game-bindings.json', 'data/lab/new-puzzles.json',
    'data/child/child.json', 'data/child/activity-bindings.json', 'data/child/character-frames.json', 'data/child/symbol-assets.json',
    'data/ui-copy.json'].map(loadJSON));
  const byId = (arr, k) => Object.fromEntries(arr.map(x => [x[k], x]));
  app.data = {
    treasure: { story: t, bindings: byId(tb, 'puzzleId') },
    planets: { story: p, bindings: byId(pb, 'missionId') },
    lab: { games: lg.games, bindings: lb, cases: ln.puzzles },
    child: { story: c, bindings: byId(cb, 'activityId') },
    copy,
  };
  setSymbolMap(cs);
  registerCharacters('treasure', tf, 'assets/treasure/characters/');
  registerCharacters('planets', pf, 'assets/planets/characters/');
  registerCharacters('child', cf, 'assets/child/characters/');
}

function home(root) {
  const c = app.data.copy; const last = app.profile.last; root.innerHTML = '';
  const tiles = [
    ['#/lab', c.nav.lab, c.lab.subtitle, 'assets/lab/backgrounds/patterns.webp'],
    ['#/treasure', app.data.treasure.story.title, app.data.treasure.story.subtitle, 'assets/treasure/backgrounds/TI_BG_01.webp'],
    ['#/planets', app.data.planets.story.title, app.data.planets.story.subtitle, 'assets/planets/backgrounds/moon.webp'],
    ['#/child', c.nav.child, app.data.child.story.title, 'assets/child/backgrounds/letters.webp'],
  ];
  root.append(
    h('header', { class: 'home-hero' },
      h('img', { src: 'assets/lab/design/brand-mark.svg', alt: '', class: 'brand-mark-big' }),
      h('div', {}, h('p', { class: 'eyebrow' }, c.home.eyebrow), h('h1', {}, c.home.title), h('p', { class: 'lead' }, c.home.body),
        h('div', { class: 'row wrap' },
          last ? h('button', { type: 'button', class: 'btn primary', onclick: () => go(last.hash) }, `${c.home.primary}: ${last.label}`) : h('button', { type: 'button', class: 'btn primary', onclick: () => go('#/treasure') }, c.home.freshPrimary),
          h('button', { type: 'button', class: 'btn', onclick: () => go('#/lab') }, c.home.secondary)),
        last ? null : h('p', { class: 'muted small' }, c.home.resumeEmpty))),
    app.migrated && app.profile.legacy ? h('section', { class: 'card notice' }, h('b', {}, 'وجدنا بيانات من إصدار سابق. '), 'حُفظت نسخة منها كما هي، ولن تُحتسب حلًا للألغاز الجديدة. ', h('a', { href: '#/profile' }, 'التفاصيل في «رحلتي»'), '.') : null,
    h('ul', { class: 'home-tiles' }, ...tiles.map(([href, title, sub, img]) => h('li', {}, h('a', { href, class: 'home-tile' }, h('img', { src: img, alt: '', loading: 'lazy' }), h('b', {}, title), h('small', {}, sub))))),
    h('p', { class: 'muted small disclaimer' }, c.profile.note));
}

export function route() {
  stopSpeech();
  const root = view(); root.className = 'view'; window.scrollTo(0, 0);
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  document.querySelectorAll('.nav a').forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href').split('/')[1] === (parts[0] || '') || (a.getAttribute('href') === '#/' && !parts[0]))));
  const [sec, a, b] = parts;
  try {
    if (!sec) home(root);
    else if (sec === 'treasure') { if (a === 'journal') treasureJournal(root, go); else if (b) treasurePuzzle(root, go, a, b); else if (a) treasureChapter(root, go, a); else treasureHome(root, go); }
    else if (sec === 'planets') { if (b) planetMission(root, go, a, b); else if (a) planetStation(root, go, a); else planetsHome(root, go); }
    else if (sec === 'lab') { if (a) labGame(root, go, a); else labHome(root, go); }
    else if (sec === 'child') { if (b) childActivity(root, go, a, b); else if (a) childWorld(root, go, a); else childHome(root, go); }
    else if (sec === 'profile') profileView(root, go);
    else home(root);
  } catch (e) {
    console.error(e);
    root.innerHTML = ''; root.append(h('section', { class: 'card' }, h('h2', {}, 'حدث خطأ في عرض هذه الشاشة'), h('p', {}, String(e.message || e)), h('a', { href: '#/' }, 'العودة للرئيسية')));
  }
  if (app.profile.last) persist();
  const h2 = root.querySelector('h1, h2'); if (h2) { h2.setAttribute('tabindex', '-1'); h2.focus({ preventScroll: true }); }
}

async function boot() {
  const root = view();
  root.textContent = 'نجهز مساحة الفكرة…';
  initProfile();
  applySettings();
  try { await loadData(); }
  catch (e) { root.innerHTML = ''; root.append(h('section', { class: 'card' }, h('h2', {}, 'تعذر تحميل المحتوى'), h('p', {}, 'تحقق من الاتصال ثم أعد المحاولة. إن كان التطبيق مثبتًا افتحه مرة واحدة مع الاتصال أولًا.'), h('button', { class: 'btn primary', onclick: () => location.reload() }, 'أعد المحاولة'))); return; }
  const n = app.data.copy.nav;
  document.getElementById('nav').replaceChildren(...[['#/', n.home], ['#/lab', n.lab], ['#/treasure', 'جزيرة الكنز'], ['#/planets', 'الكواكب'], ['#/child', n.child], ['#/profile', n.profile]].map(([href, l]) => h('a', { href }, l)));
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
  window.__dabtReady = true;
}
boot();
