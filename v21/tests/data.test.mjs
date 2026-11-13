// Validates every authored case against the constraint engine, and checks that
// alternative solutions are accepted while wrong ones are rejected.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as V from '../src/core/validators.js';

const root = new URL('../public/data/', import.meta.url);
const J = p => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));
const treasure = J('treasure/treasure.json');
const planets = J('planets/planets.json');
const lab = J('lab/new-puzzles.json');
const child = J('child/child.json');

const cases = [
  ...treasure.chapters.flatMap(c => c.puzzles.map(p => ({ ...p, section: 'treasure' }))),
  ...planets.stations.flatMap(s => s.puzzles.map(p => ({ ...p, section: 'planets' }))),
  ...lab.puzzles.map(p => ({ ...p, section: 'lab' })),
  ...child.worlds.flatMap(w => w.activities.map(p => ({ ...p, section: 'child' }))),
];

let pass = 0; const log = [];
function ok(name, cond, msg) { assert.ok(cond, `${name}: ${msg}`); pass++; }

// counts
ok('counts', treasure.chapters.length === 6, 'six chapters');
ok('counts', treasure.chapters.flatMap(c => c.puzzles).length === 48, '48 treasure puzzles');
ok('counts', planets.stations.length === 9, 'nine stations');
ok('counts', planets.stations.flatMap(s => s.puzzles).length === 36, '36 missions');
ok('counts', lab.puzzles.length === 28, '28 lab cases');
ok('counts', J('lab/games.json').games.length === 24, '24 lab identities');
ok('counts', child.worlds.length === 12 && child.worlds.flatMap(w => w.activities).length === 48, '12 worlds / 48 activities');

// permutations helper
function perms(a) { if (a.length <= 1) return [a]; return a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])); }
function product(arrs) { return arrs.reduce((acc, a) => acc.flatMap(x => a.map(y => [...x, y])), [[]]); }

const altAccepted = [];
for (const p of cases) {
  const { type, setup, answer, id } = p;
  if (type === 'freebuild') { ok(id, V.validate(p, null).ok, 'open-ended'); continue; }
  if (type === 'choice-story') {
    for (const o of setup.options) ok(id, V.validate(p, o).ok, 'every story choice accepted');
    continue;
  }
  const r = V.validate(p, V.referenceResponse(p));
  ok(id, r.ok, `reference answer rejected (${r.reason}) ${JSON.stringify(answer)}`);
  // derived targets agree with authored answers
  if (type === 'numeric' || (type === 'schedule' && setup.durations)) {
    const c = V.computeNumeric(setup); ok(id, c === null || c === answer, `computed ${c} != answer ${answer}`);
    ok(id, V.validate(p, String(answer).replace(/\d/g, d => V.AR_DIGITS[d])).ok, 'Arabic-Indic digits accepted');
    ok(id, !V.validate(p, String(answer + 1)).ok, 'wrong number rejected');
  }
  if (type === 'rotate') ok(id, String(V.rotateTarget(setup)) === String(answer), 'rotate target');
  if (type === 'coordinate') ok(id, JSON.stringify(V.coordinateTarget(setup)) === JSON.stringify(answer), 'coordinate target');
  if (type === 'memory') ok(id, JSON.stringify(V.memoryTarget(setup, answer)) === JSON.stringify(answer), 'memory target');
  if (type === 'multiselect' && (setup.records || setup.requiredFeatures)) ok(id, new Set(V.multiselectTarget(setup)).size === answer.length && answer.every(a => V.multiselectTarget(setup).includes(a)), 'multiselect target');
  // exhaustive search: count every accepted response, make sure a wrong one is rejected
  let space = null;
  if (['sequence', 'schedule'].includes(type) && !setup.durations && !setup.rule && !setup.cycle) space = perms(setup.items);
  if (type === 'assignment') space = perms(setup.items);
  if (type === 'mirror') space = product(setup.mirrorSlots.map(() => setup.options));
  if (type === 'toggle') { const b = Object.keys(setup.buttons); space = product(b.map(() => [0, 1])).map(m => b.filter((_, i) => m[i])); }
  if (type === 'graph') { const n = V.graphNodes(setup); space = []; const walk = (path) => { space.push(path); for (const x of n) if (!path.includes(x)) walk([...path, x]); }; walk([setup.start]); }
  if (type === 'subset' || type === 'multiselect') { const keys = setup.items ? Object.keys(setup.items) : setup.cards ? Object.keys(setup.cards) : setup.records ? Object.keys(setup.records) : setup.options; space = product(keys.map(() => [0, 1])).map(m => keys.filter((_, i) => m[i])).filter(s => s.length); }
  if (type === 'allocation') { space = []; for (let a = 0; a <= setup.total; a++) for (let b = 0; a + b <= setup.total; b++) space.push([a, b, setup.total - a - b]); }
  if (type === 'path') { const [R_, C_] = setup.grid; space = []; const walk = (path) => { const [r, c] = path[path.length - 1]; if (r === setup.end[0] && c === setup.end[1]) { space.push(path); return; } for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nr=r+dr, nc=c+dc; if (nr<1||nc<1||nr>R_||nc>C_) continue; if (path.some(([x,y])=>x===nr&&y===nc)) continue; walk([...path,[nr,nc]]); } }; walk([setup.start]); }
  if (space) {
    const accepted = space.filter(s => V.validate(p, s).ok);
    const rejected = space.length - accepted.length;
    ok(id, accepted.length >= 1, 'at least one accepted');
    ok(id, rejected >= 1, 'some candidate rejected');
    if (accepted.length > 1) altAccepted.push(`${id}(${type}): ${accepted.length} valid responses`);
  }
}
// specific spot checks requested by the pack
const byId = Object.fromEntries(cases.map(c => [c.id, c]));
ok('CH-01-02', V.validate(byId['CH-01-02'], ['ب٢', 'ا', 'ب١']).ok, 'equivalent ب pieces swap accepted');
ok('CH-10-04', V.validate(byId['CH-10-04'], ['أ', 'ج', 'ب', 'د']).ok, 'ب/ج swap accepted');
ok('CH-10-04', !V.validate(byId['CH-10-04'], ['ب', 'أ', 'ج', 'د']).ok, 'invalid order rejected');
ok('TI-03-01', V.validate(byId['TI-03-01'], ['٢', '٣', '٤']).ok, 'alternative subset summing to 9 accepted');
ok('TI-04-06', V.validate(byId['TI-04-06'], 3).ok && !V.validate(byId['TI-04-06'], 2).ok, 'changed position memory');
ok('mirror-edge', V.traceBeam(byId['NX-003'].setup, ['\\', '/']).end === 'edge', 'beam leaving the grid stops at the edge');
ok('mirror-loop-guard', V.traceBeam({ grid: [2, 2], source: [1, 1, 'E'], mirrorSlots: [[1, 1], [1, 2], [2, 2], [2, 1]], receiver: [9, 9, 'N'] }, ['\\', '\\', '/', '\\']).end !== 'receiver', 'unreachable receiver never reported');

console.log(`PASS ${pass} checks over ${cases.length} authored cases`);
console.log('Cases with accepted alternative solutions:\n  ' + altAccepted.join('\n  '));
