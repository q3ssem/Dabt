import { h, fmt, scene, announce, toast } from '../core/ui.js';
import { app, persist } from '../app-state.js';
import { runPuzzle, dialogueBox, readButton } from '../core/runner.js';
import { TYPE_LABEL } from '../core/widgets.js';
import { offlineButton } from '../core/offline.js';
import { sprite, setPose } from '../core/character.js';

const A = 'assets/treasure/';
const bgOf = b => A + 'backgrounds/' + b.background.split('/').pop().replace('.png', '.webp');
const toolOf = b => A + 'tools/' + b.tool.split('/').pop().replace('.png', '.webp');
const sealOf = b => A + 'design/production/' + b.seal.split('/').pop();

function D() { return app.data.treasure; }
function S() { return app.profile.treasure; }
const bind = id => D().bindings[id];
const done = id => !!S().results[id];
const chapterComplete = c => c.puzzles.filter(p => p.required).every(p => done(p.id));
const unlocked = i => i === 0 || chapterComplete(D().story.chapters[i - 1]);

export function treasureHome(root, go) {
  const t = D().story; const s = S();
  root.innerHTML = '';
  const seals = h('ol', { class: 'seal-row', 'aria-label': 'أختام الأطلس الستة' }, ...t.chapters.map(c => {
    const b = bind(c.puzzles[0].id); const has = s.sealsAwarded.includes(c.id);
    return h('li', { class: 'seal' + (has ? ' has' : '') }, h('img', { src: has ? sealOf(b) : A + 'design/production/seal-socket.svg', alt: '' }), h('span', {}, has ? `ختم ${c.seal}` : `تجويف ${c.seal}`));
  }));
  const list = h('ol', { class: 'chapter-list' }, ...t.chapters.map((c, i) => {
    const req = c.puzzles.filter(p => p.required), opt = c.puzzles.filter(p => !p.required);
    const open = unlocked(i);
    const b = h('button', { type: 'button', class: 'chapter-card' + (open ? '' : ' locked'), disabled: !open || null, style: { '--accent': c.color } },
      h('span', { class: 'num' }, fmt(i + 1)), h('b', {}, c.title),
      h('small', {}, open ? `الأساسية ${fmt(req.filter(p => done(p.id)).length)}/${fmt(req.length)} · الاختيارية ${fmt(opt.filter(p => done(p.id)).length)}/${fmt(opt.length)}` : 'أكمل التحديات الأساسية في الفصل السابق'),
      chapterComplete(c) ? h('span', { class: 'chip done' }, 'اكتمل الفصل') : null);
    b.addEventListener('click', () => go(`#/treasure/${c.id}`));
    return h('li', {}, b);
  }));
  root.append(
    h('header', { class: 'section-hero treasure' }, h('h1', {}, t.title), h('p', { class: 'lead' }, t.subtitle), h('p', { class: 'muted' }, t.audience),
      h('div', { class: 'row wrap' }, h('button', { type: 'button', class: 'btn', onclick: () => go('#/treasure/journal') }, 'افتح الدفتر'), offlineButton('treasure'))),
    h('figure', { class: 'map-figure' }, h('img', { src: A + 'design/maps/treasure-overview.svg', alt: 'خريطة الجزيرة العامة (رسم زخرفي؛ الفصول أزرار حية أدناه)' })),
    h('h2', {}, 'الأختام'), seals, h('h2', {}, 'الفصول'), list);
  if (s.finalChoice) root.append(h('section', { class: 'card' }, h('h2', {}, 'نهاية رحلتك'), h('p', {}, fmt(t.chapters[5].endings?.[s.finalChoice] || ''))));
}

export function treasureChapter(root, go, chapterId) {
  const t = D().story; const i = t.chapters.findIndex(c => c.id === chapterId); const c = t.chapters[i];
  if (!c) return go('#/treasure');
  if (!unlocked(i)) { toast('أكمل التحديات الأساسية في الفصل السابق أولًا.'); return go('#/treasure'); }
  const s = S(); root.innerHTML = '';
  const b0 = bind(c.puzzles[0].id);
  const nodes = h('ol', { class: 'node-list' }, ...c.puzzles.map((p, k) => {
    const r = s.results[p.id]; const draft = s.drafts[p.id];
    const b = h('button', { type: 'button', class: 'node-card' + (r ? ' done' : ''), style: { '--accent': c.color } },
      h('span', { class: 'num' }, fmt(k + 1)), h('b', {}, p.title), h('small', {}, `${p.id} · ${TYPE_LABEL[p.type]}`),
      h('span', { class: 'chip' + (p.required ? '' : ' optional') }, p.required ? 'أساسي' : 'مسار اختياري'),
      r ? h('span', { class: 'chip done' }, r.status === 'assisted' ? 'اكتمل بالمساعدة' : 'محلول') : draft ? h('span', { class: 'chip' }, 'مسودة محفوظة') : null);
    b.addEventListener('click', () => go(`#/treasure/${c.id}/${p.id}`));
    return h('li', {}, b);
  }));
  root.append(
    h('header', { class: 'puzzle-head' }, h('button', { type: 'button', class: 'btn ghost back', onclick: () => go('#/treasure') }, '→ الجزيرة'), h('div', {}, h('small', { class: 'crumb' }, `الفصل ${fmt(i + 1)} · ختم ${c.seal}`), h('h2', {}, c.title))),
    scene(bgOf(b0), `مشهد الفصل: ${c.title}`),
    h('section', { class: 'card story' }, h('p', {}, fmt(c.opening)), readButton(() => c.opening)),
    dialogueBox(c.dialogue, { fallbackChar: b0.character }),
    h('section', { class: 'goal' }, h('b', {}, 'هدف الفصل: '), fmt(c.goal)),
    h('figure', { class: 'map-figure small' }, h('img', { src: `${A}design/maps/treasure-chapter-0${i + 1}.svg`, alt: 'خريطة الفصل (زخرفية؛ عقد الألغاز الحية أدناه)' })),
    nodes);
  if (chapterComplete(c)) root.append(chapterClose(c, i, go));
}

function sealAward(c, i, go) {
  S().sealsAwarded.push(c.id);
  const b = bind(c.puzzles[0].id); const next = D().story.chapters[i + 1];
  return h('section', { class: 'card seal-award fresh' },
    h('img', { src: sealOf(b), alt: `ختم ${c.seal}`, class: 'seal-big' }), h('h2', {}, `اكتمل الفصل: ختم ${c.seal}`), h('p', {}, fmt(c.ending)),
    h('div', { class: 'tool-row' }, h('img', { src: toolOf(b), alt: c.tool, class: 'tool-img' }), h('p', {}, h('b', {}, 'أُضيف إلى الدفتر: '), c.tool)),
    next ? h('p', { class: 'muted small' }, `فُتح الفصل التالي: ${next.title}`) : null,
    h('button', { type: 'button', class: 'btn', onclick: () => go(`#/treasure/${c.id}`) }, 'اختر أثرًا لصفحة الفصل'));
}

function chapterClose(c, i, go) {
  const s = S(); const b = bind(c.puzzles[0].id);
  const first = !s.sealsAwarded.includes(c.id);
  if (first) { s.sealsAwarded.push(c.id); persist(); }
  const box = h('section', { class: 'card seal-award' + (first ? ' fresh' : '') },
    h('img', { src: sealOf(b), alt: `ختم ${c.seal}`, class: 'seal-big' }),
    h('h2', {}, `ختم ${c.seal}`), h('p', {}, fmt(c.ending)),
    h('div', { class: 'tool-row' }, h('img', { src: toolOf(b), alt: c.tool, class: 'tool-img' }), h('p', {}, h('b', {}, 'أُضيف إلى الدفتر: '), c.tool)),
    first ? null : h('p', { class: 'muted small' }, 'الختم محفوظ مسبقًا؛ لا تتكرر المكافأة.'));
  if (c.closingChoice) {
    const cur = s.chapterNotes[c.id];
    box.append(h('h3', {}, c.closingChoice.prompt), h('p', { class: 'muted small' }, c.closingChoice.effect),
      h('div', { class: 'row wrap' }, ...c.closingChoice.options.map(o => h('button', { type: 'button', class: 'btn' + (cur === o ? ' primary' : ''), 'aria-pressed': String(cur === o), onclick: () => { s.chapterNotes[c.id] = o; if (persist()) { toast('أُضيف السطر إلى الدفتر.'); treasureChapter(document.getElementById('view'), go, c.id); } } }, o))));
  }
  const next = D().story.chapters[i + 1];
  if (next) box.append(h('button', { type: 'button', class: 'btn primary', onclick: () => go(`#/treasure/${next.id}`) }, `انتقل إلى الفصل التالي: ${next.title}`));
  return box;
}

export function treasurePuzzle(root, go, chapterId, puzzleId) {
  const t = D().story; const ci = t.chapters.findIndex(c => c.id === chapterId); const c = t.chapters[ci];
  const p = c?.puzzles.find(x => x.id === puzzleId);
  if (!p || !unlocked(ci)) return go('#/treasure');
  const b = bind(p.id); const s = S();
  app.profile.last = { hash: `#/treasure/${c.id}/${p.id}`, label: `${c.title} · ${p.title}` };
  const idx = c.puzzles.indexOf(p); const nextP = c.puzzles[idx + 1];
  runPuzzle(root, {
    section: 'treasure', puzzle: p, sectionState: s, background: bgOf(b), bgAlt: `مشهد ${c.title}`, character: b.character,
    crumb: `الفصل ${fmt(ci + 1)} · ${c.title} · ${p.id}`, successText: b.successText,
    storyEffect: p.type === 'choice-story' ? ch => { s.finalChoice = ch; return c.endings?.[ch]; } : null,
    hideSceneForMemory: true,
    onExit: () => go(`#/treasure/${c.id}`),
    onNext: () => go(nextP ? `#/treasure/${c.id}/${nextP.id}` : `#/treasure/${c.id}`),
    nextLabel: nextP ? `التالي: ${nextP.title}` : 'عد إلى خريطة الفصل',
    afterButtons: [h('button', { type: 'button', class: 'btn', onclick: () => go(`#/treasure/${c.id}`) }, 'خريطة الفصل')],
    side: journalMini(),
    // the seal, chapter ending and tool are awarded the moment the last required puzzle is solved
    successExtra: () => (chapterComplete(c) && !s.sealsAwarded.includes(c.id)) ? sealAward(c, ci, go) : null,
  });
}

function journalMini() {
  return h('details', { class: 'journal-mini' }, h('summary', {}, 'الدفتر'), journalContent(true));
}

function journalContent(compact) {
  const t = D().story; const s = S();
  const wrap = h('div', { class: 'journal' });
  const tools = t.chapters.filter(c => s.sealsAwarded.includes(c.id));
  wrap.append(h('h3', {}, 'الأدوات'), tools.length ? h('ul', { class: 'tools' }, ...tools.map(c => h('li', {}, h('img', { src: toolOf(bind(c.puzzles[0].id)), alt: '' }), h('span', {}, c.tool)))) : h('p', { class: 'muted' }, 'لم تُجمع أدوات بعد.'));
  const notes = Object.entries(s.chapterNotes);
  if (notes.length) wrap.append(h('h3', {}, 'سطورك'), h('ul', {}, ...notes.map(([cid, o]) => h('li', {}, `${t.chapters.find(c => c.id === cid)?.title}: ${o}`))));
  if (!compact) {
    // Only finished puzzles appear: the journal never exposes a memory target during a response.
    wrap.append(h('h3', {}, 'ما فهمته'));
    for (const c of t.chapters) {
      const solved = c.puzzles.filter(p => s.results[p.id] && p.type !== 'choice-story');
      if (!solved.length) continue;
      wrap.append(h('h4', {}, c.title), h('ul', {}, ...solved.map(p => h('li', {}, h('b', {}, p.title + ': '), fmt(p.solution)))));
    }
  }
  return wrap;
}

export function treasureJournal(root, go) {
  root.innerHTML = '';
  root.append(h('header', { class: 'puzzle-head' }, h('button', { type: 'button', class: 'btn ghost back', onclick: () => go('#/treasure') }, '→ الجزيرة'), h('h2', {}, 'دفتر الرحلة')), journalContent(false));
}
