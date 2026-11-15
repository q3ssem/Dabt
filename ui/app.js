'use strict';
/* 5.1–5.3 presentation layer (loaded last): games page in sections, faster game start, «مستواي» dashboard,
   kids layout and river decorations. Game engines, scores and saves are untouched. */
(function () {
  const $ = DX.$, E = DX.el, AR = DX.AR, ART = 'ui/art/';

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
        E('div', {}, E('img', { src: ART + 'badge_streak.webp', alt: '' }), E('b', { text: AR(sk) }), E('span', { text: 'يوم متتالي' })),
        E('div', {}, E('img', { src: ART + 'badge_sessions.webp', alt: '' }), E('b', { text: AR(hist.length) }), E('span', { text: 'جلسة لعب' })),
        E('div', {}, E('img', { src: ART + 'hub_treasure.webp', alt: '', class: 'ui-kpi-isl' }), E('b', { text: AR(stations) + '/٢١' }), E('span', { text: 'محطة في الجزيرة' }))),
      E('div', { class: 'ui-week', 'aria-label': 'نشاط آخر سبعة أيام' }, ...week.map(([n, c]) => E('div', { class: c ? 'on' : '' }, E('i', { style: `height:${Math.min(100, 18 + c * 20)}%` }), E('small', { text: n })))),
      E('h3', { class: 'ui-h-badge' }, E('img', { src: ART + 'badge_skills.webp', alt: '' }), E('span', { text: 'مهاراتك' })),
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
  function riverDecor() {
    const g = (() => { try { return curGame(); } catch (e) { return null; } })(), old = $('#play .ui-decor');
    if (old && (!g || g.id !== 'pz_river')) old.remove();
    const p = g && g.id === 'pz_river' && $('#play .rv3'); // birds stay over the painted river, not the HUD
    if (!p || p.querySelector('.ui-decor')) return;
    const d = E('div', { class: 'ui-decor', 'aria-hidden': 'true' });
    [['bird_1', 8, 12, 0, 38], ['bird_2', 30, 7, 3, 30], ['bird_3', 62, 15, 6, 34]].forEach(([f, x, y, delay, w]) => d.append(E('img', { class: 'ui-bird', src: ART + f + '.webp', alt: '', style: `left:${x}%;top:${y}%;width:${w}px;animation-delay:-${delay}s` })));
    [['butterfly_2', 12, 72, 0], ['butterfly_1', 82, 64, 2], ['butterfly_2', 70, 30, 4]].forEach(([f, x, y, delay], i) => d.append(E('img', { class: 'ui-fly' + (i === 2 ? ' flip' : ''), src: ART + f + '.webp', alt: '', style: `left:${x}%;top:${y}%;animation-delay:-${delay}s` })));
    p.append(d);
  }
  const hd0 = header; header = function (g) { hd0.apply(this, arguments); setTimeout(riverDecor, 0); };
  const cl0 = closePlay; closePlay = function () { const d = $('#play .ui-decor'); if (d) d.remove(); return cl0.apply(this, arguments); }; if ($('#quit')) $('#quit').onclick = closePlay;

  /* ---------- 5.3 art: game, kids and badge icons ---------- */
  if (typeof I === 'object') [['brake', 'brain_brake'], ['revspan', 'brain_backward'], ['deduce', 'brain_rules']].forEach(([id, f]) => { I[id] = `<img class="ui-ico-art" src="${ART}${f}.webp" alt="" loading="lazy">`; });
  const KID_ART = ['بطاقات الذاكرة', 'وش تغيّر؟', 'كمّل النمط', 'اتبع الضوء', 'ظل الشكل', 'موقف السيارات', 'نفس الحيوان؟', 'الصورة الناقصة', 'الرسم بالمربعات', 'خريطة الكنز', 'فقاعات الألوان', 'وين الكرة؟', 'المرآة السحرية', 'لا تلمس الذئب!', 'حديقة الحروف', 'ورشة الكلمات', 'متجري الصغير', 'قطار الأرقام', 'قصة النبتة', 'البنّاء الصغير', 'جسر الأصدقاء', 'بيت الحيوان', 'رحلة قطرة', 'قلبي يفهم', 'ميزان الفريق', 'بوصلة الأصدقاء'];
  const kidArt = g => { const i = KID_ART.indexOf(g.name); return i < 0 ? null : `${ART}kid_${String(i + 1).padStart(2, '0')}.webp`; };
  function kidIcons() { const v = $('#v-kid'); if (!v || typeof KID_GAMES === 'undefined') return;
    v.querySelectorAll('.kgame[data-g]').forEach(b => { const g = KID_GAMES.find(k => k.id === b.dataset.g), src = g && kidArt(g), box = b.querySelector('.kge'); if (!src || !box || box.dataset.uiArt) return; box.dataset.uiArt = '1'; box.classList.add('ui-kart'); box.innerHTML = `<img src="${src}" alt="" loading="lazy">`; }); }
  if (typeof renderKid === 'function') { const rk0 = renderKid; renderKid = function () { const r = rk0.apply(this, arguments); kidIcons(); return r; }; }
  if ($('#v-kid')) new MutationObserver(() => kidIcons()).observe($('#v-kid'), { childList: true, subtree: true });

  /* ---------- 5.3 series puzzles: short rule on top, the detailed notes fold under it ---------- */
  const RULES = window.UI_RULES || {};
  if (typeof G !== 'undefined') G.forEach(g => { const r = RULES[g.id]; if (r) { g.rule = r[0]; g.how = r.slice(1); } });
  const ruleOpen = {};
  const played = id => (S.st.hist || []).some(h => h.g === id) || (typeof pzLv === 'function' && pzLv(id) > 1);
  function foldNotes() {
    const g = (() => { try { return curGame(); } catch (e) { return null; } })(), r = g && RULES[g.id], body = $('#pzb');
    if (!r || !body) return;
    const ol = body.querySelector('.xpin ol, .xpaper ol'); if (!ol || ol.closest('.ui-rules')) return;
    if (!(g.id in ruleOpen)) ruleOpen[g.id] = !played(g.id);
    const d = E('details', { class: 'ui-rules' }), sum = E('summary', {}, E('b', { text: 'القاعدة' }), E('span', { text: r[0] }), E('i', { text: 'التفاصيل' }));
    d.open = ruleOpen[g.id]; d.addEventListener('toggle', () => { ruleOpen[g.id] = d.open; });
    ol.replaceWith(d); d.append(sum, ol);
  }

  /* ---------- 5.3 بطاقاتي: a one-tap sample deck when the list is empty ---------- */
  const SAMPLE = [['عاصمة اليابان؟', 'طوكيو'], ['كم عظمة في جسم الإنسان البالغ؟', '٢٠٦ عظمات'], ['أطول نهر في العالم؟', 'النيل']];
  function cardsSample() {
    const g = (() => { try { return curGame(); } catch (e) { return null; } })(), list = $('#stage .clist'), add0 = $('#stage .cardadd');
    if (!g || g.id !== 'cards' || !list || !add0 || list.querySelector('.citem') || $('#stage .ui-sample') || (S.st.cards || []).length) return;
    add0.after(E('button', { class: 'cta ui-sample', type: 'button', text: 'جرّب ببطاقات مثال', onclick: () => {
      SAMPLE.slice(0, 2).forEach(([q, a], i) => S.st.cards.push({ id: Date.now().toString(36) + 's' + i, q, a, box: 0, due: Date.now(), ts: Date.now() }));
      const [q, a] = SAMPLE[2], cq = $('#cq'), ca = $('#ca'), add = $('#cadd'); if (cq && ca && add) { cq.value = q; ca.value = a; add.click(); } else S.save(); } }));
  }

  let pending = 0;
  const onPlay = () => { if (pending) return; pending = requestAnimationFrame(() => { pending = 0; try { foldNotes(); cardsSample(); riverDecor(); } catch (e) {} }); };
  if ($('#play')) new MutationObserver(onPlay).observe($('#play'), { childList: true, subtree: true });

  if (curTab === 'games') renderGames();
})();
