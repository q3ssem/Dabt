'use strict';
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const vm = require('node:vm');
const cards = require('./riddles.json');
const { source } = require('../../EDITORIAL_SOURCE_INDEX.json');
const root = path.resolve(__dirname,'../../../..');
const native = execFileSync('git',['show',source+':index.html'],{cwd:root,maxBuffer:4e6,encoding:'utf8'});
const begin=native.indexOf('const RIDDLES='), stop=native.indexOf('const RID_PER=',begin);
assert.ok(begin>=0 && stop>begin);
const questions=vm.runInNewContext(native.slice(begin,stop)+'\nRIDDLES');
assert.equal(cards.length,32);
assert.equal(cards.length,questions.length);
cards.forEach(({number,verdict,question,hints,proof},i)=>{
  assert.equal(number,i+1);
  assert.ok(question.trim()&&verdict.trim()&&proof.trim());
  assert.equal(hints.length,3);
  assert.ok(hints.every(s=>s.trim()));
});
assert.match(cards[21].proof,/تحديث خيار الإجابة/);
assert.match(cards[28].proof,/استبدال الجواب والخيارات/);

function permutations(values){
  if(!values.length)return [[]];
  return values.flatMap((v,i)=>permutations(values.filter((_,j)=>j!==i)).map(rest=>[v,...rest]));
}
const matches=(values,predicate)=>permutations(values).filter(predicate);
const crates=matches(['apple','orange','mixed'], p=>p.every((x,i)=>x!==['apple','orange','mixed'][i]));
assert.equal(crates.length,2);
assert.ok(crates.every(p=>p[2]!=='mixed'));
for(const fruit of ['apple','orange'])assert.equal(crates.filter(p=>p[2]===fruit).length,1);

const truthWorlds=n=>Array.from({length:2**n},(_,m)=>Array.from({length:n},(_,i)=>Boolean(m&(1<<i))));
assert.deepEqual(truthWorlds(2).filter(([a,b])=>a===!b && b===(!a&&!b)),[[true,false]]);
assert.deepEqual(truthWorlds(2).filter(([a,b])=>a===(!a||!b)),[[true,false]]);
assert.deepEqual(truthWorlds(3).filter(([a,b,c])=>a===!b && b===!c && c===(!a&&!b)),[[false,true,false]]);
const oneTrue=claims=>claims.filter(Boolean).length===1;
assert.deepEqual(['a','b','c'].filter(box=>oneTrue([box==='a',box!=='b',box!=='a'])),['b']);
assert.deepEqual(['a','b','c','d'].filter(person=>oneTrue([person==='b',person==='d',person!=='c',person!=='d'])),['c']);
const neighbors=matches(['saad','fahad','ahmad','bandar','majed'],p=>p[0]==='saad'&&p[2]==='fahad'&&p[3]==='ahmad'&&p[1]!=='bandar');
assert.deepEqual(neighbors,[['saad','majed','fahad','ahmad','bandar']]);
const arrivals=matches(['majed','salem','khaled','omar'],p=>p.indexOf('omar')<p.indexOf('majed')&&p.indexOf('majed')<p.indexOf('salem')&&p.indexOf('salem')<p.indexOf('khaled'));
assert.deepEqual(arrivals,[['omar','majed','salem','khaled']]);
const colors=matches(['red','blue','green','yellow'],p=>{
  const red=p.indexOf('red');
  return p.indexOf('blue')-p.indexOf('green')===1&&(red===0||red===3)&&
    Math.abs(red-p.indexOf('yellow'))!==1&&Math.abs(red-p.indexOf('green'))!==1;
});
assert.ok(colors.length);
assert.ok(colors.every(p=>p[3]==='red'));
const capacities=[3,5], jugs=[0,0];
const fill=i=>{jugs[i]=capacities[i];};
const empty=i=>{jugs[i]=0;};
function pour(from,to){
  const amount=Math.min(jugs[from],capacities[to]-jugs[to]);
  jugs[from]-=amount;
  jugs[to]+=amount;
}
fill(1);pour(1,0);empty(0);pour(1,0);fill(1);pour(1,0);
assert.deepEqual(jugs,[3,4]);
console.log('32 per-question cards match the pinned record count. Independent enumeration confirmed crates, truth/lie, posters, vase, seating, arrival, house and jug examples.');
