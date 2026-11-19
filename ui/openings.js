/* 5.5.28 — Pre-play openings controller (80 official + 8 extra library IDs).
   Presentation only: does not alter puzzle IDs, solvers, generators, or miran:v2 progress. */
(function () {
  'use strict';
  if (window.__MINDLAB_OPENINGS_UI) return;
  window.__MINDLAB_OPENINGS_UI = true;

  const SEEN_KEY = 'mindlab:openings:seen:v1';
  const EXPR_POS = {
    welcome: '0% 0%',
    thinking: '100% 0%',
    success: '0% 100%',
    concerned: '100% 100%'
  };

  const $ = (s, r = document) => r.querySelector(s);
  const HEROES = [['rawaa', 'رواء'], ['nuha', 'نهى'], ['ward', 'ورد']];
  function crewMarkup(speaker, expression) {
    return `<div class="fit-opening-crew" aria-label="رواء ونهى وورد">${HEROES.map(([id, name]) => {
      const response = expression === 'concerned' ? 'thinking' : expression;
      const position = EXPR_POS[id === speaker ? expression : response] || EXPR_POS.welcome;
      return `<span class="fit-opening-hero${id === speaker ? ' speaking' : ''}" role="img" aria-label="${name}"
        style="background-image:url('ui/designs_art/characters/${id}_expressions.png');background-position:${position}"></span>`;
    }).join('')}</div>`;
  }
  const readSeen = () => {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch (_) { return {}; }
  };
  const markSeen = id => {
    try {
      const s = readSeen();
      s[id] = 1;
      localStorage.setItem(SEEN_KEY, JSON.stringify(s));
    } catch (_) {}
  };
  const gid = () => {
    try { return typeof curGame === 'function' ? (curGame() || {}).id : null; } catch (_) { return null; }
  };

  let lastBody = null;
  let lastTriggerFocus = null;

  function bgPositionForRect(rect) {
    if (!rect) return '0% 0%';
    const dx = 1 - (rect.width || 0.5);
    const dy = 1 - (rect.height || 0.2);
    const px = dx > 0 ? Math.round((rect.x / dx) * 100) : 0;
    const py = dy > 0 ? Math.round((rect.y / dy) * 100) : 0;
    return `${px}% ${py}%`;
  }

  function bgSizeForRect(rect) {
    if (!rect) return '200% 500%';
    const sx = Math.round(100 / (rect.width || 0.5));
    const sy = Math.round(100 / (rect.height || 0.2));
    return `${sx}% ${sy}%`;
  }

  function closeOpening() {
    const ov = $('#fit-opening-overlay');
    if (ov) ov.remove();
    if (lastTriggerFocus && typeof lastTriggerFocus.focus === 'function' && lastTriggerFocus.isConnected) {
      try { lastTriggerFocus.focus({ preventScroll: true }); } catch (_) {}
    }
    lastTriggerFocus = null;
  }

  function openOpening(id, forceReplay, begin, cancel) {
    const data = window.__MINDLAB_OPENINGS_DATA || {};
    const entry = data[id];
    if (!entry) return;
    closeOpening();
    lastTriggerFocus = document.activeElement;

    const seen = readSeen();
    const alreadySeen = !!seen[id];
    const river = id === 'pz_river';
    const background = river ? 'ui/designs_art/river_stage1/05_opening_and_icon/05_opening_scene.png' : `ui/designs_art/openings/${entry.bg}`;
    const bgUrl = new URL(background, document.baseURI).href;
    const size = river ? 'cover' : bgSizeForRect(entry.rect);
    const position = river ? 'center' : bgPositionForRect(entry.rect);

    const ov = document.createElement('div');
    ov.id = 'fit-opening-overlay';
    ov.className = 'fit-opening-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', entry.name || 'مقدمة اللغز');

    ov.innerHTML = `
      <div class="fit-opening-card">
        <div class="fit-opening-scene" style="background-image:url('${bgUrl}');background-size:${size};background-position:${position}">
          <div class="fit-opening-scrim"></div>
          <span class="fit-opening-badge">${entry.heroName}</span>
          ${crewMarkup(entry.hero, entry.expr)}
        </div>
        <div class="fit-opening-body">
          <h3 class="fit-opening-title">${entry.name}</h3>
          <div class="fit-opening-bubble">
            <span class="fit-opening-speaker">${entry.heroName}</span>
            <span>${entry.dialogue}</span>
          </div>
          <div class="fit-opening-actions">
            <button type="button" class="fit-op-start" id="fit-op-start">${forceReplay ? 'متابعة اللغز' : 'ابدأ اللغز'}</button>
            ${alreadySeen ? '<button type="button" class="fit-op-skip" id="fit-op-skip">تخطي</button>' : ''}
          </div>
        </div>
      </div>
    `;

    // Prevent the tap that closes the opening from passing through to the puzzle board.
    const dismiss = e => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      // A cancelled pre-play scene leaves the original intro and starts no timer.
      if (begin && e && (e.target === ov || e.key === 'Escape')) {
        closeOpening();
        if (cancel) cancel();
        return;
      }
      markSeen(id);
      closeOpening();
      if (begin) begin();
    };

    ov.addEventListener('pointerdown', e => {
      if (e.target === ov) {
        e.stopPropagation();
      }
    });
    ov.addEventListener('click', e => {
      if (e.target === ov) dismiss(e);
    });
    ov.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        dismiss(e);
        return;
      }
      if (e.key === 'Tab') {
        const focusables = [...ov.querySelectorAll('button:not([disabled])')];
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    ($('#play') || document.body).append(ov);
    const startBtn = $('#fit-op-start', ov);
    const skipBtn = $('#fit-op-skip', ov);
    if (startBtn) {
      startBtn.addEventListener('click', dismiss);
      startBtn.focus({ preventScroll: true });
    }
    if (skipBtn) {
      skipBtn.addEventListener('click', dismiss);
    }
  }

  function checkMount() {
    const b = $('#stage #pzb');
    if (!b) {
      lastBody = null;
      closeOpening();
      return;
    }
    if (b === lastBody) return;
    lastBody = b;
    const id = gid();
    if (!id) return;
    const data = window.__MINDLAB_OPENINGS_DATA || {};
    if (!data[id]) return;
    const seen = readSeen();
    if (!seen[id]) {
      openOpening(id, false);
    }
  }

  function watch() {
    const st = $('#stage');
    if (!st) return setTimeout(watch, 300);
    new MutationObserver(checkMount).observe(st, { childList: true });
    checkMount();
  }

  // Gate the engine itself, rather than covering an already running timed board.
  // The original countdown owns timers/cleanup and is called once after Start.
  if (typeof countdown === 'function') {
    const countdown0 = countdown;
    countdown = function () {
      const id = gid(), run = typeof RUN !== 'undefined' ? RUN : null;
      const data = window.__MINDLAB_OPENINGS_DATA || {};
      if (!id || !data[id] || readSeen()[id]) return countdown0.apply(this, arguments);
      const self = this, args = arguments;
      if (typeof stopAll === 'function') stopAll();
      openOpening(id, false, () => {
        if (typeof RUN !== 'undefined' && RUN === run && gid() === id) countdown0.apply(self, args);
      }, () => {
        if (typeof RUN !== 'undefined' && RUN === run && typeof showIntro === 'function') showIntro();
      });
    };
  }

  window.fitOpenings = { open: openOpening, close: closeOpening, crewMarkup };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }
})();
