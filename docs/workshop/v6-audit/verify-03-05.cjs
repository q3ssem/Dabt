'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const vm = require('node:vm');
const { source: baseline } = require('../EDITORIAL_SOURCE_INDEX.json');
const cwd = path.resolve(__dirname, '../../..');
function atBaseline(file) {
  return execFileSync('git', ['show', baseline + ':' + file], { cwd, encoding: 'utf8', maxBuffer: 4e6 });
}
const html = atBaseline('index.html');
const palace = atBaseline('motion/palace-motion.js');
const slices = [
  ['const tiMd=', 'const tiCd='],
  ['function xrSlide(', 'function xrMake('],
  ['function xgSolve(', 'function xgMake('],
  ['function xcSat(', 'function xcMake('],
  ['function xlFair(', 'function xlCount('],
  ['function tdCan(', 'function tdMake('],
  ['function xkScore(', 'function xkMake('],
  ['const YM_LV=', 'const YM_STY='],
  ['const YH_LV=', 'function yhMake('],
  ['const YT_TY=', 'function ytMake('],
  ['function ydLevers(', 'function ydMake('],
  ['function zcRay(', 'function zcMake('],
  ['const zrAt=', 'function zrSolve('],
  ['function zgFlow(', 'function zgMake('],
  ['function zsShadow(', 'function zsMake('],
  ['const znG=', 'function runZNim('],
  ['function zoSat(', 'const ZO_CLUE_COUNTS='],
  ['function plSat(', 'function plMake('],
  ['const PQ_LV=', 'const PQN=']
];
const code = slices.map(([first, last]) => {
  const a = html.indexOf(first);
  const b = html.indexOf(last, a + first.length);
  assert.ok(a >= 0 && b > a, first);
  return html.slice(a, b);
}).join('\n');
const prelude = `
  let seed = 20261123;
  const rnd = n => Math.floor(((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * n);
  const D4 = [[0,-1],[1,0],[0,1],[-1,0]];
  const D8 = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  const inb = (x,y,w,h) => x >= 0 && y >= 0 && x < w && y < h;
  const same = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
`;
const cases = {
  '03': `
    const reef = { w:3, h:3, rock:[0,0,0,0,0,0,0,1,0],
      cur:[-1,2,-1,-1,-1,-1,-1,-1,-1], goal:4 };
    same(xrSlide(reef, 0, 1), [0,1,4]);
    same(xrSlide(reef, 4, 2), [4]);

    const bridge = { W:6, pil:new Set([0,2,3,6]), planks:[2,3,3] };
    assert.equal(xgSolve(bridge, 2, 1), 0);
    assert.ok(xgSolve(bridge, 3, 2) > 0);
    assert.equal(xcSat({t:'bef',a:0,b:1}, [0,2]), true);
    assert.equal(xcSat({t:'adj',a:0,b:1}, [0,2]), false);
    assert.equal(xcSat({t:'adj',a:0,b:1}, [1,0]), true);

    const gold = { crew:[{},{}], total:12, wsum:2, w:[1,1], per:2, same:1,
      bags:[1,2,3,6], gem:1, gemBag:3 };
    const partition = [0,0,0,1];
    same(xlFair(gold, partition).sums, [6,6]);
    same(xlFair(gold, partition).bad, [0,1]);
    assert.equal(xlFair(gold, partition).gemOk, false);
    assert.equal(xlFair(gold, [1,1,1,0]).gemOk, true);

    assert.equal(tdCan([3,5], 2, [4], 3, new Map()), false);
    assert.equal(tdCan([3,5], 2, [0], 3, new Map()), true);
    same(xkScore([1,1,2,3], [1,2,1,1]), [1,2]);
  `,
  '04': `
    const tiles = [[0,1,2,0],[0,0,3,1],[2,4,0,0],[3,0,0,4]];
    const placements = ids => ids.map(t => ({ t, r:1 }));
    assert.equal(ymOk({n:2,tiles}, placements([2,0,3,1])), 0);
    assert.ok(ymOk({n:2,tiles}, placements([2,0,3,1]).map((p,i) => i ? p : {...p,r:0})) > 0);

    const hold = { w:2, h:2, k:2, hatch:2, start:3, keyAt:3, cell:Array(4).fill({t:'floor'}) };
    same(yhSolve(hold, {pos:3,key:1,mask:0}, 0), [3]);
    assert.equal(yhSolve(hold, {pos:3,key:1,mask:0}, 1), null);
    assert.equal(yhMove(hold, {pos:2,key:0,mask:0}, 1).key, 1);
    assert.equal(yhMove(hold, {pos:3,key:0,mask:0}, 3).key, 0);
    const tide = {w:1,h:1,rock:[null,{p:2,up:1,ph:0}]};
    assert.equal(ytSafe(tide, 1, 0), true);
    assert.equal(ytSafe(tide, 1, 1), false);

    const rings = {R:4, lev:ydLevers(4,'d'), goal:[2,0,5,1]};
    same(ydBFS(rings, [0,0,0,0]), [3]);
    same(rings.lev[3], [2,0,5,1]);

    same(zcRay({n:3}, 4, 2), [5]);
    const route = {rock:[],whirl:[],snakes:[{c:[1,0]}]};
    assert.equal(zrSafe(route, 0, 1, 0), false);
    assert.equal(zrSafe(route, 2, 1, 0), true);

    const loop = {w:2,h:2,start:0,goal:-1,cell:[1,2,0,3].map(d=>({t:'arrow',d}))};
    assert.equal(zgFlow(loop, []).why, 'loop');
    const pair = {w:2,h:3,start:4,goal:1,cell:[
      {t:'gate',d:0,g:0},{t:'goal'},{t:'arrow',d:0},{t:'rock'},
      {t:'gate',d:3,g:0},{t:'arrow',d:0}
    ]};
    assert.equal(zgFlow(pair, [0]).why, 'out');
    same(zgFlow(pair, [1]).path, [4,2,0,1]);
    assert.equal(zgFlow(pair, [1]).ok, true);
  `,
  '05': `
    const shadow = {n:3,offs:[[0,0],[1,0]],st:[
      {x:0,y:0,cells:[[0,0],[1,0]]},{x:0,y:0,cells:[[0,0]]}
    ]};
    same([...zsShadow(shadow, [0,1])], [0,1]);
    same(znBest([3,4], 2), [0,2]);
    assert.equal(znG([1,4], 2), 0);
    assert.equal(znG([3,3], 2), 0);
    for(const reply of [[2,3],[1,3],[3,2],[3,1]]) assert.notEqual(znG(reply,2),0);

    assert.equal(zoSat({t:'cw',a:0,b:1},[5,0],6),true);
    assert.equal(zoSat({t:'cw',a:0,b:1},[0,5],6),false);
    assert.equal(zoSat({t:'adj',a:0,b:1},[0,5],6),true);

    const lock = [{t:'sum',a:0,b:1,c:2},{t:'gt',a:0,b:1,k:1},{t:'even',a:1}];
    assert.ok(lock.every(c => plSat(c,[3,2,5])));
    assert.ok(!lock.every(c => plSat(c,[2,1,3])));

    for(let lv=1;lv<=8;lv++) {
      const P = pqMake(lv), worlds = [];
      for(let door=0;door<P.D;door++) {
        for(let mask=0;mask<(1<<P.k);mask++) {
          const tr = Array.from({length:P.k}, (_,i)=>!!(mask&(1<<i)));
          const w = {door,tr};
          if(P.sts.every((s,i)=>pqEval(s,w)===tr[i])) worlds.push(w);
        }
      }
      same(worlds, JSON.parse(JSON.stringify([P.sol])));
    }
  `
};

for (const [batch, checks] of Object.entries(cases)) {
  vm.runInNewContext(prelude + code + checks, { assert });
  console.log('audit ' + batch + ' · logic witnesses passed');
}
assert.ok(html.includes('GM.pz_xreef.run=runXReef'));
assert.ok(palace.includes('GM.pz_pliar.run = function runPLiarMotion'));
assert.ok(palace.includes('round = 1; mount()'));
assert.ok(palace.includes("pWin(api, 'pz_pliar'"));
assert.match(html, /const done=P\.letters\.every\(c=>guess\[P\.key\[c\]\]===c\);\$\('#zkq'\)\.hidden=!done/);
console.log('active registry, second hall and ledger destination gates found');
