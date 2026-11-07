// اختبار متصفح بمقاس جوال. التشغيل: node space/tests/e2e.js <outdir>
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const OUT = process.argv[2] || '/tmp/sv-e2e'; fs.mkdirSync(OUT, { recursive: true });
const url = 'file://' + path.resolve(__dirname, '..', 'play.html');
const results = []; const ok = (name, cond, info = '') => { results.push([cond ? 'PASS' : 'FAIL', name, info]); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#go'); await p.waitForSelector('.svi'); await p.waitForTimeout(2600);
  await p.screenshot({ path: OUT + '/01-intro.png' });
  await p.click('.svi-skip'); await p.waitForSelector('.svw-hs'); await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + '/02-world.png' });
  ok('world shows 5 puzzle points + 3 gates', await p.$$eval('.svw-hs', e => e.length) === 8);
  // نقاط التفاعل داخل الشاشة وغير مقصوصة
  const off = await p.$$eval('.svw-hs .ring, .svw-hs .lb, .svw-bc', es => es.filter(e => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || r.top < 60 || r.bottom > innerHeight - 70; }).length);
  ok('all interaction points fully visible on 390x844', off === 0, off + ' clipped');
  ok('bottom bar fits screen', await p.$$eval('.svw-ch button', es => es.every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })));
  const types = ['lightpath', 'symbols', 'stones', 'memory', 'flow'];
  for (let n = 1; n <= 5; n++) {
    for (let g = 1; g <= 3; g++) {
      if (g === 1) { await p.click(`[data-p="nowara-0${n}"]`); await p.waitForSelector('.svw-sheet.in'); await p.waitForTimeout(250); if (n === 1) await p.screenshot({ path: OUT + '/03-sheet.png' }); await p.click('.svw-gr [data-k="1"]'); }
      await p.waitForSelector('.svp-board > *');
      await p.waitForTimeout(350);
      await p.screenshot({ path: `${OUT}/p${n}-g${g}.png` });
      const fits = await p.evaluate(() => { const b = document.querySelector('.svp-board').getBoundingClientRect(), c = document.querySelector('.svp-board > *').getBoundingClientRect(), f = document.querySelector('.svp-f').getBoundingClientRect(); return { boardFits: c.width <= innerWidth + 1, overlap: c.bottom > f.top + 2, page: document.documentElement.scrollWidth <= innerWidth }; });
      ok(`p${n} g${g} board fits width & not under footer`, fits.boardFits && !fits.overlap && fits.page, JSON.stringify(fits));
      // تلميح ٣ مستويات
      for (let k = 0; k < 3; k++) await p.click('[data-a=hint]');
      const hint = await p.textContent('.svp-msg'); ok(`p${n} g${g} hint shows text`, hint.trim().length > 5);
      // حل مرجعي عبر واجهة الجلسة
      await p.evaluate(() => { const S = SV._session; S.ctx.commit(S.impl.solved(S.P)); });
      await p.waitForSelector('.svp-win'); await p.waitForTimeout(900);
      if (n === 1 && g === 1) await p.screenshot({ path: OUT + '/04-win.png' });
      const nextBtn = await p.$('.svp-win [data-a=next]');
      if (g < 3) {
        // الدرجة ٣ تحتاج نجمتين في ٢: الحل باستعمال ٣ تلميحات يعطي نجمة أقل؛ نتحقق من الحالتين
        if (!nextBtn) { const why = await p.textContent('.svp-wb small').catch(() => ''); ok(`p${n} g${g} next grade gated`, g === 2 && /نجمتين/.test(why), why); await p.evaluate((id) => { const r = SV.rec(id); r.g[2].stars = 3; SV.store.save(); }, `nowara-0${n}`); await p.click('.svp-win [data-a=exit]'); await p.click(`[data-p="nowara-0${n}"]`); await p.waitForSelector('.svw-sheet.in'); await p.waitForTimeout(200); await p.click('.svw-gr [data-k="3"]'); }
        else await nextBtn.click();
      } else await p.click('.svp-win [data-a=exit]');
    }
    await p.waitForTimeout(300);
  }
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('spaceVoyage.v1')));
  ok('shards = 5 puzzles x (1+2+3) = 30', st.inv.shards === 30, st.inv.shards);
  ok('chapter key earned', st.inv.keys.includes('nowara-k1'), st.inv.keys.join());
  ok('all 5 puzzles done', Object.values(st.puz).filter(x => x.status === 'done').length === 5);
  ok('treasure island save untouched', await p.evaluate(() => localStorage.getItem('miran:v2') === null));
  await p.screenshot({ path: OUT + '/05-world-after.png' });
  ok('chapter 2 unlocked chip', await p.$eval('.svw-ch [data-c="1"]', e => !e.classList.contains('lk')));
  // التراجع والإعادة
  await p.click('[data-p="nowara-01"]'); await p.waitForSelector('.svw-sheet.in'); await p.waitForTimeout(200); await p.click('.svw-gr [data-k="1"]'); await p.waitForSelector('.svlp-t');
  const before = await p.evaluate(() => JSON.stringify(SV._session.state));
  const tile = await p.evaluate(() => { const S = SV._session; for (let i = 0; i < S.P.n * S.P.n; i++) if (!S.P.fixed[i] && !['E', 'X'].includes(S.P.kind[i])) return i; });
  await p.click(`.svlp-t[data-i="${tile}"]`);
  ok('rotation changes state', await p.evaluate(b => JSON.stringify(SV._session.state) !== b, before));
  await p.click('[data-a=undo]'); ok('undo restores state', await p.evaluate(b => JSON.stringify(SV._session.state) === b, before));
  await p.click(`.svlp-t[data-i="${tile}"]`); await p.click('[data-a=reset]'); ok('reset restores initial', await p.evaluate(b => JSON.stringify(SV._session.state) === b, before));
  // الحجارة: الأسهم وسحب الإصبع
  await p.click('.svp-h [data-a=exit]'); await p.click('[data-p="nowara-03"]'); await p.waitForSelector('.svw-sheet.in'); await p.waitForTimeout(200); await p.click('.svw-gr [data-k="1"]'); await p.waitForSelector('.svst-pad');
  const m0 = await p.evaluate(() => SV._session.moves); for (const d of [0, 1, 2, 3]) await p.click(`.svst-pad [data-d="${d}"]`);
  ok('stones d-pad moves', await p.evaluate(m => SV._session.moves > m, m0));
  await p.click('.svp-h [data-a=exit]');
  // إعادة التحميل تحفظ التقدم
  await p.reload(); await p.click('#go'); await p.waitForSelector('.svw-hs');
  ok('no intro on second visit', !(await p.$('.svi')));
  ok('progress persists after reload', await p.$$eval('.svw-hs.done', e => e.length) === 5);
  // استعادة النسخة الاحتياطية عند تلف الحفظ
  await p.evaluate(() => localStorage.setItem('spaceVoyage.v1', '{broken'));
  await p.reload(); await p.click('#go'); await p.waitForSelector('.svw-hs'); await p.waitForTimeout(300);
  ok('corrupt save restored from backup', await p.$$eval('.svw-hs.done', e => e.length) >= 4, await p.$eval('.svw-toast', e => e.textContent).catch(() => 'no toast'));
  // اللوحات الأخرى
  await p.click('[data-a=journal]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/06-journal.png' }); await p.click('.svw-x');
  await p.click('[data-b]'); await p.waitForTimeout(1100); await p.screenshot({ path: OUT + '/07-beacon.png' }); await p.click('.svw-x');
  await p.click('.svw-ch [data-c="1"]'); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/08-ch2.png' });
  ok('no console errors (fonts blocked offline ignored)', errs.filter(e => !/ERR_TUNNEL|fonts\.g/.test(e)).length === 0, errs.slice(0, 3).join(' | '));
  await b.close();
  for (const r of results) console.log(r.join('  '));
  console.log(results.every(r => r[0] === 'PASS') ? '\nE2E ALL PASS' : '\nE2E FAILURES');
})().catch(e => { console.error(e); process.exit(1); });
