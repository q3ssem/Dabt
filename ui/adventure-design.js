/* 5.5.9 — additive pirate, wreck and temple puzzle presentation/audio layer.
   Game solvers, puzzle generators, IDs and miran:v2 persistence remain untouched. */
(function () {
  'use strict';
  if (window.__MINDLAB_ADVENTURE_DESIGN_559) return;
  window.__MINDLAB_ADVENTURE_DESIGN_559 = true;
  const $ = (s, r = document) => r.querySelector(s);
  const FAMILIES = {
    pirate: {
      ids: ['pz_xbottle','pz_tpath','pz_xreef','pz_xbridge','pz_xcave','pz_xloot','pz_tmap','pz_tdig','pz_xlock'],
      label: 'رحلة القراصنة', title: 'اتبع أثر الخريطة واكتشف طريق الكنز',
      text: 'راقب العلامات، فك الإشارات، وخطّط خطواتك قبل التحرك.',
      interval: 3400, pad: [110,146.83,174.61], melody: [329.63,392,440,392,349.23,293.66,329.63],
      color: 'pirate'
    },
    wreck: {
      ids: ['pz_ybell','pz_ymap','pz_yhold','pz_ytide','pz_ydoor'],
      label: 'أسرار الحطام', title: 'استكشف السفينة وما أخفته الأمواج',
      text: 'اجمع شتات الأدلة، واستمع جيدًا، واختر عبورك بحذر.',
      interval: 3000, pad: [123.47,155.56,185], melody: [369.99,415.3,493.88,415.3,369.99,311.13,349.23],
      color: 'wreck'
    },
    temple: {
      ids: ['pz_zcomp','pz_zroute','pz_zcur','pz_zcode','pz_zharp','pz_zshadow','pz_znim','pz_zstars','pz_zthrone'],
      label: 'ألغاز المعبد', title: 'اكشف أسرار المعبد خطوةً بعد خطوة',
      text: 'وازن بين الملاحظة والذاكرة والمنطق حتى تصل إلى السر.',
      interval: 3700, pad: [98,130.81,164.81], melody: [293.66,349.23,392,440,392,349.23,261.63],
      color: 'temple'
    }
  };
  const byId = Object.fromEntries(Object.entries(FAMILIES).flatMap(([key, f]) => f.ids.map(id => [id, { ...f, key }])));
  const state = { id: '', timer: null, observer: null, mountedBody: null, cleanupAdded: false };
  function game() { try { return typeof curGame === 'function' ? curGame() : null; } catch (_) { return null; } }
  function enabled() { try { return !S.st.mute && !S.st.puzzleMusicOff; } catch (_) { return false; } }
  function stop() { if (state.timer) clearInterval(state.timer); state.timer = null; state.id = ''; }
  function start(id) {
    const f = byId[id];
    if (!f || !enabled() || typeof tone !== 'function' || document.hidden) { stop(); return; }
    if (state.timer && state.id === id) return;
    stop(); let step = 0;
    const phrase = () => {
      if (!enabled() || document.hidden || game()?.id !== id) { stop(); return; }
      f.pad.forEach((hz, i) => tone(hz, 2.5, 'sine', 0.0048, i * 0.055));
      tone(f.melody[step++ % f.melody.length], 0.62, 'sine', 0.0042, 0.25);
    };
    state.id = id; phrase(); state.timer = setInterval(phrase, f.interval);
    if (!state.cleanupAdded && typeof cleanup !== 'undefined' && Array.isArray(cleanup)) { cleanup.push(stop); state.cleanupAdded = true; }
  }
  function toggle() {
    S.st.puzzleMusicOff = !S.st.puzzleMusicOff; S.save(); paintButton();
    if (S.st.puzzleMusicOff) stop(); else start(state.gameId || game()?.id);
  }
  function paintButton(btn) {
    if (!btn) btn = $('.mla-music-toggle'); if (!btn) return;
    const on = enabled(); btn.setAttribute('aria-pressed', String(on));
    btn.textContent = S.st.mute ? 'الصوت مكتوم' : (S.st.puzzleMusicOff ? 'تشغيل موسيقى المغامرة' : 'إيقاف موسيقى المغامرة');
  }
  function mount() {
    const g = game(), f = g && byId[g.id], play = $('#play'), body = $('#pzb'), hud = $('.pzhud');
    if (!f || !play || !body || !hud) {
      if (play) { delete play.dataset.mlaTheme; }
      stop(); state.mountedBody = null; return;
    }
    state.gameId = g.id; play.dataset.mlaTheme = f.color;
    if (state.mountedBody !== body) {
      state.mountedBody = body;
      const intro = document.createElement('section'); intro.className = 'mla-adventure-intro'; intro.innerHTML = `<span class="mla-eyebrow">${f.label}</span><h2>${f.title}</h2><p>${f.text}</p>`;
      body.prepend(intro);
    }
    let btn = $('.mla-music-toggle', hud);
    if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.className = 'mla-music-toggle'; btn.addEventListener('click', toggle); const hint = $('#pzh', hud); hud.insertBefore(btn, hint || null); }
    paintButton(btn); start(g.id);
  }
  function schedule() { if (state.raf) return; state.raf = requestAnimationFrame(() => { state.raf = 0; try { mount(); } catch (e) { stop(); } }); }
  if ($('#play')) { state.observer = new MutationObserver(schedule); state.observer.observe($('#play'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else schedule(); });
  document.addEventListener('click', e => { if (e.target.closest('#quit')) stop(); }, true);
  schedule();
  window.MINDLAB_ADVENTURE_DESIGN_559 = { families: FAMILIES, stop, mount };
})();
