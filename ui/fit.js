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
  const RULE = '.lb-lead,.lb-rule,#pzb .mk-lead,#pzb .pl-lead,details.ui-rules > summary';
  const JOURNAL = '.castle-book-open,.atheran-journal-open';
  const SEEN_KEY = 'mindlab:fit:seen:v1';
  const seen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch (e) { return {}; } };
  const markSeen = id => { try { const s = seen(); s[id] = 1; localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) {} };
  const gid = () => { try { return typeof curGame === 'function' ? (curGame() || {}).id : null; } catch (e) { return null; } };
  const txt = e => (e && e.innerText || '').replace(/\s+/g, ' ').trim();
  const I_INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>';
  const I_BOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z"/><path d="M12 6v13.5"/></svg>';

  let body = null, mo = null, raf = 0, fitting = false, sheetPrevFocus = null;

  function sheetHTML() {
    const story = $$(STORY, body).map(e => { const c = e.cloneNode(true); $$('button', c).forEach(b => b.remove()); return txt(c); }).filter(Boolean);
    const rules = $$(RULE, body).map(e => { const c = e.cloneNode(true); $$('i', c).forEach(i => { if (/التفاصيل/.test(i.textContent)) i.remove(); }); return txt(c).replace(/^القاعدة\s*/, ''); }).filter(Boolean);
    const title = txt($('#pt'));
    const id = gid();
    const hasOpening = !!(id && window.__MINDLAB_OPENINGS_DATA && window.__MINDLAB_OPENINGS_DATA[id] && window.fitOpenings);
    return `<div class="fit-sheet-card" role="dialog" aria-modal="true" aria-label="${title}"><h3>${title}</h3>${rules.length ? `<div class="fit-sh-rule"><b>القاعدة</b>${rules.map(r => `<p>${r}</p>`).join('')}</div>` : ''}${story.length ? `<div class="fit-sh-story">${story.map(s => `<p>${s}</p>`).join('')}</div>` : ''}${hasOpening ? '<button class="fit-sh-replay" type="button">عرض مشهد الافتتاحية</button>' : ''}<button class="fit-sh-go" type="button">فهمت</button></div>`;
  }
  function openSheet() {
    closeSheet(); sheetPrevFocus = document.activeElement;
    const d = document.createElement('div'); d.className = 'fit-sheet'; d.innerHTML = sheetHTML();
    d.addEventListener('click', e => {
      if (e.target.closest('.fit-sh-replay')) { const id = gid(); closeSheet(); if (id && window.fitOpenings) window.fitOpenings.open(id, true); return; }
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
    if (window.__MINDLAB_OPENINGS_DATA && window.__MINDLAB_OPENINGS_DATA[id]) return;
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
    if (!$('.fit-info', tools) && $$(STORY + ',' + RULE, body).length) {
      const ib = document.createElement('button'); ib.type = 'button'; ib.className = 'pzhb fit-info'; ib.id = 'fitinfo'; ib.setAttribute('aria-label', 'القاعدة والقصة'); ib.innerHTML = I_INFO;
      ib.onclick = openSheet; tools.prepend(ib);
    }
    const jb = $(JOURNAL, body);
    if (jb && !$('.fit-journal', tools)) {
      const pb = document.createElement('button'); pb.type = 'button'; pb.className = 'pzhb fit-journal'; pb.setAttribute('aria-label', txt(jb) || 'الدفتر'); pb.innerHTML = I_BOOK;
      const n = (txt(jb).match(/[\d٠-٩]+\s*\/\s*[\d٠-٩]+/) || [])[0]; if (n) pb.insertAdjacentHTML('beforeend', `<i>${n}</i>`);
      pb.onclick = () => jb.click(); (($('.fit-info', tools) || {}).after ? $('.fit-info', tools).after(pb) : tools.prepend(pb));
    }
    const q = $('#pzq'); if (q && q.parentElement !== tools) { q.setAttribute('aria-label', q.textContent.trim() === 'رجوع' ? 'رجوع' : 'استسلم'); tools.append(q); }
    const t = $('#pzt'); if (t && !t.dataset.fit) { t.dataset.fit = '1'; t.addEventListener('click', () => { t.hidden = true; }); }
  }

  function arrange() {
    $$('details.ui-rules', body).forEach(d => { d.open = true; });
    $$('.xpin > h3', body).forEach(h => h.classList.add('fit-dup'));
    $('#play').classList.add('fit');
  }
  const framed = () => { const p = $('#play'); return !p || p.classList.contains('xframe'); };

  // zoom the board until it fits under the HUD; below MIN_ZOOM the board scrolls inside itself
  function fit() {
    raf = 0; if (!body || !body.isConnected || fitting || framed()) return; fitting = true;
    try {
      const pl = $('#play'); if (pl) pl.scrollTop = 0;
      const top = body.getBoundingClientRect().top, safe = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fit-safe-b')) || 0;
      const avail = Math.max(160, window.innerHeight - top - 6 - safe);
      const keep = body.scrollTop;
      const natural = () => { body.scrollTop = 0; const r0 = body.getBoundingClientRect().top; let b = 0; for (const c of body.children) { const r = c.getBoundingClientRect(); if (r.height) b = Math.max(b, r.bottom); } return b - r0 + 4; };
      let z = 1; body.style.removeProperty('--fit-z'); body.style.height = ''; let need = natural();
      for (let i = 0; i < 5 && need > avail + 1; i++) {
        z = Math.max(MIN_ZOOM, Math.min(1, z * avail / need)); body.style.setProperty('--fit-z', String(z)); need = natural();
        if (z === MIN_ZOOM) break;
      }
      body.style.height = `${avail / z}px`; body.dataset.fitZoom = z.toFixed(2);
      body.classList.toggle('fit-scroll', need > avail + 1); if (keep) body.scrollTop = keep;
    } finally { fitting = false; }
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(fit); };

  function mount() {
    const b = $('#stage #pzb');
    if (b === body) return;
    if (mo) mo.disconnect(); body = b; closeSheet();
    if (!b) { const p = $('#play'); if (p) p.classList.remove('fit'); return; }
    arrange(); hud(); schedule(); setTimeout(() => { hud(); schedule(); }, 120); setTimeout(() => { hud(); schedule(); }, 600);
    setTimeout(() => { if (body === b) bubble(); }, 250);
    mo = new MutationObserver(() => { $$('details.ui-rules:not([open])', b).forEach(d => { d.open = true; }); schedule(); });
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
    if (!P) { page = pageEl = null; return; }
    const fresh = el !== pageEl; page = P; pageEl = el;
    const tools = $(P.tools);
    if (tools && !$('.fit-info', tools) && ((P.rule && $(P.rule)) || (P.story && $(P.story)))) {
      const ib = document.createElement('button'); ib.type = 'button'; ib.className = 'fit-info fit-pinfo'; ib.setAttribute('aria-label', 'القاعدة والقصة'); ib.innerHTML = I_INFO; ib.onclick = () => pageSheet(P); tools.prepend(ib);
    }
    if (fresh) {
      if (window.scrollY) window.scrollTo(0, 0); if (document.body.scrollTop) document.body.scrollTop = 0;
      pageSchedule(); setTimeout(pageSchedule, 150); setTimeout(pageSchedule, 700);
      const id = P.id(), r = P.rule && txt($(P.rule));
      if (r && !seen()[id]) { markSeen(id); setTimeout(() => {
        const b = document.createElement('div'); b.className = 'fit-bubble fit-pbubble'; b.innerHTML = `<span>${I_INFO}</span><p>${r}</p>`;
        b.style.setProperty('--fit-bt', `${Math.max(8, Math.round(el.getBoundingClientRect().top))}px`); document.body.append(b);
        const off = () => { b.classList.add('gone'); setTimeout(() => b.remove(), 300); document.removeEventListener('pointerdown', off, true); };
        setTimeout(() => document.addEventListener('pointerdown', off, true), 50); setTimeout(off, 5000);
      }, 200); }
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
  window.fitUI = { fit, openSheet, closeSheet, get body() { return body; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { watch(); pageWatch(); }); else { watch(); pageWatch(); }
})();
