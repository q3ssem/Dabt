'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
let seed = 0x55162026;
const M = Object.create(Math);
M.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 0x100000000; };
const c = {
  Math: M, Array, Object, Set, Map, Number, String, Infinity, console,
  rnd: n => Math.floor(M.random() * n),
  pick: a => a[Math.floor(M.random() * a.length)],
  shuffle: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(M.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  inb: (x, y, w, h) => x >= 0 && y >= 0 && x < w && y < h,
};
vm.createContext(c);
const blocks = [
  ['const APT_LV=', 'function runAPort('],
  ['const ARG_LV=', 'function runARing('],
  ['const AGI_LV=', 'function runAGiant('],
  ['const AHE_LV=', 'function runAHerd('],
  ['const ACT_SP=', 'function runACity('],
  ['const ALY_LV=', 'function runALayer('],
];
for (const [start, end] of blocks) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `source range exists: ${start}`);
  vm.runInContext(html.slice(a, b), c, { timeout: 20000 });
}
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };

// 1) Tide passage forecast: the chosen unique departure clears every passage;
// the forecast reproduces each reading including values inferred from the repeating cycle.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 40; sample++) {
  const P = c.aptMake(lv), f = c.aptForecast(P, P.t0);
  const [expectedK, expectedPeriod] = [[3,12],[3,12],[3,12],[4,12],[4,12],[4,8],[5,8],[5,6]][lv - 1];
  eq(P._requested, lv, `tide generator never downgrades requested level lv${lv}`);
  eq(P.K, expectedK, `tide passage count remains at selected level lv${lv}`);
  eq(P.Pd, expectedPeriod, `tide cycle period remains at selected level lv${lv}`);
  if (P._fallback) eq(P._layout, 'same-level-periodic-witness', `tide fallback remains same-level lv${lv}`);
  for (let h = P.Pd; h < P.h.length; h++) eq(P.h[h], P.h[h % P.Pd], `tide cycle repeats exactly at hour ${h} lv${lv}`);
  eq(f.length, P.K, `tide forecast has one row per passage lv${lv}`);
  ok(f.every(q => q.ok), `tide intended departure clears every passage lv${lv}`);
  const candidates = [];
  for (let start = P.w0; start < P.w0 + P.Pd; start++) {
    const q = c.aptForecast(P, start);
    if (q.length === P.K && q.every(x => x.ok)) candidates.push(start);
    q.forEach((x, i) => {
      const expectedHour = start + i;
      const expectedSource = P.hide < 24 && expectedHour >= P.hide ? expectedHour % P.Pd : expectedHour;
      eq(x.hour, expectedHour, `tide hour alignment lv${lv}`);
      eq(x.sourceHour, expectedSource, `tide repeat source mapping lv${lv}`);
      eq(x.tide, P.h[expectedSource], `tide forecast reading matches chart cycle lv${lv}`);
      eq(x.ok, x.tide >= x.need, `tide passage status is exact lv${lv}`);
    });
  }
  eq(candidates.length, 1, `tide departure remains unique lv${lv}`);
  eq(candidates[0], P.t0, `tide forecast identifies unique departure lv${lv}`);
  eq(c.aptForecast(P, P.w0 - 1).length, 0, `tide rejects departure before gate lv${lv}`);
}

// 2) Tree rings: live alignment score and candidate scanner agree with the generator's unique placement.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 36; sample++) {
  const P = c.argMake(lv);
  eq(P.S.length, P.K, `ring count retained lv${lv}`);
  P.S.forEach((beam, k) => {
    const score = c.argScore(P, k, beam.end);
    ok(score.valid, `ring true placement fully matches lv${lv}`);
    eq(score.matched, score.total, `ring score counts all non-damaged marks lv${lv}`);
    const candidates = c.argCandidates(P, k);
    eq(candidates.length, 1, `ring window has unique candidate lv${lv}`);
    eq(candidates[0], beam.end, `ring candidate matches true year lv${lv}`);
    ok(!c.argScore(P, k, beam.end - 1).valid, `ring adjacent wrong placement is rejected lv${lv}`);
  });
}

// 3) Herd crossing: preview matches the movement/collision rules and every generator witness is safe.
const dirs = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0], w: [0, 0] };
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 20; sample++) {
  const P = c.aheMake(lv);
  let pos = P.start, t = 0;
  for (const action of P.sol) {
    const q = c.ahePreview(P, pos, t, action);
    ok(q.valid, `herd witness step stays inside grid lv${lv}`);
    ok(!q.collision, `herd witness step is collision-free lv${lv}`);
    const [dx, dy] = dirs[action], nx = pos % P.n + dx, ny = ((pos / P.n) | 0) + dy;
    eq(q.to, ny * P.n + nx, `herd preview destination is exact lv${lv}`);
    const now = c.aheSim(P, t), next = c.aheSim(P, t + 1);
    const landing = next.some(g => g.y * P.n + g.x === q.to);
    const crossing = now.some((g, i) => g.y * P.n + g.x === q.to && next[i].y * P.n + next[i].x === pos);
    eq(q.collision, landing || crossing, `herd preview detects landing and crossing collisions lv${lv}`);
    eq(q.giants.map(g => `${g.x},${g.y}`).join('|'), next.map(g => `${g.x},${g.y}`).join('|'), `herd forecast shows next positions exactly lv${lv}`);
    pos = q.to; t++;
  }
  eq(pos, P.goal, `herd generated route reaches goal lv${lv}`);
  const edge = c.ahePreview(P, P.start, 0, 'd');
  if (((P.start / P.n) | 0) === P.n - 1) ok(!edge.valid && edge.reason === 'edge', `herd preview rejects lower edge lv${lv}`);
}
eq(c.ahePreview({ n: 2, gs: [] }, 0, 0, 'x').valid, false, 'herd preview rejects unknown action');

// 4) Living city: simulating a candidate reproduces the observed cascade for one cause only.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 80; sample++) {
  const P = c.actMake(lv);
  const trueAudit = c.actAudit(P, P.gone);
  ok(trueAudit.exact, `city true first loss reproduces full cascade lv${lv}`);
  eq(trueAudit.mismatch, 0, `city true hypothesis has no mismatches lv${lv}`);
  const dark = P.al.map((v, i) => !v ? i : -1).filter(i => i >= 0);
  const exact = dark.filter(i => c.actAudit(P, i).exact);
  eq(exact.length, 1, `city cascade has a unique initiating loss lv${lv}`);
  eq(exact[0], P.gone, `city unique cascade points to actual lost species lv${lv}`);
  for (const i of dark) {
    const a = c.actAudit(P, i);
    eq(a.mismatch, a.extra.length + a.missing.length, `city audit mismatch count is decomposed lv${lv}`);
  }
}

// 5) Stratigraphy: evidence comparator respects the generated chronological partial order.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 28; sample++) {
  const P = c.alyMake(lv), rank = P.items.map(e => P.ev.indexOf(e));
  ok(rank.every(v => v >= 0), `stratigraphy items remain traceable to section lv${lv}`);
  for (let a = 0; a < P.items.length; a++) {
    eq(c.alyRelation(P, a, a), null, `stratigraphy rejects comparing a sample with itself lv${lv}`);
    for (let b = a + 1; b < P.items.length; b++) {
      const r = c.alyRelation(P, a, b);
      ok(!!r, `stratigraphy returns a relation for distinct samples lv${lv}`);
      eq(r.older, rank[a] < rank[b] ? a : b, `stratigraphy identifies older sample lv${lv}`);
      eq(r.younger, rank[a] < rank[b] ? b : a, `stratigraphy identifies younger sample lv${lv}`);
      eq(r.distance, Math.abs(rank[a] - rank[b]), `stratigraphy relation separation lv${lv}`);
    }
  }
}

for (const [needle, label] of [
  ['id="aptf"', 'tide passage forecast panel'],
  ['function aptForecast(', 'tide per-passage forecast engine'],
  ['id="argscore${k}"', 'tree-ring match meter'],
  ['function argCandidates(', 'tree-ring candidate helper'],
  ['id="ahepreview"', 'herd next-step simulation control'],
  ['function ahePreview(', 'herd movement preview helper'],
  ['id="acttest"', 'living-city hypothesis simulation control'],
  ['function actAudit(', 'living-city causal audit helper'],
  ['id="alycompare"', 'stratigraphy evidence comparison control'],
  ['function alyRelation(', 'stratigraphy pairwise relation helper'],
]) ok(html.includes(needle), label);

console.log(`Atheran next mechanics: ${checks.toLocaleString('en-US')} assertions; tide forecast, tree-ring matching, herd move simulation, causal cascade audit, and stratigraphic evidence comparison verified across eight levels.`);
