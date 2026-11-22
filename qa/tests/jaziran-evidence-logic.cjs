'use strict';
/* Jaziran p7: observation -> verified after a repeatable win -> independent inference.
   Never mutate campaign engine saves, and never reward twice for the same dossier. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync('ui/journey-evidence.js','utf8');
const data=new Map([
  ['miran:v2','{"v":1,"coins":137,"tx":{"a4":{"prog":3}}}'],
  ['treasureV3','{"done":{"sea7_0":true}}'],
  ['mindlab:journey:evidence-notes:v1','{"measurement":"موضع الحجر"}']
]);
const writes=[];
const storage={getItem:k=>data.get(k)||null,setItem(k,v){writes.push(k);data.set(k,String(v));}};
const window={};
const context={window,localStorage:storage,Date,console};
vm.runInNewContext(script,context);
const engine=window.MindlabEvidence;
const native={};
const status=id=>({done:!!native[id]});
assert.equal(engine.list().length,4);
const file=id=>engine.getFile(id,status);
assert.equal(file('measurement').ready,false);
assert.equal(file('measurement').sealed,false);
assert.equal(engine.verifySource('pz_xlock',1,status).reason,'not-completed');
native.pz_xlock=true;
assert.equal(engine.verifySource('pz_xlock',0,status).reason,'wrong-answer');
const first=engine.verifySource('pz_xlock',1,status);
assert.equal(first.ok,true);
assert.equal(first.awarded,true);
assert.equal(engine.verifySource('pz_xlock',1,status).awarded,false,'cannot count same source twice');
assert.equal(file('measurement').verifiedCount,1);
assert.equal(file('measurement').independentCount,1);
assert.equal(engine.infer('measurement',1,status).reason,'not-independent');
native.pz_zstars=true;
assert.equal(engine.verifySource('pz_zstars',2,status).ok,true);
assert.equal(file('measurement').ready,true);
assert.equal(engine.infer('measurement',2,status).reason,'wrong-answer');
const marked=engine.infer('measurement',1,status);
assert.equal(marked.ok,true);
assert.equal(marked.awarded,true);
assert.equal(engine.infer('measurement',1,status).awarded,false,'seal granted once');
assert.equal(file('measurement').sealed,true);
assert.equal(file('measurement').sealAt,marked.at);
assert.equal(file('measurement').sources[0].verifiedAt,first.at);
native.pz_zstars=false;
assert.equal(file('measurement').sealed,false,'losing native completion never presents stale stamp as valid');
native.pz_zstars=true;
assert.equal(file('measurement').sealed,true,'original valid proof and seal can be reloaded without double reward');
// Two copies from one guard record are not independent testimony.
native.pz_pclock=true;native.pz_pobs=true;
assert.equal(engine.verifySource('pz_pclock',1,status).ok,true);
assert.equal(engine.verifySource('pz_pobs',1,status).ok,true);
assert.equal(file('testimony').verifiedCount,2);
assert.equal(file('testimony').independentCount,1);
assert.equal(file('testimony').ready,false);
assert.equal(engine.infer('testimony',2,status).reason,'not-independent');
native.pz_pjail=true;
assert.equal(engine.verifySource('pz_pjail',0,status).ok,true);
assert.equal(file('testimony').independentCount,2);
assert.equal(engine.infer('testimony',2,status).ok,true);
// Optional identities require the real official finale AND every optional world solved.
assert.equal(file('people'),null,'no premature disclosure before official ending');
native.pz_wbone=true;
assert.equal(engine.verifySource('pz_wbone',0,status).reason,'locked');
native.pz_aheart=true;
assert.equal(file('people').ready,false);
for(const s of file('people').sources){
  native[s.id]=true;
  assert.equal(engine.verifySource(s.id,s.answer,status).ok,true);
}
assert.equal(file('people').verifiedCount,5);
assert.equal(file('people').ready,true);
assert.equal(engine.infer('people',2,status).ok,true);
assert.equal(file('people').sealed,true);
native.pz_aheart=false;
assert.equal(file('people'),null,'old secret proof never bypasses the official finale');
// No duplicate proof counted when a stored map has repeated string keys or corrupted answer.
const ledger=JSON.parse(data.get(engine.key));
ledger.files.measurement.proofs.pz_zstars.answer=0;
data.set(engine.key,JSON.stringify(ledger));
assert.equal(file('measurement').ready,false,'corrupt claim cannot certify the inference');
assert.equal(file('measurement').sealed,false);
assert.equal(engine.getFile('bad-file',status),null);
assert.equal(engine.verifySource('bad-id',0,status).ok,false);
assert.deepEqual(new Set(writes),new Set([engine.key]),'only the isolated ledger key may be written');
assert.equal(JSON.parse(data.get('miran:v2')).coins,137);
assert.equal(JSON.parse(data.get('treasureV3')).done.sea7_0,true);
assert.equal(JSON.parse(data.get('mindlab:journey:evidence-notes:v1')).measurement,'موضع الحجر');
// Recovery from malformed ledger and rejected storage write.
data.set(engine.key,'{broken');
assert.equal(file('traces').verifiedCount,0);
const blockedStore={getItem:storage.getItem,setItem(){throw Error('quota');}};
const ctx2={window:{},localStorage:blockedStore,Date,console};
vm.runInNewContext(script,ctx2);
assert.equal(ctx2.window.MindlabEvidence.verifySource('pz_xlock',1,status).reason,'storage');
// All notebook IDs come from current real puzzle inventory; no retired engines return.
const catalog=JSON.parse(fs.readFileSync('legacy/inventory.json','utf8')).puzzles;
const live=new Set(catalog.map(x=>x.id));
const extras=new Set(['pz_wbone','pz_wspore','pz_wlog','pz_wlake','pz_wfirst']);
assert.equal(extras.size,5);
for(const id of engine.list().map(x=>x.id)){
  if(id==='people')native.pz_aheart=true;
  for(const s of file(id).sources)assert(live.has(s.id),'unknown source '+s.id);
}
console.log('JAZIRAN_EVIDENCE_LOGIC=passed: source win gate, wrong answers, copy-family rejection, seals exactly once, old saves untouched, secret finale gate, corruption recovery');
