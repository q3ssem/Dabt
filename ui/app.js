'use strict';
/* 5.1–5.3 presentation layer (loaded last): games page in sections, faster game start, «مستواي» dashboard,
   kids layout and river decorations. Game engines, scores and saves are untouched. */
// 5.5: white theme by default — set before first paint; release54.js keeps it in sync afterwards.
try { if (!S.st.skin) document.documentElement.dataset.skin = 'light'; } catch (e) {}
// 5.5.1: transparent game illustrations (ui/art/games/<id>.webp). The engine's icoBox() draws I[g.id], so filling
// that map shows the art everywhere a game icon appears (cards, home, intro, plans) without touching any engine.
// A game with no file keeps its original glyph.
const ML_GAME_ART = ['dual','juggle','crash','loci','faces','cards','mylist','pm','piano','scene','symspan','revspan','dx_cargo','dx_memory',
  'mmap','compass','nav','fold','dx_pack','dx_turn','matrix','series','xw','deduce','dx_route','dx_balance','dx_order',
  'hawk','glance','dd','dx_signal','racer','steps','radar','mot','brake','dx_search','conf','sw','dx_sort'];
const ML_CAT_ART = { mem: 'memory', spa: 'space', log: 'logic', spd: 'speed', foc: 'attention', flx: 'flexibility' };
try {
  ML_GAME_ART.forEach(id => {
    if (typeof I === 'object' && I && id in I) I[id] = `<img class="ml-art" src="ui/art/games/${id}.webp" alt="" width="512" height="512" loading="lazy" decoding="async" draggable="false">`;
  });
} catch (e) {}
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
      const section = (title, color, list, key) => list.length ? `<section class="ui-cat" data-cat="${key}"><h2>${ML_CAT_ART[key] ? `<img class="ml-cat-art" src="ui/art/games/${ML_CAT_ART[key]}.webp" alt="" width="512" height="512" decoding="async">` : `<i style="background:${color}"></i>`}${title}<small>${AR(list.length)}</small></h2><div class="ui-grid">${list.map(g => cardHTML(g, fav)).join('')}</div></section>` : '';
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
    const si0 = showIntro; showIntro = function () { const r = si0.apply(this, arguments); try { const g = curGame(); if (g && !g.kid) (LA.needed ? LA.needed(g) : LA.assets(g)).forEach(f => LA.load(f)); if (g && !g.puz) warmOnce(); } catch (e) {} return r; };
    const warm = () => { const c = navigator.connection; if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) return; const list = ['surfaces', 'objects-a', 'objects-b', 'objects-c', 'objects-d', 'objects-e', 'puzzle-parts'];
      const next = () => { const f = list.shift(); if (!f) return; Promise.resolve(LA.load(f)).then(() => (window.requestIdleCallback || setTimeout)(next, { timeout: 1500 })); }; next(); };
    // perf-cleanup: the brain-game atlases (~2 MB) used to download 2.5 s after every start-up; now they warm once,
    // when the player opens the games tab or a brain game, so a player who only does puzzles never pays for them.
    let warmed = false; const warmOnce = () => { if (warmed) return; warmed = true; (window.requestIdleCallback || setTimeout)(warm, { timeout: 4000 }); };
    window.mindlabWarmGames = warmOnce;
    if (typeof tab === 'function') { const tab0 = tab; tab = function (t) { const r = tab0.apply(this, arguments); if (t === 'games') warmOnce(); return r; }; }
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
      E('div', { class: 'ui-island' }, E('img', { src: ART + 'hub_treasure.webp', alt: '', class: 'ui-island-ico' }), E('p', { text: `جزيرة الكنز: ${AR(seals)} / ٧ أختام · ${AR(stars)} نجمة تحدٍّ` })),
      best.length ? E('div', { class: 'ui-best' }, E('h3', { text: 'أفضل نتائجك' }), ...best.map(h => { const g = GM[h.g]; return g ? E('p', {}, E('span', { text: g.name }), E('b', { text: AR(h.idx || h.pts || 0) })) : null; })) : null);
  }
  /* perf-cleanup D: the theme choice lived only inside the closed «الإعدادات» fold. This row at the top of «مستواي»
     shows it; each chip presses the existing setting button, so there is still one theme setting and one handler. */
  function appearance() {
    let pref = 'light'; try { pref = S.st.skin || document.documentElement.dataset.skin || 'light'; } catch (_) {}
    const row = E('div', { class: 'ui-look', role: 'group', 'aria-label': 'مظهر التطبيق' }, E('b', { text: 'المظهر' }));
    [['light', 'فاتح'], ['dark', 'داكن'], ['auto', 'تلقائي']].forEach(([k, n]) => {
      const b = E('button', { type: 'button', class: 'ui-look-chip' + (pref === k ? ' on' : ''), 'data-look-sk': k, 'aria-pressed': String(pref === k), text: n });
      b.onclick = () => { const real = document.querySelector(`#v-me [data-sk="${k}"]`); if (real) real.click(); };
      row.append(b);
    });
    return row;
  }
  /* iPhone silent switch: shown only where the browser can change it (audio/mindlab-audio.js mlSilentSound). */
  function silentRow() {
    const M = window.mlSilentSound; if (!M || !M.supported()) return null;
    const row = E('div', { class: 'ui-look', role: 'group', 'aria-label': 'الصوت مع وضع الصامت' }, E('b', { text: 'الصوت مع الصامت' }));
    [[true, 'يشتغل'], [false, 'لا يشتغل']].forEach(([v, n]) => {
      const b = E('button', { type: 'button', class: 'ui-look-chip' + (M.on === v ? ' on' : ''), 'data-silent': String(v), 'aria-pressed': String(M.on === v), text: n });
      b.onclick = () => { M.set(v); renderMe(); };
      row.append(b);
    });
    return row;
  }
  const me0 = renderMe; renderMe = function () {
    // 5.4.8: a setting (theme, mute, motion…) re-renders this page; keep the folds the player had open.
    const prev = $('#v-me'), wasOpen = new Set(prev ? [...prev.querySelectorAll('details.ui-fold[open]')].map(d => d.dataset.fold) : []);
    me0();
    const v = $('#v-me'); if (!v) return;
    const head = v.firstElementChild, rest = [...v.children].slice(1);
    const titleOf = n => { const h = n.querySelector && n.querySelector('h2'); if (h) return h.textContent.trim(); if (n.classList.contains('radar')) return 'مؤشر العقل'; if (n.classList.contains('stats')) return 'أرقامك'; return ''; };
    const groups = []; rest.forEach(n => { const t = titleOf(n); if (t || !groups.length) groups.push([t || 'المزيد', [n]]); else groups[groups.length - 1][1].push(n); });
    // radar + stats read better together
    const folded = groups.map(([t, nodes]) => { const d = E('details', { class: 'ui-fold', 'data-fold': t }, E('summary', { text: t })); if (wasOpen.has(t)) d.open = true; nodes.forEach(n => d.append(n)); return d; });
    v.innerHTML = ''; v.append(head, appearance(), ...[silentRow()].filter(Boolean), dashboard(), ...folded);
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
  if (typeof I === 'object') [['brake', 'brain_brake'], ['revspan', 'brain_backward'], ['deduce', 'brain_rules']].filter(([id]) => !ML_GAME_ART.includes(id)).forEach(([id, f]) => { I[id] = `<img class="ui-ico-art" src="${ART}${f}.webp" alt="" loading="lazy">`; });
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
    // 5.5.28: in Atheran stations the rule line stays visible and the numbered details start folded, so the board is on screen.
    if (!(g.id in ruleOpen)) ruleOpen[g.id] = !played(g.id) && !/^pz_[aw][a-z]/.test(g.id);
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

/* 5.4.1 — additive release layer; keeps the original application engine source intact. */
(function(){
  if(document.querySelector('script[data-release="5.4.0"]'))return;
  const s=document.createElement('script');s.src=new URL('release54.js',document.baseURI).href;s.dataset.release='5.4.0';document.body.append(s);
})();
/* 5.5.2 — ألعاب القراصنة المصغّرة (طبقة عرض فوق مكتبة الألغاز). */
(function(){
  if(document.querySelector('script[data-release="5.5.2-mini"]'))return;
  const s=document.createElement('script');s.src=new URL('ui/mini.js',document.baseURI).href;s.dataset.release='5.5.2-mini';document.body.append(s);
})();
/* 5.5.28 — غلاف حملة أَثْرَان وقصتها (بعد طبقة المكتبة، لأن الحملة تلتف حول renderPuz).
   perf-cleanup: these play layers (campaign, art bindings, motion boards, fit, openings, journey hub and their
   stylesheets) are not needed to paint the home screen, so they no longer compete with it during start-up.
   They load as one ordered bundle at the first of: the page finished loading and the browser is idle, the
   player's first touch, the puzzles tab being the opening tab, or startRun() (which waits for them). */
(function(){
  if(document.querySelector('script[data-release="5.5.28-atheran"]')||window.mindlabPlayLayers)return;
  const scripts = [
    'atheran/runtime/assets-runtime.js',
    'atheran/campaign/story.js',
    'atheran/campaign/campaign.js',
    'atheran/bindings/bindings.js',
    'motion/kit.js',
    'motion/atheran-motion.js',
    'motion/palace-motion.js',
    'motion/lab10.js',
    'ui/engines/scene-kit.js',
    'motion/pirate-routes.js',
    'ui/fit.js',
    'ui/openings-data.js',
    'ui/openings.js',
    'ui/journey-story-data.js',
    'ui/board-art-data.js',
    'ui/designs_art/journey/v3/stations.js',
    'ui/journey-hub.js'
  ];
  const styles = ['atheran/campaign/campaign.css', 'atheran/bindings/bindings.css', 'motion/motion.css', 'motion/lab10.css', 'ui/fit.css', 'ui/openings.css', 'ui/journey-hub.css', 'motion/correction-art.css', 'motion/expedition-art.css'];
  const layers = ['ui/puzzle-design.js', 'ui/adventure-design.js'];
  let loading = null;
  const idle = cb => (window.requestIdleCallback ? requestIdleCallback(cb, { timeout: 1200 }) : setTimeout(cb, 200));
  const insert = src => new Promise(done => {
    // Fetched in parallel, executed in order (async=false); a failed file must not block play.
    const script = document.createElement('script');
    script.async = false;
    script.src = new URL(src, document.baseURI).href;
    script.dataset.release = '5.5.28-atheran';
    script.onload = script.onerror = () => { script.onload = script.onerror = null; done(); };
    document.body.append(script);
  });
  const go = () => {
    for (const href of styles) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL(href, document.baseURI).href; document.head.append(link);
    }
    return Promise.all([...scripts, ...layers].map(insert)).then(() => { window.__mlPlayReady = true; window.dispatchEvent(new Event('mindlab:play-layers')); idle(startSide); });
  };
  // The side journey (25 stations, its own save) is a separate bundle: only the journey hub and its map need it.
  const side = { css: ['expedition10/style.css'], js: ['expedition10/logic.js', 'expedition10/app.js'] };
  let sideLoading = null;
  const startSide = () => {
    if (sideLoading) return sideLoading;
    if (window.ML10) return (sideLoading = Promise.resolve());
    for (const href of side.css) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL(href, document.baseURI).href; document.head.append(link); }
    sideLoading = Promise.all(side.js.map(insert)).then(() => window.dispatchEvent(new Event('mindlab:side-journey')));
    return sideLoading;
  };
  window.mindlabSide = { start: startSide };
  const start = () => {
    if (loading) return loading;
    const mini = document.querySelector('script[data-release="5.5.2-mini"]');
    loading = (mini && !window.LA?.miniReady ? new Promise(r => mini.addEventListener('load', r, { once: true })) : Promise.resolve()).then(go);
    return loading;
  };
  window.mindlabPlayLayers = { start, get ready() { return !!window.__mlPlayReady; } };
  // A puzzle never starts without its layers: startRun waits for the bundle the first time.
  if (typeof startRun === 'function') {
    const startRun0 = startRun;
    startRun = function () {
      if (window.__mlPlayReady) return startRun0.apply(this, arguments);
      const self = this, args = arguments;
      return start().then(() => startRun.apply(self, args));
    };
  }
  if (typeof curTab !== 'undefined' && curTab !== 'home' && curTab !== 'games') start();
  else if (document.readyState === 'complete') idle(start);
  else window.addEventListener('load', () => idle(start), { once: true });
  document.addEventListener('pointerdown', start, { once: true, capture: true });
})();


/* Retired Hasad game and eager word-bank loader removed; saved player data is untouched. */
/* 5.5.7 additive puzzle quality layer.
   The historical inline game engine remains fingerprint-stable; this replaces only
   its shared puzzle-play coordinator with the audited hint/restart handling. */
(function installPuzzleQualityLayer() {
  if (typeof window.pzPlay !== 'function' || window.__MINDLAB_PZ_QUALITY_557) return;
  window.__MINDLAB_PZ_QUALITY_557 = true;
  const pzPlay = function(id, build) {
return done=>{
  const g=GM[id],kid=!!g.kid,mx=pzMax(id),daily=!!(RUN&&RUN.daily)&&!kid,isRid=id==='pz_rid';
  const rp=RUN&&RUN.replay&&RUN.replay.id===id?RUN.replay:null;if(RUN)RUN.replay=null;
  const stg=rp?null:txStageOf(id),lv=rp?rp.lv:stg?stg.lv:pzLv(id),seed=rp?rp.seed:(Math.random()*2147483646|0)+1;if(RUN&&!isRid)RUN.last={id,lv,seed};
  const st=$('#stage');const base=kid?0:(isRid?40:20+lv*10)*(daily?2:1);let pts=base,hints=0,wrongs=0,ended=false,P={};
  const canRe=!PZ_NORESTART.includes(id);
  st.innerHTML=`<div class="pzhud">${kid?`<span class="pzlv">المستوى <b class="num">${lv}</b></span>`:`<span class="pzlv">${daily?'<span class="badge">لغز اليوم ×2</span> ':''}${isRid?'':stg?`المرحلة <b class="num">${stg.k}</b> من 3`:`المستوى <b class="num">${lv}</b> من ${mx}`}</span><span class="pzcoin" title="العملات المتاحة">${COIN}<b class="num" id="pzp">${pts}</b></span>`}${canRe?`<button class="pzhb pzre" id="pzr" aria-label="إعادة اللغز من البداية">${RE_SVG}<span>إعادة</span></button>`:''}<button class="pzhb" id="pzh" aria-label="تلميح">${BULB}<span>تلميح</span><i class="num" id="pzhn">3</i></button></div><div class="pzhint" id="pzt" hidden></div><div class="msg" id="m"></div><div class="pzbody" id="pzb"></div><div class="pzfoot"><button class="pzgive" id="pzq">${kid?'رجوع':'استسلم'}</button></div>`;
  const paintState = state => { st.dataset.expState = state; };
  const board = $('#pzb');
  board.addEventListener('click', event => {
    const input = event.target.closest('button,[data-i],[data-tok],[data-drag],[role="button"]');
    if (!ended && input && !input.disabled && input.getAttribute('aria-disabled') !== 'true') paintState('selected');
  }, { capture: true });
  delete st.dataset.expState;
  const setP=v=>{pts=Math.max(Math.round(base*.25),v);const e=$('#pzp');if(e)e.textContent=pts};
  const fin=(won,detail)=>{ended=true;stopAll();const p=pzState(),cur=pzLv(id);let nl=cur;
    if(!isRid&&!stg)nl=won?Math.min(mx,cur+1):Math.max(1,cur-1);if(!isRid&&!stg)pzSetLv(id,nl);if(won&&stg&&stg.replay){S.st.stgR=S.st.stgR||{};S.st.stgR[id]=stg.k%3}
    if(won&&!kid){p.pts+=pts;p.n[id]=(p.n[id]||0)+1;if(daily)p.daily=dayKey()}if(RUN){RUN.daily=false;if(isRid)RUN.rid=null}
    const lvTxt=isRid||stg?'':nl>cur?` المرحلة التالية: المستوى ${nl}.`:nl<cur?` رجعنا للمستوى ${nl} لتثبيت المهارة.`:'';
    const hTxt=kid?'':won?(hints?` استخدمت ${arN(hints,AN.hint)}.`:' بدون أي تلميح!'):'';
    if(won){paintState('solved');sfx.win();$('#pzb').classList.add('solved');pzStamp(kid?'أحسنت!':'محلول!')}
    later(()=>done({pts:won?pts:0,metric:won?clamp(1000-hints*150-wrongs*100,250,1000):0,detail:(detail||'')+hTxt+lvTxt}),won?1500:300)};
  const api={lv,kid,id,body:$('#pzb'),msg:h=>{const m=$('#m');if(m)m.innerHTML=h},get ended(){return ended},get hints(){return hints},get wrongs(){return wrongs},
    wrong(){if(ended)return;paintState('wrong');wrongs++;sfx.bad();if(!kid)setP(pts-Math.round(base*.1))},
    win(detail){if(!ended)fin(true,detail)},over(detail){if(!ended)fin(false,detail)}};
  const mount=()=>{const R=Math.random;Math.random=seeded(seed);try{P=build(api)||{};if(typeof XOLD!=='undefined'&&XOLD.has(id)&&id!=='pz_pipe')try{xWrapOld(api.body,id)}catch(e){}}finally{Math.random=R}};
  mount();
  window.mindlabOffline?.warmPuzzle(id);
  const hb=$('#pzh');if(!P.hint)hb.hidden=true;
  hb.onclick=()=>{if(ended||hints>=3||!P.hint)return;const before=pts;hints++;if(!kid)setP(pts-Math.round(base*.2));const t=P.hint(hints);if(t==null){hints--;if(!kid)setP(before);return}$('#pzhn').textContent=3-hints;
    const box=$('#pzt');box.hidden=false;box.innerHTML=`<b>تلميح ${hints}:</b> ${t}`;sfx.lit();if(hints>=3||ended)hb.disabled=true};
  const rb=$('#pzr');if(rb)rb.onclick=()=>{if(ended)return;stopAll();delete st.dataset.expState;const b=$('#pzb');b.className='pzbody';b.innerHTML='';const hintBox=$('#pzt');hintBox.hidden=true;hintBox.innerHTML='';api.msg('');
    pts=base;hints=0;wrongs=0;setP(pts);$('#pzhn').textContent='3';hb.disabled=false;hb.hidden=false;
    rb.classList.remove('spin');void rb.offsetWidth;rb.classList.add('spin');sfx.flip();mount();hb.hidden=!P.hint;hb.disabled=!P.hint;b.classList.add('rebuilt')};
  let arm=0;$('#pzq').onclick=()=>{if(ended)return;if(kid){closePlay();return}const q=$('#pzq');
    if(!arm){arm=1;q.textContent='متأكد؟ اضغط مرة ثانية';q.classList.add('arm');setTimeout(()=>{arm=0;if(!ended&&q.isConnected){q.textContent='استسلم';q.classList.remove('arm')}},3000);return}
    api.over(P.reveal?P.reveal():'استسلمت هذه المرة.')};
}
  };
  window.pzPlay = pzPlay;
})();


/* 5.5.8 — unified logic-grid and river-crossing presentation layer. */
(function loadPuzzleDesign558() {
  // perf-cleanup: loaded with the play-layer bundle above (window.mindlabPlayLayers).
})();

/* 5.5.9 — additive pirate, wreck and temple puzzle presentation/audio layer. */
(function loadAdventureDesign559() {
  // perf-cleanup: loaded with the play-layer bundle above (window.mindlabPlayLayers).
})();
