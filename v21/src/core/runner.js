// Shared puzzle screen: scene → dialogue → goal → live panel → undo/check → hints →
// explicit reveal (assisted) → explanation → player-driven continue.
import { h, fmt, scene, announce, confirmDialog } from './ui.js';
import { buildWidget, TYPE_LABEL } from './widgets.js';
import { validate, referenceResponse } from './validators.js';
import { sprite, setPose, NAMES } from './character.js';
import { sfx, speak, speechInfo } from './audio.js';
import { app, persist } from '../app-state.js';
import { recordResult } from './store.js';

const MEMORY_RESPONSE_PROMPT = s => s.after ? 'حدد الموضع الذي تغيّر.' : s.recall === 'reverse' ? 'أعد العناصر بالعكس.' : /^last(\d+)/.test(s.recall || '') ? `أعد آخر ${fmt(/^last(\d+)/.exec(s.recall)[1])} عناصر فقط.` : 'أعد العناصر بالترتيب نفسه.';

export function readButton(getText) {
  const info = speechInfo();
  const b = h('button', { type: 'button', class: 'btn ghost small', 'aria-label': 'قراءة مساعدة' }, '🔈 اقرأ');
  b.addEventListener('click', () => {
    if (!app.profile.settings.narration) { announce('القراءة المساعدة متوقفة من الإعدادات.'); b.after(h('span', { class: 'muted small' }, ' فعّل القراءة المساعدة من «مساحة تناسبك».')); return; }
    if (!speak(getText())) { b.replaceWith(h('span', { class: 'muted small no-voice' }, 'لا يتوفر صوت عربي في هذا المتصفح؛ النص الظاهر هو البديل.')); }
  });
  if (!info.available && !app.profile.settings.narration) b.title = 'القراءة تعمل عند توفر صوت عربي في المتصفح';
  return b;
}

export function dialogueBox(lines, { fallbackChar } = {}) {
  // lines: [[speaker, text], ...] — pose switches to talk at each line start
  const box = h('section', { class: 'dialogue', 'aria-label': 'حوار' });
  if (!lines?.length) return box;
  let i = 0; const ids = lines.map(([sp]) => ({ 'سالم': 'salem', 'المستكشف': 'explorer', 'مهرة': 'mahra', 'نادر': 'nader', 'صوت نادر': 'nader', 'طيف': 'tayf', 'قائدة البعثة': 'yara', 'لُمى': 'luma' }[sp] || fallbackChar));
  const spr = sprite(ids[0] || fallbackChar, 'talk');
  const who = h('b', { class: 'speaker' }); const text = h('p', { class: 'line', 'aria-live': 'polite' });
  const next = h('button', { type: 'button', class: 'btn small' }, 'التالي');
  const all = h('button', { type: 'button', class: 'btn ghost small' }, 'اعرض الحوار كله');
  const stage = h('div', { class: 'char-stage' }, spr);
  function show() {
    const [sp, t] = lines[i]; who.textContent = sp; text.textContent = fmt(t);
    if (ids[i] && spr.dataset.char !== ids[i]) { const ns = sprite(ids[i], 'talk'); stage.replaceChildren(ns); } else setPose(stage.firstChild, 'talk');
    next.textContent = i < lines.length - 1 ? 'التالي' : 'جاهز';
  }
  next.addEventListener('click', () => { if (i < lines.length - 1) { i++; show(); } else { setPose(stage.firstChild, 'idle'); box.classList.add('done'); next.disabled = true; box.dispatchEvent(new CustomEvent('done')); } });
  all.addEventListener('click', () => { box.querySelector('.all-lines')?.remove(); box.append(h('ol', { class: 'all-lines' }, ...lines.map(([s, t]) => h('li', {}, h('b', {}, s + ': '), fmt(t))))); });
  box.append(stage, h('div', { class: 'bubble' }, who, text, h('div', { class: 'row' }, next, all, readButton(() => lines.map(l => l.join(': ')).join('. ')))));
  show();
  return box;
}

// opts: {section, puzzle, background, bgAlt, character, sectionState, onExit, onSolved, extraTop, child, assistOnReplay, statusLine}
export function runPuzzle(root, opts) {
  const { puzzle: p, section, sectionState } = opts;
  const prior = sectionState.results[p.id];
  let hintsUsed = 0, attempts = 0, assisted = false, solved = false, savedOk = true;
  root.innerHTML = '';
  const isMemory = p.type === 'memory';
  const promptEl = h('p', { class: 'prompt', id: 'prompt-' + p.id }, fmt(p.prompt));
  const responsePrompt = opts.responsePrompt || (isMemory ? MEMORY_RESPONSE_PROMPT(p.setup) : null);
  const feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const hintBox = h('div', { class: 'hints' });
  const spr = opts.character ? sprite(opts.character, 'idle') : null;

  let draftTimer = null;
  const draftSaver = r => { clearTimeout(draftTimer); draftTimer = setTimeout(() => { if (solved) return; sectionState.drafts[p.id] = { response: r, at: Date.now() }; persist(); }, 400); };
  const ctx = {
    onChange: r => { feedback.textContent = ''; if (p.type !== 'freebuild' && !isMemory) draftSaver(r); },
    exposureMs: opts.exposureMs,
    onPhase: ph => {
      if (opts.hideSceneForMemory) root.querySelector('.puzzle-main')?.classList.add('memory-active');
      if (ph === 'respond') { promptEl.textContent = responsePrompt; promptEl.classList.add('response-prompt'); }
      if (ph === 'watch') { promptEl.textContent = 'شاهد العناصر وتذكر ترتيبها.'; }
    },
    savedWork: opts.savedWork, onWork: opts.onWork,
  };
  const widget = buildWidget(p, ctx);
  const draft = sectionState.drafts[p.id];
  if (draft && !isMemory && p.type !== 'freebuild' && draft.response != null) { try { widget.set(draft.response); } catch { } }

  const btnUndo = h('button', { type: 'button', class: 'btn' }, 'تراجع خطوة');
  const btnReset = h('button', { type: 'button', class: 'btn' }, 'أعد ترتيب المحاولة');
  const btnCheck = h('button', { type: 'button', class: 'btn primary' }, p.type === 'choice-story' ? 'أكّد اختياري' : 'تحقق من الفكرة');
  const btnHint = h('button', { type: 'button', class: 'btn ghost' }, 'أحتاج إشارة');
  const btnReveal = h('button', { type: 'button', class: 'btn ghost' }, 'اشرح الحل كاملًا');
  const btnReplay = isMemory ? h('button', { type: 'button', class: 'btn ghost' }, 'أعد العرض') : null;
  const btnExit = h('button', { type: 'button', class: 'btn ghost' }, p.type === 'freebuild' ? 'احفظ وعد لاحقًا' : 'احفظ وعد لاحقًا');
  btnUndo.addEventListener('click', () => { if (!widget.undo()) announce('لا توجد خطوة للتراجع.'); });
  btnReset.addEventListener('click', () => widget.reset());
  btnExit.addEventListener('click', () => { if (!isMemory && p.type !== 'freebuild') { sectionState.drafts[p.id] = { response: widget.get(), at: Date.now() }; } const ok = persist(); if (ok) opts.onExit(); });
  btnHint.addEventListener('click', () => {
    if (hintsUsed >= p.hints.length) return;
    hintBox.append(h('p', { class: 'hint' }, h('b', {}, hintsUsed === 0 ? 'إشارة: ' : 'إشارة أوضح: '), fmt(p.hints[hintsUsed])));
    if (isMemory && hintsUsed === 1 && opts.assistOnReplay !== false) { assisted = true; hintBox.append(h('p', { class: 'muted small' }, 'الإشارة الثانية تكشف جزءًا من الهدف، لذلك تُسجل مساعدة.')); }
    hintsUsed++; btnHint.textContent = hintsUsed < p.hints.length ? 'إشارة أوضح' : 'لا توجد إشارات أخرى'; btnHint.disabled = hintsUsed >= p.hints.length;
  });
  btnReveal.addEventListener('click', async () => {
    if (!await confirmDialog('سيُسجل هذا اللغز بوصفه مكتملًا بالمساعدة. هل تريد عرض الحل؟', 'اعرض الحل')) return;
    assisted = true;
    if (!(isMemory && widget.phase?.() !== 'respond')) { try { widget.set(referenceResponse(p)); } catch { } }
    complete(true);
  });
  if (btnReplay) btnReplay.addEventListener('click', () => { if (opts.assistOnReplay !== false) assisted = true; widget.replay(); announce(opts.assistOnReplay !== false ? 'إعادة العرض تُسجل مساعدة.' : 'يمكنك المشاهدة مرة أخرى.'); });
  btnCheck.addEventListener('click', () => {
    const r = validate(p, widget.get());
    widget.afterCheck?.();
    if (r.empty) { feedback.className = 'feedback warn'; feedback.textContent = 'أكمل الاستجابة قبل التحقق.'; return; }
    attempts++;
    if (r.ok) { complete(false); return; }
    sfx('err'); feedback.className = 'feedback bad'; feedback.textContent = fmt(p.failure || 'لم تتطابق الشروط بعد.');
    root.classList.remove('shake'); void root.offsetWidth; if (!app.profile.settings.reduceMotion) root.classList.add('shake');
  });

  function complete(viaReveal) {
    if (solved) return; solved = true; clearTimeout(draftTimer);
    widget.destroy?.();
    [btnUndo, btnReset, btnCheck, btnHint, btnReveal, btnReplay].forEach(b => b && (b.disabled = true));
    panel.classList.add('locked'); panel.setAttribute('inert', '');
    const open = p.type === 'choice-story' || p.type === 'freebuild';
    const isAssisted = assisted || viaReveal;
    delete sectionState.drafts[p.id];
    const res = recordResult(sectionState, p.id, { assisted: isAssisted, attempts, hintsUsed });
    if (p.type === 'choice-story') sectionState.decisions[p.id] = widget.get();
    opts.onSolved?.({ first: res.first, assisted: isAssisted, choice: p.type === 'choice-story' ? widget.get() : null });
    const extra = opts.successExtra?.();
    savedOk = persist();
    sfx(open ? 'card' : 'ok'); if (spr) setPose(spr, 'celebrate');
    widget.afterSuccess?.();
    feedback.className = 'feedback good';
    feedback.replaceChildren(
      h('p', { class: 'verdict' }, open ? 'حُفظ اختيارك.' : isAssisted ? 'اكتمل بالمساعدة.' : 'وجدت العلاقة.'),
      p.solution && !open ? h('p', {}, h('b', {}, 'التفسير: '), fmt(p.solution)) : null,
      opts.successText || p.success ? h('p', { class: 'effect' }, fmt(opts.successText || p.success)) : null,
      opts.storyEffect ? h('p', { class: 'effect' }, fmt(opts.storyEffect(widget.get()) || '')) : null,
      res.first ? null : h('p', { class: 'muted small' }, 'إعادة لعب: لا تتكرر المكافأة.'),
      extra || null,
      savedOk ? null : h('p', { class: 'bad' }, 'تعذر حفظ النتيجة. استخدم زر إعادة الحفظ أعلى الشاشة قبل المتابعة.'),
      nextRow());
    announce(open ? 'حُفظ اختيارك.' : 'تحقق الحل.');
    feedback.querySelector('button')?.focus();
  }
  function nextRow() {
    const row = h('div', { class: 'row' });
    const go = h('button', { type: 'button', class: 'btn primary' }, opts.nextLabel || 'التالي عندما تكون جاهزًا');
    go.addEventListener('click', () => { if (!savedOk) { savedOk = persist(); if (!savedOk) { announce('ما زال الحفظ متعذرًا.'); return; } } opts.onNext ? opts.onNext() : opts.onExit(); });
    row.append(go);
    for (const extra of opts.afterButtons || []) row.append(extra);
    return row;
  }

  const panel = h('section', { class: 'panel', 'aria-label': 'لوحة اللغز' }, widget.el);
  const head = h('header', { class: 'puzzle-head' },
    h('button', { type: 'button', class: 'btn ghost back', onclick: () => { if (!isMemory && p.type !== 'freebuild' && !solved) { sectionState.drafts[p.id] = { response: widget.get(), at: Date.now() }; persist(); } widget.destroy?.(); opts.onExit(); } }, '→ عودة'),
    h('div', {}, h('small', { class: 'crumb' }, opts.crumb || ''), h('h2', {}, fmt(p.title))),
    h('span', { class: 'chip' }, TYPE_LABEL[p.type] || p.type), p.required === false ? h('span', { class: 'chip optional' }, 'مسار اختياري') : null,
    prior ? h('span', { class: 'chip done' }, prior.status === 'assisted' ? 'اكتمل بالمساعدة' : 'محلول') : null);

  root.append(head,
    h('div', { class: 'puzzle-layout' },
      h('div', { class: 'puzzle-main' },
        opts.background ? scene(opts.background, opts.bgAlt || p.title, 'puzzle-scene' + (isMemory && opts.hideSceneForMemory ? ' dim' : '')) : null,
        opts.extraTop || null,
        h('section', { class: 'goal' }, h('div', { class: 'goal-row' }, spr ? h('div', { class: 'char-mini' }, spr) : null, h('div', {}, promptEl, h('p', { class: 'muted small interaction' }, fmt(p.interaction || '')))), readButton(() => promptEl.textContent)),
        panel,
        h('div', { class: 'actions' }, btnUndo, btnReset, btnCheck),
        feedback),
      h('aside', { class: 'puzzle-side' }, h('div', { class: 'row wrap' }, btnHint, btnReplay, btnReveal, btnExit), hintBox, opts.side || null)));
  if (p.type === 'choice-story' || p.type === 'freebuild') { btnHint.hidden = !p.hints?.length; btnReveal.hidden = true; }
  if (p.type === 'freebuild') { btnCheck.textContent = 'أنهيت العمل'; btnReset.textContent = 'امسح اللوحة الحالية'; }
  root.querySelector('h2')?.focus?.();
  return { widget, complete };
}
