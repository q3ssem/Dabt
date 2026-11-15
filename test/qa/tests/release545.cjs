'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('treasure/app.js'),css=read('treasure/style.css'),data=read('treasure/data.js');
assert(app.includes('const SEA_PASSAGES={'),'six authored sea passages exist');
for(let ch=1;ch<7;ch++){assert(new RegExp(`\\n ${ch}:{speaker:`).test(app),`passage ${ch} exists`);}
assert(app.includes('function continueJourney()'),'transition entry point exists');
assert(app.includes('from.ch!==to.ch&&sealHere(from)&&done(from.i)'),'transition only follows a completed sea seal');
assert(app.includes('function renderPassage()')&&app.includes("passage:renderPassage"),'passage view is renderable');
assert(app.includes("button('تجاوز المشهد'"),'passage can be skipped');
assert(app.includes("button('ابدأ الفصل الجديد'"),'passage has a clear destination action');
assert(app.includes("crew_full_'+guide.key+'.webp"),'uses original crew full-body artwork');
assert(css.includes('.v545-passage-layout')&&css.includes('@media(max-width:760px){.v545-passage-layout'),'responsive passage layout exists');
assert.equal((data.match(/id:'sea7_'/g)||[]).length,1,'station IDs remain generated from fixed indices');
assert(read('index.html').includes('miran:v2'),'existing save key remains');
assert(read('sw.js').includes("const VERSION='"+JSON.parse(read('package.json')).version+"'"),'service worker cache version updated');
for(const key of ['rawaa','nabd','nuha','suhail','shibl','nawfal'])assert(fs.existsSync(path.join(root,`treasure/art/story5/crew_full_${key}.webp`)),`crew art exists: ${key}`);
console.log(JSON.stringify({status:'passed',checks:18,chapterPassages:6,saveKey:'miran:v2',stationIDs:'unchanged'},null,2));
