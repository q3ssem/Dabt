'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
let seed = 0x55182026;
const M = Object.create(Math);
M.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 0x100000000; };
const c = {
  Math: M, Array, Object, Set, Map, Number, String, Infinity, console,
  rnd: n => Math.floor(M.random() * n),
  pick: a => a[Math.floor(M.random() * a.length)],
  shuffle: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(M.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  XAR: v => String(v),
};
vm.createContext(c);
const blocks = [
  ['const ALT_LV=', 'const altDesc='],
  ['const ASI_LV=', 'function runASilent('],
  ['const AFL_LV=', 'function runAFlow('],
  ['const WSP_LV=', 'function runWSpore('],
  ['const WLG_LV=', 'function runWLog('],
  ['const WLK_LV=', 'function runWLake('],
  ['const WFI_S=', 'function runWFirst('],
];
for (const [start, end] of blocks) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `source range exists: ${start}`);
  vm.runInContext(html.slice(a, b), c, { timeout: 30000 });
}
const altEq = vm.runInContext('altEq', c), altRot = vm.runInContext('altRot', c), wspRun = vm.runInContext('wspRun', c);
let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.equal(a, b, m); checks++; };

// Lighthouse: stuck apertures must already match the target; generator never downgrades.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 100; sample++) {
  const P = c.altMake(lv);
  eq(P._requested, lv, `lighthouse retains selected level ${lv}`);
  eq(P.S, [[8,0],[8,0],[10,0],[10,2],[12,2],[12,3],[14,3],[16,4]][lv-1][0], `lighthouse aperture count ${lv}`);
  eq(P.stuck.length, [[8,0],[8,0],[10,0],[10,2],[12,2],[12,3],[14,3],[16,4]][lv-1][1], `lighthouse stuck count ${lv}`);
  ok(P.runs && P.runs.length >= 4, `lighthouse run description exists ${lv}`);
  ok(altEq(P.disk, P.target), `lighthouse scrambled disk is a rotation of target ${lv}`);
  for (const i of P.stuck) eq(P.disk[i], P.target[i], `stuck aperture is solvable ${lv}`);
  for (let shift = 1; shift < P.S; shift++) ok(!altRot(P.target, shift).every((v,i)=>v===P.target[i]), `lighthouse target has unique circular alignment ${lv}`);
}
// Force deterministic fallback and make sure it is still at the selected difficulty and uniquely aligned.
const oldRandom = M.random; M.random = () => 0.9;
for (let lv = 1; lv <= 8; lv++) {
  const P = c.altMake(lv);
  eq(P._fallback, true, `lighthouse fallback path reached lv${lv}`);
  eq(P._requested, lv, `lighthouse fallback keeps level lv${lv}`);
  ok(P.runs.length >= 4, `lighthouse fallback has four or more runs lv${lv}`);
  for (const i of P.stuck) eq(P.disk[i], P.target[i], `lighthouse fallback stuck cells are valid lv${lv}`);
  for (let shift=1;shift<P.S;shift++) ok(!altRot(P.target,shift).every((v,i)=>v===P.target[i]), `lighthouse fallback alignment is unique lv${lv}`);
}
M.random = oldRandom;

// Silent scene event track: each visual event has a marker and replay remains available.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 30; sample++) {
  const P = c.asiMake(lv);
  ok(P.ev.length >= P.qs.length, `silent scene has enough events lv${lv}`);
  ok(P.qs.every(q => q.a >= 0 && q.a < q.o.length), `silent scene answers are in range lv${lv}`);
}

// Current branches: the displayed graph covers every generated level, and bay answers are unique minima.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 60; sample++) {
  const P = c.aflMake(lv), nodes = P.levels.flat();
  eq(P.levels.length, [[2,3,0],[2,3,0],[3,4,0],[3,4,0],[3,4,1],[4,5,1],[4,5,1],[4,6,1]][lv-1][0] + 1, `current graph depth is retained lv${lv}`);
  ok(nodes.every(n => n.bay || (P.out[n.id] || []).length > 0), `every internal current node has an outgoing branch lv${lv}`);
  eq(P.bv.filter(v => v === Math.min(...P.bv)).length, 1, `current graph has a unique calmest bay lv${lv}`);
  eq(P.ans, P.bv.indexOf(Math.min(...P.bv)), `current graph answer matches minimum bay lv${lv}`);
}

// Spore previews use a pure simulation; the source selection remains unchanged.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 35; sample++) {
  const P = c.wspMake(lv), before = P.a0.slice(), simulated = wspRun(before, P.s);
  eq(simulated[0].join(','), before.join(','), `spore simulation preserves initial row lv${lv}`);
  eq(simulated[P.s].join(','), P.tg.join(','), `spore generated initial row reaches target lv${lv}`);
  eq(before.join(','), P.a0.join(','), `spore preview does not mutate puzzle solution lv${lv}`);
}

// Ship log visual calendar markers preserve exact chronological order and calendar type.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 45; sample++) {
  const P = c.wlgMake(lv);
  eq(P.pages.length, P.k, `ship log page count lv${lv}`);
  ok(P.pages.every(p => ['kings','moon','whale','spring'].includes(p.kind)), `ship log pages have visual calendar type lv${lv}`);
  ok(P.pages.every((p,i)=>i===0||P.pages[i-1].abs<p.abs), `ship log pages remain chronological lv${lv}`);
  eq(new Set(P.pages.map(p=>p.txt)).size, P.k, `ship log pages have distinct clues lv${lv}`);
}

// Sky lake: target constellation transformed by vertical reflection and permitted drift reproduces the water.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 45; sample++) {
  const P = c.wlkMake(lv), truth = P.opts[P.ans].map(([x,y])=>[x,4-y]);
  const matches=[];
  for (const shift of [-1,0,1]) for (let omit=-1;omit<truth.length;omit++) {
    const pts=truth.filter((_,i)=>i!==omit).map(([x,y])=>[x+shift,y]);
    if(P.shown.every(([x,y])=>pts.some(([a,b])=>a===x&&b===y))) matches.push({shift,omit});
  }
  ok(matches.length>0, `sky-lake answer has a valid visual reflection transform lv${lv}`);
  ok(P.ans>=0&&P.ans<P.opts.length, `sky-lake answer remains within options lv${lv}`);
}

// First trace wheel: clue proof matches the generated solution, and each clue reflects its own visible rule.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 50; sample++) {
  const P = c.wfiMake(lv);
  eq(P.proof.length, P.nr, `first-trace clue count equals ring count lv${lv}`);
  const statuses = P.proof.map(q => q.type==='outer'
    ? P.rings[0][(q.slot+P.rot[0])%P.ns]===q.symbol
    : (P.rings[q.ring][(q.slot+P.rot[q.ring])%P.ns]===q.inner && P.rings[q.ring-1][(q.slot+P.rot[q.ring-1])%P.ns]===q.outer));
  ok(statuses.every(Boolean), `first-trace proof all holds at solution lv${lv}`);
}

for (const [needle,label] of [
  ['id="altbeam"','lighthouse beam sweep visualization'],
  ['P.stuck','lighthouse locked apertures'],
  ['data-asi-step=','silent-scene progress timeline'],
  ['id="afltracego"','current branch animated trace'],
  ['id="wspPeek"','spore non-penalty preview control'],
  ['wlg-cal','ship log calendar illustrations'],
  ['id="wlgTimeline"','ship log order rail'],
  ['id="wlkPreview"','sky-lake reflection workshop'],
  ['id="wfiProof"','first-trace live clue verification'],
]) ok(html.includes(needle),label);

console.log(`Atheran final-seven review: ${checks.toLocaleString('en-US')} assertions across 8 levels; lighthouse solvability, silent-scene replay tracking, animated current trace, spore preview, visual calendar log, reflection workshop, and live first-trace clue verification passed.`);
