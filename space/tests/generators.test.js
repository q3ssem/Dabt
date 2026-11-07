// اختبار آلي: لكل نوع × درجة × بذور كثيرة: التوليد ينجح، الحلّال يجد حلًا، الحالة الابتدائية غير محلولة، الحالة المحلولة تمر بالمحقق، والتلميحات لا تغيّر الحالة.
// التشغيل: node space/tests/generators.test.js [seeds]
const path = require('path');
global.window = undefined; globalThis.SV = {};
for (const f of ['engine/core.js', 'puzzles/lightpath.js', 'puzzles/symbols.js', 'puzzles/stones.js', 'puzzles/memory.js', 'puzzles/flow.js']) require(path.join(__dirname, '..', f));
const SV = globalThis.SV, N = +(process.argv[2] || 200);
let fail = 0; const report = [];
for (const type of ['lightpath', 'symbols', 'stones', 'memory', 'flow']) {
  for (const g of [1, 2, 3]) {
    const t0 = Date.now(); let ok = 0, maxMs = 0; const extra = {};
    for (let s = 1; s <= N; s++) {
      const t1 = Date.now();
      try {
        const P = SV.make(type, s * 7919 + g, g), impl = SV.types[type];
        const init = impl.init(P), sol = impl.solved(P);
        if (impl.isSolved(P, init)) throw new Error('initial state already solved');
        if (!impl.isSolved(P, sol)) throw new Error('reference solution rejected');
        const before = JSON.stringify(init);
        const ctx = { markTile() { }, markTray() { }, markDir() { }, flash() { }, ghost() { } };
        for (const lv of [1, 2, 3]) { const h = impl.hint(P, init, lv, ctx); if (!h || !h.text) throw new Error('empty hint ' + lv); }
        if (JSON.stringify(init) !== before) throw new Error('hint mutated state');
        if (type === 'stones') { extra.opt = (extra.opt || 0) + P.opt; }
        if (type === 'lightpath') { extra.par = (extra.par || 0) + P.par; }
        ok++;
      } catch (e) { fail++; if (fail < 8) console.log('FAIL', type, g, s, e.message); }
      maxMs = Math.max(maxMs, Date.now() - t1);
    }
    const line = `${type.padEnd(10)} g${g}: ${ok}/${N} ok · avg ${((Date.now() - t0) / N).toFixed(1)}ms · max ${maxMs}ms` + (extra.opt ? ` · avg optimal moves ${(extra.opt / ok).toFixed(1)}` : '') + (extra.par ? ` · avg par rotations ${(extra.par / ok).toFixed(1)}` : '');
    console.log(line); report.push(line);
  }
}
console.log(fail ? `\n${fail} FAILURES` : '\nALL PASS');
process.exit(fail ? 1 : 0);
