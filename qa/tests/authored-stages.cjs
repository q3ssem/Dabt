'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const stages = JSON.parse(read('motion/stages60/boards.json'));
const html = read('index.html');
const parkingSolvers = html.slice(html.indexOf('function rhDecode('), html.indexOf('function rhRandom('));
const context = {
  URL, window: {},
  document: { currentScript: { src: 'https://example.com/motion/stages60/play.js' } },
  localStorage: { getItem: () => null }
};
vm.createContext(context);
vm.runInContext(parkingSolvers + read('motion/stages60/play.js'), context);
const engine = context.window.mlAuthoredStages;
const baselineCrossings = [7, 5, 5, 5, 3, 7, 7, 5, 5, 3, 7, 3, 4, 4, 5, 3, 3, 3, 3, 10];

for (const track of Object.values(stages)) assert.equal(track.length, 20);
for (const board of stages.pz_stat) {
  const puzzle = engine.statues(board);
  let state = board.s;
  for (let i = 0; i < board.min; i++) {
    assert(state.some(Boolean));
    const press = puzzle.nxt[puzzle.enc(state)];
    assert(press >= 0);
    state = state.map((angle, j) => (angle + puzzle.R[press][j]) % 4);
  }
  assert(state.every(angle => angle === 0));
}
for (const board of stages.pz_rush) {
  const puzzle = engine.parking(board);
  assert.equal(context.rhSolve(puzzle.vs, 200000)?.length, board.min, `Parking ${board.level}`);
}
for (const board of stages.pz_river) {
  const rules = engine.riverRules(board);
  let state = rules.initial;
  const best = rules.best(state);
  assert.equal(best.crossings, baselineCrossings[board.number - 1], `River ${board.number}`);
  for (let i = best.steps; i > 0; i--) {
    const next = rules.best(state);
    assert.equal(next.steps, i);
    state = next.first.state;
  }
  assert(rules.won(state));
}

const captains = engine.riverRules(stages.pz_river[15]);
const arrival = captains.travel(captains.initial, [0, 1], []);
assert(arrival.error); // Leaving the wolf with the sheep is unsafe.
const withWolf = captains.groups(captains.initial).filter(group => group.name === 'ذئب');
const docked = captains.travel(captains.initial, [0, 1], withWolf).state;
const swapped = captains.operations(docked)[0].state;
assert.notEqual(swapped.captain, docked.captain);
const back = captains.travel(swapped, [1, 0], []).state;
assert.equal(back.loc[swapped.captain], 0);
assert.equal(back.loc[docked.captain], 1);
assert(captains.best(back));

const grain = engine.riverRules(stages.pz_river[16]);
const full = grain.groups(grain.initial).filter(group => group.name === 'كيس الحبوب');
assert.equal(full.length, 1);
const warehouse = grain.travel(grain.initial, [0, 2, -1, 1], full);
assert.equal(warehouse.state.flags, 0);
assert(grain.best(warehouse.state));
const divided = grain.operations(grain.initial)[0].state;
assert(grain.groups(divided).some(group => group.name === 'نصف-أ'));
assert(grain.groups(divided).some(group => group.name === 'نصف-ب'));
assert(grain.best(divided));

console.log('Authored tracks: 60 boards solved, 20 current-state river hint chains, captain swap and whole/split grain verified.');
