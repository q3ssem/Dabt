/* 5.5.28 — Unified Journey Map Hub («رحلة الكنز»), 46 Non-Library Openings (21 Treasure + 25 Side-Journey),
   12 Transitions Viewer, and Priority 7 / Four Puzzles Board Art Accents.
   Presentation only: never alters save keys, puzzle rules, or secret-world unlock gating. */
(function () {
  'use strict';
  if (window.__MINDLAB_JOURNEY_HUB) return;
  window.__MINDLAB_JOURNEY_HUB = true;

  const SEEN_KEY = 'mindlab:openings:journey:v1';
  const EXPR_POS = {
    welcome: '0% 0%',
    thinking: '100% 0%',
    success: '0% 100%',
    concerned: '100% 100%'
  };

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
      const st = typeof S !== 'undefined' && S.st ? S.st : {};
      if (st.t7 && st.t7.done) {
        seaDone = Object.keys(st.t7.done).filter(k => st.t7.done[k]).length;
      }
      if (typeof aState === 'function') {
        const a = aState();
        atheranDone = Math.max(0, Number(a && a.prog) || 0);
        if (a && a.sw) {
          secretsUnlocked = Object.keys(a.sw).filter(k => a.sw[k]).length;
        }
      }
    } catch (_) {}
    return { seaDone, atheranDone, secretsUnlocked };
  }

  function openTransitionsModal(startIdx = 0) {
    const data = window.__MINDLAB_JOURNEY_STORY;
    if (!data || !data.transitions || !data.transitions.length) return;
    const prev = document.activeElement;
    let idx = Math.max(0, Math.min(data.transitions.length - 1, startIdx));
    const old = $('#mlj-tr-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'mlj-tr-modal';
    modal.className = 'mlj-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'مختصرات انتقال رحلة الكنز');

    const atlasUrl = new URL(data.transitionsAtlas, document.baseURI).href;
    function close() {
      modal.remove();
      if (prev && typeof prev.focus === 'function' && prev.isConnected) {
        try { prev.focus({ preventScroll: true }); } catch (_) {}
      }
    }
    function render() {
      const t = data.transitions[idx];
      modal.innerHTML = `
        <div class="mlj-modal-card">
          <div class="mlj-head">
            <h2>${t.title}</h2>
            <span class="mlj-pill">${idx + 1} / ${data.transitions.length}</span>
          </div>
          <div class="mlj-tr-scene" style="background-image:url('${atlasUrl}');background-size:${bgSize(t.rect)};background-position:${bgPos(t.rect)}"></div>
          <div class="fit-opening-bubble">
            <span class="fit-opening-speaker">${t.speaker}</span>
            <span>${t.dialogue}</span>
          </div>
          <div class="mlj-tr-nav">
            <button type="button" id="mlj-tr-prev" ${idx === 0 ? 'disabled' : ''}>السابق</button>
            <button type="button" id="mlj-tr-next" ${idx === data.transitions.length - 1 ? 'disabled' : ''}>التالي</button>
            <button type="button" class="mlj-tr-close" id="mlj-tr-close">إغلاق</button>
          </div>
        </div>
      `;
      const p = $('#mlj-tr-prev', modal), n = $('#mlj-tr-next', modal), c = $('#mlj-tr-close', modal);
      if (p) p.onclick = () => { if (idx > 0) { idx--; render(); } };
      if (n) n.onclick = () => { if (idx < data.transitions.length - 1) { idx++; render(); } };
      if (c) { c.onclick = close; c.focus({ preventScroll: true }); }
    }
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    document.body.append(modal);
    render();
  }

  function triggerChapter(chId) {
    if (chId === 'seven_seas') {
      const btn = $('#v-puz .t7-open-map, #v-puz .t7-go, #v-puz button[data-t7-open]');
      if (btn) btn.click();
    } else if (chId === 'palace') {
      const btn = $('#v-puz [data-series="mirrors"], #v-puz .la-series-card[data-k="mirrors"]');
      if (btn) btn.click();
    } else if (chId === 'atheran') {
      const btn = $('#v-puz .ah-enter, #v-puz [data-series="athran"]');
      if (btn) btn.click();
    } else if (chId === 'side') {
      const btn = $('#v-puz .ex10-entry-btn, #v-puz .ex10-launch button');
      if (btn) btn.click();
    }
  }

  function mountUnifiedHub() {
    const v = $('#v-puz');
    if (!v || v.classList.contains('t7') || v.classList.contains('ah-view')) return;
    if ($('.ex10-game-shell', v) || $('.t7-puzzle-layout', v)) return;
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
        <button type="button" class="mlj-trans-btn" id="mlj-open-trans">مختصرات الانتقال (${data.transitions.length})</button>
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
          <button type="button" class="mlj-ch-card" data-mlj-ch="side">
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

    // Place official Journey Hub above the side-journey entry (.ex10-launch) if present
    const exLaunch = $('.ex10-launch, .ex10-entry', v);
    if (exLaunch && exLaunch.parentElement) {
      exLaunch.parentElement.insertBefore(sec, exLaunch);
    } else {
      v.prepend(sec);
    }

    const trBtn = $('#mlj-open-trans', sec);
    if (trBtn) trBtn.onclick = () => openTransitionsModal(0);
    sec.querySelectorAll('[data-mlj-ch]').forEach(b => {
      b.onclick = () => triggerChapter(b.dataset.mljCh);
    });
  }

  /* ---- 46 Non-Library Openings (21 Treasure Island + 25 Side Journey) ---- */
  function showStationOpening(key, info, force) {
    if (!info) return;
    const seen = readSeen();
    if (!force && seen[key]) return;
    const prev = document.activeElement;
    const old = $('#fit-opening-overlay');
    if (old) old.remove();

    const heroUrl = new URL(`ui/designs_art/characters/${info.hero}_expressions.png`, document.baseURI).href;
    const bgUrl = info.bg ? new URL(info.bg, document.baseURI).href : new URL('ui/designs_art/journey/journey_map.png', document.baseURI).href;
    const exprPos = EXPR_POS[info.expr] || EXPR_POS.welcome;

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
          <div class="fit-opening-hero" aria-hidden="true" style="background-image:url('${heroUrl}');background-position:${exprPos}"></div>
        </div>
        <div class="fit-opening-body">
          <h3 class="fit-opening-title">${info.title}</h3>
          <div class="fit-opening-bubble">
            <span class="fit-opening-speaker">${info.heroName}</span>
            <span>${info.dialogue}</span>
          </div>
          <div class="fit-opening-actions">
            <button type="button" class="fit-op-start" id="fit-op-start">${force ? 'متابعة المحطة' : 'ابدأ المحطة'}</button>
            ${seen[key] ? '<button type="button" class="fit-op-skip" id="fit-op-skip">تخطي</button>' : ''}
          </div>
        </div>
      </div>
    `;

    const dismiss = e => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      markSeen(key);
      ov.remove();
      if (prev && typeof prev.focus === 'function' && prev.isConnected) {
        try { prev.focus({ preventScroll: true }); } catch (_) {}
      }
    };
    ov.addEventListener('pointerdown', e => { if (e.target === ov) e.stopPropagation(); });
    ov.addEventListener('click', e => { if (e.target === ov) dismiss(e); });
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') dismiss(e); });
    document.body.append(ov);
    const sBtn = $('#fit-op-start', ov), kBtn = $('#fit-op-skip', ov);
    if (sBtn) { sBtn.onclick = dismiss; sBtn.focus({ preventScroll: true }); }
    if (kBtn) kBtn.onclick = dismiss;
  }

  let lastStationKey = '';
  function checkNonLibraryStation() {
    const data = window.__MINDLAB_JOURNEY_STORY;
    if (!data) return;

    const t7Title = $('#v-puz.t7 .t7-puzzle-layout') && $('#v-puz.t7 .t7-top h1');
    if (t7Title) {
      const titleText = (t7Title.textContent || '').trim();
      const st = data.treasureStations.find(s => s.engineTitle === titleText || s.storyTitle === titleText);
      if (st) {
        const key = 't7:' + st.saveKey;
        if (key !== lastStationKey) {
          lastStationKey = key;
          showStationOpening(key, {
            title: `${st.storyTitle} · ${st.location}`,
            badge: `البحر ${st.sea} · ${st.heroName}`,
            hero: st.hero,
            heroName: st.heroName,
            expr: st.expr,
            dialogue: st.dialogue,
            bg: 'ui/designs_art/journey/journey_map.png',
          }, false);
        }
      }
      return;
    }

    const exTitle = $('#v-puz .ex10 .ex10-game-shell') && $('.ex10-game-top b');
    if (exTitle) {
      const titleText = (exTitle.textContent || '').trim();
      const st = data.expeditionStations.find(s => titleText.includes(s.title) || s.title === titleText);
      if (st) {
        const key = 'ex10:' + st.stageId;
        if (key !== lastStationKey) {
          lastStationKey = key;
          showStationOpening(key, {
            title: `${st.title} · ${st.location}`,
            badge: `${st.stageId.toUpperCase()} · ${st.heroName}`,
            hero: st.hero,
            heroName: st.heroName,
            expr: st.expr,
            dialogue: st.dialogue,
            bg: st.scene,
          }, false);
        }
      }
      return;
    }

    lastStationKey = '';
  }

  /* ---- Board Art Accents (Four Puzzles Art + Priority 7 Revision 4) ---- */
  const P7_LEAD_ICON = {
    pz_door: { icon: 'ui/designs_art/priority7/door_closed.png', label: 'رموز الأبواب المعتمدة' },
    pz_pliar: { icon: 'ui/designs_art/priority7/badge_1.png', label: 'أختام القصر المعتمدة' },
    pz_acity: { icon: 'ui/designs_art/priority7/prop_biolantern.png', label: 'فانوس المدينة الغارقة' },
    pz_pobs: { icon: 'ui/designs_art/priority7/prop_clock.png', label: 'عدسة المرصد' },
    pz_aarch: { icon: 'ui/designs_art/priority7/prop_manifest.png', label: 'سجل الأرشيف' },
    pz_alayer: { icon: 'ui/designs_art/priority7/prop_strata.png', label: 'طبقات الأرض' },
    pz_arelic: { icon: 'ui/designs_art/priority7/prop_diary.png', label: 'مخطوطة الأثر' },
  };

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
    const p7 = P7_LEAD_ICON[id];
    if (p7 && !$('.mlj-p7-ribbon', pzb)) {
      const rib = document.createElement('div');
      rib.className = 'mlj-p7-ribbon';
      const src = new URL(p7.icon, document.baseURI).href;
      rib.innerHTML = `<img src="${src}" alt="" aria-hidden="true"><span>${p7.label}</span>`;
      pzb.prepend(rib);
    }
  }

  function watchAll() {
    const vp = $('#v-puz');
    if (vp) {
      let raf = 0;
      const onPuz = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          mountUnifiedHub();
          checkNonLibraryStation();
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

  window.mindlabJourneyHub = { openTransitions: openTransitionsModal, showStationOpening, mountUnifiedHub, applyBoardArt };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchAll);
  else watchAll();
})();
