'use strict';
/* 5.4.8 — stability fixes found by the real-browser journey. Behaviour is checked in the shared simulated DOM
   where possible; the browser half lives in qa/browser/journey.py, challenges.py and sweep.py. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fixture=fs.readFileSync(path.join(__dirname,'storybook.interaction.cjs'),'utf8');
const boot=new Function('require','__dirname',fixture.slice(0,fixture.indexOf('const t=boot(),'))+'return boot;')(require,__dirname);
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const pkg=JSON.parse(read('package.json'));
const ver=pkg.version.split('.').map(Number);ok(ver[0]>5||ver[0]===5&&(ver[1]>4||ver[1]===4&&ver[2]>=8),'package version 5.4.8 or later ('+pkg.version+')');
ok(read('sw.js').includes("const VERSION='"+pkg.version+"'"),'service-worker caches renamed so updated scripts reach installed apps');
ok(read('index.html').includes("localStorage.getItem('miran:v2')")&&read('index.html').includes("localStorage.setItem('miran:v2'"),'save key miran:v2 unchanged');

// 1. «مستواي» froze: the theme-label observer rewrote text on every mutation it caused.
{const src=read('release54.js');let calls=0,observer=null;
 const btn=k=>({dataset:{sk:k},_t:'old',_a:'',get textContent(){return this._t},set textContent(v){this._t=v;observer&&observer.cb([{type:'childList'}]);},getAttribute(){return this._a},setAttribute(_,v){this._a=v}});
 const buttons=['dark','light','auto'].map(btn);
 const doc={documentElement:{dataset:{},},querySelector:q=>q==='#v-me'?{}:null,querySelectorAll:q=>{const m=q.match(/data-sk="(\w+)"/);return m?buttons.filter(b=>b.dataset.sk===m[1]):[]},head:{append(){}},createElement:()=>({dataset:{}}),baseURI:'http://x/'};
 class MO{constructor(cb){this.cb=m=>{if(++calls>50)throw Error('observer loop');cb(m)};observer=this}observe(){}}
 vm.runInNewContext(src,{document:doc,MutationObserver:MO,window:{},S:{st:{}},URL,requestAnimationFrame:()=>0,console});
 ok(calls<10,'theme labels settle instead of re-triggering their own observer ('+calls+' passes)');
 ok(buttons.map(b=>b.textContent).join()==='أسود,أبيض,تلقائي','theme labels still applied');}

const D0=boot().c.TreasureData,allDone=()=>Object.fromEntries(D0.stations.map(s=>[s.id,{at:1,moves:3,hints:0}]));
// 2. Older journey records restore: absent maps are filled, damaged ones are still refused.
{const t=boot(),c=t.c;
 c.S.merge({treasureV3:{version:3,done:allDone(),rewards:[0,1,2,3,4,5,6]}});
 const x=c.T7.state();
 ok(Object.keys(x.done).length===21,'older record without notes/moves/hints/work merges in (21 stations)');
 for(const k of ['notes','moves','hints','work'])ok(x[k]&&typeof x[k]==='object','filled '+k);
 const before=JSON.stringify(c.T7.state().done);
 c.S.merge({treasureV3:{version:3,done:allDone(),notes:[],rewards:[]}});
 ok(JSON.stringify(c.T7.state().done)===before,'a damaged record (wrong type) is still rejected');
 const app=read('treasure/app.js');
 ok(/DX\.validateBackup=function\(data\)\{const st=validate0\(data\);if\(st\.treasureV3\)\{fillAbsent\(st\.treasureV3\)/.test(app),'backup restore uses the same tolerant path');}

// 3. A station finished in an older save owns challenge 1, so the later challenges open.
{const t=boot({hist:[],treasureV3:{version:3,done:allDone(),work:{},notes:{},hints:{},moves:{},rewards:[]}}),x=t.c.T7.state();
 ok(D0.stations.every(s=>x.v5.ch[s.id]&&x.v5.ch[s.id][0]===true),'«الحل» star granted for every finished station');
 ok(D0.stations.filter(s=>s.gives).every(s=>x.v5.tools[s.gives]),'tools still granted on migration');
 ok(Object.keys(x.bonus).length===7&&x.rewards.length===7,'seven secrets and seals still granted');
 ok(Object.keys(x.bonus).every(k=>/^sea7_secret_[0-6]$/.test(k))&&Object.keys(x.done).every(k=>/^sea7_(\d|1\d|20)$/.test(k)),'station and secret ids unchanged');}

// 4. «أرني حركة» preview is read-only and restores only its own board.
{const b=read('treasure/boards.js');
 ok(/function moved\(ctx, next, opt = \{\}\) \{\s*if \(ctx\.demo\) return;/.test(b),'moves ignored during the preview');
 ok(/function free\(ctx, next\) \{ if \(ctx\.demo\) return;/.test(b),'free placement ignored during the preview');
 ok(b.includes('still && w[ctx.base.id] === n'),'preview restores the board only if nothing replaced it');
 ok(read('treasure/style.css').includes('.v5-board.demo{pointer-events:none}'),'preview board does not take taps');}

// 5. Settings keep their folds open across re-render.
ok(read('ui/app.js').includes("'data-fold': t }")&&read('ui/app.js').includes('if (wasOpen.has(t)) d.open = true'),'profile folds remembered');

// 6. Offline: the journey kit (board pieces, tools, seals, faces, thumbnails) is warmed in the background.
{const ctx={self:{}};vm.runInNewContext(read('offline-manifest.js'),ctx);const kit=ctx.self.MINDLAB_JOURNEY_ART;
 ok(Array.isArray(kit)&&kit.length>=80,'journey kit listed ('+kit.length+' files)');
 ok(kit.every(p=>fs.existsSync(path.join(root,p))),'every journey-kit file exists');
 ok(!kit.some(p=>/_scene\.webp$/.test(p)&&!p.includes('/thumbs/')),'large scene paintings stay on demand');
 const size=kit.reduce((n,p)=>n+fs.statSync(path.join(root,p)).size,0);ok(size<4.5*1048576,'kit under 4.5 MB ('+(size/1048576).toFixed(2)+' MB)');
 ok(!read('sw.js').includes('warm-journey')&&!read('pwa.js').includes('warm-journey')&&read('pwa.js').includes('mindlabOffline.prepareAll'),'journey and game icons are fetched on demand; full offline preparation is opt-in');
 for(const k of ['rawaa','nuha','nabd','shibl','suhail','ward','nawfal'])ok(ctx.self.MINDLAB_OFFLINE_FILES.includes('treasure/art/story5/crew_full_'+k+'.webp')&&fs.existsSync(path.join(root,'treasure/art/story5/crew_'+k+'.webp')),'original crew art kept: '+k);}

console.log(JSON.stringify({status:'passed',checks,fixes:['profile freeze','old backup restore','challenge-1 migration','read-only move preview','settings folds','offline journey kit'],saveKey:'miran:v2'},null,2));
