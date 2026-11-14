'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const base=path.resolve(__dirname,'../..'),engineSource=fs.readFileSync(path.join(base,'qa/assessment-engine/Dabt_Assessment_Engine_v1.3.js'),'utf8'),commonSource=fs.readFileSync(path.join(base,'assessment/common.js'),'utf8');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++};
function store(seed){const data={'miran:v2':JSON.stringify(seed)};return{data,getItem:k=>data[k]||null,setItem(k,v){data[k]=v}};}
function assessment(storage){const c={localStorage:storage,console};vm.createContext(c);vm.runInContext(engineSource,c);vm.runInContext(commonSource,c);return c;}
const initial={hist:[{id:'keep',pts:93}],lv:{piano:5,pz_stat:6},best:{mot:100},mute:true,treasureV3:{done:{a:1}},custom:{retained:true}};
const storage=store(initial),c=assessment(storage),A=c.MindLabAssessment,E=c.DabtAssessmentEngine,repo=A.createStore(storage);
const session=(id,mode='training')=>E.scoreSession({sessionId:id,gameId:'rule-switch-reference',mode,domainId:'cognitive-flexibility',responses:[{ok:true,rt:200},{ok:false,rt:300}]});
repo.add(session('first'));let saved=JSON.parse(storage.getItem('miran:v2'));
for(const key of Object.keys(initial))ok(JSON.stringify(saved[key])===JSON.stringify(initial[key]),'assessment preserves '+key);
ok(saved.assessmentV4.results.length===1,'assessment written into miran:v2');ok(!storage.data['dabt.assessment.v1'],'no alternate save key');
repo.add(session('first'));ok(repo.getAll().length===1,'duplicate save idempotent');A.createStore(storage).add(session('second','assessment'));ok(repo.getAll().length===2,'second tab/session merged');
const before=storage.getItem('miran:v2'),originalSet=storage.setItem;storage.setItem=()=>{throw Error('quota')};assert.throws(()=>repo.add(session('quota')),/quota/);ok(storage.getItem('miran:v2')===before,'quota failure preserves root');storage.setItem=originalSet;
const broken={getItem:()=>'{broken',setItem(){throw Error('must not overwrite malformed data')}};assert.throws(()=>A.createStore(broken).add(session('bad')));checks++;
c.S={st:JSON.parse(JSON.stringify(initial)),save(){storage.setItem('miran:v2',JSON.stringify(this.st));}};c.window=c;c.addEventListener=()=>{};vm.runInContext(fs.readFileSync(path.join(base,'assessment/sync.js'),'utf8'),c);c.S.save();ok(JSON.parse(storage.getItem('miran:v2')).assessmentV4.results.length===2,'BFCache/stale main state retains assessment results');
const fixture=fs.readFileSync(path.join(__dirname,'legacy.art.cjs'),'utf8'),prefix=fixture.slice(0,fixture.indexOf('const LA=context.LA;'));
const {Node}=new Function('require','__dirname',prefix+'return {Node};')(require,__dirname);Node.prototype.replaceChildren=function(...kids){this.children=[];this.append(...kids);};
const ids=['intro','result','game','rule','shape','description','progress','resume','left','right','start','again','retry-save','summary','message'],body=new Node('body',{},...ids.map(id=>new Node('div',{id}))),events={};let now=1000;
const gameStore=store(initial),g=assessment(gameStore);g.document={hidden:false,createElement:t=>new Node(t),querySelector:s=>body.querySelector(s),getElementById:id=>body.querySelector('#'+id),addEventListener:(n,f)=>events[n]=f};g.performance={now:()=>now};g.window=g;g.addEventListener=()=>{};
vm.runInContext(fs.readFileSync(path.join(base,'assessment/rule-switch.js'),'utf8'),g);
const $=id=>body.querySelector('#'+id);$('start').onclick();
for(let i=0;i<12;i++){
 if(i===3){now+=50;g.document.hidden=true;events.visibilitychange();const old=$('progress').textContent;$('left').onclick();ok($('progress').textContent===old,'hidden trial rejects input');now+=10000;g.document.hidden=false;events.visibilitychange();$('resume').onclick();}
 now+=100;const left=$('rule').textContent.includes('اللون')?$('description').textContent.includes('أحمر'):$('description').textContent.includes('دائرة');$(left?'left':'right').onclick();
}
const resultRoot=JSON.parse(gameStore.getItem('miran:v2')),r=resultRoot.assessmentV4.results[0];
ok(r.correct===12&&r.attempts===12,'actual reference UI handlers complete 12 trials');ok(r.responses.every(x=>x.responseTimeMs<200),'hidden duration excluded');ok(JSON.stringify(resultRoot.lv)===JSON.stringify(initial.lv),'reference game leaves original levels');ok(JSON.stringify(resultRoot.hist)===JSON.stringify(initial.hist),'reference game leaves points/history');
$('retry-save').onclick();ok(JSON.parse(gameStore.getItem('miran:v2')).assessmentV4.results.length===1,'retry save does not duplicate result');
const colors=['243b40','f4efdf'].map(h=>[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4)).map(a=>.2126*a[0]+.7152*a[1]+.0722*a[2]);
const ratio=(Math.max(...colors)+.05)/(Math.min(...colors)+.05);ok(ratio>=4.5,'grid explicit palette meets 4.5:1');
const assets=fs.readdirSync(path.join(base,'watercolor/art'));ok(!assets.some(x=>x.endsWith('.png')),'source PNG removed from deployment');ok(assets.filter(x=>x.endsWith('.webp')).length===48,'48 standalone WebP assets');
ok(assets.reduce((n,f)=>n+fs.statSync(path.join(base,'watercolor/art',f)).size,0)<6*1024*1024,'art budget below 6 MiB');
const app=fs.readFileSync(path.join(base,'watercolor/app.js'),'utf8');ok(!/toDataURL|createElement\('canvas'\)|const tone0=tone/.test(app),'no atlas canvas crop or fragile tone interception');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');ok(html.includes('if(window.Watercolor)Watercolor.stone();else tone('),'stone called directly by existing statue turn handler');
async function serviceWorker(){
 const handlers={},stores=new Map(),offline={value:false},BASE='https://test.invalid/app/',api={};
 function cache(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return{async addAll(urls){for(const u of urls){const rel=new URL(u).pathname.slice('/app/'.length);ok(fs.existsSync(path.join(base,rel||'index.html')),'precache path exists '+rel);map.set(u,new Response('core',{status:200}));}},async match(req,opts={}){const url=typeof req==='string'?req:req.url;for(const[k,v]of map)if(k===url||(opts.ignoreSearch&&k.split('?')[0]===url.split('?')[0]))return v.clone();},async put(req,response){map.set(typeof req==='string'?req:req.url,response.clone());}};}
 const sw={URL,Response,console,caches:{open:async n=>cache(n),keys:async()=>[...stores.keys()],delete:async n=>stores.delete(n)},fetch:async()=>{if(offline.value)throw Error('offline');return new Response('network',{status:200});}};
 sw.self={location:{href:BASE+'sw.js'},addEventListener:(n,f)=>handlers[n]=f,skipWaiting:async()=>{},clients:{claim:async()=>{}}};sw.importScripts=f=>vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),sw);vm.createContext(sw);vm.runInContext(fs.readFileSync(path.join(base,'sw.js'),'utf8'),sw);
 let pending;handlers.install({waitUntil:p=>pending=p});await pending;stores.set('mindlab-4.1.0-core',new Map());stores.set('unrelated',new Map());handlers.activate({waitUntil:p=>pending=p});await pending;ok(!stores.has('mindlab-4.1.0-core')&&stores.has('unrelated'),'activation deletes only obsolete app caches');
 async function get(rel,mode='cors'){let p;handlers.fetch({request:{url:BASE+rel,method:'GET',mode},respondWith:v=>p=v});return p&&await p;}
 await get('watercolor/art/piano.webp');offline.value=true;ok((await get('watercolor/art/piano.webp')).status===200,'visited image available offline');ok((await get('watercolor/art/unvisited.webp')).status===503,'unvisited image honestly unavailable');ok((await get('assessment/dashboard.html','navigate')).status===200,'assessment page precached');ok(await get('tv/tv/index.html','navigate')===undefined,'TV transport/pages bypass service worker handling');
}
serviceWorker().then(()=>console.log(JSON.stringify({status:'passed',checks,gridContrast:ratio,scope:'source, simulated UI/storage and service worker; not browser/physical-device approval'}))).catch(e=>{console.error(e);process.exitCode=1});
