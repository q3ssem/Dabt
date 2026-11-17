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
    let sel = null, drag = null;
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
      root.querySelectorAll('.mk-over').forEach(x => x.classList.remove('mk-over'));
      drag.ghost.style.visibility = 'hidden'; const t = target(e.clientX, e.clientY); drag.ghost.style.visibility = '';
      if (t && root.contains(t)) t.classList.add('mk-over');
    }, { passive: false });
    const end = e => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const d = drag; drag = null; root.querySelectorAll('.mk-over').forEach(x => x.classList.remove('mk-over'));
      if (d.moved) { d.tok.classList.remove('mk-lift'); if (d.ghost) d.ghost.remove(); if (e && e.type === 'pointerup') place(d.tok, target(e.clientX, e.clientY)); return; }
      // a tap: select the token, or place the selected token on a tapped slot
      if (sel === d.tok) { clearSel(); return; }
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
