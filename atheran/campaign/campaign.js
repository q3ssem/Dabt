/* 5.5.28 — غلاف حملة أَثْرَان.
   منذ أن صارت جزيرة الكنز (treasure/app.js) هي شاشة الألغاز، لم يعد أطلس أَثْرَان (aHubHTML) يظهر في أي مكان.
   هذا الملف يعيد عرضه في شاشة خاصة به، ويستدعي دوال الحملة الأصلية كما هي (aHubHTML وtxBind وaStation وaSwOpen وaFinale).
   لا يغيّر المحركات ولا المعرّفات ولا مفاتيح الحفظ ولا شرط الفتح aOpen. */
(function () {
  'use strict';
  if (typeof ASTN === 'undefined' || !window.LA || window.ATHERAN_CAMPAIGN) return;
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
  /* ---------- بطاقة الدخول في تبويب الألغاز ---------- */
  function back() { LA.view=null; renderPuz(); }
  function open() {
    back();
    window.mindlabJourneyHub?.openChapters?.('atheran');
  }

  const puz0 = renderPuz;
  renderPuz = function () {
    const v = document.getElementById('v-puz'); if (v) v.classList.remove('ah-view');
    puz0.apply(this, arguments); libraryOrder();
  };
  /* ترتيب مكتبة الألغاز: الفصل الرسمي أولاً، والرحلة الجانبية تحته كمحتوى فرعي؛ ومربع «لغز اليوم» أزيل من الواجهة
     (اللغز اليومي ومضاعفته ما زالا يعملان من بقية التطبيق؛ لم يُحذف أي محرك أو مفتاح حفظ). */
  function libraryOrder() {
    const v = document.getElementById('v-puz'); if (!v || LA.view) return;
    const day = v.querySelector('#pzday'); if (day) day.remove();
    const main = v.querySelector('.mlj-journey-entry'), side = v.querySelector('.ex10-launch');
    if (!main) return;
    let head = v.querySelector('.ah-side-head');
    if (side) {
      if (main.compareDocumentPosition(side) & Node.DOCUMENT_POSITION_PRECEDING) main.after(side);
      if (!head) { head = document.createElement('div'); head.className = 'ah-side-head'; head.innerHTML = '<b>رحلة جانبية</b><small>مغامرة قصيرة مستقلة بحفظها الخاص</small>'; }
      side.before(head); side.classList.add('ah-side');
    }
  }
  // the side journey may insert its card after us: keep the order whenever the tab is re-rendered
  new MutationObserver(() => { const v = document.getElementById('v-puz'); if (v && !LA.view && v.querySelector('.mlj-journey-entry') && (v.querySelector('#pzday') || (v.querySelector('.ex10-launch') && !v.querySelector('.ex10-launch.ah-side')) || (v.querySelector('.ex10-launch') && v.querySelector('.mlj-journey-entry').compareDocumentPosition(v.querySelector('.ex10-launch')) & Node.DOCUMENT_POSITION_PRECEDING))) libraryOrder(); })
    .observe(document.getElementById('v-puz') || document.body, { childList: true });
  // قصة المحطة مطويّة في سطرين داخل شاشة اللعب، وتُفتح باللمس.
  document.addEventListener('click', e => {
    const st = e.target.closest && e.target.closest('#stage .atheran-story');
    if (st && !e.target.closest('button')) st.classList.toggle('ah-open');
  });
  function canOpenStation(i) {
    return !!ASTN[i] && aOpen() && i <= aState().prog;
  }

  function openJourneyStation(i) {
    if (canOpenStation(i)) startRun([ASTN[i].id], null, { journeyStation: true });
  }

  function finishJourneyScene() {
    const a = aState();
    if (!aOpen() || !a.finPend || !a.done.pz_aheart) return false;
    a.finPend = 0;
    if (window.MindlabRescue?.open?.()) return true;
    aFinale(); // Fallback for older/offline bundles without the new rescue UI.
    return true;
  }

  // Native campaign actions retain their original gates in the chapter folders.
  function journeyActions() {
    const s = summary();
    if (!s.open) return [];
    const a = aSwState();
    const actions = [{ label: 'سجل بعثات أَثْرَان', open: aLogs }];
    for (const world of ASW) {
      if (a.sw[world.k] || world.cond(a)) {
        actions.push({ label: a.sw[world.k] ? world.n : world.k === 'bones' ? 'آثار الطوّاف' : 'استكشف أثرًا جديدًا',
          open: () => {
            const current = aSwState();
            if (aOpen() && (current.sw[world.k] || world.cond(current))) aSwOpen(world.k);
          } });
      }
    }
    const needsNight = state => state.done.pz_acity && !state.sw?.spores && !state.nightPass && aHour() >= 5 && aHour() < 19;
    if (needsNight(a)) actions.push({ label: 'انتظر حلول الليل', open: () => {
      const current = aSwState();
      if (!aOpen() || !needsNight(current)) return;
      current.nightPass = 1;
      S.save();
      aSwOpen('spores');
    } });
    if (s.done === ASTN.length && a.done.pz_aheart) actions.push({ label: window.MindlabRescue?.state()?.completed ?
        'طريق الإخلاء · القرار الأخير' : 'إخلاء أَثْرَان · أكمل القرار الأخير',
      open: () => {
        const current = aState();
        if (!aOpen() || !current.done.pz_aheart) return;
        current.finPend = 0;
        if (!window.MindlabRescue?.open?.()) aFinale();
      } });
    return actions;
  }

  window.ATHERAN_CAMPAIGN = { open, back, summary, contiguous, canOpenStation, openJourneyStation, finishJourneyScene, journeyActions };
  if (typeof curTab !== 'undefined' && curTab === 'puz') renderPuz();
})();
