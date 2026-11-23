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
  ['const RIDDLES=', 'const RID_PER='],
  ['function lkFb(', 'function lkText('],
  ['function loSolve(', '/* ---- untangle'],
  ['function osMake(', '/* ---- binary']
].map(([a,b])=>extract(a,b)).join('\n'),game);

const riddles=vm.runInContext('RIDDLES',game);
assert.ok(riddles.length>0);
for(const [question,answer,alternatives,hints,explanation] of riddles){
  assert.ok(question && answer && explanation && hints.length===3);
  assert.equal(new Set([answer,...alternatives]).size,alternatives.length+1);
}
for(let level=1;level<=8;level++){
  const lock=game.lkMake(level);
  const fits=game.lkAll(lock.D).filter(guess=>lock.clues.every(c=>
    game.lkFb(c.g,guess).join()===c.fb.join()));
  assert.equal(fits.length,1);
  assert.equal(fits[0].join(),lock.sec.join());

  const lights=game.loMake(level), solved=game.loSolve(lights.n,lights.on);
  const remaining=Array.from(lights.on);
  solved.x.forEach((press,i)=>{
    if(!press)return;
    const x=i%lights.n, y=Math.floor(i/lights.n);
    for(const [dx,dy] of [[0,0],[0,-1],[1,0],[0,1],[-1,0]]){
      const a=x+dx,b=y+dy;
      if(a>=0&&a<lights.n&&b>=0&&b<lights.n)remaining[b*lights.n+a]^=1;
    }
  });
  assert.ok(remaining.every(x=>x===0));

  const stroke=game.osMake(level);
  const edges=new Set(stroke.edges.map(edge=>edge.join('-')));
  for(let i=1;i<stroke.trail.length;i++){
    const edge=[stroke.trail[i-1],stroke.trail[i]].sort((a,b)=>a-b).join('-');
    assert.ok(edges.delete(edge));
  }
  assert.equal(edges.size,0);
}
const progress=require('../EDITORIAL_PROGRESS.json');
const covered=new Set();
const registered=new Set(index.puzzles.map(p=>p.id));
for(const batch of [...progress.batch_history,progress.current_batch]){
  for(const id of [...(batch.editorial_reviewed??[]),...(batch.puzzle_cards??[]).map(c=>c.id),
    ...(batch.implemented??[]).map(c=>typeof c==='string'?c:c.id)]) if(registered.has(id))covered.add(id);
}
for(const id of registered)assert.ok(covered.has(id),'missing from workshop: '+id);
assert.equal(covered.size,86);
console.log(`Verified coverage of ${covered.size} indexed puzzle IDs; ${riddles.length} riddle records checked for structure; 24 lock, lights and stroke samples replayed or enumerated.`);
