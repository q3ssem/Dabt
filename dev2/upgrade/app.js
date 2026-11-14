'use strict';
/* app.js — ربط طبقة التطوير بالتطبيق الأصلي: المكتبة، البطاقات، عالم الطفل، الإعدادات، النسخ الاحتياطي. */
(function () {
  const $ = DX.$, E = DX.el, AR = DX.AR;
  /* أيقونة بديلة لأي لعبة أصلية بلا أيقونة (كان يظهر النص undefined) */
  G.forEach(g => { if (!I[g.id]) I[g.id] = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="15"/><path d="M18 24l4 4 8-9"/></svg>'; });

  /* ---- مكتبة ألعاب العقل ---- */
  DX.catalog = { query: '', filter: 'all' }; DX.favorites = () => S.st.discoveryFavorites || (S.st.discoveryFavorites = []);
  renderGames = function () {
    const v = $('#v-games'), shown = G.filter(g => !g.hidden);
    v.innerHTML = `<div class="dx-head"><div><span class="dx-eyebrow">ضبط دماغك · مكتبة العقل</span><h1>اختر مهارتك وابدأ</h1><p class="dx-muted">${AR(shown.length)} لعبة · لكل لعبة تعليمات ومستويات وإيقاف مؤقت</p></div></div>
     <input id="dxSearch" class="dx-search" type="search" aria-label="ابحث عن لعبة" placeholder="ابحث عن لعبة…" value="${esc(DX.catalog.query)}">
     <div class="dx-chips">${[['all', 'الكل'], ['new', 'الجديدة'], ['favorites', 'المفضلة'], ...Object.entries(CATS).map(([k, c]) => [k, c.n])].map(([k, n]) => `<button class="dx-chip ${DX.catalog.filter === k ? 'active' : ''}" aria-pressed="${DX.catalog.filter === k}" data-filter="${k}">${n}</button>`).join('')}</div>
     <div class="dx-catalog" id="dxCatalog"></div><p class="dx-muted">النتائج تصف أداءك داخل الألعاب فقط، وليست قياسًا للذكاء أو تشخيصًا.</p>`;
    const fill = () => {
      const { query, filter } = DX.catalog, fav = DX.favorites(), rows = shown.filter(g => g.name.includes(query.trim()) && (filter === 'all' || (filter === 'new' && g.discovery) || (filter === 'favorites' && fav.includes(g.id)) || g.cat === filter));
      $('#dxCatalog').innerHTML = rows.map(g => { const gi = gameIndex(g.id), rk = gameRank(g.id); return `<article class="dx-card" data-skill="${g.cat}"><button class="dx-cardmain" data-open="${g.id}" style="--c:${g.col[0]}">${icoBox(g)}<b>${esc(g.name)}</b><small style="color:${CATS[g.cat].hex}">${CATS[g.cat].n}${g.discovery ? ' · جديدة' : ''}</small><small>${gi == null ? 'لم تُجرَّب بعد' : 'مؤشرك ' + AR(gi)}${rk ? ' · م' + AR(rk[0]) : ''}</small></button><button class="dx-fav" data-favorite="${g.id}" aria-label="المفضلة: ${esc(g.name)}" aria-pressed="${fav.includes(g.id)}">${fav.includes(g.id) ? '★' : '☆'}</button></article>`; }).join('') || '<p class="dx-empty">لا توجد ألعاب مطابقة. جرّب اسمًا أو تصنيفًا آخر.</p>';
      v.querySelectorAll('[data-open]').forEach(b => b.onclick = () => startRun([b.dataset.open]));
      v.querySelectorAll('[data-favorite]').forEach(b => b.onclick = () => { const id = b.dataset.favorite; S.st.discoveryFavorites = DX.favorites().includes(id) ? DX.favorites().filter(k => k !== id) : [...DX.favorites(), id]; S.save(); fill(); });
    };
    $('#dxSearch').oninput = e => { DX.catalog.query = e.target.value; fill(); };
    v.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { DX.catalog.filter = b.dataset.filter; v.querySelectorAll('[data-filter]').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); }); fill(); });
    fill();
  };

  /* ---- بطاقتا المغامرتين في الرئيسية وقسم الألغاز ---- */
  DX.cards = () => {
    const c = DX.worldStats('campaign'), p = DX.worldStats('planets');
    const card = (k, art, eyebrow, title, sub, st) => `<button class="dx-cover" data-world="${k}" style="background-image:linear-gradient(180deg,rgba(6,10,26,.05),rgba(6,10,26,.88)),url('upgrade/art/${art}')"><span class="dx-eyebrow">${eyebrow}</span><b>${title}</b><small>${sub}</small><div class="dx-progress"><i style="width:${st.done / st.total * 100}%"></i></div><small>${AR(st.done)} من ${AR(st.total)} مهمة${st.done ? ' · تابع من حيث توقفت' : ''}</small></button>`;
    return `<div class="dx-head"><div><span class="dx-eyebrow">عوالم الاكتشاف</span><h2>المغامرة تنتظرك</h2></div></div><div class="dx-covers">${card('campaign', 'island-cover.jpg', '٦ فصول · ١٨ منطقة · ٣٦ آلية', 'جزيرة الكنز', 'امشِ واقفز، اجمع الأدوات، وشغّل الآليات لتفتح الطريق.', c)}${card('planets', 'planets-cover.jpg', '٩ محطات · ٢٧ مهمة', 'رحلة الكواكب', 'من القمر إلى نبتون: جاذبية مختلفة ومهمة علمية في كل محطة.', p)}</div>`;
  };
  DX.bindCards = v => v.querySelectorAll('[data-world]').forEach(b => b.onclick = () => DX.openWorld(b.dataset.world));
  const home0 = renderHome; renderHome = function () { home0(); const v = $('#v-home'), n = E('div', { html: DX.cards() }), w = v.querySelector('.workout'); w ? w.after(n) : v.append(n); DX.bindCards(v); };
  const puz0 = renderPuz; renderPuz = function () { puz0(); const v = $('#v-puz'); if (typeof PZ_TRIP !== 'undefined' && PZ_TRIP) return; const b = v.querySelector('#tripgo'), n = E('div', { html: DX.cards() }); if (b) { b.before(n); const s = b.querySelector('b,strong'); } else v.prepend(n); DX.bindCards(v); };

  /* ---- عالم الطفل: أربع فئات عمرية ---- */
  const lv0 = kidLvGet; kidLvGet = function (id) { const a = DX.age(); return Math.min(a.cap, Math.max(a.floor, lv0(id))); };
  const add0 = renderKidAdd; renderKidAdd = function () {
    add0(); const v = $('#v-kid'), bands = v.querySelector('.kbands'); if (!bands) return; const old = [...bands.querySelectorAll('button')]; let sel = null; bands.innerHTML = ''; bands.classList.add('dx-ages');
    DX.ages.forEach(a => { const b = E('button', { 'data-age': a.id, html: `<b>${a.label.replace(/ سن.*/, '')}</b><small>${a.i === 3 ? 'سنة' : 'سنوات'}</small>` }); b.onclick = () => { sel = a; old.find(x => x.dataset.b === a.band).onclick(); bands.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }; bands.append(b); });
    const save = $('#ksave'), orig = save.onclick; save.onclick = () => { const n = kidSt().list.length; orig(); const c = kidCur(); if (c && sel && kidSt().list.length > n) { c.ageGroup = sel.id; kidTouch(); renderKid(); } };
  };
  const kid0 = renderKid; renderKid = function () {
    kid0(); if (KID_VIEW !== 'home' || !kidCur()) return; const v = $('#v-kid'), grid = v.querySelector('.kgrid'); if (!grid) return; const a = DX.age();
    grid.before(E('section', { class: 'dx-kbanner' }, E('span', { class: 'dx-eyebrow', text: 'مسار ' + a.label }), E('h2', { text: 'مغامرة صغيرة، مهارة جديدة' }), E('p', { class: 'dx-muted', text: 'الأسئلة والتعليمات هنا مضبوطة على عمرك. يغيّرها ولي الأمر من القفل.' }),
      E('div', { class: 'dx-chips' }, [['all', 'كل الأنشطة'], ['new', 'الأنشطة الجديدة'], ['old', 'الألعاب الأولى']].map(([k, t], i) => E('button', { class: 'dx-chip' + (i ? '' : ' active'), text: t, onclick: e => { v.querySelectorAll('.dx-kbanner .dx-chip').forEach(x => x.classList.toggle('active', x === e.currentTarget)); grid.querySelectorAll('[data-g]').forEach(x => { const d = !!GM[x.dataset.g].discovery; x.hidden = k === 'new' ? !d : k === 'old' ? d : false; }); } })))));
    grid.querySelectorAll('[data-g]').forEach(b => { const c = DX.child.find(x => 'dx_k_' + x.id === b.dataset.g); if (c) b.append(E('small', { class: 'dx-agenote', text: c.ageNote[a.i] })); });
  };
  const par0 = renderParent; renderParent = function () {
    par0(); const v = $('#v-kid'), sec = E('section', { class: 'dx-settings' }, E('h2', { text: 'الفئة العمرية لكل طفل' }), E('p', { class: 'dx-muted', text: 'الفئة تحدد نوع الأسئلة وطول الجولة وحدود المستويات. تغييرها لا يحذف أي تقدم.' }));
    kidSt().list.forEach(c => { const s = E('select', { 'aria-label': 'فئة ' + c.name }, DX.ages.map(a => E('option', { value: a.id, text: a.label }))); s.value = c.ageGroup || (c.band === 'b' ? '8-10' : '4-5'); s.onchange = () => { c.ageGroup = s.value; c.band = DX.ages.find(a => a.id === s.value).band; kidTouch(); renderParent(); }; sec.append(E('label', {}, E('span', { text: c.av + ' ' + c.name }), s)); });
    v.append(sec); v.querySelectorAll('[data-band]').forEach(b => b.remove());
  };

  /* ---- «مستواي»: الإعدادات والنسخ الاحتياطي ---- */
  const me0 = renderMe; renderMe = function () {
    me0(); const v = $('#v-me'), p = DX.prefs(), st = E('p', { class: 'dx-muted', id: 'dxBackupStatus', role: 'status', text: 'تشمل النسخة ألعابك وملفات الأطفال والمغامرتين.' });
    const file = E('input', { type: 'file', hidden: true, accept: '.json,application/json', id: 'dxFile' });
    file.onchange = async e => { const f = e.target.files[0]; if (!f) return; try { if (f.size > 1e7) throw Error('حجم الملف كبير جدًا.'); const data = DX.validateBackup(JSON.parse(await f.text())); if (!confirm('ستستبدل النسخة تقدم هذا الجهاز. هل تريد الاستعادة؟')) return; DX.restore(data); renderAll(); DX.toast('تمت استعادة التقدم'); } catch (err) { st.textContent = 'تعذرت الاستعادة: ' + (err.message || 'ملف غير صالح'); } file.value = ''; };
    const rounds = E('select', { id: 'dxRounds' }, [[4, '٤ مهام · سريعة'], [6, '٦ مهام · متوازنة'], [8, '٨ مهام · أطول']].map(([n, t]) => E('option', { value: n, text: t }))); rounds.value = String(p.rounds); rounds.onchange = () => { p.rounds = +rounds.value; S.save(); };
    const chk = (id, key, text) => { const c = E('input', { type: 'checkbox', id }); c.checked = !!p[key]; c.onchange = () => { p[key] = c.checked; S.save(); }; return E('label', {}, E('span', { text }), c); };
    v.prepend(E('section', { class: 'dx-settings' }, E('h2', { text: 'تجربتك وتقدمك' }), E('label', {}, E('span', { text: 'طول جلسة الألعاب الجديدة' }), rounds), chk('dxMotion', 'motion', 'حركة المشاهد والخلفيات'), chk('dxSpeech', 'speech', 'قراءة التعليمات صوتيًا تلقائيًا'),
      E('div', { class: 'dx-acts' }, E('button', { class: 'dx-btn', id: 'dxBackup', text: 'حفظ نسخة من التقدم', onclick: DX.download }), E('button', { class: 'dx-btn', id: 'dxRestore', text: 'استعادة التقدم', onclick: () => file.click() }), file), st));
  };

  /* ---- شاشة اللعب ---- */
  const head0 = header; header = function (g) { head0(g); const pl = $('#play'); pl.dataset.skill = g.cat; pl.style.setProperty('--c', (g.col && g.col[0]) || '#ffd25a'); pl.classList.toggle('dx-brain-play', !g.kid && !g.puz); pl.classList.toggle('dx-child-play', !!g.kid); };
  const rank0 = gameRank; gameRank = function (id) { const g = GM[id]; return g && g.discovery ? [clamp(g.kid ? kidLvGet(id) : S.st.lv[id] || 1, 1, 6), 6] : rank0(id); };
  const close0 = closePlay; closePlay = function () { if (DX.clock.paused()) { const c = $('.dx-pause'); if (c) c.remove(); $('#play').classList.remove('dx-paused'); DX.clock.resume(); } DX.hush(); close0(); }; $('#quit').onclick = closePlay;
  const fin0 = finish; finish = function (r) { fin0(r); $('#play').classList.add('dx-idle'); };
  const intro0 = showIntro; showIntro = function () { intro0(); $('#play').classList.add('dx-idle'); const g = curGame(), intro = $('#stage .intro'); if (intro && !g.puz) intro.insertAdjacentHTML('beforeend', `<p class="dx-muted dx-introtip">يمكنك إيقاف اللعبة مؤقتًا في أي لحظة من زر ⏸ أعلى الشاشة، وهناك تجد التعليمات أيضًا.</p>`); };
  const cd0 = countdown; countdown = function () { $('#play').classList.remove('dx-idle'); cd0(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && DX.inRound() && !DX.clock.paused()) DX.pause(); });
  renderAll();
})();
