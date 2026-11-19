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
          <div class="mlj-tr-scene" style="background-image:url('${atlasUrl}');background-size:${bgSize(t.rect)};background-position:${bgPos(t.rect)}"></div>
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
        let tile = [...document.querySelectorAll('#v-puz [data-legacy-puzzle]')]
          .find(el => el.dataset.legacyPuzzle === id);
        if (!tile && window.LA && typeof LA.library === 'function') {
          LA.library();
          tile = [...document.querySelectorAll('#v-puz [data-legacy-puzzle]')]
            .find(el => el.dataset.legacyPuzzle === id);
        }
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
      if (window.ML10 && typeof window.ML10.renderMap === 'function') window.ML10.renderMap();
      else $('#v-puz .ex10-launch-go')?.click();
    }
  }

  function mountUnifiedHub() {
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
    sec.className = 'mlj-hub';
    sec.setAttribute('aria-label', data.journeyTitle);
    sec.innerHTML = `
      <div class="mlj-head">
        <h2>${data.journeyTitle}</h2>
        <button type="button" class="mlj-trans-btn" id="mlj-open-trans">مشاهد الرحلة (${discoveredTransitions().length})</button>
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
        <span class="mlj-pill">البحار السبعة: ${prog.seaDone} / 21</span>
        <span class="mlj-pill">أَثْرَان: ${prog.atheranDone} / 21</span>
        <span class="mlj-pill">${prog.secretsUnlocked > 0 ? `عوالم سرية مكتشفة: ${prog.secretsUnlocked} / 5` : 'العوالم السرية محجوبة حتى اكتشافها'}</span>
      </div>
    `;

    ($('.t7-top', v) || entry).after(sec);

    const trBtn = $('#mlj-open-trans', sec);
    if (trBtn) trBtn.onclick = () => openTransitionsModal(0);
    sec.querySelectorAll('[data-mlj-ch]').forEach(b => {
      b.onclick = () => triggerChapter(b.dataset.mljCh);
    });
  }

  /* ---- 46 Non-Library Openings (21 Treasure Island + 25 Side Journey) ---- */
  function showStationOpening(key, info, start) {
    const prev = document.activeElement;
    const old = $('#fit-opening-overlay');
    if (old) old.remove();

    const bgUrl = info.bg ? new URL(info.bg, document.baseURI).href : new URL('ui/designs_art/journey/journey_map.png', document.baseURI).href;

    const ov = document.createElement('div');
    ov.id = 'fit-opening-overlay';
    ov.className = 'fit-opening-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', info.title);
    ov.innerHTML = `
      <div class="fit-opening-card">
        <div class="fit-opening-scene" style="background-image:url('${bgUrl}');background-size:cover;background-position:center">
          <div class="fit-opening-scrim"></div>
          <span class="fit-opening-badge">${info.badge}</span>
          ${window.fitOpenings.crewMarkup(info.hero, info.expr)}
        </div>
        <div class="fit-opening-body">
          <h3 class="fit-opening-title">${info.title}</h3>
          <div class="fit-opening-bubble">
            <span class="fit-opening-speaker">${info.heroName}</span>
            <span>${info.dialogue}</span>
          </div>
          <div class="fit-opening-actions">
            <button type="button" class="fit-op-start" id="fit-op-start">ابدأ المحطة</button>
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
      bg: scene || station.scene,
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
      new MutationObserver(onPuz).observe(vp, { childList: true, subtree: true });
      onPuz();
    }
    const st = $('#stage');
    if (st) {
      new MutationObserver(applyBoardArt).observe(st, { childList: true });
      applyBoardArt();
    }
  }

  window.mindlabJourneyHub = { openChapter: triggerChapter, openTransitions: openTransitionsModal, discoveredTransitions, beforeStation, mountUnifiedHub, applyBoardArt };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchAll);
  else watchAll();
})();
