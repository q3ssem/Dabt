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
  const XI2 = '', XR = '', XI = '', XK = '';
  const D4 = [[0,-1],[1,0],[0,1],[-1,0]];
  const inb = (x,y,w,h) => x >= 0 && y >= 0 && x < w && y < h;
` + [
  ['const TI_LM=', 'const xHead='],
  ['const XC_SYM=', 'function xcText('],
  ['const XL_CREW=', 'function runXLoot('],
  ['const TM_LV=', 'function tmText('],
  ['const TD_LV=', 'const TDF='],
  ['const XK_SYM=', 'function runXLock('],
  ['const YH_LV=', 'const YH_COL='],
  ['const YT_LV=', 'function runYTide('],
  ['const YD_LV=', 'function runYDoor(']
].map(([a,b]) => extract(a,b)).join('\n'), game);

for (const level of [1,4,8]) {
  const cave = game.xcMake(level);
  const orders = vm.runInContext("xcPerms",game)(cave.syms.length).filter(order => {
    const positions = order.map((_,symbol)=>order.indexOf(symbol));
    return cave.clues.every(clue=>game.xcSat(clue,positions));
  });
  assert.equal(orders.length,1);
  assert.equal(orders[0].join(),cave.ord.join());
  const loot = game.xlMake(level);
  const fair = game.xlFair(loot,loot.own);
  assert.equal(fair.bad.length,0);
  assert.ok(fair.gemOk && game.xlCount(loot) > 0);
  const map = game.tmMake(level);
  assert.deepEqual(Array.from(map.cand0.filter(c=>map.clues.filter(clue=>!game.tmSat(clue,c,map)).length===Number(Boolean(map.lie)))),[map.T]);
  const dig = game.tdMake(level);
  assert.ok(game.tdCan(dig.dig,dig.digs,dig.dig,dig.n,new Map()));
  const lock = game.xkMake(level);
  assert.equal(game.xkAll(lock.L,lock.S,lock.rep).filter(code=>game.xkScore(lock.code,code)[0]===lock.L).length,1);
  assert.deepEqual(Array.from(game.xkScore([1,1,2,3],[1,2,1,1])),[1,2]);
  const hold = game.yhMake(level);
  let state = {pos:hold.start,key:0,mask:0};
  hold.sol.forEach((direction,i)=>{
    state=game.yhMove(hold,state,direction);
    assert.ok(state && Math.floor(state.pos/hold.w)<hold.h-Math.floor((i+1)/hold.k));
  });
  assert.ok(state.key && state.pos===hold.hatch);
  const tide=game.ytMake(level);
  let cell=tide.start;
  const deltas=[-tide.w,1,tide.w,-1,0];
  tide.sol.forEach((action,i)=>{
    cell+=deltas[action];
    assert.ok(game.ytSafe(tide,cell,i+1));
  });
  assert.equal(Math.floor(cell/tide.w),0);
  const temple=game.ydMake(level);
  let rings=Array.from(temple.start);
  for (const lever of temple.sol) rings=rings.map((x,i)=>(x+temple.lev[lever][i])%6);
  assert.deepEqual(rings,Array.from(temple.goal));
  console.log(`Level ${level}: cave ${orders.length} order, treasure map 1 cell, digging ${dig.digs} attempts, escape ${hold.min}, tide ${tide.min}, temple ${temple.min}`);
}
console.log('Eight source puzzles checked across 24 generated cases.');
