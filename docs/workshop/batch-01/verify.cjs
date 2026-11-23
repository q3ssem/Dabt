'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const track = require(path.join(root, 'motion/stages60/boards.json'));
const fixtures = require('./fixtures.json');
const index = require('../EDITORIAL_SOURCE_INDEX.json');
require(path.join(root, 'expedition10/logic.js'));

function extract(first, last) {
  const start = html.indexOf(first), end = html.indexOf(last, start);
  assert.ok(start >= 0 && end > start);
  return html.slice(start, end);
}

const native = vm.createContext({});
vm.runInContext(
  extract('function rhDecode(', 'function rhRandom(') +
  extract('const ppRot=', 'function runPipes('), native
);

function parking(grid) {
  assert.match(grid, /^[A-No]{36}$/);
  const ids = [...new Set(grid)].filter(mark => mark !== 'o').sort();
  const vehicles = ids.map(id => {
    const cells = [...grid].flatMap((mark, i) => mark === id ? [i] : []);
    assert.ok(cells.length === 2 || cells.length === 3);
    const first = cells[0], row = Math.floor(first / 6), col = first % 6;
    const horizontal = cells.every(i => Math.floor(i / 6) === row);
    assert.ok(cells.every((cell, i) => cell === first + i * (horizontal ? 1 : 6)));
    return { id, row, col, horizontal, length: cells.length };
  });
  assert.deepEqual(vehicles[0], { id: 'A', row: 2, col: grid.indexOf('A') % 6, horizontal: true, length: 2 });

  function options(position, forbidRetreat) {
    const occupied = new Set();
    const cell = (vehicle, coordinate) => vehicle.horizontal
      ? vehicle.row * 6 + coordinate
      : coordinate * 6 + vehicle.col;
    vehicles.forEach((vehicle, i) => {
      for (let offset = 0; offset < vehicle.length; offset++) {
        occupied.add(cell(vehicle, position[i] + offset));
      }
    });
    return vehicles.flatMap((vehicle, i) => {
      const legal = [];
      for (const direction of [-1, 1]) {
        if (forbidRetreat && i === 0 && direction < 0) continue;
        for (let next = position[i] + direction; ; next += direction) {
          const edge = direction < 0 ? next : next + vehicle.length - 1;
          if (edge < 0 || edge > 5 || occupied.has(cell(vehicle, edge))) break;
          const after = position.slice();
          after[i] = next;
          legal.push({ move: [vehicle.id, next + 1], after });
        }
      }
      return legal;
    });
  }

  const start = vehicles.map(v => v.horizontal ? v.col : v.row);
  function shortest(forbidRetreat) {
    let layer = [{ position: start, ways: 1 }];
    const seen = new Set([String(start)]);
    for (let depth = 0; layer.length; depth++) {
      const wins = layer.filter(({position}) => position[0] === 4);
      if (wins.length) return { min: depth, count: wins.reduce((n, win) => n + win.ways, 0) };

      const nextLayer = new Map();
      for (const {position, ways} of layer) {
        for (const {after} of options(position, forbidRetreat)) {
          const key = String(after);
          if (seen.has(key)) continue;
          if (!nextLayer.has(key)) nextLayer.set(key, { position: after, ways: 0 });
          nextLayer.get(key).ways += ways;
        }
      }
      layer = [...nextLayer.values()];
      for (const key of nextLayer.keys()) seen.add(key);
    }
    return null;
  }

  function replay(moves) {
    let position = start;
    for (const [id, destination] of moves) {
      assert.notEqual(position[0], 4, 'example ends at first win');
      const match = options(position, false).find(({move}) => move[0] === id && move[1] === destination);
      assert.ok(match, 'example move is legal: ' + id + destination);
      position = match.after;
    }
    return position[0] === 4;
  }

  return { shortest, replay };
}

const firstParking = fixtures.rush[0];
assert.equal(firstParking.level, 1);
assert.ok(track.pz_rush.every(board => board.grid !== firstParking.grid));
assert.equal(firstParking.min, track.pz_rush[0].min + 1);
for (const board of fixtures.rush) {
  const layout = parking(board.grid);
  assert.deepEqual(layout.shortest(false), { min: board.min, count: board.shortestPaths });
  assert.equal(Boolean(layout.shortest(true)), board.canWinWithoutRetreat);
  assert.equal(native.rhSolve(native.rhDecode(board.grid), 200000).length, board.min);
  assert.equal(board.example.length, board.min);
  assert.ok(layout.replay(board.example));
}
for (const board of fixtures.rush.slice(1)) {
  assert.equal(board.grid, track.pz_rush[board.level - 1].grid);
}

const directions = [[0,-1,1,4], [1,0,2,8], [0,1,4,1], [-1,0,8,2]];
function rotations(mask) {
  const masks = [];
  while (!masks.includes(mask)) {
    masks.push(mask);
    mask = ((mask << 1) | (mask >> 3)) & 15;
  }
  return masks;
}

function pipeLayouts(board) {
  const { w, h, cur, fixed } = board;
  const edges = cur.flatMap((_, i) => directions.map(([dx,dy,bit,other]) => {
    const x = i%w + dx, y = Math.floor(i/w) + dy;
    const j = x<0 || x>=w || y<0 || y>=h ? -1 : y*w+x;
    return { i, j, bit, other };
  }));
  function prune(domains) {
    let rounds = 0;
    while (true) {
      const filtered = domains.map(choices => choices.slice());
      for (const {i,j,bit,other} of edges) {
        filtered[i] = filtered[i].filter(mask => j < 0
          ? !(mask & bit)
          : domains[j].some(neighbor => Boolean(mask & bit) === Boolean(neighbor & other)));
      }
      if (filtered.some(choices => !choices.length)) return { reduced: null, rounds };
      if (filtered.every((choices,i) => choices.length === domains[i].length)) {
        return { reduced: filtered, rounds };
      }
      domains = filtered;
      rounds++;
    }
  }
  const open = cur.map((mask,i) => fixed.includes(i) ? [mask] : rotations(mask));
  const { reduced, rounds } = prune(open);
  const layouts = [];
  function search(domains) {
    if (!domains) return;
    const first = domains.findIndex(choices => choices.length > 1);
    if (first < 0) {
      layouts.push(domains.flat());
      return;
    }
    for (const choice of domains[first]) {
      const branch = domains.slice();
      branch[first] = [choice];
      search(prune(branch).reduced);
    }
  }
  search(reduced);
  return { layouts, rounds };
}

const firstPipes = fixtures.pipe[0], oldPipes = track.pz_pipe[0];
assert.deepEqual(firstPipes.sol, oldPipes.sol);
assert.deepEqual(firstPipes.fixed, oldPipes.fixed.filter(i => i !== 9));
assert.deepEqual(firstPipes.cur, oldPipes.cur.map((mask, i) => i === 9 ? 10 : mask));
for (const [i, board] of fixtures.pipe.entries()) {
  assert.ok(!native.ppSolved(board));
  assert.ok(board.fixed.every(cell => board.cur[cell] === board.sol[cell]));
  const clicks = board.cur.map((mask, cell) => rotations(mask).indexOf(board.sol[cell]));
  assert.ok(clicks.every(n => n >= 0));
  assert.equal(clicks.reduce((a,b) => a+b, 0), board.min);

  const { layouts, rounds } = pipeLayouts(board);
  assert.equal(rounds, [3,6,10][i]);
  assert.equal(layouts.length, board.number === 20 ? 2 : 1);
  const valid = layouts.filter(cur => native.ppSolved({ ...board, cur }));
  assert.deepEqual(valid, [board.sol]);
  if (board.number === 20) {
    const disconnected = layouts.find(cur => !native.ppSolved({ ...board, cur }));
    assert.deepEqual([disconnected[2], disconnected[3]], [2, 8]);
    const powered = native.ppPowered({ ...board, cur: disconnected });
    assert.deepEqual(disconnected.flatMap((_, cell) => powered.has(cell) ? [] : [cell]), [2, 3]);
  }
}

const { TARGET_CODE, CODE_CLUES, codeFeedback, solveCode } = globalThis.ML10Logic;
assert.equal(fixtures.code[0].target, TARGET_CODE);
assert.deepEqual(fixtures.code[0].clues, CODE_CLUES.map(c => [c.guess,c.well,c.wrong]));
assert.deepEqual(solveCode(), ['042']);
const allCodes = Array.from({length: 1000}, (_, n) => String(n).padStart(3, '0'))
  .filter(code => new Set(code).size === 3);
assert.equal(allCodes.length, 720);

for (const [i, {target, clues}] of fixtures.code.entries()) {
  const matching = rows => allCodes.filter(code => rows.every(([guess, well, wrong]) => {
    const feedback = codeFeedback(code, guess);
    return feedback.well === well && feedback.wrong === wrong;
  }));
  assert.deepEqual(matching(clues), [target]);
  assert.deepEqual(clues.map((_, j) => matching(clues.slice(0,j+1)).length), [
    [126,30,1,1,1], [252,45,2,1], [252,96,30,2,1]
  ][i]);
  assert.deepEqual(clues.map((_, j) => matching(clues.filter((_, k) => j !== k)).length), [
    [4,4,3,1,1], [3,2,5,2], [2,2,2,2,2]
  ][i]);
}

const registered = new Set([...html.matchAll(/\{id:'(pz_[a-z0-9]+)',maxLv:\s*\d+[^\n]*?\brun:\s*\w+/g)].map(m => m[1]));
assert.deepEqual(new Set(index.puzzles.map(p => p.id)), registered);
assert.equal(index.stations.length, 85);
assert.equal(index.stations.filter(s => registered.has(s.id)).length, 40);
assert.equal(new Set([...registered, ...index.stations.map(s => s.id)]).size, 131);
console.log('Editorial workshop: 86 registry IDs, 85 stations, 40 shared IDs. Passed 3 parking, 3 lighthouse and 3 pipe fixtures.');
