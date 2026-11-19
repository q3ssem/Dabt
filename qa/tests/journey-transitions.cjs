'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ids=['departure','coral_light','mist_bells','oasis_water','ice_observatory','wind_engine','moon_vow','eighth_route','letter','palace','atheran','return'];
const stations=Array.from({length:21},(_,i)=>({id:'s'+i}));
const sea={done:{}},atlas={open:false,done:0,cleared:0};
const saved=new Map();
const win={T7:{state:()=>sea,data:{stations}},ATHERAN_CAMPAIGN:{summary:()=>atlas},__MINDLAB_JOURNEY_STORY:{transitions:ids.map(id=>({id}))}};
const doc={readyState:'loading',addEventListener(){}};
vm.runInNewContext(fs.readFileSync('ui/journey-hub.js','utf8'),{window:win,T7:win.T7,document:doc,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},console});
const discover=()=>Array.from(win.mindlabJourneyHub.discoveredTransitions(),t=>t.id);
assert.deepEqual(discover(),['departure']);
// Noncontiguous and side-journey completion must reveal no official milestones.
sea.done.s20=1;assert.deepEqual(discover(),['departure']);
for(let i=0;i<20;i++){
 sea.done['s'+i]=1;
 const found=discover();
 assert.equal(found.includes('coral_light'),i>=2);
 assert.equal(found.includes('moon_vow'),i>=17);
 assert.equal(found.includes('letter'),i>=19);
 assert.equal(found.includes('atheran'),false);
}
assert.equal(discover().length,10);
atlas.open=true;assert.equal(discover().at(-1),'atheran');
atlas.done=21;atlas.cleared=4;assert.equal(discover().includes('return'),false);
atlas.cleared=5;assert.deepEqual(discover(),ids);
// Restoring an earlier campaign hides later scenes despite their presentation history.
saved.set('mindlab:transitions:seen:v1',JSON.stringify(Object.fromEntries(ids.map(x=>[x,true]))));
sea.done={};atlas.open=false;atlas.done=0;atlas.cleared=0;
assert.deepEqual(discover(),['departure']);
const side=fs.readFileSync('expedition10/app.js','utf8');
assert(!side.includes('انفتحت بوابة قصر المرايا'));
assert(!side.includes('ظهر الطريق إلى الفصل الثاني'));
console.log('Journey transitions: fresh, partial, noncontiguous, old/reset saves, all milestones and independent side finale passed.');
