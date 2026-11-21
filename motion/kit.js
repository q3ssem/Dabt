/* motion-batch-1 — shared drag kit for the converted puzzles.
   Tokens ([data-tok]) are dragged with the finger/mouse onto slots ([data-slot]) or back to a tray ([data-tray]).
   Touch alternative: tap a token (it lights up), then tap a slot. Keyboard: Enter/Space on a token, then on a slot.
   The kit only moves pieces; each puzzle keeps its own generator, rules, win path and save. */
(function () {
  'use strict';
  if (window.MK) return;
  const svgNS = 'http://www.w3.org/2000/svg';
  function attach(root, opt) {
    // opt: { drop(tokId, slotId|null, tokEl, slotEl), canDrag(tokEl), onPick(tokId) }
    let sel = null, drag = null, auto = 0, last = null;
    // edge auto-scroll while dragging: near the top/bottom edge of the screen (or of the scrolling stage) the page follows the finger
    const scroller = () => { for (let e = root.parentElement; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2) return e; } return document.scrollingElement || document.documentElement; };
    const tick = () => { auto = 0; if (!drag || !drag.moved || !last) return; const sc = scroller(), top = sc === document.scrollingElement || sc === document.documentElement ? 0 : sc.getBoundingClientRect().top,
        bot = sc === document.scrollingElement || sc === document.documentElement ? innerHeight : sc.getBoundingClientRect().bottom, E = 64; let v = 0;
      if (last.y < top + E) v = -Math.ceil((top + E - last.y) / 5); else if (last.y > bot - E) v = Math.ceil((last.y - (bot - E)) / 5);
      if (v) { const before = sc.scrollTop; sc.scrollTop += v; if (sc.scrollTop !== before) { mark(last.x, last.y); auto = requestAnimationFrame(tick); } } };
    const mark = (x, y) => { root.querySelectorAll('.mk-over').forEach(q => q.classList.remove('mk-over')); if (!drag || !drag.ghost) return; drag.ghost.style.visibility = 'hidden'; const t = target(x, y); drag.ghost.style.visibility = ''; if (t && root.contains(t)) t.classList.add('mk-over'); };
    const clearSel = () => { root.querySelectorAll('.mk-sel').forEach(e => e.classList.remove('mk-sel')); root.classList.remove('mk-picking'); sel = null; };
    const target = (x, y) => { const el = document.elementFromPoint(x, y); return el && (el.closest('[data-slot]') || el.closest('[data-tray]')); };
    const place = (tok, dst) => { if (!dst || !root.contains(dst)) return false; const sid = dst.dataset.slot != null ? dst.dataset.slot : null; opt.drop(tok.dataset.tok, sid, tok, dst); return true; };
    root.addEventListener('pointerdown', e => {
      const tok = e.target.closest('[data-tok]'); if (!tok || !root.contains(tok) || tok.getAttribute('aria-disabled') === 'true') return;
      if (opt.canDrag && !opt.canDrag(tok)) return;
      drag = { tok, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, ghost: null };
    });
    root.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 7) return;
      if (!drag.moved) {
        drag.moved = true; clearSel();
        const r = drag.tok.getBoundingClientRect(), g = drag.tok.cloneNode(true);
        g.classList.add('mk-ghost'); g.removeAttribute('data-tok'); g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
        drag.ox = e.clientX - r.left; drag.oy = e.clientY - r.top; document.body.append(g); drag.ghost = g; drag.tok.classList.add('mk-lift');
        try { root.setPointerCapture(e.pointerId); } catch (_) {}
      }
      e.preventDefault();
      drag.ghost.style.transform = `translate(${e.clientX - drag.ox}px,${e.clientY - drag.oy}px)`;
      last = { x: e.clientX, y: e.clientY }; mark(e.clientX, e.clientY); if (!auto) auto = requestAnimationFrame(tick);
    }, { passive: false });
    const end = e => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const d = drag; drag = null; last = null; if (auto) { cancelAnimationFrame(auto); auto = 0; } root.querySelectorAll('.mk-over').forEach(x => x.classList.remove('mk-over'));
      if (d.moved) { d.tok.classList.remove('mk-lift'); if (d.ghost) d.ghost.remove(); if (e && e.type === 'pointerup') place(d.tok, target(e.clientX, e.clientY)); return; }
      // a tap: select the token, or place the selected token on a tapped slot
      if (sel === d.tok) { clearSel(); return; }
      // a piece is picked and the player taps a slot that already holds a piece: place (swap) instead of re-picking
      const hold = sel && d.tok.parentElement && d.tok.parentElement.closest('[data-slot]');
      if (hold && root.contains(hold)) { const t = sel; clearSel(); place(t, hold); return; }
      clearSel(); sel = d.tok; d.tok.classList.add('mk-sel'); root.classList.add('mk-picking'); if (opt.onPick) opt.onPick(d.tok.dataset.tok);
    };
    root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
    root.addEventListener('click', e => {
      if (!sel || e.target.closest('[data-tok]')) return;
      const dst = e.target.closest('[data-slot]') || e.target.closest('[data-tray]'); if (!dst || !root.contains(dst)) return;
      const tok = sel; clearSel(); place(tok, dst);
    });
    root.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const tok = e.target.closest('[data-tok]'), dst = e.target.closest('[data-slot]') || e.target.closest('[data-tray]');
      const holdK = tok && sel && sel !== tok && tok.parentElement && tok.parentElement.closest('[data-slot]');
      if (holdK && root.contains(holdK)) { e.preventDefault(); const t = sel; clearSel(); place(t, holdK); return; }
      if (tok) { e.preventDefault(); if (sel === tok) clearSel(); else { clearSel(); sel = tok; tok.classList.add('mk-sel'); root.classList.add('mk-picking'); } }
      else if (dst && sel) { e.preventDefault(); const t = sel; clearSel(); place(t, dst); }
    });
    return { clear: clearSel };
  }
  // tiny helpers shared by the converted puzzles
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icon = (paths, color = '#3A2616', fill = 'none', vb = '0 0 40 40') => `<svg viewBox="${vb}" aria-hidden="true"><g fill="${fill}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
  const REL = { // relation pictograms
    eq: '<span class="mk-rel eq" title="هو نفسه">=</span>', ne: '<span class="mk-rel ne" title="ليس">≠</span>',
    before: '<span class="mk-rel seq" title="قبل">◀</span>', after: '<span class="mk-rel seq" title="بعد">▶</span>',
    next: '<span class="mk-rel nx" title="مباشرة بعد">▶|</span>'
  };
  window.MK = { attach, esc, icon, REL, svgNS };
})();

/* Presentation for the bridge, cave and loot rounds. The native builders own every move. */
(function () {
  'use strict';
  if (typeof pzPlay !== 'function') return;
  const renderers = { pz_xbridge: bridge, pz_xcave: cave, pz_xloot: loot };
  const play = pzPlay;

  function artwork(targets, file) {
    if (!targets.length) return;
    const image = new Image();
    image.onload = () => {
      for (const target of targets) {
        if (target.isConnected) target.classList.add('pirate-painted');
      }
    };
    image.src = 'motion/pirate-revised/' + file + '.webp';
  }

  function bridge(body) {
    const stage = body.querySelector('#xgw');
    const tray = body.querySelector('#xgtray');
    if (!stage || !tray) return;
    const widthInUnits = Number(tray.style.getPropertyValue('--W'));
    if (widthInUnits > 0) {
      const setScale = () => tray.style.setProperty('--bridge-unit', stage.clientWidth * 0.92 / widthInUnits + 'px');
      const watch = new ResizeObserver(setScale);
      watch.observe(stage);
      cleanup.push(() => watch.disconnect());
      setScale();
    }
    artwork([...stage.querySelectorAll('.xgp')], 'bridge/pier');
  }

  function cave(body) {
    artwork([...body.querySelectorAll('.xcst2')], 'cave/torch');
    artwork([...body.querySelectorAll('.xcslab2')], 'cave/slab');
  }

  function loot(body) {
    const crew = [...body.querySelectorAll('.xlcrew > button.xlp')];
    const portraits = ['captain', 'sailor', 'cook', 'gunner'];
    crew.forEach((oldCard, index) => {
      const card = document.createElement('article');
      card.className = oldCard.className;
      card.dataset.p = oldCard.dataset.p;
      const recipient = document.createElement('button');
      recipient.type = 'button';
      recipient.className = 'xlrecipient';
      const [portrait, name, total, bags] = oldCard.children;
      total.setAttribute('aria-live', 'polite');
      recipient.append(portrait, name, total);
      recipient.onclick = oldCard.onclick.bind(card);
      card.append(recipient, bags);
      oldCard.replaceWith(card);
      artwork([portrait], 'loot/' + portraits[index]);
    });
    const restoreFocus = event => {
      const bag = event.target.closest('.xlbag');
      if (!bag || event.detail !== 0) return;
      const same = body.querySelector('.xlbag[data-b="' + bag.dataset.b + '"]');
      if (same && same !== bag) same.focus();
    };
    body.addEventListener('click', restoreFocus);
    cleanup.push(() => body.removeEventListener('click', restoreFocus));
    artwork([body.querySelector('.xlcrew').parentElement], 'loot/sack');
  }

  pzPlay = function (id, build) {
    if (!renderers[id]) return play(id, build);
    return play(id, api => {
      api.body.dataset.pirateWork = id.slice(3);
      const result = build(api);
      renderers[id](api.body);
      return result;
    });
  };
})();
