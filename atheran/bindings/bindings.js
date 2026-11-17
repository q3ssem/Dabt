/* 5.5.28 athran-assets-2 — Atheran interactive bindings: the 80 puzzle-piece states, the 14 UI frames and the VFX
   (14 sprite sheets + 21 puzzle effects + 14 relic effects) attached to the screens and events they belong to.
   Display layer only: it reads the DOM the engines already produce and the classes they already toggle.
   No engine, id, save key or progress rule changes. Asset ids and paths are read from the approved registry
   (window.MINDLAB_ATHRAN_ASSETS); nothing is renamed or moved. */
(function () {
  'use strict';
  const REG = window.MINDLAB_ATHRAN_ASSETS;
  if (!REG || window.ATHRAN_BINDINGS) return;
  const url = id => (REG.url ? REG.url(id) : '') || '';
  const $ = (s, r = document) => r.querySelector(s);
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  /* ------------------------------------------------------------------ 1. puzzle-piece states
     For each station: the element that is the piece, and how each approved state reads in that engine's DOM.
     Priority when several apply: wrong > correct/success > selected > active > disabled > default.
     "solved" = #pzb.solved (set by the runner on a win); "wrong" = the 700 ms after sfx.bad() (every api.wrong()). */
  const PIECES = {
    pz_aarch: { piece: '.mk-slot[data-slot]', art: 'archive_card', states: { selected: '.full' } },  // motion-batch-1: slots of the drag board
    pz_aport: { piece: '.aptb', art: 'tide_gate', mode: 'cap', base: null, states: { disabled: '.shut', active: ':not(.shut)' }, win: 'success', winOn: ':not(.shut)' },
    pz_alight: { piece: '.altw', order: ['active', 'selected'], art: 'lens_ring_slot', states: { active: ':has(#altl[opacity="1"])', selected: ':has(.altw-s.cur)' }, win: 'success' },
    pz_acur: { piece: '[data-s]', art: 'drift_token', states: { selected: ':has(em svg)' } },
    pz_ashell: { piece: '.ashc', art: 'music_shell', states: { selected: '.sel', active: '.used' }, win: 'success' },
    pz_aroot: { piece: '#artw i', art: 'root_tile', mode: 'fill', pre: { default: '.bank i' }, states: { active: '.on', disabled: ':not(.on)' }, wrongOn: '.me' },
    pz_aring: { piece: '.args', art: 'tree_ring_band', states: { selected: '.sel' }, noWrong: true },
    pz_ashade: { piece: '#asdg [data-k].sel', art: 'glass_pillar', base: null, states: { selected: '.sel' }, winOn: '.sel', wrongOn: '.sel' },
    pz_aswarm: { piece: '.aswc', art: 'swarm_cell', states: { active: '.rev', disabled: '.gone' }, win: 'success', winOn: '.rev', noWrong: true },
    pz_aecho: { piece: '.rock,.post,[data-k].sel', art: 'echo_node', states: { selected: '.sel' }, winOn: '.sel', wrongOn: '.sel' },
    pz_avsong: { piece: '[data-v]', art: 'echo_bird_note', states: { active: '.ah-pressed', selected: '.ah-last:not(.ah-pressed)' }, win: 'success', noWrong: true },
    pz_agiant: { piece: '[data-k].sel,[data-k]:has(i.g0.s2)', art: 'giant_marker', states: { selected: '.sel' }, winOn: '.sel', wrongOn: '.sel' },
    pz_aherd: { piece: '#ahew i', art: 'herd_path_tile', mode: 'fill', states: { active: '.goal', disabled: '.orb' }, wrongOn: ':has(.me)', noWin: true },
    pz_abridge: { piece: '#abrtop g[data-i]', art: 'fog_pillar', mode: 'svg', states: { selected: ':has(circle[stroke="#9B2B1F"])' } },
    pz_asilent: { piece: '[data-o]', art: 'silent_event_token', states: { selected: '.ah-pressed,.ah-last' }, winOn: '.ah-last', wrongOn: '.ah-last' },
    pz_alayer: { piece: '.mk-slot.tl', art: 'strata_slab', base: null, states: { selected: '.full' }, winOn: '.full', wrongOn: '.mk-wrong' },
    pz_acity: { piece: '#actweb .mk-sp', art: 'city_lantern_node', mode: 'svg', svgAt: [14, -14, 9], states: { active: '.lit', disabled: '.dark:not(.cause):not(.relit)', selected: '.cause' }, winOn: '.relit,.lit', corrOn: '.relit', wrongOn: '.cause' },
    pz_asong: { piece: '[data-i]', art: 'whale_song_crest', states: { selected: '.sel' }, winOn: '.sel', wrongOn: '.sel' },
    pz_aflow: { piece: '[data-b]', art: 'jelly_fork_gate', states: { selected: '.sel' }, winOn: '.sel', wrongOn: '.sel' },
    pz_arelic: { piece: '.mk-tok.src', art: 'chronicle_tablet', states: { selected: '[data-slot="cmp"] .mk-tok' }, winOn: '[data-slot="cmp"] .mk-tok', wrongOn: '[data-slot="cmp"] .mk-tok' },
    pz_aheart: { piece: '[data-i]', art: 'coast_stone_tile', states: { active: '.work-match', selected: '.sel' }, win: 'success', winOn: '.sel', noWrong: true }
  };
  const has = id => !!(REG.get ? REG.get(id) : url(id));
  const artId = (gid, art, st) => `${gid}_${art}_${st}`;
  const ORDER = ['selected', 'active', 'disabled'];
  const matches = (el, sel) => { try { return el.matches(sel); } catch (e) { return false; } };

  function stateOf(gid, cfg, el, pzb) {
    const winState = cfg.win || 'correct';
    if (pzb.classList.contains('ah-wrong') && !cfg.noWrong && (!cfg.wrongOn || matches(el, cfg.wrongOn)) && has(artId(gid, cfg.art, 'wrong'))) return 'wrong';
    if (cfg.corrOn && matches(el, cfg.corrOn) && has(artId(gid, cfg.art, 'correct'))) return 'correct';
    if (pzb.classList.contains('solved') && !cfg.noWin && (!cfg.winOn || matches(el, cfg.winOn)) && has(artId(gid, cfg.art, winState))) return winState;
    for (const st in (cfg.pre || {})) if (matches(el, cfg.pre[st]) && has(artId(gid, cfg.art, st))) return st;
    for (const st of (cfg.order || ORDER)) { const sel = cfg.states && cfg.states[st]; if (sel && matches(el, sel) && has(artId(gid, cfg.art, st))) return st; }
    if (cfg.base === null) return '';
    return has(artId(gid, cfg.art, 'default')) ? 'default' : '';
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  const seen = id => { if (id && window.__test) (window.__ahPieceSeen = window.__ahPieceSeen || {})[id] = 1; };
  function paint(gid) {
    const cfg = PIECES[gid], pzb = $('#pzb'); if (!cfg || !pzb) return;
    pzb.dataset.ahPieces = gid;
    pzb.querySelectorAll(cfg.piece).forEach(el => {
      const st = stateOf(gid, cfg, el, pzb), id = st ? artId(gid, cfg.art, st) : '', u = id ? url(id) : ''; seen(id);
      if (cfg.mode === 'svg') {
        let im = el.querySelector(':scope > image.ah-pc');
        if (!u) { if (im) im.remove(); return; }
        const c = el.querySelector('circle'); if (!c) return;
        if (!im) { im = document.createElementNS(SVGNS, 'image'); im.setAttribute('class', 'ah-pc'); im.setAttribute('pointer-events', 'none'); const t = el.querySelector('text'); el.insertBefore(im, t || null); }
        const at = cfg.svgAt || [0, 0, 13], cx = +c.getAttribute('cx') + at[0], cy = +c.getAttribute('cy') + at[1], r = at[2];
        im.setAttribute('x', cx - r); im.setAttribute('y', cy - r); im.setAttribute('width', 2 * r); im.setAttribute('height', 2 * r);
        if (im.getAttribute('href') !== u) im.setAttribute('href', u);
        im.dataset.state = st; im.dataset.asset = id; return;
      }
      el.classList.add('ah-piece', cfg.mode === 'fill' ? 'ah-piece-fill' : cfg.mode === 'cap' ? 'ah-piece-cap' : 'ah-piece-badge');
      if (el.dataset.ahState !== st) { el.dataset.ahState = st; el.dataset.ahAsset = id; el.style.setProperty('--ah-piece', u ? `url("${u}")` : 'none'); }
    });
  }

  /* ------------------------------------------------------------------ 2. VFX
     Sprite sheets are 1024×256: four 256-px frames (the inventory says "8 × 128"; the pixels say 4 × 256 — the player
     reads the real image). One overlay at a time, pointer-events none, skipped under prefers-reduced-motion. */
  const SHEET_FRAMES = 4;
  function vfx(id, opt = {}) {
    const u = url(id); if (!u || reduced()) return null;
    const host = opt.host || document.body, el = document.createElement('div');
    const sheet = /^vfx_/.test(id);
    el.className = 'ah-vfx' + (sheet ? ' ah-vfx-sheet' : ' ah-vfx-still') + (opt.cls ? ' ' + opt.cls : '');
    el.dataset.vfx = id; el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--ah-vfx', `url("${u}")`); el.style.setProperty('--ah-vfx-frames', SHEET_FRAMES);
    if (opt.size) el.style.setProperty('--ah-vfx-size', opt.size + 'px');
    host.append(el);
    (window.__ahVfxLog = window.__ahVfxLog || []).push(id);
    setTimeout(() => el.remove(), opt.ms || 1100);
    return el;
  }
  // station → the sheet that matches its mechanism (played with the station's own success effect)
  const STATION_SHEET = { pz_aport: 'vfx_gate_open', pz_alight: 'vfx_dial_rotate', pz_aheart: 'vfx_mechanism_activate', pz_aflow: 'vfx_water_flow', pz_ashade: 'vfx_sand_shift', pz_aswarm: 'vfx_crystal_sparkle', pz_acur: 'vfx_chest_open', pz_aroot: 'vfx_mechanism_activate' };
  const isStation = id => typeof ASTN !== 'undefined' && ASTN.some(s => s.id === id);
  const isSecret = id => typeof ASW !== 'undefined' && ASW.some(w => w.id === id);
  const regionOf = i => { try { return AREG.findIndex(r => r.st && r.st.includes(i)); } catch (e) { return -1; } };

  if (typeof aWin === 'function') {
    const aWin0 = aWin;
    aWin = function (api, id) {
      const before = (() => { try { const a = aState(); return { tr: (a.tr || []).length, done: !!a.done[id], prog: a.prog }; } catch (e) { return {}; } })();
      const r = aWin0.apply(this, arguments);
      try {
        const play = $('#play');
        vfx('vfx_solve_success', { host: play, cls: 'ah-vfx-center' });
        if (isStation(id)) {
          vfx(`${id}_success_vfx`, { host: play, cls: 'ah-vfx-center ah-vfx-late' })
            || vfx({ pz_aecho: 'pz_aecho_sound_wave_vfx', pz_abridge: 'pz_abridge_mist_discovery_vfx', pz_asilent: 'pz_asilent_ripple_success_vfx', pz_alayer: 'pz_alayer_strata_glow_vfx', pz_acity: 'pz_acity_biolight_success_vfx', pz_asong: 'pz_asong_wave_success_vfx', pz_aflow: 'pz_aflow_current_success_vfx', pz_arelic: 'pz_arelic_truth_success_vfx', pz_aheart: 'pz_aheart_heart_success_vfx' }[id], { host: play, cls: 'ah-vfx-center ah-vfx-late' });
          if (STATION_SHEET[id]) vfx(STATION_SHEET[id], { host: play, cls: 'ah-vfx-corner' });
        }
        const a = aState();
        if (isStation(id) && !before.done && a.done[id]) vfx('vfx_heroines_celebrate', { host: play, cls: 'ah-vfx-top', ms: 1400 });
        const tr = (a.tr || []);
        if (tr.length > (before.tr || 0)) {
          const n = tr[tr.length - 1], num = String(n + 1).padStart(2, '0');
          vfx('vfx_relic_appear', { host: play, cls: 'ah-vfx-center ah-vfx-late2' });
          vfx(`relic_${num}_vfx`, { host: play, cls: 'ah-vfx-center ah-vfx-late2', size: 220, ms: 1600 });
        }
        if (isStation(id) && a.prog > (before.prog || 0)) {
          const i = ASTN.findIndex(s => s.id === id), j = a.prog;
          if (j < ASTN.length && regionOf(j) !== regionOf(i)) sessionStorage.setItem('ah-region-transition', String(regionOf(j)));
        }
      } catch (e) { console.warn('[Atheran bindings] win vfx', e); }
      return r;
    };
  }
  // a region opened: play the transition when the atlas is shown next
  function regionTransition() { const k = sessionStorage.getItem('ah-region-transition'); if (k == null) return; sessionStorage.removeItem('ah-region-transition'); vfx('vfx_region_transition', { cls: 'ah-vfx-screen', ms: 1300 }); }
  if (typeof aSwOpen === 'function') {
    const sw0 = aSwOpen;
    aSwOpen = function (k) {
      let fresh = false; try { fresh = !((aState().sw || {})[k]); } catch (e) {}
      const r = sw0.apply(this, arguments);
      try { vfx(fresh ? 'vfx_discovery_glow' : 'vfx_secret_world_ignite', { cls: 'ah-vfx-screen', ms: 1200 }); } catch (e) {}
      return r;
    };
  }
  // entering a secret world
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-play]'); if (b && isSecret(b.dataset.play)) vfx('vfx_secret_world_ignite', { cls: 'ah-vfx-screen', ms: 1200 }); }, true);
  // wrong answer: transient state on the pieces (sfx.bad is called by every api.wrong())
  if (typeof sfx === 'object' && sfx && typeof sfx.bad === 'function') {
    const bad0 = sfx.bad;
    sfx.bad = function () { const r = bad0.apply(this, arguments); const pzb = $('#pzb'), g = pzb && pzb.dataset.ahPieces; if (g) { pzb.classList.add('ah-wrong'); paint(g); setTimeout(() => { pzb.classList.remove('ah-wrong'); paint(g); }, 700); } return r; };
  }

  /* ------------------------------------------------------------------ 3. UI frames (9-slice borders derived from the 14 frames) */
  const FRAME = (el, id) => { if (el && el.dataset.ahFrame !== id) { el.dataset.ahFrame = id; el.style.setProperty('--ah-frame', `url("${new URL(`atheran/bindings/frames/${id}.png`, document.baseURI).href}")`); el.classList.add('ah-framed'); } };
  function frames() {
    FRAME($('.ah-launch'), 'ui_athran_campaign_cover');
    FRAME($('#v-puz.ah-view .ah-top'), 'ui_athran_campaign_cover');
    FRAME($('#v-puz.ah-view .amapw'), 'ui_world_map_frame');
    document.querySelectorAll('.xvaultm .xpin').forEach(p => {
      if (p.querySelector('#afin')) FRAME(p, 'ui_epilogue_frame');
      else if (p.querySelector('.atrl')) FRAME(p, 'ui_relics_screen_frame');
      else if (p.querySelector('.ares')) FRAME(p, 'ui_secret_worlds_frame');
      else if (p.querySelector('.ah-region-art')) FRAME(p, 'ui_region_card_frame');
      else if (p.querySelector('.ah-station-main,.zwhy') && p.querySelector('.xvh')) FRAME(p, 'ui_station_card_frame');
    });
    FRAME($('.atheran-book'), 'ui_journal_book_frame');  // دفتر أَثْرَان (the journal opened from every Atheran screen)
    const play = $('#play'), g = play && play.dataset.laGame;
    const ath = g && (isStation(g) || isSecret(g));
    if (!ath) return;
    const stage = $('#stage');
    if (stage && stage.querySelector('#go')) FRAME(stage.firstElementChild, 'ui_stage_entry_frame');
    const sheet = $('#pzb .xpaper'); if (sheet) FRAME(sheet, 'ui_gameplay_hud_frame');
    document.querySelectorAll('#play .pzhint').forEach(h => { if (!h.dataset.ahFrame) { FRAME(h, 'ui_hint_modal_frame'); vfx('vfx_hint_appear', { host: h, cls: 'ah-vfx-badge', size: 56, ms: 900 }); } });
    const res = stage && stage.querySelector('.res');
    if (res && !res.dataset.ahFrame) {
      const lit = res.querySelectorAll('.bigstars path[fill="var(--gold)"]').length, won = play.dataset.ahOutcome === 'win';
      FRAME(res, !won ? 'ui_retry_screen_frame' : lit >= 3 ? 'ui_perfect_win_frame' : 'ui_win_screen_frame');
    }
  }

  /* ------------------------------------------------------------------ relics: the 14-slot collection strip
     The relics screen lists only what was found. Above the list, a strip of all 14 slots: a found relic shows its
     approved icon, a missing one its approved silhouette, so the player sees how many remain (no names revealed). */
  if (typeof aTraces === 'function') {
    const tr0 = aTraces;
    aTraces = function () {
      const r = tr0.apply(this, arguments);
      try {
        const pins = document.querySelectorAll('.xvaultm .xpin'), pin = pins[pins.length - 1];
        if (pin && pin.querySelector('.atrl') && !pin.querySelector('.ah-relic-strip')) {
          const found = new Set(aState().tr || []), n = (typeof ATR !== 'undefined' && ATR.length) || 14;
          const strip = document.createElement('div'); strip.className = 'ah-relic-strip'; strip.setAttribute('aria-label', `الآثار: ${found.size} من ${n}`);
          for (let i = 0; i < n; i++) { const num = String(i + 1).padStart(2, '0'), id = found.has(i) ? `relic_${num}_icon` : `relic_${num}_silhouette`; const u = url(id); if (!u) continue;
            const im = document.createElement('img'); im.src = u; im.alt = ''; im.dataset.asset = id; im.className = found.has(i) ? 'got' : 'miss'; strip.append(im); }
          const h = pin.querySelector('.zwhy') || pin.querySelector('.xvh'); (h || pin.firstChild).after(strip);
        }
      } catch (e) { console.warn('[Atheran bindings] relic strip', e); }
      return r;
    };
  }

  /* ------------------------------------------------------------------ atlas: keep the 18 map stations tappable on narrow phones
     Station buttons sit at the story coordinates. Below ~400 px some neighbours (e.g. 9 and 18) share pixels, so a tap
     could open the wrong station. Spread overlapping buttons just enough to separate them (display only, the stored
     coordinates are untouched) and move each map marker with its button. */
  function spreadMap() {
    const btns = [...document.querySelectorAll('#v-puz .ahub .amst')]; if (btns.length < 2) return;
    const box = btns[0].offsetParent; if (!box) return;
    const W = box.clientWidth, H = box.clientHeight; if (!W || !H) return;
    const marks = [...document.querySelectorAll('#v-puz .ah-map-marker')];
    const D = btns[0].offsetWidth + 2, P = btns.map(b => { b.dataset.ahX = b.dataset.ahX || b.style.left; b.dataset.ahY = b.dataset.ahY || b.style.top;
      return { b, x: parseFloat(b.dataset.ahX) / 100 * W, y: parseFloat(b.dataset.ahY) / 100 * H }; });
    for (let it = 0; it < 60; it++) {
      let moved = false;
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const a = P[i], c = P[j], dx = c.x - a.x, dy = c.y - a.y, gap = Math.max(Math.abs(dx), Math.abs(dy));
        if (gap >= D) continue;
        moved = true; const push = (D - gap) / 2 + .5;
        if (Math.abs(dx) >= Math.abs(dy)) { const sx = dx >= 0 ? 1 : -1; a.x -= sx * push; c.x += sx * push; }
        else { const sy = dy >= 0 ? 1 : -1; a.y -= sy * push; c.y += sy * push; }
      }
      P.forEach(q => { q.x = Math.min(W - D / 2, Math.max(D / 2, q.x)); q.y = Math.min(H - D / 2, Math.max(D / 2, q.y)); });
      if (!moved) break;
    }
    P.forEach((q, k) => { const l = (q.x / W * 100).toFixed(2) + '%', t = (q.y / H * 100).toFixed(2) + '%'; q.b.style.left = l; q.b.style.top = t; if (marks[k]) { marks[k].style.left = l; marks[k].style.top = t; } });
  }
  addEventListener('resize', () => requestAnimationFrame(spreadMap));

  /* ------------------------------------------------------------------ offline: a station started online stays playable offline
     The 546 images (≈128 MB) are not precached. When a station opens, its own images (three stage backgrounds, piece
     states, effects) are fetched once in the background; the service worker keeps them, so the next stages and replays
     work without a connection. Shared effects and the frames are small and cached at install. */
  const warmed = {};
  function warmStation(id) {
    if (warmed[id] || !navigator.onLine) return; warmed[id] = 1;
    const recs = (REG.byStation && REG.byStation[id]) || [];
    const urls = [...new Set(recs.map(r => url(r.asset_id)).filter(Boolean))];
    const run = () => { let i = 0; const next = () => { if (i >= urls.length) return; fetch(urls[i++], { credentials: 'same-origin' }).catch(() => {}).finally(next); }; next(); next(); };
    (window.requestIdleCallback || (f => setTimeout(f, 400)))(run);
    (window.__ahWarm = window.__ahWarm || {})[id] = urls.length;
  }

  /* ------------------------------------------------------------------ wiring */
  let raf = 0;
  const tick = () => { raf = 0; const play = $('#play'), g = play && !play.hidden && play.dataset.laGame; const pzb = $('#pzb');
    if (g && (isStation(g) || isSecret(g))) warmStation(g);
    if (pzb && pzb.classList.contains('solved') && play) play.dataset.ahOutcome = 'win';
    if (g && PIECES[g]) paint(g); frames(); };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const play = $('#play');
  if (play) {
    new MutationObserver(ms => { if (ms.some(m => m.target === play && m.attributeName === 'data-la-game')) delete play.dataset.ahOutcome; schedule(); })
      .observe(play, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-la-game', 'hidden', 'fill', 'stroke', 'opacity'] });
  }
  new MutationObserver(schedule).observe(document.body, { childList: true });
  const vp = $('#v-puz'); if (vp) new MutationObserver(() => { schedule(); if (vp.classList.contains('ah-view')) { regionTransition(); requestAnimationFrame(spreadMap); setTimeout(spreadMap, 400); setTimeout(spreadMap, 1200); } }).observe(vp, { childList: true });
  // bird notes and silent-water answers have no pressed/answered class of their own: mark the press briefly and
  // remember the last answered piece, so "wrong"/"correct" land on the piece the player actually chose
  const press = b => { b.parentElement && b.parentElement.querySelectorAll('.ah-last').forEach(x => x !== b && x.classList.remove('ah-last')); b.classList.add('ah-pressed', 'ah-last'); setTimeout(() => { b.classList.remove('ah-pressed'); schedule(); }, 350); schedule(); };
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#pzb[data-ah-pieces="pz_avsong"] [data-v],#pzb[data-ah-pieces="pz_asilent"] [data-o]'); if (b) press(b); }, true);
  schedule();
  window.ATHRAN_BINDINGS = { PIECES, vfx, paint, frames, stateOf, spreadMap };
})();
