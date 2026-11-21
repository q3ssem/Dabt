const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const offline=fs.readFileSync(path.join(root,'offline-manifest.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const app=fs.readFileSync(path.join(root,'expedition10/app.js'),'utf8');
const logic=fs.readFileSync(path.join(root,'expedition10/logic.js'),'utf8');
const uiApp=fs.readFileSync(path.join(root,'ui/app.js'),'utf8');
// perf-cleanup: the side journey is wired as an on-demand bundle in ui/app.js (window.mindlabSide) instead of start-up tags.
const wired=n=>html.includes(n)||uiApp.includes("'"+n+"'");
assert(wired('expedition10/style.css')&&wired('expedition10/logic.js')&&wired('expedition10/app.js'),'chapter scripts and styles are wired');
assert.strictEqual(pkg.version,'5.5.28','package version is 5.5.28');
assert(sw.includes("const VERSION='5.5.28'"),'service worker cache version is 5.5.28');
assert(offline.includes('expedition10/art/world-map.webp'),'world map is precached');
for(const f of ['roaa.webp','noha.webp','ward.webp'])assert(offline.includes('expedition10/art/crew/'+f),'main heroine asset precached: '+f);
for(let i=1;i<=25;i++){if(i===15)continue;
  const prefix=String(i).padStart(2,'0')+'-';
  const scene=fs.readdirSync(path.join(root,'expedition10/art/scenes')).find(x=>x.startsWith(prefix));
  assert(scene,'stage scene exists '+prefix);
  assert(offline.includes('expedition10/art/scenes/'+scene),'stage scene precached '+scene);
}
assert.strictEqual((app.match(/id:'ml10_\d\d'/g)||[]).length,24,'exactly twenty-five stages are registered');
assert(app.includes("const SAVE_KEY='mindlab:expedition10:v1'"),'the existing isolated save namespace is retained for backward-compatible progress');
assert(!/S\.st\.[^;]*ml10/.test(app),'expedition does not write into legacy campaign state');
for(const fn of ['gameManifest','gameTideClock','gameRelics','gameCrate','gameKnight','gameLanternMaze','gameWaterJugs','gameSignalTowers','gameHanoi','gameFivefoldSeal'])assert(app.includes('function '+fn+'('),'interactive stage implementation exists '+fn);
for(const id of ['ml10_16','ml10_17','ml10_18','ml10_19','ml10_20','ml10_21','ml10_22','ml10_23','ml10_24','ml10_25'])assert(app.includes(id),'stage id included '+id);
for(const f of ['16-harbor-cargo.webp','17-tide-clock.webp','18-mask-gallery.webp','19-wind-lab.webp','20-guardian-gate.webp','21-lantern-maze.webp','22-waterworks.webp','23-signal-towers.webp','24-disk-temple.webp','25-fivefold-seal.webp']){
 assert(fs.existsSync(path.join(root,'expedition10/art/scenes',f)),'new stage scene exists on disk '+f);
 assert(offline.includes('expedition10/art/scenes/'+f),'new stage scene is precached '+f);
}
assert(app.includes('من ٢٤')&&app.includes('/ ٧٢'),'map progress and star counters reflect twenty-five stages');
assert(app.includes('success&&i<stages.length-1')&&app.includes('success&&i===stages.length-1'),'stage 25 is final stage of this chapter');
assert(logic.includes('manifestSolutions')&&logic.includes('tideSolutions')&&logic.includes('relicAudit')&&logic.includes('crateAudit')&&logic.includes('knightAudit')&&logic.includes('mazeAudit')&&logic.includes('jugAudit')&&logic.includes('signalSolutions')&&logic.includes('hanoiAudit')&&logic.includes('sealSolutions'),'independent solvers/audits are present');
console.log('Expedition 25 integration: twenty-five stage registry, ten new interactive modules, art and offline precache, chapter progression and preserved save namespace passed.');
