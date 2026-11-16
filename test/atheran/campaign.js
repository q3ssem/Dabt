/* 5.5.28 — غلاف حملة أَثْرَان.
   منذ أن صارت جزيرة الكنز (treasure/app.js) هي شاشة الألغاز، لم يعد أطلس أَثْرَان (aHubHTML) يظهر في أي مكان.
   هذا الملف يعيد عرضه في شاشة خاصة به، ويستدعي دوال الحملة الأصلية كما هي (aHubHTML وtxBind وaStation وaSwOpen وaFinale).
   لا يغيّر المحركات ولا المعرّفات ولا مفاتيح الحفظ ولا شرط الفتح aOpen. */
(function () {
  'use strict';
  if (typeof ASTN === 'undefined' || typeof aHubHTML !== 'function' || !window.LA || window.ATHERAN_CAMPAIGN) return;
  const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const POSE = 'expedition10/art/crew/poses/';
  const HERO_ART = { roaa: 'char_rawaa_ref', noha: 'char_noha_ref', ward: 'char_ward_ref' };
  const heroSrc = k => window.MINDLAB_ATHRAN_ASSETS?.url(HERO_ART[k]) || `${POSE}${k}-welcome.webp`;
  const HEROINES = [['roaa', 'رواء', 'قائدة الطاقم'], ['noha', 'نهى', 'مهندسة الآلات'], ['ward', 'ورد', 'قارئة الأدلة']];

  /* ---------- التقدّم: المحطات تُحتسب بالتتابع مهما كان مكان اللعب ----------
     aWin لا يحرّك a.prog إلا إذا كانت المحطة هي التالية بالضبط، فاللعب من المكتبة خارج الترتيب
     يسجّل الإنجاز ولا يفتح ما بعده. نعيد حساب prog = عدد المحطات المتتالية المنجزة من البداية،
     وهي نفس قاعدة ترحيل الحملة campaignPathV4. لا ينقص prog أبدًا. */
  const contiguous = (list, done) => { let p = 0; while (p < list.length && done && done[list[p].id]) p++; return p; };
  if (typeof aState === 'function') {
    const aState0 = aState;
    aState = function () { const a = aState0.apply(this, arguments); const p = contiguous(ASTN, a.done); if (p > (a.prog || 0)) a.prog = p; return a; };
  }
  // قصر الملوك السبعة هو شرط فتح أَثْرَان، وغلافه أيضًا غير ظاهر؛ نفس التصحيح على تقدّمه.
  if (typeof pState === 'function' && typeof PW !== 'undefined') {
    const pState0 = pState;
    pState = function () { const a = pState0.apply(this, arguments); const p = contiguous(PW, a.done); if (p > (a.prog || 0)) a.prog = p; return a; };
  }
  const normalize = () => { try { aState(); if (typeof pState === 'function') pState(); } catch (e) {} };

  /* ---------- شاشة الحملة ---------- */
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function summary() {
    normalize();
    const a = aState(), open = aOpen(), done = ASTN.filter(s => a.done[s.id]).length;
    const sw = (a.sw || {}), swd = (a.swd || {}), found = ASW.filter(w => sw[w.k]).length, cleared = ASW.filter(w => swd[w.k]).length;
    const tr = (a.tr || []).length, palace = (txState().a4 || {}).prog || 0;
    return { a, open, done, found, cleared, tr, palace };
  }
  function header(s) {
    const crew = HEROINES.map(([k, n, r]) => `<figure class="ah-hero"><img src="${heroSrc(k)}" alt="" decoding="async"><figcaption><b>${n}</b><small>${r}</small></figcaption></figure>`).join('');
    const lock = s.open ? '' : `<p class="ah-lock"><b>الحملة مقفلة.</b> تنفتح بعد إكمال قصر الملوك السبعة (${AR(s.palace)} من ${AR(PW.length)} محطة). المحطات ظاهرة على الأطلس لتعرف الطريق.</p>`;
    return `<header class="triph ah-top">
      <div class="ah-bar"><button class="t7-btn ah-back" type="button" data-ah="back">رجوع</button><span class="ah-kicker">الفصل الرسمي</span></div>
      <h1 class="ah-title">أَثْرَان: أطلس المجهول</h1>
      <p class="ah-lead">رواء ونهى وورد في قارة لا تظهر في أي خريطة صحيحة، ومعهن من أهلها ليان وبدر والعم نوّار.</p>
      <div class="ah-crew">${crew}</div>
      <dl class="ah-stats">
        <div><dt>المحطات</dt><dd>${AR(s.done)} / ${AR(ASTN.length)}</dd></div>
        <div><dt>الآثار</dt><dd>${AR(s.tr)} / ${AR(ATR.length)}</dd></div>
        <div><dt>العوالم السرية</dt><dd>${AR(s.cleared)} / ${AR(ASW.length)}</dd></div>
      </dl>${lock}
    </header>`;
  }
  function render() {
    const v = document.getElementById('v-puz'); if (!v) return;
    const s = summary();
    v.classList.remove('t7'); v.classList.add('trip', 'ah-view');
    v.innerHTML = header(s) + aHubHTML();
    try { txBind(); } catch (e) { console.warn('[atheran] bind', e); }
    v.querySelector('[data-ah="back"]').onclick = back;
    window.scrollTo(0, 0); document.body.scrollTop = 0; document.documentElement.scrollTop = 0;
  }
  function back() { LA.view = null; const v = document.getElementById('v-puz'); if (v) v.classList.remove('ah-view'); renderPuz(); }
  function open() { LA.view = 'atheran'; if (typeof curTab !== 'undefined' && curTab !== 'puz') tab('puz'); else render(); }

  /* ---------- بطاقة الدخول في تبويب الألغاز ---------- */
  function launchCard() {
    const v = document.getElementById('v-puz'); if (!v || LA.view || v.querySelector('.ah-launch')) return;
    const s = summary();
    const card = document.createElement('section'); card.className = 'ah-launch';
    const state = !s.open ? `مقفلة حتى إكمال قصر الملوك السبعة · ${AR(s.palace)}/${AR(PW.length)}` : s.done >= ASTN.length ? 'اكتملت المحطات · عُد للأسرار والخاتمة' : `${AR(s.done)} من ${AR(ASTN.length)} محطة · ${AR(s.cleared)} من ${AR(ASW.length)} عوالم سرية`;
    card.innerHTML = `<div class="ah-launch-crew">${HEROINES.map(([k]) => `<img src="${heroSrc(k)}" alt="" loading="lazy" decoding="async">`).join('')}</div>
      <div class="ah-launch-text"><span class="ah-kicker">الفصل الرسمي · ٢١ محطة · ٦٣ مرحلة</span><h2>أَثْرَان: أطلس المجهول</h2><p>${esc(state)}</p></div>
      <button class="ah-launch-go" type="button">${s.open ? 'افتح الأطلس' : 'اعرض الأطلس'}</button>`;
    card.querySelector('button').onclick = open;
    const anchor = v.querySelector('.ex10-launch');
    if (anchor) anchor.after(card); else v.insertBefore(card, v.querySelector('.pzstory') || v.children[1] || null);
  }

  const puz0 = renderPuz;
  renderPuz = function () {
    if (LA.view === 'atheran') return render();
    const v = document.getElementById('v-puz'); if (v) v.classList.remove('ah-view');
    puz0.apply(this, arguments); launchCard();
  };
  // قصة المحطة مطويّة في سطرين داخل شاشة اللعب، وتُفتح باللمس.
  document.addEventListener('click', e => {
    const st = e.target.closest && e.target.closest('#stage .atheran-story');
    if (st && !e.target.closest('button')) st.classList.toggle('ah-open');
  });
  window.ATHERAN_CAMPAIGN = { open, render, back, summary, contiguous };
  if (typeof curTab !== 'undefined' && curTab === 'puz') renderPuz();
})();
