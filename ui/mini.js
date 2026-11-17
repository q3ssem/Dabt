/* 5.5.2 — «ألعاب القراصنة المصغّرة».
   يجمع قسمي «مغامرة القرصان» و«الحطام والمعبد» في بطاقة واحدة داخل مكتبة الألغاز.
   البطاقة تفتح شاشة فيها «جولة سريعة» (3 ألعاب عشوائية متتالية) وتحتها كل الألعاب.
   طبقة عرض فقط: معرّفات الألغاز ومستوياتها وحفظها كما هي، ولا يُحذف أي محرّك.
   الألغاز ذات الألواح الداكنة تُرفع من المكتبة فقط (محرّكاتها باقية للحفظ القديم). */
(function () {
  if (!window.LA || !LA.librarySections || LA.miniReady) return;
  LA.miniReady = true;
  const MINI = 'ألعاب القراصنة المصغّرة';
  const SOURCES = ['مغامرة القرصان', 'الحطام والمعبد'];
  // 5.5.28: pz_aflow (محطة إلزامية في حملة أَثْران) و pz_pobs (المحطة 11 في قصر الملوك، وشرط فتح أَثْران) عادا بلوحة فاتحة.
  const HIDDEN = new Set(['pz_zstars']);
  // العوالم السرية لا تظهر في المكتبة حتى يكتشفها اللاعب داخل الحملة (a5.sw[k]).
  const SECRET = { pz_wbone: 'bones', pz_wspore: 'spores', pz_wlog: 'ship', pz_wlake: 'lake', pz_wfirst: 'first' };
  const secretFound = id => { try { const k = SECRET[id]; if (!k) return true; const t = S.st.tx || {}, a = t.a5 || {}; return !!(a.sw && a.sw[k]); } catch (e) { return false; } };
  LA.secretFound = secretFound;
  const ROUND = 3;
  const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const el = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'text') e.textContent = v; else if (k === 'onclick') e.onclick = v; else e.setAttribute(k, v);
    });
    kids.forEach(k => k && e.append(k));
    return e;
  };

  const sections0 = LA.librarySections;
  LA.librarySections = function () {
    const out = []; let mini = null;
    sections0().forEach(([name, list]) => {
      const kept = list.filter(g => !HIDDEN.has(g.id) && secretFound(g.id));
      if (SOURCES.includes(name)) {
        if (!mini) { mini = [MINI, []]; out.push(mini); }
        mini[1].push(...kept);
      } else out.push([name, kept]);
    });
    return out.filter(s => s[1].length);
  };
  LA.miniGames = () => (LA.librarySections().find(s => s[0] === MINI) || [MINI, []])[1];

  function miniCard(count) {
    const card = el('button', { class: 'la-library-card ml-mini-card', type: 'button', 'data-mini': 'pirates', onclick: () => LA.mini() });
    card.innerHTML = `<span class="la-library-image ml-mini-art"><img src="ui/art/lib_pirate.webp" alt="" loading="lazy" decoding="async"></span><b>${MINI}</b><small>${AR(count)} لعبة · جولة سريعة</small>`;
    return card;
  }

  // داخل المكتبة: قسم القراصنة يظهر كبطاقة واحدة. عند البحث تظهر الألغاز المطابقة نفسها.
  const into0 = LA.libraryInto;
  LA.libraryInto = function (host) {
    into0.call(this, host);
    const input = host.querySelector('input.dx-search');
    const fold = () => {
      if (input && input.value.trim()) return;
      const sec = [...host.querySelectorAll('.la-section')].find(s => (s.querySelector('.la-section-title span') || {}).textContent === MINI);
      if (!sec || sec.dataset.mini) return;
      sec.dataset.mini = '1'; sec.classList.add('ml-mini-section');
      const grid = sec.querySelector('.la-library-grid'), n = grid ? grid.children.length : 0;
      if (grid) grid.replaceChildren(miniCard(n));
      const small = sec.querySelector('.la-section-title small'); if (small) small.textContent = AR(1);
    };
    fold();
    if (input) input.addEventListener('input', fold);
  };

  function back() { LA.view = null; if (window.T7 && T7.hub) T7.hub(); else if (window.T7) T7.map(); else renderPuz(); }

  function quick() {
    const ids = LA.miniGames().map(g => g.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    if (ids.length) startRun(ids.slice(0, ROUND));
  }

  function render() {
    const v = document.getElementById('v-puz'); if (!v) return;
    const games = LA.miniGames();
    v.classList.remove('trip'); v.classList.add('t7'); v.innerHTML = '';
    v.append(el('header', { class: 't7-top ml-mini-top' },
      el('div', {}, el('span', { class: 't7-kicker', text: `${AR(games.length)} لعبة قصيرة من بحر القراصنة` }), el('h1', { text: MINI })),
      el('button', { class: 't7-btn', type: 'button', text: 'رجوع', onclick: back })));
    const hero = el('section', { class: 'ml-mini-hero' });
    hero.innerHTML = `<img class="ml-mini-hero-art" src="ui/art/series_pirate.webp" alt="" decoding="async"><div class="ml-mini-hero-text"><b>جولة سريعة</b><small>${AR(ROUND)} ألعاب عشوائية متتالية</small></div>`;
    hero.append(el('button', { class: 'ml-mini-go', type: 'button', text: 'ابدأ الجولة', onclick: quick }));
    v.append(hero);
    // البطاقات نفسها التي تبنيها المكتبة الأصلية، بأيقوناتها وأزرارها كما هي.
    const tmp = document.createElement('div'); into0.call(LA, tmp);
    const byId = new Map([...tmp.querySelectorAll('.la-library-card[data-legacy-puzzle]')].map(c => [c.dataset.legacyPuzzle, c]));
    const grid = el('div', { class: 'la-library-grid ml-mini-grid' });
    games.forEach(g => { const c = byId.get(g.id); if (c) grid.append(c); });
    v.append(el('h2', { class: 'la-section-head ml-mini-list-head', text: 'اختر لعبة' }), grid);
    window.scrollTo(0, 0); document.body.scrollTop = 0; document.documentElement.scrollTop = 0;
  }

  LA.mini = function () { LA.view = 'mini'; if (curTab !== 'puz') tab('puz'); else render(); };
  const puz0 = renderPuz;
  renderPuz = function () { if (LA.view === 'mini') render(); else puz0(); };
  if (window.T7 && T7.open) { const open0 = T7.open; T7.open = function (i) { if (LA.view === 'mini') LA.view = null; return open0.apply(this, arguments); }; }
  if (typeof curTab !== 'undefined' && curTab === 'puz') renderPuz();
})();
