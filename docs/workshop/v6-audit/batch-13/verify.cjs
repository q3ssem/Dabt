'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../../..');
const catalog = require('../../EDITORIAL_SOURCE_INDEX.json');
const progress = require('../../EDITORIAL_PROGRESS.json').v6_audit;
const delivery = require('./delivery-index.json');
const { stations } = require('../appearances.json');

const ids = catalog.puzzles.map(p => p.id);
const covered = progress.batches.flatMap(b => b.cards);
assert.equal(ids.length, 86);
assert.equal(new Set(covered).size, 86);
assert.deepEqual([...covered].sort(), [...ids].sort());
assert.deepEqual(delivery.map(p => p.id), ids);
for (const card of delivery) {
  assert.ok(progress.batches.find(b => b.id === card.audit_batch).cards.includes(card.id));
  assert.deepEqual(card.story_stations, stations.filter(s => s.originalPuzzleId === card.id).map(s => s.stationId));
  assert.equal(card.device_test, 'pending');
}
assert.equal(stations.length, 85);
assert.equal(progress.batches.flatMap(b => b.ready_for_migration).length, 0);

const source = execFileSync('git', ['show', catalog.source + ':index.html'], {
  cwd: root, maxBuffer: 4e6, encoding: 'utf8'
});
function extract(first, last) {
  const a = source.indexOf(first);
  const b = source.indexOf(last, a + first.length);
  assert.ok(a >= 0 && b > a, first);
  return source.slice(a, b);
}
const rules = [
  ['function pgFlow(', 'function pgMake('],
  ['const pvOp=', 'function pvMake('],
  ['function pdRuleSolutions(', 'function pdMake('],
  ['function runPClock(', 'const PZ_P=']
].map(([a,b])=>extract(a,b));
assert.match(rules.pop(), /x>0&&P\.s\.every\(\(speed,i\)=>\(P\.h\[i\]\+speed\*x\)%12===0\)/);
const witnesses = vm.runInNewContext(rules.join('\n') + `
  const T = {ch:[{g:0,ch:[{g:2,id:0},{g:3,id:1}]},{g:1,id:2}]};
  const base = pgFlow(T,[true,true,true,false],48);
  const changed = pgFlow(T,[true,true,true,true],48);
  const dry = pgFlow(T,[true,true,false,false],48);
  const closed = pgFlow(T,[false,true,true,true],48);
  assert.equal(base[0],24);
  assert.equal(base[1],0);
  assert.equal(changed[0],12);
  assert.equal(changed[1],12);
  assert.equal(changed[2],24);
  assert.equal(dry[0],undefined);
  assert.equal(dry[0] ?? 0,0);
  assert.notEqual(dry[0],0, "visible zero does not pass the raw win comparison");
  assert.equal(closed[0],0);
  const sync = t => t > 0 && (7+t)%12===0 && (9+3*t)%12===0;
  assert.equal(sync(4),false);
  assert.equal(sync(5),true);
  assert.equal(sync(17),true);
  assert.equal(pvOp([1,4],0).join(), '2,3');
  assert.equal(pvRoute([0,0,10],[2,3,5]).join(),'1,0');
  assert.notEqual(pvOp(pvOp([0,0,10],0),1).join(), '2,3,5');
  const families=['cycle','step','alt','grow'];
  const sameNext=[0,3,0,3,0,3];
  assert.equal(pdRuleSolutions(sameNext,'cycle').join(), '0');
  assert.equal(pdRuleSolutions(sameNext,'step').join(), '0');
  let collision;
  for(let seed=0;seed<6**6&&!collision;seed++){
    const row=Array.from({length:6},(_,i)=>Math.floor(seed/6**i)%6);
    if(families.some(f=>pdRuleSolutions(row,f).length)) continue;
    const options=families
      .map(f=>[f,pdRepairOptions(row,f)])
      .filter(([,repairs])=>repairs.length===1);
    const pairs=new Set(options.map(([,r])=>r[0].index+':'+r[0].next));
    if(pairs.size>1) collision={row,options};
  }
  assert.ok(collision, 'different repair pairs require a family clue');
  collision;
`,{assert});
assert.ok(7*44+6*4 > 320-2*12, 'seven independent targets cannot fit the narrow row');
assert.ok(6*44+5*4 <= 320-2*12, 'six targets fit without shrinking');
console.log('86 original puzzle IDs, 85 stations, layout geometry and logic witnesses passed.');
console.log('Cross-family repair collision:',JSON.stringify(witnesses));
