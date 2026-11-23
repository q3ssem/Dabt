'use strict';
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { rotation, rotate, inspectPipes, plans, routes, measure } = require('./pipe/logic.js');
const { source } = require('../../EDITORIAL_SOURCE_INDEX.json');
const { pipe } = require('../../batch-01/fixtures.json');
const root = path.resolve(__dirname, '../../../..');
const native = execFileSync('git', ['show', source + ':index.html'], { cwd: root, maxBuffer: 4e6, encoding: 'utf8' });
const part = (start, end) => {
  const a = native.indexOf(start), b = native.indexOf(end, a);
  assert.ok(a >= 0 && b > a);
  return native.slice(a, b);
};
const game = vm.createContext({});
vm.runInContext(part('function pgFlow(', 'function pgMake('), game);

const garden = { ch: [{g: 0, id: 0}, {g: 1, id: 1}] };
const target = {0: 12, 1: 0};
assert.deepEqual({...game.pgFlow(garden,[true,false],12)}, target);
assert.deepEqual({...game.pgFlow(garden,[true,true],12)}, {0: 6, 1: 6});
assert.equal(game.pgFlow(garden,[false,false],12)[0],undefined);

const board = pipe.find(p => p.number === 1);
assert.deepEqual(rotation.initial,board.cur);
assert.deepEqual(rotation.locked,board.fixed);
assert.ok(!inspectPipes(rotation.initial).won);
assert.ok(inspectPipes(board.sol).won);
let turns = 0;
for(let i=0;i<board.sol.length;i++){
  let mask=rotation.initial[i], steps=0;
  while(mask!==board.sol[i] && steps<4){mask=rotate(mask);steps++;}
  assert.equal(mask,board.sol[i]);
  if(rotation.locked.includes(i)) assert.equal(steps,0);
  turns+=steps;
}
assert.equal(turns,board.min);

for(const [i, plan] of plans.entries()){
  const correct = [];
  for(let state=0;state<1<<routes.length;state++){
    const mask=routes.map((_,r)=>Boolean(state&(1<<r)));
    const f=measure(plan,mask);
    const delivered=Object.values(f.totals).reduce((a,b)=>a+b,0);
    assert.ok(Math.abs(delivered+f.stalled-plan.supply)<1e-9);
    if(f.won)correct.push(mask.map(Number).join(''));
  }
  assert.deepEqual(correct,[['100110','110101'][i]]);
}
const plausible=measure(plans[0],[true,true,false,false,true,false]);
assert.deepEqual(plausible.totals,{a:6,b:6,c:12,d:0});
assert.ok(!plausible.won && plausible.stalled===0, 'All required homes wet does not imply correct quantities');
const merge=measure(plans[1],[true,true,false,true,false,true]);
assert.deepEqual(merge.totals,{a:6,b:12,c:0,d:6});
assert.ok(merge.won);
assert.equal(measure(plans[0],routes.map(()=>false)).stalled,24);

const html=fs.readFileSync(path.join(__dirname,'pipe/index.html'),'utf8');
assert.ok(html.includes('id="play" hidden') && html.includes('id="start"'));
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  assert.ok(fs.existsSync(path.resolve(__dirname,'pipe',match[1])),match[1]);
}
const ui=fs.readFileSync(path.join(__dirname,'pipe/play.js'),'utf8');
for(const match of ui.matchAll(/src="(\.\.\/[^"]+)"/g)){
  assert.ok(fs.existsSync(path.resolve(__dirname,'pipe',match[1])),match[1]);
}
console.log('Garden dilution verified in pinned native pgFlow; 8-turn rotation witness; all 128 valve states verified; full-delivery trap, merge, conservation, and asset references passed.');

// In-memory interaction check for the real prototype handlers. Layout is outside this test.
const pipeApi = require('./pipe/logic.js');
const ctx = new Proxy({}, { get: () => () => {} });
const canvas = { getBoundingClientRect: () => ({width:320,height:200}), getContext: () => ctx };
class Element {
  constructor(id){this.id=id;this.hidden=id==='play';this.disabled=false;this.dataset={};this.textContent='';}
  set innerHTML(markup){
    this.markup=markup;
    this.moves=[...markup.matchAll(/<button[^>]*data-move="(\d+)"[^>]*>/gs)].map(match=>{
      const b=new Element('');
      b.dataset.move=match[1];b.disabled=/\bdisabled\b/.test(match[0]);return b;
    });
  }
  setAttribute(){}
  focus(){}
  querySelectorAll(){return this.moves??[];}
  querySelector(sel){
    if(sel==='canvas') return this.markup?.includes('<canvas')?canvas:null;
    if(sel==='button:not(:disabled)') return this.moves?.find(m=>!m.disabled);
    return this.moves?.find(m=>sel===`[data-move="${m.dataset.move}"]`);
  }
  click(){if(!this.disabled)this.onclick();}
}
const dom = new Map();
const element = id => {
  if(!dom.has(id))dom.set(id,new Element(id));
  return dom.get(id);
};
vm.runInNewContext(ui, {
  pipeWorkshop:pipeApi,
  document:{ getElementById:element,documentElement:{dataset:{}} },
  ResizeObserver:class {observe(){}},
  devicePixelRatio:1
});
const tap = i => element('board').moves[i].click();
element('start').click();
assert.equal(element('play').hidden,false);
assert.equal(element('entry').hidden,true);
assert.equal(element('board').moves.length,16);
const initialMarkup=element('board').markup;
tap(1);
assert.notEqual(element('board').markup,initialMarkup);
element('undo').click();
assert.equal(element('board').markup,initialMarkup);
element('hint').click();
const firstHint=element('hint-panel').textContent;
element('hint').click();
assert.notEqual(element('hint-panel').textContent,firstHint);
element('reset').click();
assert.equal(element('hint-panel').textContent,'');
rotation.initial.forEach((mask,i)=>{
  while(mask!==board.sol[i]){tap(i);mask=rotate(mask);}
});
assert.equal(element('next').hidden,false);
element('next').click();
assert.equal(element('board').moves.length,6);
for(const i of [0,1,4])tap(i);
element('check').click();
assert.equal(element('next').hidden,true);
assert.match(element('status').textContent,/قارِن/);
tap(1);tap(3);
element('check').click();
assert.equal(element('next').hidden,false);
element('next').click();
for(const i of [0,1,3,5])tap(i);
element('check').click();
assert.match(element('status').textContent,/توازنت/);
element('theme').click();
element('back').click();
assert.equal(element('entry').hidden,false);
assert.equal(element('play').hidden,true);
console.log('Prototype handlers verified in memory: start, rotation, undo, hints, reset, insufficient plan, both planning wins, theme, and back.');

const { stations, puzzles } = require('../../EDITORIAL_SOURCE_INDEX.json');
const appearances = require('../appearances.json');
const known = new Set(puzzles.map(p=>p.id));
assert.equal(appearances.baseline,source);
assert.equal(appearances.stations.length,85);
assert.equal(new Set(appearances.stations.map(s=>s.stationId)).size,85);
assert.equal(appearances.stations.filter(s=>s.relation==='shared-library-puzzle').length,40);
for(const [i,row] of appearances.stations.entries()){
  const origin=stations[i];
  assert.equal(row.stationId,origin.id);
  assert.equal(row.originalPuzzleId,origin.libraryPuzzleId??origin.id);
  if(row.relation==='shared-library-puzzle') assert.ok(known.has(row.originalPuzzleId));
  if(row.similarLibraryPuzzleId){
    assert.ok(known.has(row.similarLibraryPuzzleId));
    assert.notEqual(row.originalPuzzleId,row.similarLibraryPuzzleId);
  }
}
console.log('85 station mappings verified; 40 shared library IDs, 45 independent IDs.');
