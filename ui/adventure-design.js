/* 5.5.9 — additive pirate, wreck and temple puzzle presentation/audio layer.
   Game solvers, puzzle generators, IDs and miran:v2 persistence remain untouched. */
(function () {
  'use strict';
  if (window.__MINDLAB_ADVENTURE_DESIGN_559) return;
  window.__MINDLAB_ADVENTURE_DESIGN_559 = true;
  const $ = (s, r = document) => r.querySelector(s);
  const FAMILIES = {
    pirate: {
      ids: ['pz_tpath','pz_xreef','pz_xbridge','pz_xcave','pz_xloot','pz_tmap','pz_tdig','pz_xlock'],
      label: 'رحلة القراصنة', title: 'اتبع أثر الخريطة واكتشف طريق الكنز',
      text: 'راقب العلامات، فك الإشارات، وخطّط خطواتك قبل التحرك.',
      color: 'pirate'
    },
    wreck: {
      ids: ['pz_ybell','pz_ymap','pz_yhold','pz_ytide','pz_ydoor'],
      label: 'أسرار الحطام', title: 'استكشف السفينة وما أخفته الأمواج',
      text: 'اجمع شتات الأدلة، واستمع جيدًا، واختر عبورك بحذر.',
      color: 'wreck'
    },
    temple: {
      ids: ['pz_zcomp','pz_zroute','pz_zcur','pz_zcode','pz_zharp','pz_zshadow','pz_znim','pz_zstars','pz_zthrone'],
      label: 'ألغاز المعبد', title: 'اكشف أسرار المعبد خطوةً بعد خطوة',
      text: 'وازن بين الملاحظة والذاكرة والمنطق حتى تصل إلى السر.',
      color: 'temple'
    }
  };
  const byId = Object.fromEntries(Object.entries(FAMILIES).flatMap(([key, f]) => f.ids.map(id => [id, { ...f, key }])));
  let mountedBody;
  let raf = 0;
  function game() { return typeof RUN !== 'undefined' && RUN ? curGame() : null; }
  function mount() {
    const g = game(), f = g && byId[g.id], play = $('#play'), body = $('#pzb'), hud = $('.pzhud');
    if (!f || !play || !body || !hud) {
      if (play) { delete play.dataset.mlaTheme; }
      mountedBody = null; return;
    }
    play.dataset.mlaTheme = f.color;
    if (mountedBody !== body) {
      mountedBody = body;
      const intro = document.createElement('section'); intro.className = 'mla-adventure-intro'; intro.innerHTML = `<span class="mla-eyebrow">${f.label}</span><h2>${f.title}</h2><p>${f.text}</p>`;
      body.prepend(intro);
    }
  }
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; mount(); });
  }
  const play = $('#play');
  if (play) new MutationObserver(schedule).observe(play, { childList: true, subtree: true });
  schedule();
  window.MINDLAB_ADVENTURE_DESIGN_559 = { families: FAMILIES, mount };
})();
