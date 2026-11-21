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
const pipeSolvers = html.slice(html.indexOf('const ppRot='), html.indexOf('function runPipes('));
const iceSolvers = html.slice(html.indexOf('function icSlide('), html.indexOf('function icMake('));
const crossingEngine = html.slice(html.indexOf('const segX='), html.indexOf('function unMake('));
const shapeEngine = html.slice(html.indexOf('const tgNorm='), html.indexOf('function tgMake('));
const context = {
  URL, window: {},
  document: { currentScript: { src: 'https://example.com/motion/stages60/play.js' } },
  localStorage: { getItem: () => null }
};
vm.createContext(context);
const bounds = 'const D4=[[0,-1],[1,0],[0,1],[-1,0]];const inb=(x,y,w,h)=>x>=0&&x<w&&y>=0&&y<h;';
vm.runInContext(bounds + parkingSolvers + pipeSolvers + iceSolvers + crossingEngine + shapeEngine + read('motion/stages60/play.js'), context);
const engine = context.window.mlAuthoredStages;
const rotatePipe = vm.runInContext('ppRot', context);
const baselineCrossings = [7, 5, 5, 5, 3, 7, 7, 5, 5, 3, 7, 3, 4, 4, 5, 3, 3, 3, 3, 10];

for (const track of Object.values(stages)) assert.equal(track.length, 20);
for (const board of stages.pz_rush) {
  const puzzle = engine.parking(board);
  assert.equal(context.rhSolve(puzzle.vs, 200000)?.length, board.min, `Parking ${board.level}`);
}

const pipeDirections = [[0,-1,1,4],[1,0,2,8],[0,1,4,1],[-1,0,8,2]];
function rotations(mask) {
  const result = [];
  while (!result.includes(mask)) {
    result.push(mask);
    mask = rotatePipe(mask);
  }
  return result;
}
function pipeSolutions(puzzle) {
  const { w, h, cur, fixed } = puzzle;
  const options = cur.map((_, i) => pipeDirections.map(([dx,dy,port,opposite]) => {
    const x = i % w + dx, y = Math.floor(i / w) + dy;
    return [x < 0 || x >= w || y < 0 || y >= h ? -1 : y*w+x,port,opposite];
  }));
  const pinned = new Set(fixed);
  const domains = cur.map((mask,i) => (pinned.has(i) ? [mask] : rotations(mask))
    .filter(value => options[i].every(([j,port]) => j >= 0 || !(value & port))));
  function search(state) {
    let changed;
    do {
      changed = false;
      for (let i = 0; i < state.length; i++) {
        const next = state[i].filter(mask => options[i].every(([j,port,opposite]) =>
          j < 0 || state[j].some(other => Boolean(mask&port) === Boolean(other&opposite))));
        if (!next.length) return 0;
        changed ||= next.length !== state[i].length;
        state[i] = next;
      }
    } while (changed);
    const open = state.findIndex(choices => choices.length > 1);
    if (open < 0) return Number(context.ppSolved({ ...puzzle, cur: state.flat() }));
    let result = 0;
    for (const choice of state[open]) {
      const branch = state.slice();
      branch[open] = [choice];
      result += search(branch);
      if (result > 1) return result;
    }
    return result;
  }
  return search(domains);
}
assert.equal(new Set(stages.pz_pipe.map(board => [board.w, board.h, ...board.sol].join())).size, 20);
for (const board of stages.pz_pipe) {
  const puzzle = engine.pipes(board);
  assert.notEqual(puzzle.cur, board.cur, 'restart state is copied');
  assert(!context.ppSolved(puzzle));
  assert(board.fixed.every(i => board.cur[i] === board.sol[i]));
  const clicks = puzzle.cur.map((mask,i) => rotations(mask).indexOf(puzzle.sol[i]));
  assert(clicks.every(value => value >= 0));
  assert.equal(clicks.reduce((sum,value) => sum + value, 0), board.min);
  assert(context.ppSolved({ ...puzzle, cur: puzzle.sol }));
  assert.equal(pipeSolutions(puzzle), 1, `Pipe stage ${board.number} has exactly one solution`);
}

assert.equal(new Set(stages.pz_ice.map(board => [board.w,board.h,board.start,board.goal,...board.rocks].join())).size, 20);
for (const board of stages.pz_ice) {
  const puzzle = engine.ice(board);
  assert(!puzzle.rock[puzzle.start] && !puzzle.rock[puzzle.goal]);
  assert.equal(context.icSolve(puzzle,puzzle.start).length, puzzle.min);
  const routeCount = new Map([[puzzle.start,1]]);
  const distance = new Map([[puzzle.start,0]]);
  const pending = [puzzle.start];
  for (const cell of pending) {
    assert(context.icSolve(puzzle,cell), `Stage ${board.number} must remain solvable from cell ${cell}`);
    if (cell === puzzle.goal) continue;
    for (let d = 0; d < 4; d++) {
      const next = context.icSlide(puzzle,cell,d);
      if (!distance.has(next)) {
        distance.set(next,distance.get(cell)+1);
        routeCount.set(next,0);
        pending.push(next);
      }
      if (distance.get(next) === distance.get(cell)+1) {
        routeCount.set(next,routeCount.get(next)+routeCount.get(cell));
      }
    }
  }
  assert.equal(routeCount.get(puzzle.goal),1,`Ice stage ${board.number} has one shortest route`);
}

const distance = (a,b,n) => Math.abs(a%n-b%n) + Math.abs(Math.floor(a/n)-Math.floor(b/n));
const flowLayouts = new Set();
for (const { n, segs, ends, number } of stages.pz_flow) {
  const cells = segs.flat();
  assert.equal(cells.length,n*n);
  assert.equal(new Set(cells).size,n*n);
  assert(cells.every(cell => cell >= 0 && cell < n*n));
  segs.forEach((path,i) => {
    assert.deepEqual([path[0],path.at(-1)],ends[i]);
    assert(path.every((cell,j) => !j || distance(cell,path[j-1],n) === 1), `Flow stage ${number}`);
  });
  flowLayouts.add(ends.map(pair => pair.slice().sort((a,b) => a-b).join()).sort().join(';'));
}
assert.equal(flowLayouts.size,20);

const footprints = new Set();
const normalize = vm.runInContext('tgNorm',context);
for (const { n, reg, pieces } of stages.pz_tan) {
  const cells = pieces.flatMap(p => p.sol);
  assert.equal(cells.length,new Set(cells).size);
  assert.deepEqual(cells.slice().sort((a,b) => a-b),reg);
  assert(reg.every(cell => cell >= 0 && cell < n*n));
  pieces.forEach(({ sol, shape, mask }) => {
    assert.deepEqual(JSON.stringify(normalize(sol.map(cell => [cell%n,Math.floor(cell/n)]))),JSON.stringify(shape));
    assert(Number.isInteger(mask) && mask >= 0 && mask < 8);
  });
  footprints.add([n,...reg].join());
}
assert.equal(footprints.size,20);

const webs = new Set();
for (const board of stages.pz_untangle) {
  assert.equal(board.pos.length,board.n);
  assert.equal(board.sol.length,board.n);
  assert(context.unCross(board,board.pos).c > 0);
  assert.equal(context.unCross(board,board.sol).c,0);
  board.fixed.forEach(i => assert.deepEqual(board.pos[i],board.sol[i]));
  assert(board.pos.flat().concat(board.sol.flat()).every(v => v >= 4 && v <= 96));
  webs.add(JSON.stringify([board.e,board.pos]));
}
assert.equal(webs.size,20);
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

console.log('Authored tracks: 140 fixed boards validated. Unique pipe solutions, unique shortest ice routes without traps, flow coverage, tangram footprints, untangle anchors, river rules and seven active movement tracks passed.');
