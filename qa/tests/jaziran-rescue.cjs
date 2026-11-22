'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const text=fs.readFileSync('ui/jaziran-rescue.js','utf8');
const storage=new Map([
  ['miran:v2','{"coins":460,"tx":{"a4":{"prog":19},"a5":{"done":{"pz_aheart":1}}}}'],
  ['treasureV3','{"done":{"sea7_0":1}}'],
  ['mindlab:journey:evidence-ledger:v1','{"version":1,"files":{"measurement":{"seal":{"at":1}}}}']
]);
const writes=[];
const native={open:false,a:{done:{},sw:{},swd:{}}};
const storageAPI={getItem:k=>storage.get(k)||null,setItem(k,v){writes.push(k);storage.set(k,String(v));}};
const window={ATHERAN_CAMPAIGN:{summary:()=>native}};
vm.runInNewContext(text,{window,localStorage:storageAPI,Date,console});
const m=window.MindlabRescue;
assert.equal(m.KEY,'mindlab:journey:jaziran-rescue:v1');
assert.equal(m.ANCHORS.length,3);
assert.equal(m.MAPS.length,3);
assert.equal(m.TIMELINE.length,4);
const correct={measure:1,time:0,age:2};
assert.equal(m.state().unlocked,false);
assert.equal(m.simulate(correct,'B',2).reason,'locked');
assert.equal(m.decide('teach').reason,'locked');
// Native pz_aheart win and campaign opening, no optional secret world, are enough.
native.open=true;native.a.done.pz_aheart=1;
assert.equal(m.state().unlocked,true);
assert.equal(m.state().completed,false);
assert.equal(m.simulate({measure:0,time:0,age:2},'B',2).reason,'measure');
assert.equal(m.simulate({measure:1,time:1,age:2},'B',2).reason,'time');
assert.equal(m.simulate({measure:1,time:0,age:0},'B',2).reason,'age');
assert.equal(m.simulate(correct,'A',2).reason,'map-measure');
assert.equal(m.simulate(correct,'C',2).reason,'map-age');
assert.equal(m.simulate(correct,'B',1).reason,'early');
assert.equal(m.simulate(correct,'B',3).reason,'late');
assert.equal(m.simulate(correct,'B',4).reason,'closed');
assert.equal(m.simulate(correct,'B',0).reason,'step');
assert.equal(m.decide('post').reason,'unfinished');
assert(!writes.length,'failed attempts cannot write to save');
const success=m.simulate(correct,'B',2);
assert.equal(success.ok,true);
assert.equal(success.awarded,true);
assert.equal(m.state().completed,true);
assert.equal(m.simulate(correct,'B',2).awarded,false);
assert.equal(m.state().completedAt,success.completedAt);
assert.equal(writes.length,1,'completed evacuation persisted exactly once');
const decision=m.decide('teach');
assert.equal(decision.ok,true);
assert.equal(decision.awarded,false);
assert.equal(m.state().decision,'teach');
assert.equal(m.decide('post').decision,'teach','alternative preview cannot change original decision');
assert.equal(writes.length,2,'decision persisted exactly once');
native.a.done.pz_aheart=0;
assert.equal(m.state().unlocked,false,'native win remains authoritative');
assert.equal(m.simulate(correct,'B',2).reason,'locked');
native.a.done.pz_aheart=1;
// Only rescue key touched; no sea, Palace, Atheran or money save writes.
assert.deepEqual([...new Set(writes)],[m.KEY]);
assert.equal(JSON.parse(storage.get('miran:v2')).coins,460);
assert.equal(JSON.parse(storage.get('treasureV3')).done.sea7_0,1);
assert.equal(JSON.parse(storage.get('mindlab:journey:evidence-ledger:v1')).version,1);
// Reload and corrupt ledger acceptance: no native saves changed.
const window2={ATHERAN_CAMPAIGN:{summary:()=>native}};
vm.runInNewContext(text,{window:window2,localStorage:storageAPI,Date,console});
assert.equal(window2.MindlabRescue.state().completed,true);
assert.equal(window2.MindlabRescue.state().decision,'teach');
storage.set(m.KEY,'{broken');
assert.equal(m.state().completed,false);
assert.equal(m.decide('post').reason,'unfinished');
const falseRecord={version:1,completed:true,map:'A',step:3,completedAt:Date.now()};
storage.set(m.KEY,JSON.stringify(falseRecord));
assert.equal(m.state().completed,false,'invalid legacy or corrupted rescue records rejected');
assert.equal(m.simulate(correct,'B',2).awarded,true,'bad rescue record can be safely recovered');
const blocked={getItem:storageAPI.getItem,setItem(){throw Error('storage unavailable')}};
const win3={ATHERAN_CAMPAIGN:{summary:()=>native}};
vm.runInNewContext(text,{window:win3,localStorage:blocked,Date,console});
storage.delete(m.KEY);
assert.equal(win3.MindlabRescue.simulate(correct,'B',2).reason,'storage');
assert.equal(win3.MindlabRescue.state().completed,false);
// Story continuity and optional branch rule.
const source=fs.readFileSync('ui/journey-story-data.js','utf8');
const story=JSON.parse(source.slice(source.indexOf(' = ')+3).trim().replace(/;\s*$/,''));
assert.deepEqual(story.jaziranContinuity.officialOrder,['seven_seas','palace','atheran']);
assert.equal(story.jaziranContinuity.requiresOptionalSecretsForEvacuation,false);
assert.equal(story.transitions.length,12);
assert.equal(story.treasureStations.length,21);
assert(story.transitions.find(x=>x.id==='return').dialogue.includes('قارب الإخلاء'));
assert(!fs.readFileSync('atheran/campaign/story.js','utf8').includes('الطوّاف يحرك الساحل'));
const app=fs.readFileSync('ui/app.js','utf8'),manifest=fs.readFileSync('offline-manifest.js','utf8');
for(const path of ['ui/jaziran-rescue.js','ui/jaziran-rescue-ui.js','ui/jaziran-rescue.css']){
  assert(app.includes(path),'loader missing '+path);
  assert(manifest.includes('"'+path+'"'),'offline missing '+path);
}
console.log('JAZIRAN_RESCUE_LOGIC=passed: three anchors, three maps, four tides, optional branches bypassed, native awards untouched, save recovery, one completion and one choice');
