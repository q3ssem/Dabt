'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const vm = require('node:vm');
const index = require('../EDITORIAL_SOURCE_INDEX.json');
const root = path.resolve(__dirname, '../../..');
const source = execFileSync('git', ['show', index.source + ':index.html'], { cwd: root, maxBuffer: 4e6, encoding: 'utf8' });
function extract(first, last) {
  const begin = source.indexOf(first);
  const end = source.indexOf(last, begin);
  assert.ok(begin >= 0 && end > begin, first);
  return source.slice(begin, end);
}
const game = vm.createContext({});
vm.runInContext(`
  let seed = 20261123;
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const rnd = n => Math.floor(Math.random() * n);
  const pick = items => items[rnd(items.length)];
  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = rnd(i+1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  const D4 = [[0,-1],[1,0],[0,1],[-1,0]];
  const inb = (x,y,w,h) => x >= 0 && y >= 0 && x < w && y < h;
` + [
  ['const LG_P=', 'function lgText('],
  ['function sdBox(', '/* ---- flow:'],
  ['function tnSolve(', '/* ---- light up'],
  ['const DR_RULES=', '/* ---- lights out'],
  ['function biOK(', '/* ---- ice:'],
  ['const TI_LM=', 'const xHead='],
  ['const TP_LV=', 'function runTPath('],
  ['const XR_LV=', 'const XARW='],
  ['const XG_LV=', 'function runXBridge(']
].map(([a,b]) => extract(a,b)).join('\n'), game);

function gridCount(p) {
  const permutations = game.lgPerms(p.n);
  let count = 0;
  function walk(categories) {
    if (categories.length < p.a) {
      for (const candidate of permutations) walk([...categories, candidate]);
      return;
    }
    if (p.clues.every(c => {
      if (c.t === 'pos') return categories[c.k][c.p] === c.v;
      if (c.t === 'neg') return categories[c.k][c.p] !== c.v;
      const same = categories[c.k1].indexOf(c.v1) === categories[c.k2].indexOf(c.v2);
      return c.t === 'lnk' ? same : !same;
    })) count++;
  }
  walk([]);
  return count;
}

function reefDistances(p) {
  const distance = new Map([[p.start,0]]);
  const queue = [p.start];
  for (const from of queue) {
    for (let direction = 0; direction < 4; direction++) {
      const route = game.xrSlide(p, from, direction);
      const to = route.at(-1);
      assert.ok(route.every((cell,i) => !p.rock[cell] &&
        (!i || Math.abs(cell%p.w-route[i-1]%p.w) +
          Math.abs(Math.floor(cell/p.w)-Math.floor(route[i-1]/p.w)) === 1)));
      if (distance.has(to)) continue;
      distance.set(to, distance.get(from)+1);
      queue.push(to);
    }
  }
  return distance;
}

function bridgeRoutes(p) {
  const routes = new Set();
  function visit(pos, used, lengths) {
    if (pos === p.W) {
      routes.add(lengths.join(','));
      return;
    }
    p.planks.forEach((length,i) => {
      if (!(used & (1 << i)) && p.pil.has(pos+length))
        visit(pos+length, used | (1 << i), [...lengths,length]);
    });
  }
  visit(0,0,[]);
  return [...routes];
}

const evidence = [];
for (const level of [1,4,7]) {
  const grid = game.lgMake(level);
  assert.equal(gridCount(grid),1);
  const sudoku = game.sdMake(level);
  assert.equal(game.sdCount(sudoku.puz,sudoku.n),1);
  const tents = game.tnMake(level);
  const tentResult = game.tnSolve(tents);
  assert.equal(tentResult.cnt,1);
  assert.equal(tentResult.first, [...tents.sol].sort((a,b)=>a-b).join(','));
  const doors = game.drMake(level);
  const viableDoors = Array.from({length:doors.n},(_,i)=>i)
    .filter(i=>doors.rule.ok(game.drVals(doors,i),i));
  assert.deepEqual(viableDoors,[doors.t]);
  const binary = game.biMake(level);
  assert.equal(game.biCount(binary.puz,binary.n),1);
  const map = game.tpMake(level === 7 ? 8 : level);
  const candidates = (map.unk ? map.marks : [map.S]).map(m=>[m,game.tpWalkFrom(map,m.cell,map.segs)])
    .filter(([m,route])=>route && (!map.unk || !map.marks.some(q=>q!==m&&route.slice(1).includes(q.cell))));
  assert.equal(candidates.length,1);
  assert.equal(candidates[0][1].at(-1),map.E);
  const reef = game.xrMake(level);
  assert.equal(reefDistances(reef).get(reef.goal),reef.min);
  const bridge = game.xgMake(level);
  const routes = bridgeRoutes(bridge);
  assert.ok(routes.includes(bridge.sol.join(',')));
  evidence.push({level,grid:[grid.n,grid.a],sudoku:sudoku.n,tents:tents.n,doors:doors.n,binary:binary.n,
    mapLevel:level===7?8:level,mapCandidates:candidates.length,reefMoves:reef.min,bridgeRoutes:routes.length});
}
console.log(JSON.stringify(evidence,null,2));
console.log('Eight source puzzles checked on three generated cases each.');
