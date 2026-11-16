'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
let seed = 0x55172026;
const M = Object.create(Math);
M.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 0x100000000; };
const c = {
  Math: M, Array, Object, Set, Map, Number, String, Infinity, console,
  rnd: n => Math.floor(M.random() * n),
  pick: a => a[Math.floor(M.random() * a.length)],
  shuffle: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(M.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
};
vm.createContext(c);
const blocks = [
  ['const ARO_LV=', 'function runARoot('],
  ['const ASW_LV=', 'function runASwarm('],
  ['const AVS_LV=', 'function runAVsong('],
  ['const AGI_LV=', 'function runAGiant('],
  ['const ASO_N=', 'function runASong('],
];
for (const [start, end] of blocks) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `source range exists: ${start}`);
  vm.runInContext(html.slice(a, b), c, { timeout: 25000 });
}
// AVS generator depends on the established musical motif declaration.
const motif = html.indexOf('const AMOTIF=');
const motifEnd = html.indexOf(';', motif);
assert.ok(motif >= 0 && motifEnd > motif, 'musical motif declaration exists');
vm.runInContext(html.slice(motif, motifEnd + 1), c);
let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.equal(a, b, m); checks++; };

// 1) Shifting roots: preview of every generated optimal move matches the real transition.
const rootDirs = { u: [-1, 0], l: [0, -1], r: [0, 1], w: [0, 0] };
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 28; sample++) {
  const P = c.artMake(lv);
  ok(Array.isArray(P.sol) && P.sol.length === P.min, `root solver has a witness lv${lv}`);
  let r = P.H, col = P.c0, t = 0;
  for (const action of P.sol) {
    const q = c.artPreview(P, r, col, t, action);
    const [dr, dc] = rootDirs[action], nr = r + dr, nc0 = col + dc;
    if (nr < 0) {
      ok(q.valid && q.complete, `root preview recognises crossing lv${lv}`);
      break;
    }
    ok(q.valid && q.safe && !q.complete, `root witness move is preview-safe lv${lv}`);
    eq(q.before[0], nr, `root preview row is exact lv${lv}`);
    eq(q.before[1], nc0, `root preview pre-shift column is exact lv${lv}`);
    const carried = nr < P.H ? P.sp[nr] : 0;
    eq(q.to[0], nr, `root preview final row is exact lv${lv}`);
    eq(q.to[1], nc0 + carried, `root preview applies row shift lv${lv}`);
    eq(q.turns, t + 1, `root preview increments turn once lv${lv}`);
    r = nr; col = nc0 + carried; t++;
  }
  const bad = c.artPreview(P, r, col, t, 'unknown');
  eq(bad.valid, false, `root preview rejects unknown action lv${lv}`);
}
const rootSample = c.artMake(8);
eq(c.artPreview(rootSample, rootSample.H, 0, 0, 'l').reason, 'edge', 'root preview rejects out-of-board horizontal move');

// 2) White swarm: the live audit agrees with a direct reading of every cell and every row/column cap.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 45; sample++) {
  const P = c.aswMake(lv), audit = c.aswAudit(P, P.rp, P.cp);
  ok(audit.ok, `swarm generated solution passes audit lv${lv}`);
  let gold = 0, revealed = 0, mission = 0, broken = 0;
  for (let k = 0; k < P.v.length; k++) {
    const left = Math.max(0, P.v[k] - P.rp[(k / P.C) | 0] - P.cp[k % P.C]);
    if (P.ty[k] === 1) { gold++; if (left === 0) revealed++; }
    if (P.ty[k] === 2) { mission++; if (left < 1) broken++; }
  }
  eq(audit.gold, gold, `swarm audit counts golden marks lv${lv}`);
  eq(audit.revealed, revealed, `swarm audit counts revealed marks lv${lv}`);
  eq(audit.mission, mission, `swarm audit counts expedition marks lv${lv}`);
  eq(audit.broken, broken, `swarm audit counts erased expedition marks lv${lv}`);
  eq(audit.rowOver, P.rp.filter(v => v > P.mp).length, `swarm audit row cap exact lv${lv}`);
  eq(audit.colOver, P.cp.filter(v => v > P.mp).length, `swarm audit column cap exact lv${lv}`);
  const altered = P.rp.slice(); altered[0] = P.mp + 1;
  eq(c.aswAudit(P, altered, P.cp).rowOver, 1, `swarm audit exposes row overrun lv${lv}`);
}

// 3) Giant habits: a proposed rule is checked against all three observations;
// every rule that fits the record must imply the same future cell.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 55; sample++) {
  const P = c.agiMake(lv), targetType = P.hist[0][0].t;
  const trueAudit = c.agiHabitAudit(P, 0, targetType);
  ok(trueAudit.fits, `giant true habit fits observed track lv${lv}`);
  ok(trueAudit.predictions.includes(P.ans), `giant true habit predicts generated cell lv${lv}`);
  const fits = ['line', 'orbit', 'pond'].map(type => c.agiHabitAudit(P, 0, type)).filter(a => a.fits);
  ok(fits.length >= 1, `giant observations retain at least one habit hypothesis lv${lv}`);
  const futures = new Set(fits.flatMap(a => a.predictions));
  eq(futures.size, 1, `giant all consistent habits agree on future cell lv${lv}`);
  eq([...futures][0], P.ans, `giant consistent hypotheses resolve generated target lv${lv}`);
  for (const type of ['line', 'orbit', 'pond']) {
    const q = c.agiHabitAudit(P, 0, type);
    ok(q.count >= q.predictions.length, `giant candidate count is internally valid lv${lv}`);
  }
}

// 4) Singing valley: test candidate transformations on Salma's example without replacing the answer exercise.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 40; sample++) {
  const P = c.avsMake(lv), probe = c.avsRuleProbe(P, P.R);
  ok(probe.valid, `valley true rule stays inside pitch range lv${lv}`);
  ok(probe.exact, `valley true rule exactly reproduces echo example lv${lv}`);
  eq(probe.matched, P.L, `valley true rule matches every sample note lv${lv}`);
  const identity = c.avsRuleProbe(P, { r: false, i: false, t: 0, o: 0 });
  eq(identity.proposal.join(','), P.ex.join(','), `valley identity hypothesis leaves example unchanged lv${lv}`);
  eq(identity.total, P.L, `valley probe reports complete comparison length lv${lv}`);
  ok(!c.avsRuleProbe(P, { r: false, i: false, t: 8, o: 0 }).valid, `valley probe rejects out-of-range transformation lv${lv}`);
}

// 5) Deep songs: interval fingerprints survive transposition and distinguish every generated herd.
for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < 65; sample++) {
  const P = c.asoMake(lv), signatures = P.sp.map(c.asoFingerprint).map(a => a.join(','));
  eq(new Set(signatures).size, P.ns, `deep-song fingerprints are unique lv${lv}`);
  if (!P.abs) {
    const recorded = P.rec.map(c.asoFingerprint).map(a => a.join(','));
    eq(new Set(recorded).size, P.pres.length, `deep-song present recording has unique motifs lv${lv}`);
    eq(recorded.slice().sort().join('|'), P.pres.map(i => signatures[i]).sort().join('|'), `deep-song current recording preserves herd fingerprints lv${lv}`);
  } else {
    const old = P.recO.map(c.asoFingerprint).map(a => a.join(','));
    const now = P.recN.map(c.asoFingerprint).map(a => a.join(','));
    ok(old.includes(signatures[P.gone]), `deep-song lost herd exists in old record lv${lv}`);
    ok(!now.includes(signatures[P.gone]), `deep-song lost herd is absent from current record lv${lv}`);
    eq(old.slice().sort().join('|'), P.old.map(i => signatures[i]).sort().join('|'), `deep-song old record contains expected herd fingerprints lv${lv}`);
    eq(now.slice().sort().join('|'), P.old.filter(i => i !== P.gone).map(i => signatures[i]).sort().join('|'), `deep-song current record omits only missing herd lv${lv}`);
  }
}

for (const [needle, label] of [
  ['function artPreview(', 'roots move planner helper'],
  ['id="artpeek"', 'roots preview control'],
  ['id="artpreview"', 'roots forecast status panel'],
  ['function aswAudit(', 'swarm row/column and cell audit'],
  ['id="aswdiag"', 'swarm live progress and preservation panel'],
  ['function agiHabitAudit(', 'giant candidate-habit consistency checker'],
  ['data-habit="${v}"', 'giant interactive habit hypothesis controls'],
  ['function avsRuleProbe(', 'valley proposed-rule comparison engine'],
  ['id="avsprobe"', 'valley rule laboratory feedback'],
  ['function asoFingerprint(', 'deep-song interval fingerprint helper'],
  ['id="asoproof"', 'deep-song visual fingerprint comparison panel'],
]) ok(html.includes(needle), label);

console.log(`Atheran final-five mechanics: ${checks.toLocaleString('en-US')} assertions; roots preview, swarm audit, giant habit hypotheses, echo-rule laboratory, and deep-song fingerprints verified across eight levels.`);
