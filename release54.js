'use strict';
/* 5.4.1 enhancement layer. Keeps the 5.3 engine and persistence source intact. */
(function () {
  const root = document.documentElement;
  const $ = (q, host = document) => host.querySelector(q);

  // Resolve the stored Auto preference to the active black/white palette, and tint browser chrome.
  function resolveTheme() {
    // 5.5: white is the default for anyone who has not chosen; a stored choice (dark/light/auto) is kept.
    let preference = 'light';
    try { preference = S.st.skin || 'light'; } catch (_) {}
    const light = preference === 'light' || (preference === 'auto' && !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches));
    const resolved = light ? 'light' : 'dark';
    if (root.dataset.skin !== resolved) root.dataset.skin = resolved;
    root.dataset.skinPreference = preference;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#F7F5F0' : '#111315');
  }
  const themeObserver = new MutationObserver(resolveTheme);
  themeObserver.observe(root, { attributes: true, attributeFilter: ['data-skin'] });
  if (window.matchMedia) {
    const query = window.matchMedia('(prefers-color-scheme: light)');
    if (query.addEventListener) query.addEventListener('change', resolveTheme);
    else if (query.addListener) query.addListener(resolveTheme);
  }
  resolveTheme();

  // Keep the existing setting values and handlers; only clarify the visible labels.
  // 5.4.8: write only when the label differs. Rewriting textContent is itself a childList
  // mutation, so an unconditional write re-fired the observer forever and froze «مستواي».
  const setLabel = (b, text, aria) => {
    if (b.textContent !== text) b.textContent = text;
    if (b.getAttribute('aria-label') !== aria) b.setAttribute('aria-label', aria);
  };
  function labelThemeOptions() {
    let pref = 'light'; try { pref = S.st.skin || 'light'; } catch (_) {}
    document.querySelectorAll('#v-me [data-sk]').forEach(b => { const on = b.dataset.sk === pref; if (b.classList.contains('on') !== on) b.classList.toggle('on', on); });
    document.querySelectorAll('#v-me [data-sk="dark"]').forEach(b => setLabel(b, 'أسود', 'الثيم الأسود'));
    document.querySelectorAll('#v-me [data-sk="light"]').forEach(b => setLabel(b, 'أبيض', 'الثيم الأبيض'));
    document.querySelectorAll('#v-me [data-sk="auto"]').forEach(b => setLabel(b, 'تلقائي', 'الثيم التلقائي'));
  }
  const me = $('#v-me');
  if (me) new MutationObserver(labelThemeOptions).observe(me, { childList: true, subtree: true });
  labelThemeOptions();

  // Three clear learning phases over the existing eight-level difficulty curve.
  const phases = [
    { name: 'التأسيس', desc: 'تعرّف على آلية اللغز وثبّت القاعدة الأساسية.' },
    { name: 'التركيب', desc: 'اجمع الأدلة والقيود، وخطّط لأكثر من خطوة.' },
    { name: 'الإتقان', desc: 'تعامل مع شروط مركّبة وقلّل التجريب والحركات الزائدة.' }
  ];
  function phaseFor(level, maximum) {
    const first = Math.max(1, Math.floor(maximum * .25));
    const second = Math.max(first + 1, Math.ceil(maximum * .625));
    const index = level <= first ? 0 : level <= second ? 1 : 2;
    return { ...phases[index], index, first, second };
  }
  function gameContext() {
    try {
      if (typeof curGame !== 'function') return null;
      const game = curGame();
      if (!game || !game.puz) return null;
      // Treasure-journey stations already have their own authored challenge progression.
      if (typeof txStageOf === 'function' && txStageOf(game.id)) return null;
      const maximum = typeof pzMax === 'function' ? pzMax(game.id) : game.maxLv || 8;
      const level = typeof pzLv === 'function' ? pzLv(game.id) : 1;
      if (!maximum || maximum <= 1) return null;
      return { game, maximum, level, phase: phaseFor(level, maximum) };
    } catch (_) { return null; }
  }
  function addPhaseCard() {
    const intro = $('#stage .intro');
    if (!intro || intro.querySelector('.pz-phase-card')) return;
    const ctx = gameContext();
    if (!ctx) return;
    const card = document.createElement('section');
    card.className = 'pz-phase-card';
    const q = ctx.phase;
    const head = document.createElement('div');
    head.className = 'pz-phase-head';
    const headTitle = document.createElement('b'); headTitle.textContent = 'تدرّج اللغز';
    const headCount = document.createElement('span'); headCount.textContent = (q.index + 1) + ' / 3';
    head.append(headTitle, headCount);
    const track = document.createElement('div'); track.className = 'pz-phase-track';
    track.setAttribute('role', 'progressbar'); track.setAttribute('aria-label', 'مرحلة تقدم اللغز');
    track.setAttribute('aria-valuemin', '1'); track.setAttribute('aria-valuemax', '3'); track.setAttribute('aria-valuenow', String(q.index + 1));
    phases.forEach((phase, i) => { const item = document.createElement('i'); item.className = (i <= q.index ? 'on ' : '') + (i === q.index ? 'current' : ''); item.setAttribute('aria-label', phase.name); track.append(item); });
    const title = document.createElement('div'); title.className = 'pz-phase-title'; title.textContent = q.name;
    const description = document.createElement('p'); description.textContent = q.desc;
    card.append(head, track, title, description);
    // Each puzzle already has authored, puzzle-specific steps in UI_RULES. Surface the
    // matching step for the learner's current phase instead of repeating generic advice.
    const focusText = Array.isArray(ctx.game.how) ? ctx.game.how[q.index] : '';
    if (focusText) {
      const focus = document.createElement('div'); focus.className = 'pz-phase-focus';
      const label = document.createElement('span'); label.textContent = 'تركيز هذه المرحلة';
      const detail = document.createElement('b'); detail.textContent = focusText;
      focus.append(label, detail); card.append(focus);
    }
    const levelNote = document.createElement('small'); levelNote.textContent = 'المستوى ' + ctx.level + ' من ' + ctx.maximum;
    card.append(levelNote);
    const how = intro.querySelector('.how');
    if (how) how.insertAdjacentElement('afterend', card);
    else intro.append(card);
  }
  function addPhaseLabel() {
    const hud = $('#stage .pzhud .pzlv');
    if (!hud || hud.querySelector('.pz-phase-inline')) return;
    const ctx = gameContext();
    if (!ctx) return;
    const small = document.createElement('small');
    small.className = 'pz-phase-inline';
    small.textContent = 'المرحلة ' + (ctx.phase.index + 1) + ' · ' + ctx.phase.name;
    hud.append(small);
  }
  let queued = false;
  function updatePuzzleStages() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      addPhaseCard();
      addPhaseLabel();
    });
  }
  const stageHost = $('#stage');
  if (stageHost) new MutationObserver(updatePuzzleStages).observe(stageHost, { childList: true, subtree: true });
  updatePuzzleStages();

  // Drawn icons are lazy-loaded from watercolor/app.js, which owns the card mapping.
  // Apply the theme CSS last so it wins over the legacy fixed-dark card styles.
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('release54.css', document.baseURI).href;
  link.dataset.release = '5.4.0';
  document.head.append(link);
  // 5.5: the design system — generated white layer, then the central tokens/components (last = wins).
  ['ds/light-auto.css', 'ds/mindlab-ds.css'].forEach(href => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL(href, document.baseURI).href; l.dataset.release = '5.5.0'; document.head.append(l);
  });
})();
