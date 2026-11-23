import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const inventoryPath = path.join(root, 'research/experiments/EXP-0001-dependency-inventory/results/dependency-inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const source = inventory.generated_from.ref;

function show(relativePath) {
  return execFileSync('git', ['show', `${source}:${relativePath}`], {
    cwd: path.resolve(root, '..'),
    encoding: 'utf8',
    maxBuffer: 12 * 1024 * 1024,
  });
}
function javascriptAssignment(text, name) {
  const prefix = `window.${name} = `;
  const start = text.indexOf(prefix);
  assert.ok(start >= 0, `Missing ${name}`);
  const serialized = text.slice(start + prefix.length).trim().replace(/;$/, '');
  return JSON.parse(serialized);
}
function assertUnique(rows) {
  const ids = rows.map(row => row.id);
  assert.equal(ids.length, new Set(ids).size, 'duplicate IDs in evidence inventory');
}
test('EXP-0001 is evidence inventory only, not a migrated-game claim', () => {
  assert.equal(inventory.status, 'partial-not-approved-for-migration');
  assert.equal(inventory.library_puzzles.length, 86);
  assert.equal(inventory.story_stations.length, 85);
  assertUnique(inventory.library_puzzles);
  assertUnique(inventory.story_stations);
  for (const item of [...inventory.library_puzzles, ...inventory.story_stations]) {
    assert.equal(item.verification, 'inventory-partial');
    assert.ok(item.evidence.length >= 2);
    assert.ok(item.migration_strategy.startsWith('hold'));
  }
});
test('Source SHA 5.5.30 retains exact catalog 86 active + 2 retired IDs', () => {
  const catalog = JSON.parse(show('docs/JAZIRAN_PUZZLE_INDEX_2026-11-22.json'));
  const entries = catalog.sections.flatMap(section => section.entries);
  const active = entries.filter(item => item.status === 'active').map(item => item.id).sort();
  assert.equal(active.length, 86);
  assert.deepEqual(inventory.library_puzzles.map(item => item.id).sort(), active);
  const retired = entries.filter(item => item.status !== 'active').map(item => item.id).sort();
  assert.deepEqual(inventory.retired_ids.slice().sort(), retired);
});
test('85 official/side stations and chapter order verified against source SHA', () => {
  const stationIndex = javascriptAssignment(show('ui/designs_art/journey/v3/stations.js'), '__MINDLAB_JOURNEY_MAP');
  const narrative = javascriptAssignment(show('ui/journey-story-data.js'), '__MINDLAB_JOURNEY_STORY');
  const count = { seven_seas: 21, palace: 19, atheran: 21, side: 24 };
  for (const [chapter, expected] of Object.entries(count)) {
    assert.equal(inventory.story_stations.filter(s => s.chapter === chapter).length, expected);
  }
  assert.deepEqual(narrative.chapterOrder, ['seven_seas', 'palace', 'atheran']);
  assert.deepEqual(stationIndex.stations.map(s => s.id).sort(), inventory.story_stations.map(s => s.id).sort());
});
test('Design file contains recorded identifiers and scene/piece candidate paths', () => {
  const sourceDesign = show('ui/puzzle-designs-data.js');
  const designLines = sourceDesign.split('\n');
  const designIds = [];
  for (const line of designLines) {
    const match = line.match(/^\s*(pz_[a-z0-9_]+):\s*(\{.+\}),?\s*$/);
    if (match) designIds.push(match[1]);
  }
  assert.deepEqual(designIds.sort(), inventory.library_puzzles.map(p => p.id).sort());
  for (const p of inventory.library_puzzles) {
    assert.ok(p.assets.every(a => a.usage.includes('candidate')));
  }
});
test('No source import, save key mutation or port occurs in inventory records', () => {
  assert.ok(inventory.unresolved.includes('Trace each storage read/write key and legacy migration behavior'));
  assert.ok(inventory.library_puzzles.every(p => p.save_keys.length === 0));
  assert.ok(inventory.library_puzzles.every(p => p.engine_files.every(f => !f.startsWith('mindlab6/src/'))));
});

test('40 brain / 26 kid illustration candidates match source, without asserting game IDs for children', () => {
  const data = JSON.parse(fs.readFileSync(path.join(root,
    'research/experiments/EXP-0001-dependency-inventory/results/brain-kids-art-candidates.json'), 'utf8'));
  const app = show('ui/app.js');
  const extract = re => {
    const match = app.match(re);
    assert.ok(match, 'Missing visual catalog in source');
    return [...match[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
  };
  const brain = extract(/const ML_GAME_ART = (\[[\s\S]*?\]);/);
  const kids = extract(/const KID_ART = (\[[\s\S]*?\]);/);
  assert.equal(data.status, 'art-registry-candidates-only');
  assert.equal(brain.length, 40);
  assert.equal(kids.length, 26);
  assert.deepEqual(data.brain_visual_id_candidates.map(x => x.id), brain);
  assert.deepEqual(data.kid_visual_name_candidates.map(x => x.name), kids);
  assert.ok(data.kid_visual_name_candidates.every(x => x.id === null));
});
