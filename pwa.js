'use strict';
(function () {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  const serviceWorker = navigator.serviceWorker;
  const scriptURL = new URL('sw.js', document.baseURI);
  const defer = callback => {
    if ('requestIdleCallback' in window) requestIdleCallback(callback, {timeout: 3000});
    else setTimeout(callback, 250);
  };

  // Preserve per-puzzle on-demand warming for the existing callers.
  const pending = new Set();
  function flushPuzzles() {
    const worker = serviceWorker.controller;
    if (!worker || navigator.connection?.saveData) return;
    for (const puzzleId of pending) worker.postMessage({type: 'warm-puzzle-art', puzzleId});
    pending.clear();
  }
  serviceWorker.addEventListener('controllerchange', () => defer(flushPuzzles));
  function warmPuzzle(puzzleId) {
    if (!puzzleId || pending.has(puzzleId) || navigator.connection?.saveData) return;
    pending.add(puzzleId);
    defer(flushPuzzles);
  }
  window.mindlabOffline = {warmPuzzle, rememberPuzzle() {}};

  let journeyRequested = false;
  document.addEventListener('click', event => {
    const puzzle = event.target.closest?.('[data-legacy-puzzle]');
    if (puzzle) warmPuzzle(puzzle.dataset.legacyPuzzle);
    if (journeyRequested || navigator.connection?.saveData ||
        !event.target.closest?.('#mlj-journey-entry, #t7-homego')) return;
    journeyRequested = true;
    defer(() => {
      const worker = serviceWorker.controller;
      if (worker) worker.postMessage({type:'warm-journey'});
      else journeyRequested = false;
    });
  });

  // Full-screen first-run asset preparation. CacheStorage is checked on each launch;
  // files already saved are never requested from the network again.
  const style = document.createElement('style');
  style.textContent = `
    #ml-preload {position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;
      overflow:auto;overscroll-behavior:contain;direction:rtl;text-align:center;
      background:linear-gradient(165deg,#fffaf0f8,#dff3f4fc);color:#173343;
      padding:calc(24px + env(safe-area-inset-top,0px)) 24px calc(24px + env(safe-area-inset-bottom,0px));
      font-family:inherit;box-sizing:border-box}
    #ml-preload[hidden] {display:none}
    #ml-preload .ml-load-body {width:min(100%,440px);display:grid;justify-items:center;gap:12px}
    #ml-preload h2 {font-size:clamp(23px,6vw,33px);line-height:1.45;margin:0}
    #ml-preload p {font-size:clamp(15px,3.9vw,18px);line-height:1.8;margin:0}
    #ml-preload .ml-load-mark {font-size:50px;line-height:1;opacity:.9}
    #ml-preload progress {appearance:none;-webkit-appearance:none;width:100%;height:12px;border:0;border-radius:99px;
      overflow:hidden;background:#c7d8d9}
    #ml-preload progress::-webkit-progress-bar {background:#c7d8d9;border-radius:99px}
    #ml-preload progress::-webkit-progress-value {background:#287d86;border-radius:99px}
    #ml-preload progress::-moz-progress-bar {background:#287d86;border-radius:99px}
    #ml-preload .ml-load-percent {font-size:30px;font-weight:850;font-variant-numeric:tabular-nums}
    #ml-preload .ml-load-note {font-size:13px;opacity:.83}
    #ml-preload .ml-load-actions {display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:10px}
    #ml-preload button {min-width:126px;min-height:48px;padding:9px 16px;border:1px solid #286f77;
      background:transparent;border-radius:99px;color:inherit;font:inherit;font-weight:700}
    #ml-preload button:focus-visible {outline:3px solid #286f77;outline-offset:3px}
    html[data-skin="dark"] #ml-preload {background:linear-gradient(155deg,#101c28fa,#1b3040fa);color:#f8f1df}
    @media (prefers-reduced-motion:reduce) {#ml-preload * {animation:none!important;transition:none!important}}
  `;
  document.head.append(style);
  const overlay = document.createElement('section');
  overlay.id = 'ml-preload';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'ml-load-title');
  overlay.innerHTML = `<div class="ml-load-body">
    <div class="ml-load-mark" aria-hidden="true">✦</div>
    <h2 id="ml-load-title">جاري تحميل الأصول</h2>
    <p id="ml-load-status" role="status" aria-live="polite">يُجهّز مختبر العقل الصور والألغاز للاستخدام دون تنزيلها في كل زيارة.</p>
    <progress id="ml-load-bar" max="100" value="0" aria-label="تقدّم تنزيل الأصول"></progress>
    <div id="ml-load-percent" class="ml-load-percent" aria-hidden="true">٠٪</div>
    <p id="ml-load-count" class="ml-load-note">فحص الملفات المحفوظة…</p>
    <div class="ml-load-actions">
      <button type="button" id="ml-load-retry" hidden>إعادة المحاولة</button>
      <button type="button" id="ml-load-skip" hidden>الدخول الآن</button>
    </div>
  </div>`;
  document.body.append(overlay);
  const $ = id => document.getElementById(id);
  const count = new Intl.NumberFormat('ar-SA');
  const bar = $('ml-load-bar'), percentage = $('ml-load-percent');
  const status = $('ml-load-status'), detail = $('ml-load-count');
  const retry = $('ml-load-retry'), skip = $('ml-load-skip');
  let progressPort, finished = false;
  const openSkip = setTimeout(() => {if (!finished) skip.hidden = false;}, 12000);
  function close() {
    finished = true;
    clearTimeout(openSkip);
    progressPort?.close();
    overlay.remove();
    style.remove();
  }
  skip.onclick = close;
  function fail(message) {
    status.textContent = message;
    retry.hidden = false;
    skip.hidden = false;
  }
  function preload(worker) {
    retry.hidden = true;
    skip.hidden = true;
    finished = false;
    progressPort?.close();
    const channel = new MessageChannel();
    progressPort = channel.port1;
    channel.port1.onmessage = ({data}) => {
      if (finished || !data || !['progress', 'complete'].includes(data.type)) return;
      const {done, total, cached, downloaded, failed} = data;
      const percent = total ? Math.round(100 * done / total) : 100;
      bar.value = percent;
      percentage.textContent = count.format(percent) + '٪';
      detail.textContent = count.format(done) + ' من ' + count.format(total) + ' ملف · المحفوظ: ' + count.format(cached);
      if (data.type !== 'complete') return;
      if (failed) {
        fail('تعذر تجهيز ' + count.format(failed) + ' ملفات. تحقق من الاتصال أو مساحة التخزين وأعد المحاولة.');
      } else {
        status.textContent = 'اكتمل تجهيز الأصول. ستُفتح الألغاز من الذاكرة المؤقتة في الزيارات التالية.';
        setTimeout(close, 450);
      }
    };
    try { worker.postMessage({type:'preload-all'}, [channel.port2]); }
    catch (_) { fail('تعذر بدء التحميل المسبق. يمكنك دخول التطبيق ثم إعادة المحاولة لاحقًا.'); }
  }
  // An existing installation may still run the old worker, which does not handle preload-all.
  // Resume automatically when the newly installed worker takes control.
  serviceWorker.addEventListener('controllerchange', () => {
    if (!finished && serviceWorker.controller) preload(serviceWorker.controller);
  });
  retry.onclick = async () => {
    try { const registration = await serviceWorker.ready; preload(registration.active || serviceWorker.controller); }
    catch (_) { fail('تعذر الوصول إلى التخزين دون اتصال.'); }
  };
  serviceWorker.register(scriptURL.href, {updateViaCache:'none'})
    .then(() => serviceWorker.ready)
    .then(registration => {
      const worker = registration.active || serviceWorker.controller;
      if (!worker) throw new Error('Service worker not active');
      preload(worker);
    })
    .catch(() => fail('تعذر تجهيز الأصول الآن. التطبيق ما زال متاحًا عبر الإنترنت.'));
})();
