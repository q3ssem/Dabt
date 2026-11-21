/* Show a rules sheet before a round starts and make the story replayable from the HUD. */
(function () {
  'use strict';
  if (window.__MINDLAB_OPENINGS_UI) return;
  window.__MINDLAB_OPENINGS_UI = true;

  const $ = (s, r = document) => r.querySelector(s);
  const PUZZLE_ACTION_PATHS = {
    start: '<path d="m8 5 12 7-12 7z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    next: '<path d="m14 5-7 7 7 7m-7-7h13"/>',
    back: '<path d="m10 5 7 7-7 7m7-7H4"/>',
    retry: '<path d="M4 4v6h6M4.5 10a8 8 0 1 1 .7 7"/>',
    home: '<path d="m3 11 9-8 9 8m-16-2v11h5v-6h4v6h5V9"/>',
    levels: '<path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zm6-3v15m6-12v15"/>',
    share: '<path d="m12 15 0-12m-5 5 5-5 5 5m-10 3H4v10h16V11h-3"/>',
    check: '<path d="m5 12 4 4L19 6"/>'
  };
  window.puzzleAction = function puzzleAction(button, icon, label = button.textContent.trim()) {
    button.classList.add('puzzle-action');
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PUZZLE_ACTION_PATHS[icon]}</svg>`;
  };
  const heroes = {
    rawaa: 'رواء', nuha: 'نهى', ward: 'ورد'
  };
  const families = {
    movement: new Set(['pz_river', 'pz_rush', 'pz_stat', 'pz_pipe', 'pz_flow', 'pz_ice', 'pz_untangle', 'pz_tan']),
    coast: new Set(['pz_xreef', 'pz_zroute', 'pz_zcur', 'pz_acur', 'pz_aport', 'pz_ashell', 'pz_alight'])
  };
  const game = () => RUN && curGame();

  function paper(id) {
    if (families.coast.has(id) || id.startsWith('pz_y')) return 'coast';
    if (families.movement.has(id)) return 'motion';
    if (id.startsWith('pz_p') && id !== 'pz_pipe') return 'mirror';
    if (id.startsWith('pz_a') || id.startsWith('pz_w')) return 'athran';
    if (/^pz_[xzt]/.test(id) && id !== 'pz_tent') return 'pirate';
    return 'logic';
  }

  const designFor = id => window.mindlabPuzzleDesigns?.[id];
  const artUrl = path => `url("${new URL(path, document.baseURI).href}")`;

  function applyIllustration(current) {
    const play = $('#play');
    const design = current?.puz && designFor(current.id);
    if (current?.puz) play.dataset.playPaper = paper(current.id);
    else delete play.dataset.playPaper;
    if (design) {
      play.dataset.puzzleIllustration = design.scene ? 'scene' : 'emblem';
      play.dataset.puzzleTone = design.tone;
      if (design.board) play.dataset.puzzleBoard = design.board;
      else delete play.dataset.puzzleBoard;
      play.style.setProperty('--puzzle-illustration', artUrl(design.scene || design.piece));
      play.style.setProperty('--puzzle-piece', artUrl(design.piece));
      play.style.setProperty('--puzzle-hue', String(design.hue));
    } else {
      delete play.dataset.puzzleIllustration;
      delete play.dataset.puzzleTone;
      delete play.dataset.puzzleBoard;
      play.style.removeProperty('--puzzle-illustration');
      play.style.removeProperty('--puzzle-piece');
      play.style.removeProperty('--puzzle-hue');
    }
  }

  function addDesignPreview(card, design) {
    const preview = document.createElement('div');
    preview.className = 'fit-opening-preview';
    const piece = document.createElement('img');
    piece.src = new URL(design.piece, document.baseURI).href;
    piece.alt = '';
    piece.decoding = 'async';
    const action = document.createElement('p');
    action.textContent = design.action;
    preview.append(piece, action);
    $('.fit-opening-title', card).after(preview);
  }

  let lastFocus;
  function closeOpening() {
    $('#fit-opening-overlay')?.remove();
    if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }

  function crewMarkup(speaker) {
    const id = Object.hasOwn(heroes, speaker) ? speaker : 'rawaa';
    return `<img class="fit-opening-full-hero" src="treasure/art/story5/crew_full_${id}.webp" alt="${heroes[id]}">`;
  }

  function openOpening(id, replay, begin) {
    const g = GM[id];
    if (!g) return;
    const station = RUN?.journeyStation && window.__MINDLAB_JOURNEY_MAP?.stations.find(item => item.id === id);
    const entry = station ? { hero: station.hero, dialogue: station.openingTextAr } : window.__MINDLAB_OPENINGS_DATA?.[id];
    const current = RUN?.authoredStage;
    const stageDescription = current?.id === id ? current.board.description : null;
    closeOpening();
    lastFocus = document.activeElement;

    const d = document.createElement('div');
    d.id = 'fit-opening-overlay';
    d.className = 'fit-opening-overlay' + (g.puz ? ' puzzle-opening' : '');
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.setAttribute('aria-labelledby', 'fit-opening-name');
    d.innerHTML = `<div class="fit-opening-card" dir="rtl">
      <button type="button" class="fit-opening-dismiss" id="fit-op-start" aria-label="${replay ? 'إغلاق القواعد والعودة للعب' : 'إغلاق القواعد'}">×</button>
      <div class="fit-opening-body">
        <h3 id="fit-opening-name" class="fit-opening-title"></h3>
        <div class="fit-opening-bubble" hidden></div>
        <ol class="fit-opening-rules"></ol>
      </div>
    </div>`;
    $('#fit-opening-name', d).textContent = g.name;
    const design = designFor(id);
    if (design && !replay) addDesignPreview(d, design);
    const bubble = $('.fit-opening-bubble', d);
    if (entry?.dialogue) {
      bubble.hidden = false;
      bubble.innerHTML = crewMarkup(entry.hero);
      const line = document.createElement('span');
      line.textContent = entry.dialogue;
      bubble.append(line);
    }
    const rules = $('.fit-opening-rules', d);
    for (const rule of [...(Array.isArray(g.how) ? g.how : []), ...(stageDescription ? [stageDescription] : [])]) {
      const li = document.createElement('li');
      li.textContent = rule;
      rules.append(li);
    }
    if (!rules.childElementCount && g.why) {
      const li = document.createElement('li');
      li.textContent = g.why;
      rules.append(li);
    }

    const dismiss = event => {
      event.preventDefault();
      event.stopPropagation();
      closeOpening();
      begin?.();
    };
    const button = $('#fit-op-start', d);
    if (g.puz) puzzleAction(button, replay ? 'close' : 'start', replay ? 'إغلاق القواعد والعودة للعب' : 'ابدأ اللغز');
    button.addEventListener('click', dismiss);
    d.addEventListener('click', event => { if (event.target === d) dismiss(event); });
    d.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') dismiss(event);
      if (event.key === 'Tab') event.preventDefault();
    });
    $('#play').append(d);
    button.focus({ preventScroll: true });
  }

  const oldCountdown = countdown;
  countdown = function () {
    const current = game();
    if (!current) return;
    const run = RUN;
    applyIllustration(current);
    stopAll();
    openOpening(current.id, false, () => {
      if (RUN === run && game()?.id === current.id) oldCountdown.apply(this, arguments);
    });
  };

  const oldIntro = showIntro;
  showIntro = function () {
    const current = game();
    if (!current) return oldIntro.apply(this, arguments);
    applyIllustration(current);
    oldIntro.apply(this, arguments);
    // Authored tracks and story station pickers run their own stage selection.
    const go = $('#stage > #go');
    if (go && current.puz) {
      go.hidden = true;
      $('.intro', $('#stage'))?.setAttribute('hidden', '');
      go.click();
    }
  };

  function decorateResult(current) {
    const result = $('#stage > .res');
    if (!result) return;

    const stars = $('.bigstars', result);
    if (stars) {
      let earned = 0;
      for (const star of stars.querySelectorAll('svg')) {
        const active = $('path', star)?.getAttribute('fill') === 'var(--gold)';
        star.dataset.earned = String(active);
        star.setAttribute('aria-hidden', 'true');
        earned += Number(active);
      }
      stars.setAttribute('role', 'img');
      stars.setAttribute('aria-label', `${earned} من ٣ نجوم`);
    }

    const actions = { nx: 'next', fin: 'check', ag: current.kid ? 'retry' : 'next', rpl: 'retry', shch: 'share', hm: 'home' };
    const buttons = $('.rbtns', result);
    for (const button of buttons.querySelectorAll('button')) puzzleAction(button, actions[button.id]);
    const share = $('#shch', buttons);
    if (share && !share.hidden) {
      const click = share.onclick;
      share.onclick = async function (event) {
        const label = this.getAttribute('aria-label');
        await click.call(this, event);
        if (!this.isConnected || this.querySelector('svg')) return;
        let status = $('.puzzle-share-status', buttons);
        if (!status) {
          status = document.createElement('small');
          status.className = 'puzzle-share-status';
          status.setAttribute('role', 'status');
          buttons.append(status);
        }
        status.textContent = this.textContent;
        puzzleAction(this, 'share', label);
      };
    }
  }

  if (typeof finish === 'function') {
    const oldFinish = finish;
    finish = function () {
      const current = game();
      const value = oldFinish.apply(this, arguments);
      if (current?.puz) decorateResult(current);
      return value;
    };
  }

  const oldClose = closePlay;
  closePlay = function () {
    closeOpening();
    applyIllustration(null);
    return oldClose.apply(this, arguments);
  };
  $('#quit').onclick = closePlay;
  window.fitOpenings = { open: openOpening, close: closeOpening, crewMarkup };
})();
