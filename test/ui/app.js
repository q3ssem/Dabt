'use strict';
/* 5.1 presentation layer (loaded last): games page in sections, faster game start, «مستواي» dashboard,
   kids layout and river decorations. Game engines, scores and saves are untouched. */
(function () {
  const $ = DX.$, E = DX.el, AR = DX.AR;

  /* ---------- الألعاب: one page, every skill section with its games, three per row ---------- */
  const cardHTML = (g, fav) => { const gi = gameIndex(g.id), rk = gameRank(g.id);
    return `<article class="ui-game" data-skill="${g.cat}"><button class="ui-gmain" data-open="${g.id}" style="--c:${g.col[0]}">${icoBox(g)}<b>${esc(g.name)}</b><small>${gi == null ? 'جديدة عليك' : 'مؤشرك ' + AR(gi)}${rk ? ' · م' + AR(rk[0]) : ''}</small></button><button class="ui-fav" data-favorite="${g.id}" aria-label="المفضلة: ${esc(g.name)}" aria-pressed="${fav.includes(g.id)}">${fav.includes(g.id) ? '★' : '☆'}</button></article>`; };
  renderGames = function () {
    const v = $('#v-games'), shown = G.filter(g => !g.hidden && !g.puz && !g.kid);
    v.innerHTML = `<div class="dx-head"><div><span class="dx-eyebrow">مختبر العقل · مكتبة الألعاب</span><h1>اختر مهارتك وابدأ</h1><p class="dx-muted">${AR(shown.length)} لعبة في ${AR(Object.keys(CATS).length)} مهارات</p></div></div>
      <input id="dxSearch" class="dx-search" type="search" aria-label="ابحث عن لعبة" placeholder="ابحث عن لعبة…" value="${esc(DX.catalog.query || '')}"><div id="uiCatalog"></div>
      <p class="dx-muted">النتائج تصف أداءك داخل الألعاب فقط، وليست قياسًا للذكاء أو تشخيصًا.</p>`;
    const fill = () => {
      const q = (DX.catalog.query || '').trim(), fav = DX.favorites(), box = $('#uiCatalog');
      const section = (title, color, list, key) => list.length ? `<section class="ui-cat" data-cat="${key}"><h2><i style="background:${color}"></i>${title}<small>${AR(list.length)}</small></h2><div class="ui-grid">${list.map(g => cardHTML(g, fav)).join('')}</div></section>` : '';
      if (q) { const rows = shown.filter(g => g.name.includes(q)); box.innerHTML = rows.length ? `<div class="ui-grid">${rows.map(g => cardHTML(g, fav)).join('')}</div>` : '<p class="dx-empty">لا توجد ألعاب مطابقة.</p>'; }
      else box.innerHTML = section('المفضلة', '#ffd25a', shown.filter(g => fav.includes(g.id)), 'fav') + Object.entries(CATS).map(([k, c]) => section(c.n, c.hex, shown.filter(g => g.cat === k), k)).join('');
      v.querySelectorAll('[data-open]').forEach(b => b.onclick = () => startRun([b.dataset.open]));
      v.querySelectorAll('[data-favorite]').forEach(b => b.onclick = () => { const id = b.dataset.favorite; S.st.discoveryFavorites = DX.favorites().includes(id) ? DX.favorites().filter(k => k !== id) : [...DX.favorites(), id]; S.save(); fill(); });
    };
    $('#dxSearch').oninput = e => { DX.catalog.query = e.target.value; fill(); };
    fill();
  };

  /* ---------- faster start: art loads while the intro is read, and common atlases warm up when idle ---------- */
  if (window.LA && LA.assets && LA.load) {
    const si0 = showIntro; showIntro = function () { const r = si0.apply(this, arguments); try { const g = curGame(); if (g && !g.kid) LA.assets(g).forEach(f => LA.load(f)); } catch (e) {} return r; };
    const warm = () => { const c = navigator.connection; if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) return; const list = ['surfaces', 'objects-a', 'objects-b', 'objects-c', 'objects-d', 'objects-e', 'puzzle-parts'];
      const next = () => { const f = list.shift(); if (!f) return; Promise.resolve(LA.load(f)).then(() => (window.requestIdleCallback || setTimeout)(next, { timeout: 1500 })); }; next(); };
    window.addEventListener('load', () => setTimeout(() => (window.requestIdleCallback || setTimeout)(warm, { timeout: 4000 }), 2500));
  }

  /* ---------- مستواي: a progress dashboard on top, the detailed sections folded below ---------- */
  function dashboard() {
    const hist = S.st.hist || [], days = S.st.days || {}, sk = typeof streak === 'function' ? streak() : 0;
    const skills = Object.entries(CATS).map(([k, c]) => { const xs = G.filter(g => g.cat === k && !g.puz && !g.kid).map(g => gameIndex(g.id)).filter(x => x != null); return [c, xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null]; });
    const week = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = typeof dayKey === 'function' ? dayKey(d) : d.toISOString().slice(0, 10); week.push([['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'][d.getDay()], days[k] || 0]); }
    const T = window.T7 ? T7.state() : null, seals = T ? T.rewards.length : 0, stars = T && T.v5 ? Object.values(T.v5.ch || {}).reduce((n, c) => n + c.filter(Boolean).length, 0) : 0, stations = T ? Object.keys(T.done).length : 0;
    const best = [...hist].sort((a, b) => (b.idx || 0) - (a.idx || 0)).filter((h, i, a) => a.findIndex(x => x.g === h.g) === i).slice(0, 3);
    return E('section', { class: 'ui-dash' },
      E('div', { class: 'ui-kpis' },
        E('div', {}, E('b', { text: AR(sk) }), E('span', { text: 'يوم متتالي' })),
        E('div', {}, E('b', { text: AR(hist.length) }), E('span', { text: 'جلسة لعب' })),
        E('div', {}, E('b', { text: AR(stations) + '/٢١' }), E('span', { text: 'محطة في الجزيرة' }))),
      E('div', { class: 'ui-week', 'aria-label': 'نشاط آخر سبعة أيام' }, ...week.map(([n, c]) => E('div', { class: c ? 'on' : '' }, E('i', { style: `height:${Math.min(100, 18 + c * 20)}%` }), E('small', { text: n })))),
      E('h3', { text: 'مهاراتك' }),
      E('div', { class: 'ui-skills' }, ...skills.map(([c, v]) => E('div', { class: 'ui-skill' }, E('span', { text: c.n }), E('div', { class: 'ui-bar' }, E('i', { style: `width:${v == null ? 0 : Math.min(100, v / 10)}%;background:${c.hex}` })), E('b', { text: v == null ? '—' : AR(v) })))),
      E('div', { class: 'ui-island' }, E('span', { text: '🏝' }), E('p', { text: `جزيرة الكنز: ${AR(seals)} / ٧ أختام · ${AR(stars)} نجمة تحدٍّ` })),
      best.length ? E('div', { class: 'ui-best' }, E('h3', { text: 'أفضل نتائجك' }), ...best.map(h => { const g = GM[h.g]; return g ? E('p', {}, E('span', { text: g.name }), E('b', { text: AR(h.idx || h.pts || 0) })) : null; })) : null);
  }
  const me0 = renderMe; renderMe = function () {
    me0();
    const v = $('#v-me'); if (!v) return;
    const head = v.firstElementChild, rest = [...v.children].slice(1);
    const titleOf = n => { const h = n.querySelector && n.querySelector('h2'); if (h) return h.textContent.trim(); if (n.classList.contains('radar')) return 'مؤشر العقل'; if (n.classList.contains('stats')) return 'أرقامك'; return ''; };
    const groups = []; rest.forEach(n => { const t = titleOf(n); if (t || !groups.length) groups.push([t || 'المزيد', [n]]); else groups[groups.length - 1][1].push(n); });
    // radar + stats read better together
    const folded = groups.map(([t, nodes]) => { const d = E('details', { class: 'ui-fold' }, E('summary', { text: t })); nodes.forEach(n => d.append(n)); return d; });
    v.innerHTML = ''; v.append(head, dashboard(), ...folded);
    const settings = folded.find(d => d.querySelector('#dxBackupStatus')); if (settings) settings.querySelector('summary').textContent = 'الإعدادات والنسخة الاحتياطية';
  };

  /* ---------- عبور النهر: birds and butterflies drift over the river (decoration only) ---------- */
  const BIRD = '<svg viewBox="0 0 40 20"><path d="M2 12 Q10 2 20 10 Q30 2 38 12" fill="none" stroke="#2b3a44" stroke-width="2.6" stroke-linecap="round"/></svg>';
  const FLY = c => `<svg viewBox="0 0 30 24"><path d="M15 12 C8 0 0 4 4 12 C0 20 10 22 15 12 C20 22 30 20 26 12 C30 4 22 0 15 12Z" fill="${c}" stroke="#5a3a2a" stroke-width="1"/><path d="M15 6 V19" stroke="#3a2a20" stroke-width="1.6"/></svg>`;
  function riverDecor() {
    const p = $('#play'), g = (() => { try { return curGame(); } catch (e) { return null; } })();
    const old = p && p.querySelector('.ui-decor'); if (old && (!g || g.id !== 'pz_river')) old.remove();
    if (!p || !g || g.id !== 'pz_river' || p.querySelector('.ui-decor')) return;
    const d = E('div', { class: 'ui-decor', 'aria-hidden': 'true' });
    [[8, 14, 0], [22, 9, 3], [60, 16, 6]].forEach(([x, y, delay], i) => { const b = E('span', { class: 'ui-bird', style: `left:${x}%;top:${y}%;animation-delay:-${delay}s` }); b.innerHTML = BIRD; d.append(b); });
    [['#f2b24c', 14, 70, 0], ['#e98aa8', 82, 64, 2], ['#8fd0e8', 70, 30, 4]].forEach(([c, x, y, delay]) => { const f = E('span', { class: 'ui-fly', style: `left:${x}%;top:${y}%;animation-delay:-${delay}s` }); f.innerHTML = FLY(c); d.append(f); });
    p.append(d);
  }
  const hd0 = header; header = function (g) { hd0.apply(this, arguments); setTimeout(riverDecor, 0); };
  const cl0 = closePlay; closePlay = function () { const d = $('#play .ui-decor'); if (d) d.remove(); return cl0.apply(this, arguments); }; if ($('#quit')) $('#quit').onclick = closePlay;

  if (curTab === 'games') renderGames();
})();
