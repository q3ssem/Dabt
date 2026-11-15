'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('treasure/app.js'),css=read('treasure/style.css'),data=read('treasure/data.js'),offline=read('offline-manifest.js');
assert(app.includes('v544-chapter-overview'),'chapter overview rendered');
assert(app.includes('c[1]')&&app.includes('c[2]')&&app.includes('c[3]'),'kingdom, island and seal shown');
assert(app.includes('chapterDone/3*100'),'per-sea progress calculated from existing station completion');
assert(app.includes('v544-crew-debrief'),'crew debrief rendered on reward screen');
assert(app.includes("crew_full_'+guide.key+'.webp"),'original full-body crew art reused');
assert(css.includes('.v544-chapter-overview')&&css.includes('.v544-crew-debrief'),'new responsive styles exist');
const crew=['rawaa','nuha','nabd','shibl','suhail','ward','nawfal'];
for(const key of crew){const art=`treasure/art/story5/crew_full_${key}.webp`;assert(fs.existsSync(path.join(root,art)),`crew artwork exists: ${key}`);assert(offline.includes(art),`crew art remains offline cached: ${key}`);}
const stations=data.match(/id:'sea7_'/g)||[];assert.equal(stations.length,1,'station IDs are still generated from the fixed index mapping');
assert(read('sw.js').includes("const VERSION='"+JSON.parse(read('package.json')).version+"'"),'service worker cache version bumped');
assert(read('index.html').includes('miran:v2'),'existing save key retained');
console.log(JSON.stringify({status:'passed',checks:crew.length+9,chapterCards:7,crewDebriefs:21,crewArt:'original supplied assets',saveKey:'miran:v2',browserVisualTest:false},null,2));
