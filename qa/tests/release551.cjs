'use strict';
/* 5.5.1 — transparent game illustrations on every game icon (40 games) and the six skill headers. Presentation only. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const pkg=JSON.parse(read('package.json'));ok(/^5\.5\.[1-9]\d*$/.test(pkg.version),'version 5.5.x (>=5.5.1)');
ok(read('sw.js').includes("const VERSION='"+pkg.version+"'"),'cache renamed');
const app=read('ui/app.js');
const ids=JSON.parse(app.match(/const ML_GAME_ART = (\[[\s\S]*?\]);/)[1].replace(/'/g,'"'));
ok(ids.length===40&&new Set(ids).size===40,'40 games mapped once each');
// every game on the games page (30 brain + 10 discovery) — taken from the engine and discovery registries
const idx=read('index.html'),games=read('upgrade/games.js')+read('upgrade/mech.js');
for(const id of ids)ok(new RegExp("id:\\s*'"+id+"'").test(idx+games),'known game id '+id);
const cats={mem:'memory',spa:'space',log:'logic',spd:'speed',foc:'attention',flx:'flexibility'};
ok(app.includes("const ML_CAT_ART = { mem: 'memory', spa: 'space', log: 'logic', spd: 'speed', foc: 'attention', flx: 'flexibility' };"),'six skill headers mapped');
// files: WebP with an alpha channel (VP8X flag), 512×512, reasonable size
const webp=f=>{const b=fs.readFileSync(path.join(root,'ui/art/games',f+'.webp'));return {riff:b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP',vp8x:b.toString('ascii',12,16)==='VP8X',alpha:!!(b[20]&0x10),w:1+b.readUIntLE(24,3),h:1+b.readUIntLE(27,3),kb:b.length/1024}};
for(const f of [...ids,...Object.values(cats)]){const w=webp(f);ok(w.riff&&w.vp8x&&w.alpha&&w.w===512&&w.h===512&&w.kb<200,f+'.webp is a transparent 512×512 WebP under 200 KB ('+w.kb.toFixed(0)+' KB)');}
// wiring: engine glyph map filled from outside; the older 5.x icons yield to the new art
ok(/if \(typeof I === 'object' && I && id in I\) I\[id\] = `<img class="ml-art"/.test(app),'art fills the engine glyph map I[] (no engine edit)');
ok(app.includes(".filter(([id]) => !ML_GAME_ART.includes(id)).forEach("),'older brake/revspan/deduce icons do not override the new art');
const ds=read('ds/mindlab-ds.css');
ok(ds.includes('img.ml-art{display:block;width:100%;height:100%;object-fit:contain'),'art shown whole, never stretched or cropped');
ok(ds.includes(':is(.ico,.hero):has(>img.ml-art){background:none!important'),'no gradient tile behind the art');
// offline: listed for background warm-up; engines still frozen
const ctx={self:{}};vm.runInNewContext(read('offline-manifest.js'),ctx);
ok(ctx.self.MINDLAB_GAME_ART.length===46&&ctx.self.MINDLAB_GAME_ART.every(p=>fs.existsSync(path.join(root,p))),'46 illustrations available for optional offline preparation');
ok(read('sw.js').includes('...(self.MINDLAB_GAME_ART || [])')&&read('pwa.js').includes('mindlabOffline.prepareAll'),'offline illustrations remain available in the opt-in full pack');
ok(read('qa/tests/legacy.art.cjs').includes('retired games are not registered in the active engine'),'inline engine baseline is checked by the scoped legacy fingerprint test');
for(const f of ['brain_brake','brain_backward','brain_rules'])ok(fs.existsSync(path.join(root,'ui/art',f+'.webp')),'earlier art kept on disk: '+f);
console.log(JSON.stringify({status:'passed',checks,games:ids.length,skills:6},null,2));
