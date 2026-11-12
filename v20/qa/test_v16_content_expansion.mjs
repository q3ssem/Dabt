import assert from 'node:assert/strict';
import { islandExpansion, childWorldExpansion } from '../src/content-expansion-v16.js';
assert.equal(islandExpansion.length, 6, 'six island chapters');
assert.ok(islandExpansion.every(ch => ch.length === 6), 'six new authored puzzles per chapter');
assert.equal(islandExpansion.flat().length, 36);
assert.equal(childWorldExpansion.length, 6);
assert.ok(childWorldExpansion.every(w => w.games.length === 4));
for (const p of islandExpansion.flat()) {
  assert.ok(p.title && p.prompt && p.hint && p.solution && p.consequence);
  assert.ok(Array.isArray(p.options) && p.options.length >= 3);
  assert.ok(Number.isInteger(p.correct) && p.correct >= 0 && p.correct < p.options.length);
}
for (const w of childWorldExpansion) for (const q of w.games) {
  assert.ok(q.name && q.prompt && q.explain);
  assert.ok(Array.isArray(q.options) && q.options.length >= 2);
  assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length);
}
console.log('PASS: V16 adds 36 valid island puzzles and 24 valid child activities across six new worlds.');
