/* Show a rules sheet before a round starts and make the story replayable from the HUD. */
(function () {
  'use strict';
  if (window.__MINDLAB_OPENINGS_UI) return;
  window.__MINDLAB_OPENINGS_UI = true;

  const $ = (s, r = document) => r.querySelector(s);
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
    d.className = 'fit-opening-overlay';
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
    stopAll();
    openOpening(current.id, false, () => {
      if (RUN === run && game()?.id === current.id) oldCountdown.apply(this, arguments);
    });
  };

  const oldIntro = showIntro;
  showIntro = function () {
    const current = game();
    if (!current) return oldIntro.apply(this, arguments);
    if (current.puz) $('#play').dataset.playPaper = paper(current.id);
    else delete $('#play').dataset.playPaper;
    oldIntro.apply(this, arguments);
    // Authored tracks and story station pickers run their own stage selection.
    const go = $('#stage > #go');
    if (go && current.puz) {
      go.hidden = true;
      $('.intro', $('#stage'))?.setAttribute('hidden', '');
      go.click();
    }
  };

  const oldClose = closePlay;
  closePlay = function () {
    closeOpening();
    delete $('#play').dataset.playPaper;
    return oldClose.apply(this, arguments);
  };
  $('#quit').onclick = closePlay;
  window.fitOpenings = { open: openOpening, close: closeOpening, crewMarkup };
})();
