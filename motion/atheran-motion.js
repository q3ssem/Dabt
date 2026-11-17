/* motion-batch-1 — Atheran word puzzles rebuilt as boards you move.
   Same generators (aarMake, alyMake, actMake, arlMake), same rules, same win path (aWin), same ids and saves.
   Only the way the player answers changes: pieces are dragged (or tapped, then placed) and every clue is a pictogram. */
(function () {
  'use strict';
  if (!window.MK || typeof GM === 'undefined') return;
  const { attach, icon, REL } = MK;
  const has = id => GM[id] && typeof pzPlay === 'function';

  /* ---------------------------------------------------------------- pictograms */
  const CAP_ICON = [ // six captains' seals: distinct shape + colour, readable without colour
    ['#B5523A', '<circle cx="20" cy="20" r="7"/><path d="M20 4v6M20 30v6M4 20h6M30 20h6M9 9l4 4M27 27l4 4M31 9l-4 4M13 27l-4 4"/>'],          // sun
    ['#3F6F8C', '<path d="M26 8a13 13 0 1 0 0 24a10 10 0 0 1 0-24z"/>'],                                                                     // moon
    ['#C8932F', '<path d="M20 5l4.4 9.5 10.4 1.1-7.8 7 2.3 10.2L20 27.6l-9.3 5.2 2.3-10.2-7.8-7 10.4-1.1z"/>'],                                  // star
    ['#2F7F6A', '<path d="M4 16q4-6 8 0t8 0 8 0 8 0M4 26q4-6 8 0t8 0 8 0 8 0"/>'],                                                             // wave
    ['#7A4E8C', '<path d="M30 6C16 8 10 20 10 32M10 32l6-4M14 22l8-2M18 14l8-2"/>'],                                                         // feather
    ['#8A5A33', '<circle cx="14" cy="20" r="6"/><path d="M20 20h16M30 20v6M35 20v5"/>']                                                      // key
  ];
  const FATE_ICON = { // عادت · اختفت · انسحبت · بقيت هناك · أنكرت ما رأت
    'عادت': '<path d="M30 14H14l6-6M14 14l6 6"/><path d="M8 26h24v8H8z"/>',
    'اختفت': '<circle cx="20" cy="20" r="12" stroke-dasharray="4 4"/><path d="M14 20h12" opacity=".5"/>',
    'انسحبت': '<path d="M30 20H10M16 13l-7 7 7 7"/><path d="M34 10v20"/>',
    'بقيت هناك': '<path d="M12 34V6M12 7h16l-4 6 4 6H12"/>',
    'أنكرت ما رأت': '<path d="M5 20q15-14 30 0q-15 14-30 0z"/><circle cx="20" cy="20" r="4"/><path d="M8 32L32 8"/>'
  };
  const SHIP = '<path d="M6 26h28l-4 7H10z"/><path d="M20 6v20M20 7l10 14H20M20 10l-8 11h8"/>';

  /* ================================================================ 1. أرشيف الرحلات — pz_aarch */
  if (has('pz_aarch') && typeof aarMake === 'function') {
    GM.pz_aarch.run = function runAArchMotion() {
      return pzPlay('pz_aarch', api => {
        const P = aarMake(api.lv), n = P.n, uc = Array(n).fill(-1), uf = Array(n).fill(-1); let miss = 0, busy = false;
        const capChip = (x, small) => `<span class="mk-chip cap${small ? ' sm' : ''}" style="--c:${CAP_ICON[x % 6][0]}">${icon(CAP_ICON[x % 6][1], CAP_ICON[x % 6][0])}<small>${P.caps[x]}</small></span>`;
        const fateChip = (f, small) => `<span class="mk-chip fate${small ? ' sm' : ''}">${icon(FATE_ICON[P.fates[f]] || '<circle cx="20" cy="20" r="10"/>')}<small>${P.fates[f]}</small></span>`;
        const shipChip = r => `<span class="mk-chip ship sm">${icon(SHIP, '#2C4A5A')}<small>${P.ships[r]} · ${XAR(P.years[r])}</small></span>`;
        const clueHTML = c => {
          switch (c.t) {
            case 'eq': return shipChip(c.r) + REL.eq + capChip(c.c, 1);
            case 'cn': return shipChip(c.r) + REL.ne + capChip(c.c, 1);
            case 'cy': return capChip(c.a, 1) + '<span class="mk-rel seq">أبحر قبل</span>' + capChip(c.b, 1);
            case 'fc': return capChip(c.c, 1) + REL.eq + fateChip(c.f, 1);
            case 'fn': return capChip(c.c, 1) + REL.ne + fateChip(c.f, 1);
            case 'fr': return shipChip(c.r) + REL.eq + fateChip(c.f, 1);
            case 'fy': return fateChip(c.f, 1) + '<span class="mk-rel seq">بعد</span>' + shipChip(c.r);
            case 'adj': return capChip(c.c, 1) + '<span class="mk-rel nx">مباشرة بعد</span>' + fateChip(c.f, 1);
          } return '';
        };
        api.body.innerHTML = xSheet(`${xHead(XS_.navigator.replace('viewBox="0 0 60 80"', 'viewBox="0 0 60 80" width="28" height="36"'), 'أرشيف الرحلات')}
          <p class="mk-lead">اسحب ختم كل قائد ورمز كل مصير إلى سفينته. السفن مرتبة بسنة إبحارها. كل نقش يضيء أخضر حين يتحقق وأحمر حين يُخالَف.</p>
          <div class="mk-clues" id="aarcl">${P.clues.map((c, i) => `<div class="mk-clue" data-cl="${i}"><i class="mk-dot"></i>${clueHTML(c)}</div>`).join('')}</div>
          <div class="mk-board aar-board" id="aarboard">
            <div class="mk-rows">${P.ships.map((s, r) => `<div class="mk-row"><div class="mk-ship">${icon(SHIP, '#2C4A5A')}<b>${s}</b><small>سنة ${XAR(P.years[r])}</small></div><div class="mk-slot" data-slot="c${r}" tabindex="0" aria-label="قائد ${s}"></div><div class="mk-slot" data-slot="f${r}" tabindex="0" aria-label="مصير ${s}"></div></div>`).join('')}</div>
            <div class="mk-tray" data-tray="c" aria-label="أختام القادة"></div><div class="mk-tray" data-tray="f" aria-label="رموز المصائر"></div>
          </div>
          <div class="xkbtns"><button class="go-btn xsm alt2" id="aarclr">أعد القطع</button><button class="go-btn xsm" id="aargo">رتّب الأرشيف</button></div>`, 620 + n * 110, 501);
        const board = api.body.querySelector('#aarboard');
        const tokHTML = id => id[0] === 'c' ? `<button class="mk-tok" data-tok="${id}">${capChip(+id.slice(1))}</button>` : `<button class="mk-tok" data-tok="${id}">${fateChip(+id.slice(1))}</button>`;
        const draw = () => {
          for (let r = 0; r < n; r++) {
            const sc = board.querySelector(`[data-slot="c${r}"]`), sf = board.querySelector(`[data-slot="f${r}"]`);
            sc.innerHTML = uc[r] < 0 ? '<em>القائد</em>' : tokHTML('c' + uc[r]); sf.innerHTML = uf[r] < 0 ? '<em>المصير</em>' : tokHTML('f' + uf[r]);
            sc.classList.toggle('full', uc[r] >= 0); sf.classList.toggle('full', uf[r] >= 0);
          }
          board.querySelector('[data-tray="c"]').innerHTML = [...Array(n).keys()].filter(x => !uc.includes(x)).map(x => tokHTML('c' + x)).join('');
          board.querySelector('[data-tray="f"]').innerHTML = [...Array(n).keys()].filter(x => !uf.includes(x)).map(x => tokHTML('f' + x)).join('');
          P.clues.forEach((c, i) => { const s = aarClueStatus(c, uc, uf), e = api.body.querySelector(`[data-cl="${i}"]`); e.classList.toggle('ok', s === true); e.classList.toggle('bad', s === false); });
        };
        attach(board, {
          canDrag: () => !api.ended && !busy,
          drop: (tok, slot) => {
            const kind = tok[0], v = +tok.slice(1), arr = kind === 'c' ? uc : uf, from = arr.indexOf(v);
            if (slot == null) { if (from >= 0) arr[from] = -1; }
            else { if (slot[0] !== kind) return; const r = +slot.slice(1); if (from >= 0) arr[from] = arr[r]; arr[r] = v; }
            tone(520, .03); draw();
          }
        });
        $('#aarclr').onclick = () => { if (api.ended || busy) return; uc.fill(-1); uf.fill(-1); draw(); };
        function check() {
          if (api.ended || busy) return; if (uc.includes(-1) || uf.includes(-1)) { api.msg('ضع كل الأختام والرموز أولًا.'); return; }
          if (uc.every((v, r) => v === P.cap[r]) && uf.every((v, r) => v === P.fat[r])) { busy = true; sfx.lvl(); later(() => aWin(api, 'pz_aarch', 'عاد الأرشيف إلى ترتيبه.'), 600); return; }
          miss++; api.wrong(); const bad = P.clues.filter(c => !aarSat(c, uc, uf)).length;
          if (miss >= 3) { busy = true; P.cap.forEach((v, r) => { uc[r] = v; uf[r] = P.fat[r]; }); draw(); api.over('هذا هو الترتيب الصحيح.'); return; }
          api.msg(bad ? `ترتيبك يخالف ${arN(bad, AN.clue)}: النقوش الحمراء.` : 'كل النقوش متحققة، لكن الترتيب ليس الوحيد الممكن بعد: راجع.');
        }
        $('#aargo').onclick = check; draw(); api.msg('اسحب الأختام والرموز إلى السفن.');
        pzHook({ P, set: () => { P.cap.forEach((v, r) => { uc[r] = v; uf[r] = P.fat[r]; }); draw(); }, check, place: (tok, slot) => { const kind = tok[0], v = +tok.slice(1), arr = kind === 'c' ? uc : uf, from = arr.indexOf(v); const r = +slot.slice(1); if (from >= 0) arr[from] = arr[r]; arr[r] = v; draw(); }, state: () => ({ uc: uc.slice(), uf: uf.slice() }) });
        return {
          hint: k => {
            if (k === 1) return 'ابدأ بالنقوش التي تربط سفينة بمصير أو قائد مباشرة، ثم استخدم «قبل» و«بعد»: السفن مرتبة من الأقدم.';
            const r = uc.findIndex((v, j) => v !== P.cap[j]); if (r >= 0) { const o = uc.indexOf(P.cap[r]); if (o >= 0) uc[o] = uc[r]; uc[r] = P.cap[r]; draw(); return `ثبّت لك قائد «${P.ships[r]}».`; }
            const q = uf.findIndex((v, j) => v !== P.fat[j]); if (q >= 0) { const o = uf.indexOf(P.fat[q]); if (o >= 0) uf[o] = uf[q]; uf[q] = P.fat[q]; draw(); return `ثبّت لك مصير «${P.ships[q]}».`; } return null;
          },
          reveal: () => { P.cap.forEach((v, r) => { uc[r] = v; uf[r] = P.fat[r]; }); draw(); return 'هذا الترتيب.'; }
        };
      });
    };
  }

  /* ================================================================ 2. طبقات الزمن — pz_alayer
     The rock section stays; the dropdown bench and the tap list are gone. Each event (layer / vein / fault) is a
     token with its own mark; the player drags them onto a time line, oldest first. */
  if (has('pz_alayer') && typeof alyMake === 'function') {
    GM.pz_alayer.run = function runALayerMotion() {
      return pzPlay('pz_alayer', api => {
        const P = alyMake(api.lv), k = P.k, W = 300, Hh = 40, H = k * Hh, N = P.items.length, u = Array(N).fill(-1); let miss = 0, busy = false;
        const lay = P.ev.filter(e => e.t === 'L'), fs = P.ev.filter(e => e.t === 'F');
        const off = (li, x) => fs.reduce((s, f) => s + (li <= f.top && x > f.x * W ? 10 : 0), 0);
        let svg = `<svg viewBox="0 0 ${W} ${H + 8}" class="alys mk-section">`;
        lay.forEach(e => { const y = H - (e.i + 1) * Hh; const pts = [0, W * .25, W * .5, W * .75, W].map(x => [x, y - off(e.i, x)]); const pb = [0, W * .25, W * .5, W * .75, W].map(x => [x, y + Hh - off(e.i, x)]);
          svg += `<path data-ev="L${e.i}" d="M${pts.map(p => p.join(' ')).join('L')}L${pb.reverse().map(p => p.join(' ')).join('L')}Z" fill="${ALY_C[e.i]}" stroke="#3A2616" stroke-width="1"/>${[...Array(5)].map((_, q) => `<path d="M${20 + q * 60} ${y + 12 + (q % 2) * 10}h14" stroke="#3A2616" stroke-width=".6" opacity=".4"/>`).join('')}<text x="10" y="${y + Hh / 2 + 5}" font-size="14" fill="#3A2616" font-family="'Aref Ruqaa',serif">${'أبجدهوز'[e.i]}</text>`; });
        P.ev.filter(e => e.t === 'V').forEach(v => { const x = v.x * W, top = H - (v.top + 1) * Hh; svg += `<path data-ev="V${v.i}" d="M${x - 6} ${H}q8-${(H - top) / 3} -2 -${(H - top) * .6}t6 -${(H - top) * .4}h8q-8 ${(H - top) * .4} 2 ${(H - top) * .6}t-2 ${(H - top) * .4}z" fill="${ALY_V[v.i]}" stroke="#3A2616" stroke-width=".8" opacity=".9"/><circle cx="${x + 4}" cy="${top + 10}" r="9" fill="#F4E9CC" stroke="#3A2616"/><text x="${x + 4}" y="${top + 14}" font-size="11" text-anchor="middle" fill="#3A2616">${XAR(v.i + 1)}</text>`; });
        fs.forEach(f => { const x = f.x * W, top = H - (f.top + 1) * Hh; svg += `<path data-ev="F${f.i}" d="M${x} ${H}L${x - 6} ${top}" stroke="#1E1712" stroke-width="2.4" stroke-dasharray="6 3"/><rect x="${x - 20}" y="${top - 4}" width="26" height="14" rx="3" fill="#F4E9CC" stroke="#3A2616"/><text x="${x - 7}" y="${top + 7}" font-size="9.5" text-anchor="middle" fill="#3A2616">شق ${XAR(f.i + 1)}</text>`; });
        svg += '</svg>';
        const mark = e => e.t === 'L' ? `<svg viewBox="0 0 40 40"><rect x="4" y="12" width="32" height="16" rx="2" fill="${ALY_C[e.i]}" stroke="#3A2616" stroke-width="1.6"/><text x="20" y="25" font-size="12" text-anchor="middle" fill="#3A2616" font-family="'Aref Ruqaa',serif">${'أبجدهوز'[e.i]}</text></svg>`
          : e.t === 'V' ? `<svg viewBox="0 0 40 40"><path d="M16 36q6-10 0-18t6-14h6q-8 6-2 14t-2 18z" fill="${ALY_V[e.i]}" stroke="#3A2616" stroke-width="1.4"/></svg>`
          : `<svg viewBox="0 0 40 40"><path d="M24 36L16 4" stroke="#1E1712" stroke-width="3" stroke-dasharray="6 3"/></svg>`;
        const tok = j => `<button class="mk-tok" data-tok="${j}"><span class="mk-chip ev">${mark(P.items[j])}<small>${alyName(P.items[j])}</small></span></button>`;
        api.body.innerHTML = xSheet(`${xHead('', 'طبقات الزمن')}
          <div class="mk-rules"><span>${icon('<path d="M20 34V8M12 16l8-8 8 8"/>')}<small>الأعلى أحدث</small></span><span>${icon('<path d="M18 36q6-10 0-18t6-14" stroke-width="3"/><path d="M6 20h28" opacity=".45"/>')}<small>العرق أحدث مما يشقه</small></span>${fs.length ? `<span>${icon('<path d="M24 36L16 4" stroke-dasharray="5 3"/><path d="M6 14h10M20 22h14" opacity=".45"/>')}<small>الشق أحدث مما أزاحه</small></span>` : ''}</div>
          ${svg}
          <div class="mk-time"><span class="mk-end">الأقدم</span><div class="mk-line">${[...Array(N).keys()].map(q => `<div class="mk-slot tl" data-slot="${q}" tabindex="0" aria-label="الموضع ${q + 1}"><i>${XAR(q + 1)}</i></div>`).join('')}</div><span class="mk-end">الأحدث</span></div>
          <div class="mk-tray" data-tray="t" aria-label="الأحداث"></div>
          <div class="xkbtns"><button class="go-btn xsm alt2" id="alyz">أعد القطع</button><button class="go-btn xsm" id="alygo">ثبّت الترتيب</button></div>`, 960, 731);
        const root = api.body.querySelector('.xpaper') || api.body;
        const draw = () => {
          root.querySelectorAll('[data-slot]').forEach(s => { const q = +s.dataset.slot; s.innerHTML = u[q] < 0 ? `<i>${XAR(q + 1)}</i>` : tok(u[q]); s.classList.toggle('full', u[q] >= 0); });
          root.querySelector('[data-tray="t"]').innerHTML = [...Array(N).keys()].filter(j => !u.includes(j)).map(tok).join('');
        };
        const flash = j => { const e = P.items[j], el = root.querySelector(`[data-ev="${e.t}${e.i}"]`); if (!el) return; el.classList.remove('mk-flash'); void el.getBBox(); el.classList.add('mk-flash'); };
        attach(root, {
          canDrag: () => !api.ended && !busy, onPick: j => flash(+j),
          drop: (t, slot) => { const j = +t, from = u.indexOf(j); if (slot == null) { if (from >= 0) u[from] = -1; } else { const q = +slot; if (from >= 0) u[from] = u[q]; u[q] = j; } flash(j); tone(360 + u.filter(x => x >= 0).length * 30, .04); draw(); }
        });
        $('#alyz').onclick = () => { if (api.ended || busy) return; u.fill(-1); draw(); };
        function check() {
          if (api.ended || busy) return; if (u.includes(-1)) { api.msg('ضع كل الأحداث على خط الزمن.'); return; }
          if (u.every((j, q) => P.items[j] === P.ev[q])) { busy = true; sfx.lvl(); later(() => aWin(api, 'pz_alayer', 'قرأت تاريخ الجذع من أوله.'), 500); return; }
          miss++; api.wrong(); const f = u.findIndex((j, q) => P.items[j] !== P.ev[q]);
          root.querySelectorAll('.mk-slot.tl').forEach((s, q) => s.classList.toggle('mk-wrong', q === f));
          if (miss >= 3) { busy = true; P.ev.forEach((e, q) => u[q] = P.items.indexOf(e)); draw(); api.over('هذا الترتيب الصحيح.'); return; }
          api.msg(`أول خطأ عند الموضع ${XAR(f + 1)}.`);
        }
        $('#alygo').onclick = check; draw(); api.msg('اسحب الأحداث إلى خط الزمن، من الأقدم.');
        pzHook({ P, set: () => { P.ev.forEach((e, q) => u[q] = P.items.indexOf(e)); draw(); }, check, place: (j, q) => { const from = u.indexOf(j); if (from >= 0) u[from] = u[q]; u[q] = j; draw(); }, state: () => u.slice() });
        return {
          hint: kk => { if (kk === 1) return 'ابدأ بالطبقات من الأسفل إلى الأعلى، ثم أدخل كل عرق أو شق بعد آخر طبقة وصل إليها.';
            const q = u.findIndex((j, i) => j < 0 || P.items[j] !== P.ev[i]); if (q < 0) return null; const j = P.items.indexOf(P.ev[q]), from = u.indexOf(j); if (from >= 0) u[from] = u[q]; u[q] = j; draw(); flash(j); return `وضعت لك الحدث رقم ${XAR(q + 1)}.`; },
          reveal: () => { P.ev.forEach((e, q) => u[q] = P.items.indexOf(e)); draw(); return 'هذا الترتيب.'; }
        };
      });
    };
  }

  /* ================================================================ 3. المدينة الحية — pz_acity
     The text list of "who lives on whom" becomes a drawn food web. Drag a dark species onto the simulation stone:
     the dimming spreads along the web, and every node where the hypothesis disagrees with the scene is ringed. */
  if (has('pz_acity') && typeof actMake === 'function') {
    GM.pz_acity.run = function runACityMotion() {
      return pzPlay('pz_acity', api => {
        const P = actMake(api.lv), n = P.n, nm = i => ACT_SP[P.ord[i]][0], col = i => ACT_SP[P.ord[i]][1]; let sel = -1, miss = 0, busy = false, sim = null;
        // layout: depth = longest chain of needs; lower depth at the bottom (roots), dependants above
        const depth = Array(n).fill(0); for (let pass = 0; pass < n; pass++) for (let i = 0; i < n; i++) for (const r of P.req[i]) depth[i] = Math.max(depth[i], depth[r] + 1);
        const D = Math.max(...depth) + 1, W = 320, Hh = 84, H = D * Hh + 20, pos = [];
        for (let d = 0; d < D; d++) { const row = [...Array(n).keys()].filter(i => depth[i] === d); row.forEach((i, q) => pos[i] = [(q + .5) * W / row.length + (row.length > 1 && d % 2 ? 10 : 0), H - 40 - d * Hh]); }
        const edge = (a, b, dash) => { const [x1, y1] = pos[a], [x2, y2] = pos[b]; const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; return `<path d="M${x1 + ux * 22} ${y1 + uy * 22}L${x2 - ux * 26} ${y2 - uy * 26}" stroke="#6B5236" stroke-width="2.2" ${dash ? 'stroke-dasharray="5 4"' : ''} marker-end="url(#mkarr)" fill="none"/>`; };
        const web = () => { let s = `<svg viewBox="0 0 ${W} ${H}" class="mk-web" id="actweb"><defs><marker id="mkarr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" markerUnits="strokeWidth" orient="auto"><path d="M0 0L10 5L0 10z" fill="#6B5236"/></marker></defs>`;
          for (let i = 0; i < n; i++) for (const r of P.req[i]) s += edge(r, i, P.req[i].or);
          for (let i = 0; i < n; i++) { const [x, y] = pos[i]; s += `<g class="mk-sp ${P.al[i] ? 'lit' : 'dark'}" data-sp="${i}"><circle class="halo" cx="${x}" cy="${y}" r="21"/><circle cx="${x}" cy="${y}" r="16" fill="${col(i)}" stroke="#3A2616" stroke-width="1.6"/><text class="mk-lbl" x="${x}" y="${y + 32}" text-anchor="middle" font-size="11" font-weight="700" fill="#3A2616">${nm(i)}</text></g>`; }
          return s + '</svg>'; };
        const darkToks = () => [...Array(n).keys()].filter(i => !P.al[i] && i !== sel).map(i => `<button class="mk-tok" data-tok="${i}"><span class="mk-chip sp"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13" fill="${col(i)}" stroke="#3A2616" stroke-width="2"/></svg><small>${nm(i)}</small></span></button>`).join('');
        api.body.innerHTML = xSheet(`${xHead('', 'المدينة الحية')}
          <div class="mk-rules"><span><svg viewBox="0 0 60 20"><path d="M4 10H50" stroke="#6B5236" stroke-width="2"/><path d="M48 5l8 5-8 5z" fill="#6B5236"/></svg><small>يحتاج إلى</small></span><span><svg viewBox="0 0 60 20"><path d="M4 10H50" stroke="#6B5236" stroke-width="2" stroke-dasharray="5 4"/><path d="M48 5l8 5-8 5z" fill="#6B5236"/></svg><small>يكفيه أحدها</small></span><span><svg viewBox="0 0 40 20"><circle cx="20" cy="10" r="8" fill="#F2C553" stroke="#3A2616"/></svg><small>مضيء</small></span><span><svg viewBox="0 0 40 20"><circle cx="20" cy="10" r="8" fill="#3A3A40" stroke="#3A2616"/></svg><small>منطفئ</small></span></div>
          <p class="mk-lead">نوع واحد اختفى أولًا وأطفأ غيره. اسحب نوعًا منطفئًا إلى حجر المحاكاة لترى سلسلة الانطفاء التي يسببها، وقارنها بالمشهد.</p>
          ${web()}
          <div class="mk-simrow"><div class="mk-slot sim" data-slot="sim" tabindex="0" aria-label="حجر المحاكاة"><em>حجر المحاكاة</em></div><div class="mk-simout" id="actsim" aria-live="polite">لا فرضية بعد.</div></div>
          <div class="mk-tray" data-tray="d" aria-label="الأنواع المنطفئة"></div>
          <div class="xkbtns"><button class="go-btn xsm" id="actgo">هذا اختفى أولًا</button></div>`, 980, 711);
        const root = api.body.querySelector('.xpaper') || api.body;
        const paint = () => {
          root.querySelectorAll('.mk-sp').forEach(g => { const i = +g.dataset.sp; g.classList.remove('sim-off', 'mis', 'cause'); if (sim) { if (!sim.predicted[i]) g.classList.add('sim-off'); if (sim.extra.includes(i) || sim.missing.includes(i)) g.classList.add('mis'); if (i === sel) g.classList.add('cause'); } });
          const slot = root.querySelector('[data-slot="sim"]'); slot.innerHTML = sel < 0 ? '<em>حجر المحاكاة</em>' : `<button class="mk-tok" data-tok="${sel}"><span class="mk-chip sp"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13" fill="${col(sel)}" stroke="#3A2616" stroke-width="2"/></svg><small>${nm(sel)}</small></span></button>`; slot.classList.toggle('full', sel >= 0);
          root.querySelector('[data-tray="d"]').innerHTML = darkToks();
          const out = $('#actsim'); out.classList.toggle('good', !!(sim && sim.exact)); out.classList.toggle('bad', !!(sim && !sim.exact));
          out.innerHTML = !sim ? 'لا فرضية بعد.' : sim.exact ? `<b>تطابق كامل</b> · الحلقات المنطفئة كلها كما في المشهد.` : `<b>${XAR(sim.mismatch)} اختلاف</b> · الأنواع المحاطة بحلقة حمراء لا تطابق المشهد.`;
        };
        const simulate = () => { if (sel < 0) { sim = null; paint(); return; } sim = actAudit(P, sel); paint();
          // the dimming spreads along the web, one generation at a time
          const gens = []; const al = Array(n).fill(true); al[sel] = false; let cur = [sel]; while (cur.length) { gens.push(cur); const nx = []; for (let i = 0; i < n; i++) { if (!al[i]) continue; const R = P.req[i]; const ok = !R.length || (R.or ? R.some(r => al[r]) : R.every(r => al[r])); if (!ok) { al[i] = false; nx.push(i); } } cur = nx; }
          gens.forEach((g, q) => later(() => g.forEach(i => { const el = root.querySelector(`[data-sp="${i}"]`); if (el) { el.classList.remove('pulse'); void el.getBBox(); el.classList.add('pulse'); } }), q * 320)); tone(240, .05); };
        attach(root, {
          canDrag: () => !api.ended && !busy,
          drop: (t, slot) => { const i = +t; if (slot === 'sim') { sel = i; simulate(); } else if (slot == null && i === sel) { sel = -1; sim = null; paint(); } }
        });
        function check() { if (api.ended || busy) return; if (sel < 0) { api.msg('ضع نوعًا على حجر المحاكاة أولًا.'); return; } const audit = actAudit(P, sel);
          if (audit.exact) { busy = true; sfx.lvl(); root.querySelectorAll('.mk-sp.dark').forEach((g, q) => later(() => { if (+g.dataset.sp !== P.gone) g.classList.add('relit'); }, 300 + q * 250)); later(() => aWin(api, 'pz_acity', 'عرفت ما اختفى. وحين أعادت الفوانيس توزيع الضوء، فهمت: هذه ليست غابة… هذه مدينة.'), 1200); return; }
          miss++; api.wrong(); if (miss >= 3) { busy = true; sel = P.gone; sim = actAudit(P, sel); paint(); api.over(`اختفى أولًا: ${nm(P.gone)}.`); return; } simulate(); api.msg('الفرضية لا تعيد إنتاج سلسلة الانطفاء كاملة.'); }
        $('#actgo').onclick = check; paint(); api.msg('من اختفى أولًا؟');
        pzHook({ P, pick: i => { sel = i; simulate(); }, check, simulate });
        return {
          hint: kk => { if (kk === 1) return 'ضع على حجر المحاكاة نوعًا منطفئًا: الفرضية الصحيحة وحدها تطفئ الأنواع المنطفئة نفسها، ولا تطفئ أي نوع مضيء.';
            if (kk >= 3) return `الفرض الصحيح: ${nm(P.gone)}.`;
            const ex = [...Array(n).keys()].filter(i => !P.al[i] && i !== P.gone).map(i => ({ i, d: actAudit(P, i).mismatch })).sort((a, b) => b.d - a.d)[0]; if (!ex) return null; return `لو كان ${nm(ex.i)} هو الأول، لاختلف ${XAR(ex.d)} من الأنواع عن المشهد: استبعده.`; },
          reveal: () => { sel = P.gone; sim = actAudit(P, sel); paint(); return `اختفى ${nm(P.gone)}.`; }
        };
      });
    };
  }

  /* ================================================================ 4. أرشيف الآثار الأولى — pz_arelic
     Each source is a strip of four pictures (who / when / why / where). Drag a source onto the comparison stone:
     every other source lights the pictures where it disagrees with it. The true source is the one that matches
     the hard evidence and differs from every other source in exactly one picture. Placing it seals the truth. */
  if (has('pz_arelic') && typeof arlMake === 'function') {
    const AT_ICON = [
      ['<path d="M8 28l4-14 8 8 8-8 4 14z"/><path d="M8 32h24"/>', '<circle cx="20" cy="20" r="11"/><path d="M20 9q8 11 0 22q-8-11 0-22"/>', '<path d="M6 32q14-26 28 0z"/><circle cx="16" cy="25" r="2"/><circle cx="24" cy="25" r="2"/>', '<path d="M6 26h28l-4 7H10z"/><path d="M20 6v20M20 7l9 13H20"/>'],
      ['<path d="M8 20h24"/><circle cx="12" cy="20" r="3" fill="#3A2616"/>', '<path d="M8 20h24"/><circle cx="20" cy="20" r="3" fill="#3A2616"/>', '<path d="M8 20h24"/><circle cx="29" cy="20" r="3" fill="#3A2616"/>', '<path d="M8 20h24"/><circle cx="8" cy="20" r="3" fill="#3A2616"/><path d="M4 14l4 6-4 6"/>'],
      ['<path d="M14 30h12M16 30l-2-12h12l-2 12"/><path d="M20 8v6M12 12l3 3M28 12l-3 3"/>', '<circle cx="20" cy="20" r="11"/><path d="M20 9v11l7 4"/>', '<path d="M8 32h24M10 32V18l10-8 10 8v14M17 32v-7h6v7"/>', '<circle cx="15" cy="22" r="7"/><circle cx="25" cy="18" r="7"/>'],
      ['<path d="M20 32s-11-7-11-15a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 8-11 15-11 15z"/>', '<path d="M4 24q4-6 8 0t8 0 8 0 8 0"/><path d="M10 14h20"/>', '<path d="M4 30l10-16 6 8 6-10 10 18z"/>', '<path d="M20 34V20M12 22l8-14 8 14z"/><path d="M14 30l6-10 6 10z"/>']
    ];
    GM.pz_arelic.run = function runARelicMotion() {
      return pzPlay('pz_arelic', api => {
        const P = arlMake(api.lv), u = Array(P.na).fill(-1); let miss = 0, busy = false, cmp = -1;
        const pic = (j, v, cls = '') => `<span class="mk-pic ${cls}" title="${P.A[j].n}: ${P.A[j].v[v]}">${icon(AT_ICON[j][v])}<small>${P.A[j].v[v]}</small></span>`;
        const strip = (i, diffMask) => `<span class="mk-strip" style="--na:${P.na}">${P.S[i].map((v, j) => pic(j, v, diffMask && diffMask[j] ? 'diff' : '')).join('')}</span>`;
        const srcTok = i => `<button class="mk-tok src" data-tok="${i}"><span class="mk-chip src"><b>${ARL_SRC[i]}</b>${strip(i)}</span></button>`;
        api.body.innerHTML = xSheet(`${xHead('', 'أرشيف الآثار الأولى')}
          <div class="mk-rules"><span><small>مصدر واحد صادق في كل شيء · كل مصدر آخر يخطئ في صورة واحدة فقط</small></span></div>
          <div class="mk-attr" style="--na:${P.na}">${P.A.map(a => `<small>${a.n}</small>`).join('')}</div>
          ${P.ev.length ? `<div class="mk-evid"><b>${icon('<rect x="10" y="16" width="20" height="16" rx="2"/><path d="M14 16v-4a6 6 0 0 1 12 0v4"/>')} دليل لا يُجادَل</b>${P.ev.map(e => pic(e.k, e.v, 'fixed')).join('')}</div>` : ''}
          <div class="mk-cmp"><div class="mk-slot cmp" data-slot="cmp" tabindex="0" aria-label="منصة المقارنة"><em>منصة المقارنة: ضع مصدرًا هنا</em></div><div id="arlcmp" class="mk-cmpout" aria-live="polite"></div></div>
          <div class="mk-tray srcs" data-tray="s" aria-label="المصادر"></div>
          <div class="mk-truth"><b>الحقيقة</b><div class="mk-slot truth" data-slot="truth" tabindex="0" aria-label="الحقيقة"><em>اسحب المصدر الصادق إلى هنا</em></div></div>
          <div class="xkbtns"><button class="go-btn xsm" id="arlgo">هذه الحقيقة</button></div>`, 1040, 741);
        const root = api.body.querySelector('.xpaper') || api.body;
        const truthSrc = () => P.S.findIndex(s => s.every((v, j) => v === u[j]));
        const draw = () => {
          const t = truthSrc(), slotT = root.querySelector('[data-slot="truth"]'), slotC = root.querySelector('[data-slot="cmp"]');
          slotT.innerHTML = u.includes(-1) ? '<em>اسحب المصدر الصادق إلى هنا</em>' : `<span class="mk-strip" style="--na:${P.na}">${u.map((v, j) => pic(j, v)).join('')}</span>`; slotT.classList.toggle('full', !u.includes(-1));
          slotC.innerHTML = cmp < 0 ? '<em>منصة المقارنة: ضع مصدرًا هنا</em>' : srcTok(cmp); slotC.classList.toggle('full', cmp >= 0);
          root.querySelector('[data-tray="s"]').innerHTML = P.S.map((_, i) => i).filter(i => i !== cmp).map(i => {
            if (cmp < 0) return srcTok(i);
            const mask = P.S[i].map((v, j) => v !== P.S[cmp][j]), d = mask.filter(Boolean).length;
            return `<button class="mk-tok src ${d === 1 ? 'one' : 'many'}" data-tok="${i}"><span class="mk-chip src"><b>${ARL_SRC[i]} <i>${XAR(d)} اختلاف</i></b>${strip(i, mask)}</span></button>`;
          }).join('');
          const out = $('#arlcmp'); if (cmp < 0) { out.innerHTML = ''; return; }
          const evBad = P.ev.filter(e => P.S[cmp][e.k] !== e.v).length, diffs = P.S.map((r, j) => j === cmp ? 0 : r.filter((v, k) => v !== P.S[cmp][k]).length).filter((_, j) => j !== cmp), ok = !evBad && diffs.every(d => d === 1);
          out.className = 'mk-cmpout ' + (ok ? 'good' : 'bad'); out.innerHTML = ok ? '<b>متسق</b> · يطابق الدليل، وكل مصدر آخر يختلف عنه في صورة واحدة.' : `<b>غير متسق</b> · ${evBad ? 'يخالف الدليل' : ''}${evBad && diffs.some(d => d !== 1) ? ' و' : ''}${diffs.some(d => d !== 1) ? 'بعض المصادر تختلف عنه في أكثر من صورة' : ''}.`;
        };
        attach(root, {
          canDrag: () => !api.ended && !busy,
          drop: (t, slot) => { const i = +t; if (slot === 'cmp') cmp = i; else if (slot === 'truth') P.S[i].forEach((v, j) => u[j] = v); else if (slot == null && i === cmp) cmp = -1; tone(420, .04); draw(); }
        });
        function check() { if (api.ended || busy) return; if (u.includes(-1)) { api.msg('ضع مصدرًا في خانة الحقيقة أولًا.'); return; }
          if (u.every((v, j) => v === P.T[j])) { busy = true; sfx.lvl(); later(() => aWin(api, 'pz_arelic', `الحقيقة عند «${ARL_SRC[P.tr]}».`), 500); return; }
          miss++; api.wrong(); if (miss >= 3) { busy = true; P.T.forEach((v, j) => u[j] = v); cmp = P.tr; draw(); api.over(`المصدر الصادق: ${ARL_SRC[P.tr]}.`); return; }
          api.msg('هذا المصدر لا يصمد: ضعه على منصة المقارنة وانظر كم صورة يختلف فيها كل مصدر عنه.'); }
        $('#arlgo').onclick = check; draw(); api.msg('قارن المصادر على المنصة.');
        pzHook({ P, set: () => { P.T.forEach((v, j) => u[j] = v); draw(); }, check, compare: i => { cmp = i; draw(); }, toTruth: i => { P.S[i].forEach((v, j) => u[j] = v); draw(); } });
        return {
          hint: kk => { if (kk === 1) return 'ضع كل مصدر على منصة المقارنة: المصدر الصادق يجعل كل المصادر الأخرى تضيء صورة واحدة فقط.';
            if (kk === 2) { const bad = P.S.map((_, i) => i).filter(i => i !== P.tr); const i = bad[0]; cmp = i; draw(); return `ليس «${ARL_SRC[i]}»: انظر كم صورة تختلف عنه.`; }
            cmp = P.tr; draw(); return `جرّب «${ARL_SRC[P.tr]}» على المنصة.`; },
          reveal: () => { P.T.forEach((v, j) => u[j] = v); cmp = P.tr; draw(); return `المصدر الصادق: ${ARL_SRC[P.tr]}.`; }
        };
      });
    };
  }
  window.ATHRAN_MOTION = { CAP_ICON, FATE_ICON, SHIP };
})();
