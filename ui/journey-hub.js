/* 5.5.28 — Unified Journey Map Hub («رحلة الكنز»), 46 Non-Library Openings (21 Treasure + 25 Side-Journey),
   12 Transitions Viewer, and Priority 7 / Four Puzzles Board Art Accents.
   Presentation only: never alters save keys, puzzle rules, or secret-world unlock gating. */
(function () {
  'use strict';
  if (window.__MINDLAB_JOURNEY_HUB) return;
  window.__MINDLAB_JOURNEY_HUB = true;

  const SEEN_KEY = 'mindlab:openings:journey:v1';
  const TRANSITIONS_KEY = 'mindlab:transitions:seen:v1';

  const $ = (s, r = document) => r.querySelector(s);
  const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch (_) { return {}; } };
  const markSeen = k => { try { const s = readSeen(); s[k] = 1; localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (_) {} };

  function bgPos(rect) {
    if (!rect) return '0% 0%';
    const dx = 1 - (rect.width || 0.5);
    const dy = 1 - (rect.height || 0.2);
    const px = dx > 0 ? Math.round((rect.x / dx) * 100) : 0;
    const py = dy > 0 ? Math.round((rect.y / dy) * 100) : 0;
    return `${px}% ${py}%`;
  }
  function bgSize(rect) {
    if (!rect) return '200% 600%';
    return `${Math.round(100 / (rect.width || 0.5))}% ${Math.round(100 / (rect.height || 0.2))}%`;
  }

  function readProgressSummary() {
    let seaDone = 0;
    let atheranDone = 0;
    let secretsUnlocked = 0;
    try {
      if (window.T7) seaDone = Object.values(window.T7.state().done).filter(Boolean).length;
      if (window.ATHERAN_CAMPAIGN) {
        const summary = window.ATHERAN_CAMPAIGN.summary();
        atheranDone = summary.done;
        secretsUnlocked = summary.found;
      }
    } catch (_) {}
    return { seaDone, atheranDone, secretsUnlocked };
  }

  // Derive discovery from campaign progress, never from presentation/seen flags.
  function discoveredTransitions() {
    const data = window.__MINDLAB_JOURNEY_STORY;
    if (!data) return [];
    let completed = 0, atlasOpen = false, returned = false;
    try {
      const sea = window.T7 && T7.state();
      const stations = window.T7 && T7.data.stations;
      while (stations && completed < stations.length && sea.done[stations[completed].id]) completed++;
      const atlas = window.ATHERAN_CAMPAIGN && window.ATHERAN_CAMPAIGN.summary();
      atlasOpen = !!atlas?.open;
      returned = !!atlas && atlas.done === 21 && atlas.cleared === 5;
    } catch (_) {}
    const thresholds = {departure: 0, coral_light: 3, mist_bells: 6, oasis_water: 9,
      ice_observatory: 12, wind_engine: 15, moon_vow: 18, eighth_route: 21, letter: 21, palace: 21};
    return data.transitions.filter(t => t.id === 'atheran' ? atlasOpen :
      t.id === 'return' ? returned : Object.hasOwn(thresholds, t.id) && completed >= thresholds[t.id]);
  }
  function transitionSeen() {
    try { const v = JSON.parse(localStorage.getItem(TRANSITIONS_KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
    catch (_) { return {}; }
  }
  function markTransition(id) {
    try { const s = transitionSeen(); s[id] = true; localStorage.setItem(TRANSITIONS_KEY, JSON.stringify(s)); } catch (_) {}
  }
  function showMilestone(ids, after) {
    const seen = transitionSeen();
    const fresh = discoveredTransitions().filter(t => ids.includes(t.id) && !seen[t.id]);
    if (fresh.length) return openTransitionsModal(0, after, fresh.map(t => t.id));
    if (after) after();
  }

  function openTransitionsModal(startIdx = 0, after, onlyIds) {
    const data = window.__MINDLAB_JOURNEY_STORY;
    const available = discoveredTransitions().filter(t => !onlyIds || onlyIds.includes(t.id));
    if (!data || !available.length) { if (after) after(); return; }
    const prev = document.activeElement;
    let idx = Math.max(0, Math.min(available.length - 1, Number(startIdx) || 0));
    const old = $('#mlj-tr-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'mlj-tr-modal';
    modal.className = 'mlj-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'مشاهد الرحلة المكتشفة');

    const atlasUrl = new URL(data.transitionsAtlas, document.baseURI).href;
    function close() {
      modal.remove();
      if (after) { after(); return; }
      if (prev && typeof prev.focus === 'function' && prev.isConnected) {
        try { prev.focus({ preventScroll: true }); } catch (_) {}
      }
    }
    function render() {
      const t = available[idx];
      markTransition(t.id);
      modal.dataset.transition = t.id;
      modal.innerHTML = `
        <div class="mlj-modal-card">
          <div class="mlj-head">
            <h2>${t.title}</h2>
            <span class="mlj-pill">${idx + 1} / ${available.length}</span>
          </div>
          <div class="mlj-tr-scene" role="img" aria-label="${t.title}" aria-busy="true" style="background-image:url('${atlasUrl}');background-size:${bgSize(t.rect)};background-position:${bgPos(t.rect)}"><span>جارٍ تحميل المشهد…</span></div>
          <div class="fit-opening-bubble">
            <span class="fit-opening-speaker">${t.speaker}</span>
            <span>${t.dialogue}</span>
          </div>
          <div class="mlj-tr-nav">
            <button type="button" id="mlj-tr-prev" ${idx === 0 ? 'disabled' : ''}>السابق</button>
            <button type="button" id="mlj-tr-next" ${idx === available.length - 1 ? 'disabled' : ''}>التالي</button>
            <button type="button" class="mlj-tr-close" id="mlj-tr-close">${after ? 'متابعة الرحلة' : 'إغلاق'}</button>
          </div>
        </div>
      `;
      const preview = $('.mlj-tr-scene', modal), preload = new Image();
      preload.onload = () => { if (preview.isConnected) { preview.textContent = ''; preview.removeAttribute('aria-busy'); } };
      preload.onerror = () => { if (preview.isConnected) { preview.textContent = 'تعذّر تحميل الرسم. يمكنك متابعة النص.'; preview.removeAttribute('aria-busy'); } };
      preload.src = atlasUrl;
      const p = $('#mlj-tr-prev', modal), n = $('#mlj-tr-next', modal), c = $('#mlj-tr-close', modal);
      if (p) p.onclick = () => { if (idx > 0) { idx--; render(); } };
      if (n) n.onclick = () => { if (idx < available.length - 1) { idx++; render(); } };
      if (c) {
        c.onclick = () => {
          if (onlyIds && idx < available.length - 1) { idx++; render(); }
          else close();
        };
        c.focus({ preventScroll: true });
      }
    }
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const controls = [...modal.querySelectorAll('button:not([disabled])')];
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.body.append(modal);
    render();
  }

  // Use the existing playable atlas for each chapter. Palace alone lacks a chapter
  // atlas in the legacy engine, so display its illustrated station map here.
  function openPalaceMap() {
    const sections = window.LA && typeof LA.librarySections === 'function' ? LA.librarySections() : [];
    const section = sections.find(([name]) => name === 'قصر المرايا');
    const stations = section && section[1];
    if (!stations || !stations.length) {
      console.warn('[MindLab] Palace stations unavailable; chapter map was not opened.');
      return false;
    }
    const previous = document.activeElement;
    const old = $('#mlj-palace-map');
    if (old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'mlj-palace-map';
    modal.className = 'mlj-modal mlj-palace-map';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'خريطة فصل قصر المرايا');
    modal.innerHTML = '<section class="mlj-modal-card mlj-palace-card">' +
      '<div class="mlj-head"><h2>قصر المرايا · خريطة المحطات</h2>' +
      '<button class="mlj-palace-close" type="button" aria-label="إغلاق خريطة قصر المرايا">إغلاق</button></div>' +
      '<div class="mlj-palace-scene" role="img" aria-label="رسم قصر المرايا"></div>' +
      '<p class="mlj-palace-note">اختر محطة لفتح لغزها من المكتبة. تقدمك محفوظ كما هو.</p>' +
      '<div class="mlj-palace-stations" role="group" aria-label="محطات قصر المرايا"></div></section>';
    const slots = $('.mlj-palace-stations', modal);
    stations.forEach((p, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mlj-palace-station';
      button.dataset.mljPuzzle = p.id;
      const num = document.createElement('span');
      num.className = 'mlj-palace-number';
      num.textContent = i + 1;
      const label = document.createElement('span');
      label.textContent = p.name;
      button.append(num, label);
      slots.append(button);
    });
    function close() {
      modal.remove();
      if (previous && previous.isConnected && typeof previous.focus === 'function')
        previous.focus({ preventScroll: true });
    }
    $('.mlj-palace-close', modal).onclick = close;
    modal.querySelectorAll('[data-mlj-puzzle]').forEach(button => {
      button.onclick = () => {
        const id = button.dataset.mljPuzzle;
        close();
        // Route through the original library tile to preserve level/save/lock rules.
        const tile = palaceTile(id);
        if (tile) tile.click();
        else console.warn('[MindLab] Palace puzzle launcher unavailable:', id);
      };
    });
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const targets = [...modal.querySelectorAll('button:not([disabled])')];
        if (!targets.length) return;
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    });
    document.body.append(modal);
    $('.mlj-palace-close', modal).focus({ preventScroll: true });
    return true;
  }

  function triggerChapter(chId) {
    if (chId === 'seven_seas') {
      if (window.T7 && typeof T7.map === 'function') showMilestone(['departure'], () => T7.map());
    } else if (chId === 'palace') {
      showMilestone(['palace'], openPalaceMap);
    } else if (chId === 'atheran') {
      if (window.ATHERAN_CAMPAIGN && typeof window.ATHERAN_CAMPAIGN.open === 'function')
        showMilestone(['atheran'], () => window.ATHERAN_CAMPAIGN.open());
    } else if (chId === 'side') {
      // perf-cleanup: the side journey's code is loaded on demand (window.mindlabSide); wait for it once.
      const openSide = () => {
        if (window.ML10 && typeof window.ML10.renderMap === 'function') window.ML10.renderMap();
        else $('#v-puz .ex10-launch-go')?.click();
      };
      if (window.ML10) openSide(); else sideReady().then(openSide);
    }
  }

  function mountLegacyHub() {
    const v = $('#v-puz');
    const entry = v && $('.v5-hubcard', v);
    if (!entry || !$('.v5-hublib', v) || v.classList.contains('ah-view')) return;
    if ($('#mlj-unified-hub', v)) return;
    const data = window.__MINDLAB_JOURNEY_STORY;
    if (!data) return;

    const prog = readProgressSummary();
    const mapUrl = new URL(data.mapImage, document.baseURI).href;
    const official = data.chapters.filter(c => c.id !== 'side');
    const side = data.chapters.find(c => c.id === 'side');

    const sec = document.createElement('section');
    sec.id = 'mlj-unified-hub';
    sec.className = 'mlj-hub mlj-atlas-dialog';
    sec.setAttribute('aria-label', data.journeyTitle);
    sec.innerHTML = `
      <div class="mlj-head">
        <h2>${data.journeyTitle}</h2>
        <button type="button" class="mlj-atlas-close" id="mlj-close-atlas">إغلاق الخريطة</button>
      </div>
      <div class="mlj-map-wrap">
        <img class="mlj-map-img" src="${mapUrl}" alt="خريطة ${data.journeyTitle}" loading="lazy">
        ${data.chapters.map(c => `<button type="button" class="mlj-pin" data-mlj-ch="${c.id}" style="left:${Math.round(c.x * 100)}%;top:${Math.round(c.y * 100)}%">${c.name}</button>`).join('')}
      </div>
      <div class="mlj-chapters">
        ${official.map(c => `
          <button type="button" class="mlj-ch-card" data-mlj-ch="${c.id}">
            <span class="mlj-ch-order">الفصل ${c.order}</span>
            <span class="mlj-ch-name">${c.name}</span>
            <span class="mlj-ch-meta">${c.stationCount} محطة</span>
          </button>`).join('')}
        ${side ? `
          <button type="button" class="mlj-ch-card mlj-side-card" data-mlj-ch="side">
            <span class="mlj-ch-order">فرع مستقل</span>
            <span class="mlj-ch-name">${side.name}</span>
            <span class="mlj-ch-meta">${side.stationCount} محطة · حفظ مستقل</span>
          </button>` : ''}
      </div>
      <div class="mlj-foot">
        <button type="button" class="mlj-trans-btn" id="mlj-open-trans">مشاهد الرحلة (${discoveredTransitions().length})</button>
        <span class="mlj-pill">البحار السبعة: ${prog.seaDone} / 21</span>
        <span class="mlj-pill">أَثْرَان: ${prog.atheranDone} / 21</span>
        <span class="mlj-pill">${prog.secretsUnlocked > 0 ? `عوالم سرية مكتشفة: ${prog.secretsUnlocked} / 5` : 'العوالم السرية محجوبة حتى اكتشافها'}</span>
      </div>
    `;

    // Keep the existing chapter engines and save keys; only their entry is replaced.
    const launch = document.createElement('button');
    launch.type = 'button';
    launch.id = 'mlj-journey-entry';
    launch.className = 'mlj-journey-entry';
    launch.setAttribute('aria-label', 'رحلة الكنز: افتح الخريطة حسب ترتيب الفصول');
    launch.setAttribute('aria-expanded', 'false');
    launch.innerHTML = '<span class="mlj-entry-copy"><small>المغامرة الرسمية · ثلاثة فصول</small><strong>رحلة الكنز</strong>' +
      '<span>البحار السبعة ' + prog.seaDone + '/21 · أَثْرَان ' + prog.atheranDone + '/21</span></span>' +
      '<span class="mlj-entry-action">افتح الخريطة ←</span>';

    // Progress labels mirror the existing engines; a locked chapter remains visible but cannot bypass its rules.
    try {
      const campaign = window.ATHERAN_CAMPAIGN && window.ATHERAN_CAMPAIGN.summary();
      const palace = sec.querySelector('.mlj-ch-card[data-mlj-ch="palace"] .mlj-ch-meta');
      const atheran = sec.querySelector('.mlj-ch-card[data-mlj-ch="atheran"]');
      const side = sec.querySelector('.mlj-ch-card[data-mlj-ch="side"] .mlj-ch-meta');
      if (campaign && palace) palace.textContent = campaign.palace + ' / 19 محطة';
      if (campaign && atheran && !campaign.open) {
        atheran.dataset.locked = 'true';
        atheran.querySelector('.mlj-ch-meta').textContent = 'مقفلة حتى إكمال قصر المرايا';
      }
      if (side && window.ML10) {
        const saved = window.ML10.state();
        side.textContent = Object.values(saved.done || {}).filter(Boolean).length + ' / 25 محطة · حفظ مستقل';
      }
    } catch (_) {}
    
    // Make the existing illustrated hub a true dialog rather than a very long inline card.
    const content = document.createElement('div');
    content.className = 'mlj-atlas-content';
    while (sec.firstChild) content.appendChild(sec.firstChild);
    sec.appendChild(content);
    sec.hidden = true;
    sec.setAttribute('role', 'dialog');
    sec.setAttribute('aria-modal', 'true');
    sec.setAttribute('aria-label', 'خريطة رحلة الكنز');
    sec.querySelectorAll('.mlj-pin').forEach(pin => {
      const chapter = data.chapters.find(c => c.id === pin.dataset.mljCh);
      if (!chapter) return;
      pin.setAttribute('aria-label', chapter.order ? 'الفصل ' + chapter.order + ': ' + chapter.name : 'رحلة جانبية: ' + chapter.name);
      pin.textContent = chapter.order || 'فرعي';
      if (chapter.id === 'side') pin.classList.add('mlj-side-pin');
    });
    function closeAtlas(restoreFocus = true) {
      sec.hidden = true;
      launch.setAttribute('aria-expanded', 'false');
      if (restoreFocus && launch.isConnected) launch.focus({ preventScroll: true });
    }
    launch.onclick = () => {
      sec.hidden = false;
      launch.setAttribute('aria-expanded', 'true');
      $('#mlj-close-atlas', sec).focus({ preventScroll: true });
    };
    $('#mlj-close-atlas', sec).onclick = () => closeAtlas();
    const trBtn = $('#mlj-open-trans', sec);
    if (trBtn) trBtn.onclick = () => { closeAtlas(false); openTransitionsModal(0); };
    sec.querySelectorAll('[data-mlj-ch]').forEach(b => {
      b.onclick = () => { closeAtlas(false); triggerChapter(b.dataset.mljCh); };
    });
    sec.addEventListener('click', e => { if (e.target === sec) closeAtlas(); });
    sec.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); closeAtlas(); }
      if (e.key === 'Tab') {
        const targets = [...sec.querySelectorAll('button:not([disabled])')];
        const first = targets[0], last = targets[targets.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    v.classList.add('mlj-single-entry');
    ($('.t7-top', v) || entry).after(launch);
    launch.after(sec);
  }

  const artV3 = 'ui/designs_art/journey/v3/';
  const stationLabels = { done: 'مكتملة', current: 'متاحة', locked: 'مقفلة' };
  const chapterIcons = {
    seven_seas: 'chapters/ch1_seven_seas.webp',
    palace: 'chapters/ch2_mirror_palace.webp',
    atheran: 'chapters/ch3_atheran.webp',
    side: 'markers/marker_side.webp'
  };
  let lastStationId = null;
  let previousStationStatuses = null;
  const newlyCompletedStations = new Set();

  function palaceTile(id) {
    const find = () => [...document.querySelectorAll('#v-puz [data-legacy-puzzle]')]
      .find(tile => tile.dataset.legacyPuzzle === id);
    let tile = find();
    if (!tile && typeof window.LA?.library === 'function') {
      LA.library();
      tile = find();
    }
    return tile;
  }

  function renderRunOpening(id, host, start) {
    const station = window.__MINDLAB_JOURNEY_MAP?.stations.find(s => s.id === id);
    if (!station) return false;
    host.innerHTML = `<article class="mlj-v3-opening">
      <div class="mlj-v3-opening-art mlj-v3-opening-art--plain"><img alt=""></div>
      <div class="mlj-v3-opening-text"><h2></h2><p><strong></strong> <span></span></p>
      <button type="button" class="go-btn" id="go">ابدأ اللغز</button></div>
    </article>`;
    const art = $('.mlj-v3-opening-art', host);
    $('img', art).src = artV3 + 'heroes/' + station.hero + '.webp';
    $('.mlj-v3-opening h2', host).textContent = station.title;
    $('.mlj-v3-opening strong', host).textContent = station.heroName + ' ·';
    $('.mlj-v3-opening span', host).textContent = station.openingTextAr;
    const button = $('#go', host);
    button.onclick = start;
    button.focus({ preventScroll: true });
    return true;
  }

  // The side journey (expedition10) is loaded on demand by ui/app.js; resolves at once when it is already here.
  const sideReady = () => (window.ML10 ? Promise.resolve() : window.mindlabSide ? window.mindlabSide.start() : Promise.resolve());

  function openStation(station) {
    const index = station.order - 1;
    if (station.chapter === 'palace') {
      palaceTile(station.id)?.onclick({ journeyStation: true });
    } else if (station.chapter === 'atheran') {
      window.ATHERAN_CAMPAIGN?.openJourneyStation(index);
    } else {
      const sea = station.chapter === 'seven_seas';
      if (!sea && !window.ML10) { sideReady().then(() => { if (window.ML10) openStation(station); }); return; }
      if (!(sea ? window.T7?.unlocked(index) : window.ML10?.unlocked(index))) return;
      showStationOpening(`${sea ? 't7' : 'ex10'}:${station.id}`, {
        title: station.title,
        badge: station.region,
        heroName: station.heroName,
        dialogue: station.openingTextAr,
        sprite: artV3 + 'heroes/' + station.hero + '.webp'
      }, () => sea ? T7.open(index, true) : ML10.openFromJourney(index));
    }
  }

  function mountUnifiedHub() {
    const data = window.__MINDLAB_JOURNEY_MAP;
    if (!data) return mountLegacyHub();
    const v = $('#v-puz');
    const entry = v && $('.v5-hubcard', v);
    if (!entry || !$('.v5-hublib', v) || v.classList.contains('ah-view') || $('#mlj-unified-hub', v)) return;

    const launch = document.createElement('button');
    launch.type = 'button';
    launch.id = 'mlj-journey-entry';
    launch.className = 'mlj-journey-entry';
    launch.setAttribute('aria-expanded', 'false');
    launch.innerHTML = '<strong>رحلة الكنز</strong><span class="mlj-entry-action">افتح الخريطة</span>';

    const atlas = document.createElement('section');
    atlas.id = 'mlj-unified-hub';
    atlas.className = 'mlj-atlas-dialog mlj-v3-atlas';
    atlas.hidden = true;
    atlas.setAttribute('role', 'dialog');
    atlas.setAttribute('aria-modal', 'true');
    atlas.setAttribute('aria-label', 'خريطة رحلة الكنز');
    atlas.innerHTML = `
      <div class="mlj-v3-content">
        <header class="mlj-v3-head">
          <h2>رحلة الكنز</h2><button id="mlj-close-atlas" type="button">إغلاق</button>
        </header>
        <nav class="mlj-v3-chapters" aria-label="فصول الرحلة"></nav>
        <div class="mlj-v3-map-scroll"><div class="mlj-v3-map">
          <img class="mlj-map-img" src="${artV3}map/world_map_vertical.webp" alt="الخريطة الكبرى لرحلة الكنز" width="1152" height="2064">
          <canvas class="mlj-v3-trail" aria-hidden="true"></canvas>
          <div class="mlj-v3-markers"></div>
        </div></div>
        <footer class="mlj-v3-tools">
          <button id="mlj-v3-compass" type="button" aria-label="العودة إلى المحطة الحالية"><img alt="" src="${artV3}ui/btn_compass_return.webp"></button>
          <button id="mlj-v3-overview" type="button">عرض التجمعات</button>
          <button id="mlj-open-trans" type="button">مشاهد الرحلة</button>
          <details class="mlj-v3-extras"><summary>دفتر الرحلة</summary><div></div></details>
        </footer>
        <section class="mlj-v3-preview" hidden aria-label="معاينة المحطة">
          <strong></strong><small></small><div>
            <button type="button" class="mlj-v3-start">ابدأ</button>
            <button type="button" class="mlj-v3-dismiss">رجوع</button>
          </div>
        </section>
      </div>`;

    const scroll = $('.mlj-v3-map-scroll', atlas);
    const map = $('.mlj-v3-map', atlas);
    const markers = $('.mlj-v3-markers', atlas);
    const preview = $('.mlj-v3-preview', atlas);
    const close = $('#mlj-close-atlas', atlas);
    const toggle = $('#mlj-v3-overview', atlas);
    const extras = $('.mlj-v3-extras', atlas);
    let expanded = false;
    let selectedPin;
    let statuses;

    function center(point, behavior = 'auto') {
      scroll.scrollTo({
        left: point.x * map.clientWidth - scroll.clientWidth / 2,
        top: point.y * map.clientHeight - scroll.clientHeight / 2,
        behavior
      });
    }

    function dismissPreview(restoreFocus = false) {
      preview.hidden = true;
      if (restoreFocus) selectedPin?.focus({ preventScroll: true });
    }

    function closeAtlas() {
      atlas.hidden = true;
      launch.setAttribute('aria-expanded', 'false');
      dismissPreview();
      launch.focus({ preventScroll: true });
    }

    function refreshProgress() {
      const sea = window.T7?.state();
      const side = window.ML10?.state();
      const campaign = window.ATHERAN_CAMPAIGN?.summary();
      const palaceDone = typeof pState === 'function' ? pState().done : {};
      const completed = { seven_seas: sea?.done, side: side?.done, palace: palaceDone, atheran: campaign?.a.done };
      const canOpen = {
        seven_seas: i => window.T7?.unlocked(i),
        side: i => window.ML10?.unlocked(i),
        palace: () => true,
        atheran: i => window.ATHERAN_CAMPAIGN?.canOpenStation(i)
      };
      statuses = new Map(data.stations.map(st => {
        const allowed = canOpen[st.chapter](st.order - 1);
        const done = completed[st.chapter]?.[st.id];
        return [st.id, !allowed ? 'locked' : done ? 'done' : 'current'];
      }));

      if (previousStationStatuses) for (const [id, status] of statuses) {
        if (status === 'done' && previousStationStatuses.get(id) !== 'done') newlyCompletedStations.add(id);
      }
      previousStationStatuses = statuses;

      const list = $('div', extras);
      list.replaceChildren();
      const actions = window.ATHERAN_CAMPAIGN?.journeyActions() || [];
      if (sea) {
        actions.unshift({ label: 'كنوز البحار', open: () => T7.openJournal('treasures') });
        const discovered = T7.data.secrets.filter(secret => sea.bonus[secret.id]);
        for (const secret of discovered) {
          actions.push({ label: secret.collectible, open: () => { closeAtlas(); T7.openSecret(secret.ch, true); } });
        }
        if (sea.done.sea7_20) actions.push({ label: 'رسالة الجد', open: () => { closeAtlas(); T7.openFinaleFromJourney(); } });
      }
      actions.forEach(action => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = action.label;
        button.onclick = () => { extras.open = false; closeAtlas(); action.open(); };
        list.append(button);
      });
      extras.hidden = actions.length === 0;
    }

    function showPreview(st, pin) {
      const status = statuses.get(st.id);
      selectedPin = pin;
      preview.hidden = false;
      $('strong', preview).textContent = st.title;
      $('small', preview).textContent = `${st.region} · ${stationLabels[status]}`;
      const play = $('.mlj-v3-start', preview);
      play.hidden = status === 'locked';
      play.onclick = () => {
        lastStationId = st.id;
        dismissPreview(true);
        if (st.chapter === 'palace' || st.chapter === 'atheran') closeAtlas();
        const milestone = { seven_seas: 'departure', palace: 'palace', atheran: 'atheran' }[st.chapter];
        const start = () => openStation(st);
        if (milestone) showMilestone([milestone], start);
        else start();
      };
      (play.hidden ? $('.mlj-v3-dismiss', preview) : play).focus({ preventScroll: true });
    }

    const trail = $('.mlj-v3-trail', atlas);
    let trailFrame = 0;
    function drawTrail(width) {
      if (trailFrame) cancelAnimationFrame(trailFrame);
      trail.hidden = !expanded;
      if (!expanded) return;
      const height = width * 2064 / 1152;
      const density = Math.min(2, window.devicePixelRatio || 1);
      trail.width = Math.ceil(width * density);
      trail.height = Math.ceil(height * density);
      const pen = trail.getContext('2d');
      if (!pen) return;
      pen.scale(density, density);
      const segments = [];
      for (let i = 1; i < data.stations.length; i++) {
        const from = data.stations[i - 1], to = data.stations[i];
        if (from.chapter !== to.chapter || statuses.get(from.id) !== 'done' || statuses.get(to.id) === 'locked') continue;
        segments.push({ from, to, fresh: newlyCompletedStations.has(from.id) });
      }
      const moving = segments.some(segment => segment.fresh) && !matchMedia('(prefers-reduced-motion: reduce)').matches;

      function draw(reveal) {
        pen.clearRect(0, 0, width, height);
        pen.lineCap = 'round';
        for (const { from, to, fresh } of segments) {
          const x = from.x * width, y = from.y * height;
          const dx = (to.x - from.x) * width, dy = (to.y - from.y) * height;
          const amount = fresh ? reveal : 1;
          const distance = Math.hypot(dx, dy);
          if (amount * distance < 1) continue;
          const bend = Math.max(-12, Math.min(12, dy / 9));
          pen.beginPath();
          pen.moveTo(x, y);
          pen.quadraticCurveTo(x + dx * amount / 2 + bend * amount, y + dy * amount / 2, x + dx * amount, y + dy * amount);
          pen.setLineDash([5, 8]);
          pen.lineWidth = 5;
          pen.strokeStyle = '#fff5d6';
          pen.stroke();
          pen.lineWidth = 2.5;
          pen.strokeStyle = from.chapter === 'side' ? '#92512c' : '#21575a';
          pen.stroke();
        }
      }
      if (!moving) {
        draw(1);
        segments.forEach(({from}) => newlyCompletedStations.delete(from.id));
        return;
      }
      const start = performance.now();
      const tick = time => {
        if (atlas.hidden || !atlas.isConnected) { trailFrame = 0; return; }
        const progress = Math.min(1, (time - start) / 620);
        draw(1 - (1 - progress) ** 2);
        if (progress < 1) trailFrame = requestAnimationFrame(tick);
        else {
          trailFrame = 0;
          segments.forEach(({from}) => newlyCompletedStations.delete(from.id));
        }
      };
      trailFrame = requestAnimationFrame(tick);
    }

    function renderMap(point) {
      const width = Math.max(320, scroll.clientWidth);
      const vp = data.viewports.find(size => width <= size.mapWidth);
      const artworkWidth = expanded ? Math.max(600, Math.round(width * (vp?.expandedZoom || 1))) : width;
      map.style.width = artworkWidth + 'px';
      drawTrail(artworkWidth);
      const currentId = currentStation()?.id;
      toggle.textContent = expanded ? 'عرض التجمعات' : 'عرض المحطات';
      toggle.setAttribute('aria-pressed', String(expanded));
      markers.replaceChildren();
      for (const item of expanded ? data.stations : data.clusters) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = expanded ? 'mlj-v3-pin' : 'mlj-v3-cluster';
        button.dataset.chapter = item.chapter;
        button.style.left = item.x * 100 + '%';
        button.style.top = item.y * 100 + '%';
        const icon = document.createElement('img');
        icon.alt = '';
        if (expanded) {
          const status = statuses.get(item.id);
          button.dataset.stationId = item.id;
          button.dataset.status = status;
          if (status === 'current' && item.id === currentId) button.setAttribute('aria-current', 'step');
          button.setAttribute('aria-label', `${item.title}، ${stationLabels[status]}`);
          icon.src = artV3 + (item.chapter === 'side' ? chapterIcons.side : `markers/marker_${status === 'done' ? 'completed' : status}.webp`);
          if (item.chapter === 'side') {
            const badge = document.createElement('span');
            badge.setAttribute('aria-hidden', 'true');
            badge.textContent = { done: '★', current: '●', locked: '🔒' }[status];
            button.append(badge);
          }
          button.onclick = () => showPreview(item, button);
        } else {
          icon.src = artV3 + chapterIcons[item.chapter];
          const label = document.createElement('span');
          label.textContent = item.label;
          button.append(label);
          button.onclick = () => {
            expanded = true;
            const group = data.stations.filter(st => st.clusterGroup === item.id);
            const midpoint = {
              x: group.reduce((sum, st) => sum + st.x, 0) / group.length,
              y: group.reduce((sum, st) => sum + st.y, 0) / group.length
            };
            renderMap(midpoint);
            markers.querySelector(`[data-station-id="${group[0].id}"]`)?.focus({ preventScroll: true });
          };
        }
        button.prepend(icon);
        markers.append(button);
      }
      if (point) center(point);
    }

    const chapters = $('.mlj-v3-chapters', atlas);
    for (const chapter of window.__MINDLAB_JOURNEY_STORY.chapters.filter(ch => ch.id !== 'side')) {
      const button = document.createElement('button');
      button.type = 'button';
      const icon = document.createElement('img');
      icon.src = artV3 + chapterIcons[chapter.id];
      icon.alt = '';
      button.append(icon, chapter.name);
      button.onclick = () => {
        dismissPreview();
        center(data.clusters.find(cluster => cluster.chapter === chapter.id), 'smooth');
      };
      chapters.append(button);
    }

    function currentStation() {
      const last = data.stations.find(st => st.id === lastStationId);
      return data.stations.find(st => st.chapter === (last?.chapter || 'seven_seas') && statuses.get(st.id) === 'current') || last || data.stations[0];
    }
    launch.onclick = () => {
      atlas.hidden = false;
      launch.setAttribute('aria-expanded', 'true');
      expanded = !!lastStationId;
      refreshProgress();
      const recent = data.stations.find(st => st.id === lastStationId);
      renderMap(recent && statuses.get(recent.id) !== 'done' ? recent : currentStation());
      close.focus({ preventScroll: true });
    };
    close.onclick = closeAtlas;
    toggle.onclick = () => {
      const midpoint = { x: (scroll.scrollLeft + scroll.clientWidth / 2) / map.clientWidth,
        y: (scroll.scrollTop + scroll.clientHeight / 2) / map.clientHeight };
      expanded = !expanded;
      dismissPreview();
      renderMap(midpoint);
    };
    $('#mlj-v3-compass', atlas).onclick = () => { expanded = true; dismissPreview(); renderMap(currentStation()); };
    $('#mlj-open-trans', atlas).onclick = () => openTransitionsModal();
    $('.mlj-v3-dismiss', preview).onclick = () => dismissPreview(true);
    atlas.addEventListener('click', e => { if (e.target === atlas) closeAtlas(); });
    atlas.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); if (preview.hidden) closeAtlas(); else dismissPreview(true); }
      if (e.key !== 'Tab') return;
      const buttons = [...atlas.querySelectorAll('button, summary')].filter(el => el.getClientRects().length && !el.disabled);
      const first = buttons[0], last = buttons.at(-1);
      if ((e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === last)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    });
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => { if (!atlas.hidden) renderMap(); });
      observer.observe(scroll);
      atlas.addEventListener('mlj:remove', () => observer.disconnect(), { once: true });
    }
    v.classList.add('mlj-single-entry');
    ($('.t7-top', v) || entry).after(launch);
    launch.after(atlas);
  }

  function returnToMap() {
    mountUnifiedHub();
    if (!$('#mlj-journey-entry') && window.T7) { T7.hub(); mountUnifiedHub(); }
    $('#mlj-journey-entry')?.click();
  }

  /* ---- 46 Non-Library Openings (21 Treasure Island + 25 Side Journey) ---- */
  function showStationOpening(key, info, start) {
    const prev = document.activeElement;
    const old = $('#fit-opening-overlay');
    if (old) old.remove();


    const ov = document.createElement('div');
    ov.id = 'fit-opening-overlay';
    ov.className = 'fit-opening-overlay' + (info.sprite ? ' mlj-v3-opening-overlay' : '');
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', info.title);
    ov.innerHTML = `
      <div class="fit-opening-card">
        <div class="fit-opening-scene fit-opening-scene--plain">
          <span class="fit-opening-badge">${info.badge}</span>
          ${info.sprite ? `<img class="mlj-v3-opening-person" src="${info.sprite}" alt="">` : window.fitOpenings.crewMarkup(info.hero, info.expr)}
        </div>
        <div class="fit-opening-body">
          <h3 class="fit-opening-title">${info.title}</h3>
          <div class="fit-opening-bubble">
            <span class="fit-opening-speaker">${info.heroName}</span>
            <span>${info.dialogue}</span>
          </div>
          <div class="fit-opening-actions">
            <button type="button" class="fit-op-start" id="fit-op-start">ابدأ اللغز</button>
            <button type="button" class="fit-op-skip" id="fit-op-skip">رجوع</button>
          </div>
        </div>
      </div>
    `;

    const dismiss = (event, play) => {
      event.preventDefault();
      event.stopPropagation();
      ov.remove();
      if (play) {
        markSeen(key);
        start();
        return;
      }
      if (prev && typeof prev.focus === 'function' && prev.isConnected) {
        try { prev.focus({ preventScroll: true }); } catch (_) {}
      }
    };
    ov.addEventListener('pointerdown', e => { if (e.target === ov) e.stopPropagation(); });
    ov.addEventListener('click', e => { if (e.target === ov) dismiss(e, false); });
    const sBtn = $('#fit-op-start', ov), back = $('#fit-op-skip', ov);
    ov.addEventListener('keydown', e => {
      if (e.key === 'Escape') dismiss(e, false);
      if (e.key === 'Tab' && ((e.shiftKey && document.activeElement === sBtn) || (!e.shiftKey && document.activeElement === back))) {
        e.preventDefault();
        (e.shiftKey ? back : sBtn).focus();
      }
    });
    document.body.append(ov);
    sBtn.onclick = e => dismiss(e, true);
    back.onclick = e => dismiss(e, false);
    sBtn.focus({ preventScroll: true });
  }

  function beforeStation(id, scene, start) {
    const story = window.__MINDLAB_JOURNEY_STORY;
    const sea = story?.treasureStations.find(st => st.saveKey === id);
    const expedition = story?.expeditionStations.find(st => st.stageId === id);
    const station = sea || expedition;
    const key = `${sea ? 't7' : 'ex10'}:${id}`;
    if (!station || readSeen()[key]) return start();

    showStationOpening(key, {
      title: `${sea ? sea.storyTitle : expedition.title} · ${station.location}`,
      badge: sea ? `البحر ${sea.sea} · ${station.heroName}` : station.heroName,
      hero: station.hero,
      heroName: station.heroName,
      expr: station.expr,
      dialogue: station.dialogue,
    }, start);
  }

  function applyBoardArt() {
    const pzb = $('#stage #pzb');
    if (!pzb) return;
    let id = '';
    try { id = typeof curGame === 'function' ? ((curGame() || {}).id || '') : ''; } catch (_) {}
    if (!id) return;
    const ba = window.__MINDLAB_BOARD_ART;
    if (ba && ba.fourPuzzles && ba.fourPuzzles[id]) {
      pzb.dataset.boardArt = id;
    } else {
      delete pzb.dataset.boardArt;
    }

  }

  // Keep the engine-owned start handler and timers. Only replace the pre-play presentation.
  const originalIntro = showIntro;
  showIntro = function () {
    originalIntro.apply(this, arguments);
    if (typeof RUN === 'undefined' || !RUN?.journeyStation) return;
    const host = $('#stage');
    const start = $('#go', host)?.onclick;
    if (start) renderRunOpening(curGame().id, host, start);
  };

  const originalClose = closePlay;
  closePlay = function () {
    const stationId = typeof RUN !== 'undefined' && RUN?.journeyStation ? curGame()?.id : null;
    originalClose.apply(this, arguments);
    if (!stationId || typeof curTab === 'undefined' || curTab !== 'puz') return;
    if (stationId === 'pz_aheart' && window.ATHERAN_CAMPAIGN?.finishJourneyScene()) return;
    returnToMap();
  };
  if ($('#quit')?.onclick === originalClose) $('#quit').onclick = closePlay;

  function watchAll() {
    window.addEventListener('mindlab:journey-progress', e => {
      if (e.detail?.chapter === 'seven_seas') {
        const at = e.detail.station;
        const scenes = {2: ['coral_light'], 5: ['mist_bells'], 8: ['oasis_water'],
          11: ['ice_observatory'], 14: ['wind_engine'], 17: ['moon_vow'], 20: ['eighth_route', 'letter']};
        if (scenes[at]) showMilestone(scenes[at]);
      } else if (e.detail?.chapter === 'atheran') showMilestone(['return']);
    });
    const vp = $('#v-puz');
    if (vp) {
      let raf = 0;
      const onPuz = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          mountUnifiedHub();
        });
      };
      new MutationObserver(records => {
        for (const record of records) {
          for (const element of record.removedNodes) {
            if (element.id === 'mlj-unified-hub') element.dispatchEvent(new Event('mlj:remove'));
          }
        }
        onPuz();
      }).observe(vp, { childList: true, subtree: true });
      onPuz();
    }
    const st = $('#stage');
    if (st) {
      new MutationObserver(applyBoardArt).observe(st, { childList: true });
      applyBoardArt();
    }
  }

  window.mindlabJourneyHub = { openChapter: triggerChapter, openTransitions: openTransitionsModal, discoveredTransitions, beforeStation, mountUnifiedHub, applyBoardArt, returnToMap };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchAll);
  else watchAll();
})();
