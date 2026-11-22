'use strict';
/* Acceptance gate for the 36-page user-provided "جزران.pdf" narrative/puzzle specification.
 * This is an index contract, not an assertion that every proposed story beat has shipped. */
const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = path => fs.readFileSync(path, 'utf8');
const source = JSON.parse(read('docs/JAZIRAN_PUZZLE_INDEX_2026-11-22.json'));
const inventory = JSON.parse(read('legacy/inventory.json'));
const parseAssignment = path => {
  const text = read(path);
  return JSON.parse(text.slice(text.indexOf(' = ') + 3).trim().replace(/;\s*$/, ''));
};
const story = parseAssignment('ui/journey-story-data.js');
const map = parseAssignment('ui/designs_art/journey/v3/stations.js');

assert.equal(source.source_puzzle_count, 88);
assert.equal(source.active_runtime_puzzle_count, 86);
assert.deepEqual(source.sections.map(s => [s.chapter, s.entries.length]), [
  ['training', 20], ['seven_seas', 23], ['palace', 19], ['atheran', 21], ['first_trace', 5]
]);
const entries = source.sections.flatMap(s => s.entries);
assert.equal(entries.length, 88);
assert.equal(new Set(entries.map(e => e.id)).size, 88, 'each PDF card has one stable ID');
for (const entry of entries) {
  assert.match(entry.id, /^pz_[a-z0-9]+$/);
  assert.ok(Number.isInteger(entry.source_page) && entry.source_page >= 9 && entry.source_page <= 32);
  assert.match(entry.proposed_color, /^#[0-9A-Fa-f]{6}$/);
  assert.ok(['active', 'retired'].includes(entry.status));
}
const active = entries.filter(e => e.status === 'active').map(e => e.id).sort();
const retired = entries.filter(e => e.status === 'retired').map(e => e.id).sort();
assert.deepEqual(retired, ['pz_stat', 'pz_xbottle'], 'retired puzzle engines must not be silently restored');
assert.deepEqual([...source.retired_ids].sort(), retired);
assert.deepEqual(active, inventory.puzzles.map(p => p.id).sort(), 'PDF inventory reconciled to actual live puzzle IDs');
assert.deepEqual(story.chapterOrder, ['seven_seas', 'palace', 'atheran'], 'official chronology remains distinct');
assert.equal(story.treasureStations.length, 21, '21 authored sea story stations are not the 22 sea-library puzzles');
assert.equal(story.expeditionStations.length, 24, 'existing independent side journey has 24 stages');
assert.deepEqual(map.stations.filter(s => s.chapter === 'side').map(s => s.id),
  story.expeditionStations.map(s => s.stageId), 'side-stage IDs continue to match story scenes');
assert.equal(source.sections.at(-1).chapter, 'first_trace', 'five optional legacy puzzle IDs must not be conflated with side journey');
assert.ok(!map.stations.some(s => /^pz_w/.test(s.id) && s.chapter === 'side'), 'optional document branch is not pre-mapped as an existing side stage');
console.log('Jaziran story index passed: 88 documented, 86 live, 2 retired; 21 official sea stations, 24 independent side stages.');
