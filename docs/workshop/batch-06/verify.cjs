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
  const D8=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  const inb = (x,y,w,h) => x >= 0 && y >= 0 && x < w && y < h;
` + [
  ['const TI_LM=', 'const xHead='],
  ['const ZC_LV=', 'function runZComp('],
  ['const ZR_LV=', 'function runZRoute('],
  ['const ZG_LV=', 'const ZGL='],
  ['const ZS_LV=', 'function runZShadow('],
  ['const ZN_LV=', 'function runZNim('],
  ['const ZT_LV=', 'function runZStars('],
  ['const PLB_S=', 'function runPLib('],
  ['const ZH_LV=', 'function runZHarp('],
  ['const PC_LV=', 'function runPClock(']
].map(([a,b])=>extract(a,b)).join('\n'),game);

const value=vm.runInContext('znG',game);
for(const level of [1,4,8]) {
  const compass=game.zcMake(level);
  const common=compass.cells.filter(cell=>!compass.marks.some(m=>m.cell===cell)&&
    compass.clues.every(c=>game.zcRay(compass,compass.marks[c.L].cell,c.d).includes(cell)));
  assert.deepEqual(Array.from(common),[compass.T]);
  const route=game.zrMake(level);
  let at=route.start;
  const steps=[-route.w,1,route.w,-1,0];
  route.sol.forEach((step,t)=>{
    const next=at+steps[step];
    assert.ok(game.zrSafe(route,at,next,t));
    at=next;
  });
  assert.equal(at,route.goal);
  const gates=game.zgMake(level);
  assert.ok(!game.zgFlow(gates,gates.rot0).ok && game.zgFlow(gates,gates.groups.map(()=>0)).ok);
  const shadow=game.zsMake(level);
  let matches=0;
  function check(offsets) {
    if(offsets.length<shadow.st.length){
      for(let i=0;i<shadow.offs.length;i++)check([...offsets,i]);
    }else{
      const covered=game.zsShadow(shadow,offsets);
      if(covered.size===shadow.T.size && [...covered].every(c=>shadow.T.has(c)))matches++;
    }
  }
  check([]);
  assert.equal(matches,1);
  const nim=game.znMake(level);
  const [heap,amount]=game.znBest(nim.h,nim.m);
  assert.ok(amount>=1 && amount<=Math.min(nim.m,nim.h[heap]));
  assert.equal(value(nim.h.map((h,i)=>i===heap?h-amount:h),nim.m),0);
  const stars=game.ztMake(level);
  for(const edge of stars.edges){
    const [a,b]=edge.split('-').map(Number);
    const length=([x,y],[u,v])=>(x-u)**2+(y-v)**2;
    assert.equal(length(stars.pts[a],stars.pts[b]),length(stars.tab[a],stars.tab[b]));
  }
}
const ambiguous=[];
for(let level=1;level<=8;level++) {
  for(let trial=0;trial<20;trial++){
    const diary=game.plbMake(level);
    const words=diary.pages.map(p=>p.split(' '));
    const joins=(a,b)=>words[a].slice(-diary.ov).join(' ')===words[b].slice(0,diary.ov).join(' ');
    let count=0;
    function countChains(chain){
      if(chain.length===words.length){count++;return;}
      for(let i=0;i<words.length;i++)
        if(!chain.includes(i)&&(!chain.length||joins(chain.at(-1),i)))countChains([...chain,i]);
    }
    assert.ok(words.every((_,i)=>i===0||joins(i-1,i)));
    countChains([]);
    if(count>1)ambiguous.push({level,trial,count,pages:diary.pages});
  }
}
console.log('18 sea-puzzle cases verified: compass, route, gates, shadow, dragon, constellation.');
console.log(JSON.stringify({diaryCases:160,ambiguous:ambiguous.length,first:ambiguous[0]}));

const harpLevels=vm.runInContext('ZH_LV',game);
for(const [strings,count,shift,reverse] of harpLevels){
  const low=Math.max(0,-shift),high=strings-1-Math.max(0,shift);
  const melody=Array.from({length:count},(_,i)=>low+i%(high-low+1));
  const heard=melody.map(note=>note+shift);
  assert.ok(heard.every(note=>note>=0&&note<strings));
  const recovered=heard.map(note=>note-shift);
  assert.deepEqual(reverse?recovered.reverse():recovered,reverse?melody.slice().reverse():melody);
}
for(let level=1;level<=8;level++){
  const clock=game.pcMake(level);
  const agrees=t=>clock.s.every((speed,i)=>(clock.h[i]+speed*t)%12===0);
  assert.ok(agrees(clock.T)&&agrees(clock.T+12));
  assert.ok(!Array.from({length:clock.T-1},(_,i)=>i+1).some(agrees));
}
console.log('8 harp transformations and 8 clock rounds verified.');
