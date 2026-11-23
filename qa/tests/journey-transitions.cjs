'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ids=['departure','coral_light','mist_bells','oasis_water','ice_observatory','wind_engine','moon_vow','eighth_route','letter','palace','atheran','return'];
const stations=Array.from({length:21},(_,i)=>({id:'s'+i}));
const sea={done:{}},atlas={open:false,done:0,cleared:0};
const saved=new Map();
const win={T7:{state:()=>sea,data:{stations}},ATHERAN_CAMPAIGN:{summary:()=>atlas},__MINDLAB_JOURNEY_STORY:{transitions:ids.map(id=>({id}))}};
const doc={readyState:'loading',addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[]};
// The hub wraps the engine's showIntro/closePlay at load (5.5.28); give the sandbox inert originals.
vm.runInNewContext(fs.readFileSync('ui/journey-hub.js','utf8'),{window:win,T7:win.T7,document:doc,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},console,showIntro(){},closePlay(){}});
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
atlas.cleared=0;
atlas.a={done:{pz_aheart:1}};
win.MindlabRescue={state:()=>({completed:true})};
assert.deepEqual(discover(),ids,'successful evacuation reveals return without clearing optional secret worlds');
win.MindlabRescue={state:()=>({completed:false})};
assert.equal(discover().includes('return'),false,'unfinished evacuation and uncleared secrets keep return hidden');
atlas.cleared=5;assert.deepEqual(discover(),ids,'legacy fully completed saves preserve the old return scene');
// Restoring an earlier campaign hides later scenes despite their presentation history.
saved.set('mindlab:transitions:seen:v1',JSON.stringify(Object.fromEntries(ids.map(x=>[x,true]))));
sea.done={};atlas.open=false;atlas.done=0;atlas.cleared=0;
assert.deepEqual(discover(),['departure']);
const side=fs.readFileSync('expedition10/app.js','utf8');
assert(!side.includes('انفتحت بوابة قصر المرايا'));
assert(!side.includes('ظهر الطريق إلى الفصل الثاني'));

// Cross-check the 24 playable side stages and narrative against stable IDs.
const mapSource=fs.readFileSync('ui/designs_art/journey/v3/stations.js','utf8');
const mapData=JSON.parse(mapSource.slice(mapSource.indexOf(' = ')+3).trim().replace(/;\s*$/,''));
const storySource=fs.readFileSync('ui/journey-story-data.js','utf8');
const storyData=JSON.parse(storySource.slice(storySource.indexOf(' = ')+3).trim().replace(/;\s*$/,''));
const sideStops=mapData.stations.filter(st=>st.chapter==='side');
const engineIds=[...side.matchAll(/\{id:'(ml10_\d+)'/g)].map(m=>m[1]);
assert.equal(engineIds.length,24,'exactly 24 playable side-journey stages');
assert.equal(new Set(engineIds).size,24,'side-journey save IDs are unique');
assert.deepEqual(sideStops.map(s=>s.id),engineIds,'chapter folders and engine have identical ordered stages');
assert.equal(storyData.chapters.find(ch=>ch.id==='side').stationCount,engineIds.length,'chapter count matches engine');
assert.equal(mapData.clusters,undefined,'map-only clusters removed');
assert.equal(mapData.viewports,undefined,'map-only viewport geometry removed');
assert(sideStops.every(st=>!('x' in st)&&!('y' in st)&&!('clusterGroup' in st)),'map coordinates removed without changing stage order');
assert.equal(new Set(sideStops.map(st=>st.openingTextAr)).size,engineIds.length,'side introductions unique');
assert.deepEqual(storyData.expeditionStations.map(st=>st.stageId),engineIds,'opening data uses the same stage IDs');
assert.deepEqual(storyData.expeditionStations.map(st=>st.dialogue),sideStops.map(st=>st.openingTextAr),'opening overlay and chapter folders use identical dialogue');
assert.equal(new Set(storyData.expeditionStations.map(st=>st.dialogue)).size,engineIds.length,'all displayed side dialogue is distinctive');
assert(sideStops.every(st=>!st.openingTextAr.includes('لنبدأ بهدوء ونختبر خطواتنا')),'no duplicated template openings');
assert(side.includes("i===stages.length-1?'اكتملت الرحلة الجانبية'"),'final completion uses length');
assert(side.includes('العلامات الأربع والعشرون'),'epilogue count reflects 24 stages');
assert(!side.includes('وفتح الفصل التالي.'),'side story is independent of campaign order');
assert(side.includes('STAGE_LIMIT_LABEL[s.id]'),'stage constraints keyed by ID');
for(const id of ['ml10_07','ml10_12','ml10_17','ml10_18','ml10_19','ml10_20','ml10_21','ml10_22','ml10_23','ml10_24','ml10_25'])
 assert(side.includes(id+':'),'correct stage label declared: '+id);
assert(fs.readFileSync('ui/journey-hub.js','utf8').includes("['side','رحلة جانبية'")&&sideStops.length===24,'side folder remains a separate 24-stage adventure');

console.log('Journey transitions: fresh, partial, noncontiguous, old/reset saves, all milestones and independent side finale passed.');
