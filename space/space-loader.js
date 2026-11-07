/* أطلس النجوم — محمّل خفيف. يضيف بطاقة الرحلة في قسم الألغاز، ولا يحمّل ملفات الرحلة إلا عند فتحها.
   لا يعدّل أي بيانات لجزيرة الكنز؛ تقدم الرحلة في spaceVoyage.v1 فقط. */
(function () {
  const V = '1';
  const me = document.currentScript && document.currentScript.src;
  const BASE = me ? me.replace(/space-loader\.js(\?.*)?$/, '') : 'space/';
  const FILES = ['engine/core.js', 'puzzles/lightpath.js', 'puzzles/symbols.js', 'puzzles/stones.js', 'puzzles/memory.js', 'puzzles/flow.js', 'data/nowara.js', 'ui/world.js'];
  let loading = null;
  function load() {
    if (loading) return loading;
    window.SV = window.SV || {}; window.SV.base = BASE;
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = BASE + 'space.css?v=' + V; document.head.appendChild(css);
    loading = FILES.reduce((p, f) => p.then(() => new Promise((res, rej) => { const s = document.createElement('script'); s.src = BASE + f + '?v=' + V; s.onload = res; s.onerror = () => rej(new Error(f)); document.head.appendChild(s); })), Promise.resolve());
    return loading;
  }
  function progress() {
    try { const s = JSON.parse(localStorage.getItem('spaceVoyage.v1') || 'null'); if (!s || !s.puz) return 0; return Object.values(s.puz).filter(p => p.status === 'done').length; } catch (e) { return 0; }
  }
  window.SpaceVoyage = {
    load,
    open() {
      return load().then(() => window.SV.open(document.body, { onClose: () => { try { if (typeof renderPuz === 'function') renderPuz(); } catch (e) { } } }))
        .catch(e => { console.error('[space]', e); alert('تعذر تحميل رحلة الفضاء. تحقق من الاتصال وحاول مرة أخرى.'); });
    }
  };
  function cardHTML() {
    const done = progress(), pct = Math.round(done / 20 * 100);
    return `<button class="card tripc svcard" id="spacego"><img class="tripimg" alt="" src="${BASE}assets/img/planet-01.webp" style="object-fit:contain;background:radial-gradient(circle,#1B2D5A,#0B1230)"><span class="triptx"><span class="eyebrow">رحلة جديدة</span><b>أطلس النجوم — نداء السديم</b><small>اركب «الرَّحّالة» مع وَمْض ونو. الكوكب الأول: نُوارة، عشرون لغزًا في أربعة فصول.</small><span class="tripbar"><i style="width:${pct}%"></i></span><small class="num">نُوارة · ${done} من 20 لغزًا</small></span><span class="go">‹</span></button>`;
  }
  function addCard() {
    const v = document.getElementById('v-puz'); if (!v || v.classList.contains('trip') || document.getElementById('spacego')) return;
    const anchor = document.getElementById('tripgo') || document.getElementById('pzday'); if (!anchor) return;
    anchor.insertAdjacentHTML('afterend', cardHTML());
    document.getElementById('spacego').onclick = () => window.SpaceVoyage.open();
  }
  if (typeof renderPuz === 'function') {
    const _rp = renderPuz;
    renderPuz = function () { const r = _rp.apply(this, arguments); try { addCard(); } catch (e) { } return r; };
    try { addCard(); } catch (e) { }
  }
})();
