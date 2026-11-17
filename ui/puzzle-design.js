/* 5.5.8 — visual/audio prototype layer for Logic Grid and River Crossing.
   Presentation only: original puzzle generators, solvers, scoring and miran:v2 keys remain authoritative. */
(function () {
  'use strict';
  if (window.__MINDLAB_PUZZLE_DESIGN_558) return;
  window.__MINDLAB_PUZZLE_DESIGN_558 = true;

  const $ = (s, root = document) => root.querySelector(s);
  const state = { game: '', musicGame: '', musicTimer: null, logicObserver: null, logicTable: null, riverObserver: null, riverScene: null, scheduled: false, cleanupRegistered: false, audioPrimed: false };
  const MUSIC = {
    pz_grid: {
      interval: 3000, pad: [130.81, 164.81, 196.00],
      melody: [392.00, 440.00, 493.88, 440.00, 349.23, 392.00, 440.00, 392.00],
      padSeconds: 2.65, padVolume: 0.006, melodyVolume: 0.0065, melodyEvery: 2,
      label: 'موسيقى تركيز هادئة'
    },
    pz_river: {
      interval: 2350, pad: [110.00, 146.83, 164.81],
      melody: [440.00, 523.25, 587.33, 659.25, 587.33, 523.25, 440.00, 392.00],
      padSeconds: 2.1, padVolume: 0.007, melodyVolume: 0.0075, melodyEvery: 1,
      label: 'موسيقى استكشاف الجزيرة'
    }
  };

  function getGameId() {
    try {
      const g = typeof curGame === 'function' ? curGame() : null;
      return g && g.id || '';
    } catch (_) { return ''; }
  }

  function stopMusic() {
    if (state.musicTimer) clearInterval(state.musicTimer);
    state.musicTimer = null;
    state.musicGame = '';
  }

  function musicEnabled() {
    try { return !S.st.mute && !S.st.puzzleMusicOff; } catch (_) { return false; }
  }

  function startMusic(id) {
    if (!MUSIC[id] || !musicEnabled() || typeof tone !== 'function') { stopMusic(); return; }
    if (state.musicTimer && state.musicGame === id) return;
    stopMusic();
    const cfg = MUSIC[id];
    let step = 0;
    const playPhrase = () => {
      if (!musicEnabled() || document.hidden) return;
      const chord = cfg.pad;
      chord.forEach((f, i) => tone(f, cfg.padSeconds, 'sine', cfg.padVolume, i * 0.045));
      if (step % cfg.melodyEvery === 0) {
        const note = cfg.melody[(step / cfg.melodyEvery | 0) % cfg.melody.length];
        tone(note, 0.72, 'sine', cfg.melodyVolume, 0.28);
      }
      step++;
    };
    state.musicGame = id;
    playPhrase();
    state.musicTimer = setInterval(playPhrase, cfg.interval);
    if (!state.cleanupRegistered && typeof cleanup !== 'undefined' && Array.isArray(cleanup)) { cleanup.push(stopMusic); state.cleanupRegistered = true; }
  }

  function updateMusicButton() {
    const hud = $('.pzhud');
    if (!hud) return;
    let button = $('.mlp-music-toggle', hud);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'mlp-music-toggle';
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span></span>';
      button.addEventListener('click', () => {
        S.st.puzzleMusicOff = !S.st.puzzleMusicOff;
        S.save();
        paintMusicButton();
        if (S.st.puzzleMusicOff) stopMusic(); else startMusic(state.game);
      });
      const hint = $('#pzh', hud);
      hud.insertBefore(button, hint || null);
    }
    paintMusicButton();
  }

  function paintMusicButton() {
    const button = $('.mlp-music-toggle');
    if (!button) return;
    const enabled = musicEnabled();
    button.setAttribute('aria-pressed', String(enabled));
    button.classList.toggle('on', enabled);
    const label = $('span', button);
    if (label) label.textContent = S.st.mute ? 'الصوت مكتوم' : (S.st.puzzleMusicOff ? 'تشغيل الموسيقى' : 'إيقاف الموسيقى');
    button.title = S.st.mute ? 'فعّل المؤثرات الصوتية من الإعدادات أولًا' : (S.st.puzzleMusicOff ? 'تشغيل الموسيقى الخلفية' : 'إيقاف الموسيقى الخلفية');
  }

  function insertOnce(parent, selector, html, before) {
    if (!parent || $(selector, parent)) return;
    const t = document.createElement('template'); t.innerHTML = html.trim();
    const node = t.content.firstElementChild;
    if (before && before.parentNode === parent) parent.insertBefore(node, before); else parent.prepend(node);
  }

  function updateLogicProgress(body) {
    const table = $('#lgt', body), meter = $('.mlp-logic-meter', body);
    if (!table || !meter) return;
    const filled = table.querySelectorAll('.lgc.set').length;
    const total = table.querySelectorAll('.lgc').length;
    const count = $('.mlp-meter-count', meter), bar = $('.mlp-meter-fill', meter);
    if (count) count.textContent = `${filled} / ${total}`;
    if (bar) bar.style.width = `${total ? filled / total * 100 : 0}%`;
    meter.setAttribute('aria-valuenow', String(filled));
    meter.setAttribute('aria-valuemax', String(total));
    meter.setAttribute('aria-label', `الخانات المكتملة: ${filled} من ${total}`);
  }

  function labelLogicCells(table) {
    if (!table || !table.rows.length) return;
    const headers = Array.from(table.rows[0].cells).slice(1).map(c => c.textContent.trim());
    Array.from(table.rows).slice(1).forEach(row => {
      const person = row.cells[0] ? row.cells[0].textContent.trim() : 'الشخص';
      Array.from(row.cells).slice(1).forEach((cell, col) => {
        const button = $('button.lgc', cell);
        if (!button) return;
        const choice = button.textContent.replace(/\s+/g, ' ').trim();
        button.setAttribute('aria-label', `${person} — ${headers[col] || 'الخانة'}: ${choice === '؟' ? 'غير محدد' : choice}`);
        button.setAttribute('aria-pressed', String(button.classList.contains('set')));
        if (button.classList.contains('fix')) button.title = 'اختيار ثُبّت بواسطة التلميح';
        else button.title = 'اضغط لتغيير الاختيار';
      });
    });
  }

  function enhanceLogic() {
    const body = $('#pzb'), table = $('#lgt');
    if (!body || !table) return;
    body.classList.add('mlp-logic-board');
    insertOnce(body, '.mlp-logic-intro', `
      <section class="mlp-logic-intro">
        <span class="mlp-eyebrow">مختبر الاستدلال</span>
        <h2>اربط الأدلة حتى تكتمل الصورة</h2>
        <p>اختر قيمة لكل شخص في كل عمود. يمكنك الضغط على الخانة لتبديل الاختيار حتى تصل إلى الحل.</p>
      </section>`, $('.lgclues', body));
    insertOnce(body, '.mlp-logic-meter', `
      <section class="mlp-logic-meter" role="progressbar" aria-valuemin="0" aria-valuenow="0" aria-valuemax="0">
        <div class="mlp-meter-head"><span>الخانات المكتملة</span><b class="mlp-meter-count">0 / 0</b></div>
        <div class="mlp-meter-track"><i class="mlp-meter-fill"></i></div>
      </section>`, $('.lgclues', body));
    insertOnce(body, '.mlp-clues-title', '<div class="mlp-clues-title"><b>الأدلة</b><span>اقرأها ثم قارن العلاقات</span></div>', $('.lgclues', body));
    if (!table.parentElement.classList.contains('mlp-table-scroll')) {
      const wrap = document.createElement('div'); wrap.className = 'mlp-table-scroll';
      table.parentNode.insertBefore(wrap, table); wrap.appendChild(table);
    }
    table.setAttribute('aria-label', 'جدول استنتاج العلاقات بين الأشخاص والفئات');
    const message = $('#m');
    if (message) { message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite'); }
    const check = $('#lgok');
    if (check) { check.classList.add('mlp-check-solution'); check.setAttribute('aria-label', 'تحقق من صحة شبكة المنطق'); }
    labelLogicCells(table);
    updateLogicProgress(body);
    if (state.logicTable !== table) {
      if (state.logicObserver) state.logicObserver.disconnect();
      state.logicTable = table;
      state.logicObserver = new MutationObserver(() => {
        const current = $('#lgt', body);
        labelLogicCells(current);
        updateLogicProgress(body);
      });
      state.logicObserver.observe(table, { childList: true, subtree: true });
    }
  }

  function updateRiverStatus(root) {
    const status = $('.mlp-river-status', root);
    if (!status) return;
    const left = $('#rvL', root), right = $('#rvR', root), boat = $('#rvB', root), load = $('#rvLd', root);
    if (!left || !right || !boat || !load) return;
    const leftCount = left.querySelectorAll('.rvit[data-i]').length;
    const rightCount = right.querySelectorAll('.rvit[data-i]').length;
    const boatCount = load.querySelectorAll('.rvit[data-i]').length;
    const total = leftCount + rightCount + boatCount;
    const delivered = rightCount;
    const count = $('.mlp-river-count', status), bar = $('.mlp-river-fill', status), side = $('.mlp-river-side', status), cargo = $('.mlp-river-cargo', status);
    if (count) count.textContent = `${delivered} / ${total}`;
    if (bar) bar.style.width = `${total ? delivered / total * 100 : 0}%`;
    if (side) side.textContent = boat.classList.contains('sail') ? 'القارب في منتصف النهر' : (boat.classList.contains('r') ? 'القارب قرب المرج الأخضر' : 'القارب قرب الشاطئ الرملي');
    if (cargo) cargo.textContent = boatCount ? `على القارب: ${boatCount}` : 'القارب فارغ';
    status.setAttribute('aria-label', `وصل إلى المرج الأخضر ${delivered} من ${total}`);
  }

  function enhanceRiver() {
    const body = $('#pzb'), scene = $('#rv3', body);
    if (!body || !scene) return;
    body.classList.add('mlp-river-board');
    insertOnce(body, '.mlp-river-intro', `
      <section class="mlp-river-intro">
        <span class="mlp-eyebrow">مغامرة عبور النهر</span>
        <h2>خطّط للعبور دون أن تترك خطرًا خلفك</h2>
        <p>اختر ما يركب القارب، ثم اعبر. راقب العلاقات بين العناصر على الضفتين.</p>
      </section>`, $('.rvrules', body));
    insertOnce(body, '.mlp-rules-label', '<div class="mlp-rules-label"><b>قواعد السلامة</b><span>من يأكل من؟</span></div>', $('.rvrules', body));
    insertOnce(body, '.mlp-river-status', `
      <section class="mlp-river-status" role="status" aria-live="polite">
        <div class="mlp-river-status-head"><span>وصل إلى المرج الأخضر</span><b class="mlp-river-count">0 / 0</b></div>
        <div class="mlp-river-track"><i class="mlp-river-fill"></i></div>
        <div class="mlp-river-status-foot"><span class="mlp-river-side">القارب قرب الشاطئ الرملي</span><span class="mlp-river-cargo">القارب فارغ</span></div>
      </section>`, $('#rvgo', body));
    scene.setAttribute('role', 'group');
    scene.setAttribute('aria-label', 'مشهد عبور النهر بين الشاطئ الرملي والمرج الأخضر');
    const left = $('#rvL', scene), right = $('#rvR', scene), boat = $('#rvB', scene), load = $('#rvLd', scene);
    if (left) left.setAttribute('aria-label', 'الشاطئ الرملي — نقطة البداية');
    if (right) right.setAttribute('aria-label', 'المرج الأخضر — نقطة الوصول');
    if (boat) boat.setAttribute('aria-label', 'القارب والمزارع');
    if (load) load.setAttribute('aria-label', 'العناصر الموجودة على القارب');
    const go = $('#rvgo', body);
    if (go) { go.classList.add('mlp-river-cross'); go.setAttribute('aria-label', 'اعبر النهر بالعناصر المختارة'); }
    updateRiverStatus(body);
    if (state.riverScene !== scene) {
      if (state.riverObserver) state.riverObserver.disconnect();
      state.riverScene = scene;
      state.riverObserver = new MutationObserver(() => updateRiverStatus(body));
      state.riverObserver.observe(scene, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
  }

  function apply() {
    state.scheduled = false;
    const play = $('#play');
    if (!play) { stopMusic(); return; }
    const id = getGameId();
    const active = (id === 'pz_grid' && $('#lgt')) || (id === 'pz_river' && $('#rv3'));
    if (!active) {
      if (state.game) {
        play.removeAttribute('data-ml-puzzle');
        state.game = '';
        stopMusic();
        if (state.logicObserver) { state.logicObserver.disconnect(); state.logicObserver = null; }
        if (state.riverObserver) { state.riverObserver.disconnect(); state.riverObserver = null; }
        state.logicTable = null;
        state.riverScene = null;
      }
      return;
    }
    if (state.game && state.game !== id) {
      if (state.logicObserver) { state.logicObserver.disconnect(); state.logicObserver = null; }
      if (state.riverObserver) { state.riverObserver.disconnect(); state.riverObserver = null; }
      state.logicTable = null;
      state.riverScene = null;
      stopMusic();
    }
    state.game = id;
    play.dataset.mlPuzzle = id === 'pz_grid' ? 'logic' : 'river';
    if (id === 'pz_grid') enhanceLogic();
    else enhanceRiver();
    updateMusicButton();
    if (musicEnabled() && state.audioPrimed) startMusic(id); else stopMusic();
  }

  function schedule() {
    if (state.scheduled) return;
    state.scheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(apply);
  }

  const play = $('#play');
  if (play) {
    new MutationObserver(schedule).observe(play, { childList: true, subtree: true });
    schedule();
  }
  document.addEventListener('pointerdown', event => {
    if (!(event.target.closest && event.target.closest('#play')) || !state.game || !musicEnabled()) return;
    if (!state.audioPrimed) {
      state.audioPrimed = true;
      stopMusic();
      startMusic(state.game);
    } else if (!state.musicTimer || state.musicGame !== state.game) startMusic(state.game);
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMusic();
    else if (state.game && musicEnabled()) startMusic(state.game);
  });
  document.addEventListener('click', event => {
    if (event.target.closest && event.target.closest('#mt')) {
      setTimeout(() => { paintMusicButton(); if (S.st.mute) stopMusic(); else if (state.game && !S.st.puzzleMusicOff) startMusic(state.game); }, 0);
    }
  }, true);
})();
