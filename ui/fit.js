/* fit-ui — every Mind Lab puzzle fits the phone screen without page scroll.
   Presentation only: puzzle ids, rules, levels, generators and save keys are untouched.
   - HUD in one row of icons (level n/m, coins, hint, restart, info, journal, give up).
   - Story banners / lore / lead sentences move into an info sheet (ⓘ); clues stay on the board.
   - The board is scaled with CSS zoom so the whole puzzle fits the space under the HUD.
   The only new storage key is mindlab:fit:seen:v1 (which puzzles already showed their rule bubble). */
(function () {
  if (window.__fitUI) return; window.__fitUI = 1;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const MIN_ZOOM = 0.58;
  // story / framing → info sheet (hidden on the board)
  const STORY = '.mla-adventure-intro,.castle-lore,.atheran-story,.lb-intro';
  // rule sentences → info sheet (hidden on the board); clue lists inside them stay visible
  const RULE = '.ml-river-rules,.lb-lead,.lb-rule,#pzb .mk-lead,#pzb .pl-lead,details.ui-rules > summary,#play[data-la-game="pz_avsong"] #pzb .xnote';
  const JOURNAL = '.castle-book-open,.atheran-journal-open';
  const SEEN_KEY = 'mindlab:fit:seen:v1';
  const seen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch (e) { return {}; } };
  const markSeen = id => { try { const s = seen(); s[id] = 1; localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) {} };
  const gid = () => { try { return typeof curGame === 'function' ? (curGame() || {}).id : null; } catch (e) { return null; } };
  const txt = e => (e && (e.innerText || e.textContent) || '').replace(/\s+/g, ' ').trim();
  const arabic = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  function waterAmount(n) {
    if (!Number.isFinite(n)) return '—';
    // Garden flow divides an integer source by two or three, at most four times.
    // Show the exact fraction, rather than a long floating-point decimal.
    for (let d = 1; d <= 81; d++) {
      const numerator = Math.round(n * d);
      if (Math.abs(n - numerator / d) < 1e-9)
        return arabic(numerator) + (d === 1 ? '' : '⁄' + arabic(d));
    }
    return '≈' + new Intl.NumberFormat('ar-SA', {maximumFractionDigits: 2}).format(n);
  }
  function gardenAmounts() {
    if (gid() !== 'pz_pgarden') return;
    $$('.pgfl > b', body).forEach(b => {
      const pair = b.textContent.split('/'); if (pair.length !== 2) return;
      const values = pair.map(s => Number(s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))));
      if (!values.every(Number.isFinite)) return;
      b.innerHTML = `<span>وصل: <bdi dir="ltr">${waterAmount(values[0])}</bdi></span><span>المطلوب: <bdi dir="ltr">${waterAmount(values[1])}</bdi></span>`;
    });
  }
  const I_INFO = '<i class="fit-info-icon" aria-hidden="true">؟</i>';
  const I_SOUND = '<i class="fit-sound-icon" aria-hidden="true"></i>';
  const I_BOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z"/><path d="M12 6v13.5"/></svg>';

  let body = null, mo = null, raf = 0, fitting = false, sheetPrevFocus = null;
  // Optional, session-only enlarged board. Native saves, zoom defaults and gameplay stay unchanged.
  let largeView = false;
  const layoutObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => schedule()) : null;

  function sheetHTML() {
    const story = $$(STORY, body).map(e => { const c = e.cloneNode(true); $$('button', c).forEach(b => b.remove()); return txt(c); }).filter(Boolean);
    let rules = $$(RULE, body).map(e => { const c = e.cloneNode(true); $$('i', c).forEach(i => { if (/التفاصيل/.test(i.textContent)) i.remove(); }); return txt(c).replace(/^القاعدة\s*/, ''); }).filter(Boolean);
    const title = txt($('#pt'));
    const id = gid();
    if (!rules.length) rules = (GM[id]?.how || []).map(h => esc(h));
    const hasOpening = !!(id && window.__MINDLAB_OPENINGS_DATA && window.__MINDLAB_OPENINGS_DATA[id] && window.fitOpenings);
    const zoomChoice = body && !$('.lb[data-layout]', body)
      ? `<button class="fit-sh-magnify" type="button" aria-pressed="${largeView}">${largeView?'العودة إلى ملاءمة الشاشة':'تكبير لوحة اللغز والتمرير داخلها'}</button>`
      : '';
    return `<div class="fit-sheet-card" role="dialog" aria-modal="true" aria-label="${title}"><h3>${title}</h3>${rules.length ? `<div class="fit-sh-rule"><b>القاعدة</b>${rules.map(r => `<p>${r}</p>`).join('')}</div>` : ''}${story.length ? `<div class="fit-sh-story">${story.map(s => `<p>${s}</p>`).join('')}</div>` : ''}${hasOpening ? '<button class="fit-sh-replay" type="button">عرض مقدمة اللغز</button>' : ''}${zoomChoice}<button class="fit-sh-go" type="button">فهمت</button></div>`;
  }
  function openSheet() {
    closeSheet(); sheetPrevFocus = document.activeElement;
    const d = document.createElement('div'); d.className = 'fit-sheet'; d.innerHTML = sheetHTML();
    const extra = sheetExtras(); if (extra) { const go = $('.fit-sh-go', d); if (go) go.insertAdjacentHTML('beforebegin', extra); }
    d.addEventListener('click', e => {
      if (e.target.closest('.fit-sh-magnify')) {
        largeView = !largeView; closeSheet(); schedule(); return;
      }
      if (e.target.closest('.fit-sh-replay')) { const id = gid(); closeSheet(); if (id && window.fitOpenings) window.fitOpenings.open(id, true); return; }
      const give = e.target.closest('.fit-sh-give'), q = $('#pzq');
      if (give && q) {
        const armed = q.classList.contains('arm'); q.click();
        if (armed || !q.isConnected || !q.classList.contains('arm')) { closeSheet(); return; }
        give.classList.add('arm'); give.textContent = 'متأكد؟ اضغط مرة ثانية';
        setTimeout(() => { if (give.isConnected && !q.classList.contains('arm')) { give.classList.remove('arm'); give.textContent = 'استسلم'; } }, 3100);
        return;
      }
      const snd = e.target.closest('.fit-sh-sound'), real = $('#stage .fit-sound');
      if (snd && real) { real.click(); snd.setAttribute('aria-pressed', String(!S.st.mute)); $('span', snd).textContent = S.st.mute ? 'المؤثرات الصوتية متوقفة' : 'المؤثرات الصوتية تعمل'; return; }
      if (e.target === d || e.target.closest('.fit-sh-go')) closeSheet();
    });
    d.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
      if (e.key === 'Tab') {
        const fb = $$('button:not([disabled])', d); if (!fb.length) return;
        const first = fb[0], last = fb[fb.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    ($('#play') || document.body).append(d); $('.fit-sh-go', d).focus({ preventScroll: true });
  }
  function closeSheet() {
    $$('.fit-sheet').forEach(e => e.remove());
    if (sheetPrevFocus && typeof sheetPrevFocus.focus === 'function' && sheetPrevFocus.isConnected) {
      try { sheetPrevFocus.focus({ preventScroll: true }); } catch (_) {}
    }
    sheetPrevFocus = null;
  }

  function bubble() {
    const id = gid(); if (!id || seen()[id]) return;
    if (window.fitOpenings) return;
    const r = $$(RULE, body).map(e => txt(e).replace(/^القاعدة\s*/, '').replace(/التفاصيل$/, '').trim()).filter(Boolean)[0];
    if (!r) return; markSeen(id);
    const b = document.createElement('div'); b.className = 'fit-bubble'; b.innerHTML = `<span>${I_INFO}</span><p>${r}</p><button type="button" class="fit-bubble-x" aria-label="إغلاق">×</button>`;
    b.style.setProperty('--fit-bt', `${Math.round(body.getBoundingClientRect().top) + 4}px`); $('#stage').append(b);
    const off = e => { if (e) { e.preventDefault(); e.stopPropagation(); } b.classList.add('gone'); setTimeout(() => b.remove(), 300); };
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', off);
    setTimeout(() => off(), 6000);
  }

  function hud() {
    const h = $('#stage .pzhud'); if (!h) return;
    const lv = $('.pzlv', h);
    if (lv && !lv.dataset.short) { const m = (lv.innerText || '').match(/(\d+)\s*من\s*(\d+)/); if (m) { lv.dataset.short = `${m[1]}/${m[2]}`; lv.setAttribute('aria-label', lv.innerText.split('\n')[0]); } }
    let tools = $('.fit-tools', h); if (!tools) { tools = document.createElement('span'); tools.className = 'fit-tools'; h.append(tools); }
    if (!$('.fit-info', tools) && ($$(STORY + ',' + RULE, body).length || GM[gid()]?.how?.length)) {
      const ib = document.createElement('button'); ib.type = 'button'; ib.className = 'pzhb fit-info'; ib.id = 'fitinfo'; ib.setAttribute('aria-label', 'القاعدة والقصة'); ib.innerHTML = I_INFO;
      ib.onclick = openSheet; tools.prepend(ib);
    }
    const jb = $(JOURNAL, body);
    if (jb && !$('.fit-journal', tools)) {
      const pb = document.createElement('button'); pb.type = 'button'; pb.className = 'pzhb fit-journal'; pb.setAttribute('aria-label', txt(jb) || 'الدفتر'); pb.innerHTML = I_BOOK;
      const n = (txt(jb).match(/[\d٠-٩]+\s*\/\s*[\d٠-٩]+/) || [])[0]; if (n) pb.insertAdjacentHTML('beforeend', `<i>${n}</i>`);
      pb.onclick = () => jb.click(); (($('.fit-info', tools) || {}).after ? $('.fit-info', tools).after(pb) : tools.prepend(pb));
    }
    const hint = $('#pzh', h);
    if (hint) hint.setAttribute('aria-label', 'تلميح');
    if ($('.lb[data-layout]', body) && !$('.fit-sound', tools)) {
      const sound = document.createElement('button');
      sound.type = 'button'; sound.className = 'pzhb fit-sound'; sound.innerHTML = I_SOUND;
      sound.setAttribute('aria-label', 'المؤثرات الصوتية');
      const sync = () => sound.setAttribute('aria-pressed', String(!S.st.mute));
      sound.onclick = () => {
        S.st.mute = !S.st.mute; S.save();
        if (S.st.mute) { sfx.silenceRound?.(); sleepAudio(); }
        else unlockAudio();
        sync();
      };
      sync(); tools.append(sound);
    }
    // The river's «cross» button stays on the board, big, under the boat (it is the main action there).
    const q = $('#pzq'); if (q && q.parentElement !== tools) { q.setAttribute('aria-label', q.textContent.trim() === 'رجوع' ? 'رجوع' : 'استسلم'); tools.append(q); }
    const t = $('#pzt'); if (t && !t.dataset.fit) { t.dataset.fit = '1'; t.addEventListener('click', () => { t.hidden = true; }); }
  }

  const clueLists = '#lgcl, ol.xnote, .xnote ol, .pbclues, .mk-clues, .pl-clues';
  function pageClues(board) {
    for (const list of $$(clueLists, board)) {
      if (list.classList.contains('fit-clue-list')) continue;
      const clues = [...list.children].filter(el => el.matches('li, .mk-clue, .pl-clue, .pbclue'));
      if (clues.length < 2) continue;
      list.classList.add('fit-clue-list');
      list.setAttribute('aria-live', 'polite');
      const controls = document.createElement('nav');
      controls.className = 'fit-clue-controls';
      controls.setAttribute('aria-label', 'التنقل بين القرائن');
      controls.innerHTML = '<button type="button">السابق</button><span></span><button type="button">التالي</button>';
      list.before(controls);
      const [previous, indicator, next] = controls.children;
      let index = 0;
      function show(value) {
        index = Math.max(0, Math.min(clues.length - 1, value));
        clues.forEach((clue, i) => {
          clue.hidden = index !== i;
          clue.classList.toggle('fit-clue-current', index === i);
        });
        indicator.textContent = `القرينة ${arabic(index + 1)} من ${arabic(clues.length)}`;
        previous.disabled = index === 0;
        next.disabled = index === clues.length - 1;
        schedule();
      }
      previous.onclick = () => show(index - 1);
      next.onclick = () => show(index + 1);
      list.addEventListener('mindlab:clue', event => show(event.detail));
      show(0);
    }
  }

  function arrange() {
    $$('details.ui-rules', body).forEach(d => { d.open = true; });
    $$('.xpin > h3', body).forEach(h => h.classList.add('fit-dup'));
    $('#play').classList.add('fit');
    pageClues(body);
  }
  const framed = () => { const p = $('#play'); return !p || p.classList.contains('xframe'); };

  /* One-row HUD on every phone width. When the controls would wrap to a second row (320 px, or the river's extra
     sail button), the least-used ones — give up, then the sound toggle — move into the ⓘ sheet, where they act on
     the same buttons (the double-tap give-up confirmation is the engine's own). Touch targets stay 44 px. */
  const ONE_ROW = 46;
  function compactHud() {
    const h = $('#stage .pzhud'), tools = h && $('.fit-tools', h); if (!tools) return;
    const moved = $$('.fit-in-sheet', tools); moved.forEach(b => b.classList.remove('fit-in-sheet'));
    if (!$('.fit-info', tools)) return;
    const q = $('#pzq', tools), give = q && q.getAttribute('aria-label') === 'استسلم' ? q : null;
    for (const b of [give, $('.fit-sound', tools)]) {
      if (!b || h.getBoundingClientRect().height <= ONE_ROW) break;
      b.classList.add('fit-in-sheet');
    }
  }
  function sheetExtras() {
    const tools = $('#stage .pzhud .fit-tools'); if (!tools) return '';
    let html = '';
    const q = $('#pzq.fit-in-sheet', tools);
    if (q) html += `<button type="button" class="fit-sh-give${q.classList.contains('arm') ? ' arm' : ''}">${q.classList.contains('arm') ? 'متأكد؟ اضغط مرة ثانية' : 'استسلم'}</button>`;
    const snd = $('.fit-sound.fit-in-sheet', tools);
    if (snd) html += `<button type="button" class="fit-sh-sound" aria-pressed="${!S.st.mute}">${I_SOUND}<span>${S.st.mute ? 'المؤثرات الصوتية متوقفة' : 'المؤثرات الصوتية تعمل'}</span></button>`;
    return html ? `<div class="fit-sh-extra">${html}</div>` : '';
  }

  // zoom the board until it fits under the HUD; below MIN_ZOOM the board scrolls inside itself
  function fit() {
    raf = 0; if (!body || !body.isConnected || fitting || framed()) return; fitting = true;
    try {
      gardenAmounts(); compactHud();
      const pl = $('#play'); if (pl) pl.scrollTop = 0;
      const bounds = pl.querySelector('.pin').getBoundingClientRect();
      const safe = parseFloat(getComputedStyle(pl.querySelector('.pin')).paddingBottom) || 0;
      const vv = window.visualViewport;
      const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const avail = Math.max(1, Math.min(bounds.bottom - safe, viewportBottom - safe) - body.getBoundingClientRect().top);
      body.style.setProperty('--fit-room', `${avail}px`);
      if ($('.lb[data-layout]', body)) {
        body.classList.remove('fit-large');
        const minHeight = $('.lb[data-layout="adventure"]', body) ? 215 : 200;
        body.style.removeProperty('--fit-z');
        body.style.setProperty('--fit-room', `${Math.max(minHeight, avail - 8)}px`);
        body.style.height = `${avail}px`;
        body.dataset.fitZoom = '1.00';
        body.classList.toggle('fit-scroll', avail < minHeight + 8);
        return;
      }
      const keep = body.scrollTop;
      if (largeView) {
        // Preserve the available phone screen height, but no longer shrink game
        // controls below their native size. Scroll INSIDE the board instead.
        body.style.setProperty('--fit-z', '1');
        body.style.height = `${avail}px`;
        body.dataset.fitZoom = '1.00';
        body.classList.add('fit-scroll', 'fit-large');
        body.scrollTop = keep;
        return;
      }
      body.classList.remove('fit-large');
      const natural = () => { body.scrollTop = 0; const r0 = body.getBoundingClientRect().top; let b = 0; for (const c of body.children) { const r = c.getBoundingClientRect(); if (r.height) b = Math.max(b, r.bottom); } return b - r0 + 4; };
      const floor = ['pz_avsong','pz_ashade'].includes(gid()) ? 1 : ['pz_grid','pz_tpath','pz_door'].includes(gid()) ? 0.85 : MIN_ZOOM;
      let z = 1; body.style.removeProperty('--fit-z'); body.style.height = ''; let need = natural();
      for (let i = 0; i < 5 && need > avail + 1; i++) {
        z = Math.max(floor, Math.min(1, z * avail / need)); body.style.setProperty('--fit-z', String(z)); need = natural();
        if (z === floor) break;
      }
      body.style.height = `${avail / z}px`; body.dataset.fitZoom = z.toFixed(2);
      body.classList.toggle('fit-scroll', need > avail + 1); if (keep) body.scrollTop = keep;
    } finally { fitting = false; }
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(fit); };

  function mount() {
    const b = $('#stage #pzb');
    if (b === body) return;
    if (mo) mo.disconnect(); layoutObserver?.disconnect(); body = b; closeSheet();
    if (!b) { const p = $('#play'); if (p) p.classList.remove('fit'); return; }
    arrange(); hud(); schedule();
    // Observe the viewport-height play container as well: some mobile WebKit resizes
    // change .pin height without changing toolbar dimensions or firing window resize.
    for (const el of $$('#play .pin, #play .pbar, #stage .pzhud, #stage #m')) layoutObserver?.observe(el); setTimeout(() => { hud(); schedule(); }, 120); setTimeout(() => { hud(); schedule(); }, 600);
    setTimeout(() => { if (body === b) bubble(); }, 250);
    mo = new MutationObserver(() => { hud(); pageClues(b); $$('details.ui-rules:not([open])', b).forEach(d => { d.open = true; }); schedule(); });
    mo.observe(b, { childList: true, subtree: true });
    b.addEventListener('load', schedule, true); b.addEventListener('toggle', schedule, true);
  }
  function watch() {
    const st = $('#stage'); if (!st) return setTimeout(watch, 300);
    new MutationObserver(() => mount()).observe(st, { childList: true });
    mount();
  }

  /* ---- page puzzles: Treasure Island stations (#v-puz.t7) and the Expedition side journey (.ex10) ---- */
  const PAGES = [
    { key: 't7', ready: '#v-puz.t7 .t7-puzzle-layout', zoom: '.t7-puzzle-pane', scene: '.t7-puzzle-scene', rule: '.v5-goal', tools: '.t7-tools', title: '#v-puz.t7 .t7-top h1', id: () => 't7:' + txt($('#v-puz.t7 .t7-top h1')) },
    { key: 'ex10', ready: '#v-puz .ex10 .ex10-game-shell', zoom: '.ex10-game-content', scene: '.ex10-game-scene', story: '.ex10-brief', tools: '.ex10-top-right', title: '.ex10-game-top b', id: () => 'ex10:' + txt($('.ex10-game-top b')) }
  ];
  let page = null, pageEl = null, pageRaf = 0;
  function pageSheet(P) {
    closeSheet(); const d = document.createElement('div'); d.className = 'fit-sheet';
    const rule = P.rule ? $$(P.rule).map(txt).filter(Boolean) : [], story = P.story ? $$(P.story).map(txt).filter(Boolean) : [];
    d.innerHTML = `<div class="fit-sheet-card" role="dialog" aria-modal="true"><h3>${txt($(P.title))}</h3>${rule.length ? `<div class="fit-sh-rule"><b>القاعدة</b>${rule.map(r => `<p>${r}</p>`).join('')}</div>` : ''}${story.length ? `<div class="fit-sh-story">${story.map(r => `<p>${r}</p>`).join('')}</div>` : ''}<button class="fit-sh-go" type="button">فهمت</button></div>`;
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('.fit-sh-go')) closeSheet(); });
    document.body.append(d);
  }
  function pageFit() {
    pageRaf = 0; if (!page || !pageEl || !pageEl.isConnected || !pageEl.offsetParent) return;
    const z0 = pageEl; z0.style.removeProperty('--fit-z');
    const top = z0.getBoundingClientRect().top + window.scrollY + document.body.scrollTop, avail = Math.max(200, window.innerHeight - top - 10);
    const nat = () => { let b = 0; for (const c of z0.children) { const r = c.getBoundingClientRect(); if (r.height) b = Math.max(b, r.bottom); } return b - z0.getBoundingClientRect().top + 6; };
    let z = 1, need = nat();
    for (let i = 0; i < 5 && need > avail + 1; i++) { z = Math.max(MIN_ZOOM, Math.min(1, z * avail / need)); z0.style.setProperty('--fit-z', String(z)); need = nat(); if (z === MIN_ZOOM) break; }
    z0.dataset.fitZoom = z.toFixed(2);
  }
  const pageSchedule = () => { if (!pageRaf) pageRaf = requestAnimationFrame(pageFit); };
  function pageMount() {
    const P = PAGES.find(p => $(p.ready));
    const el = P && $(P.zoom, $(P.ready).closest('#v-puz') || document);
    document.documentElement.classList.toggle('fit-page', !!P);
    PAGES.forEach(p => document.documentElement.classList.toggle('fit-' + p.key, p === P));
    if (!P) {
      document.querySelectorAll('.fit-pbubble').forEach(node => node.remove());
      page = pageEl = null;
      return;
    }
    const fresh = el !== pageEl; page = P; pageEl = el;
    const tools = $(P.tools);
    if (tools && !$('.fit-info', tools) && ((P.rule && $(P.rule)) || (P.story && $(P.story)))) {
      const ib = document.createElement('button'); ib.type = 'button'; ib.className = 'fit-info fit-pinfo'; ib.setAttribute('aria-label', 'القاعدة والقصة'); ib.innerHTML = I_INFO; ib.onclick = () => pageSheet(P); tools.prepend(ib);
    }
    if (fresh) {
      if (window.scrollY) window.scrollTo(0, 0); if (document.body.scrollTop) document.body.scrollTop = 0;
      pageSchedule(); setTimeout(pageSchedule, 150); setTimeout(pageSchedule, 700);
      // The full-width automatic rule bubble covered clues and survived a
      // page-to-page transition for up to five seconds. The rules already
      // remain available through the accessible information control above.
      // Never put a transient instruction panel over an active board.
      document.querySelectorAll('.fit-pbubble').forEach(node => node.remove());
      const id = P.id(), r = P.rule && txt($(P.rule));
      if (r && !seen()[id]) markSeen(id);
    } else pageSchedule();
  }
  function pageWatch() {
    const v = $('#v-puz'); if (!v) return setTimeout(pageWatch, 400);
    let t = 0; new MutationObserver(() => { if (!t) t = requestAnimationFrame(() => { t = 0; pageMount(); }); }).observe(v, { childList: true, subtree: true });
    pageMount();
  }
  window.addEventListener('resize', pageSchedule);
  window.addEventListener('resize', schedule); window.addEventListener('orientationchange', () => setTimeout(schedule, 200));
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', schedule); window.visualViewport.addEventListener('resize', pageSchedule); }
  window.fitUI = { fit, openSheet, closeSheet, waterAmount, get body() { return body; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { watch(); pageWatch(); }); else { watch(); pageWatch(); }
})();
