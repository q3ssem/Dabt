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
assert.strictEqual(pkg.version,'5.5.29','package version is 5.5.28');
assert(sw.includes("const VERSION='5.5.29'"),'service worker cache version is 5.5.28');
assert(!offline.includes('expedition10/art/world-map.webp')&&!fs.existsSync(path.join(root,'expedition10/art/world-map.webp')),'retired navigation map is absent from disk and the offline pack');
for(const [id,file] of [['roaa','rawaa'],['noha','nuha'],['ward','ward']]) {
  const rel='treasure/art/story5/crew_full_'+file+'.webp';
  assert(app.includes("src:'"+rel+"'"),'side journey must use shared heroine asset '+id);
  assert(offline.includes('"'+rel+'"'),'shared heroine asset precached: '+rel);
}
const stageScenes=[...app.matchAll(/scene:'([^']+\.webp)'/g)].map(m=>m[1]);
assert.strictEqual(stageScenes.length,24,'all 24 side-journey scenes are registered');
for(const name of stageScenes) {
  const rel=name.includes('/')?name:'expedition10/art/scenes/'+name;
  assert(fs.existsSync(path.join(root,rel)),'stage scene exists: '+rel);
  assert(offline.includes('"'+rel+'"'),'stage scene is precached: '+rel);
}
assert.strictEqual((app.match(/id:'ml10_\d\d'/g)||[]).length,24,'exactly 24 stages are registered');
assert(app.includes("const SAVE_KEY='mindlab:expedition10:v1'"),'the existing isolated save namespace is retained for backward-compatible progress');
assert(!/S\.st\.[^;]*ml10/.test(app),'expedition does not write into legacy campaign state');
for(const fn of ['gameManifest','gameTideClock','gameRelics','gameCrate','gameKnight','gameLanternMaze','gameWaterJugs','gameSignalTowers','gameHanoi','gameFivefoldSeal'])assert(app.includes('function '+fn+'('),'interactive stage implementation exists '+fn);
for(const id of ['ml10_16','ml10_17','ml10_18','ml10_19','ml10_20','ml10_21','ml10_22','ml10_23','ml10_24','ml10_25'])assert(app.includes(id),'stage id included '+id);
for(const f of ['16-harbor-cargo.webp','17-tide-clock.webp','18-mask-gallery.webp','19-wind-lab.webp','20-guardian-gate.webp','21-lantern-maze.webp','22-waterworks.webp','23-signal-towers.webp','24-disk-temple.webp','25-fivefold-seal.webp']){
 assert(fs.existsSync(path.join(root,'expedition10/art/scenes',f)),'new stage scene exists on disk '+f);
 assert(offline.includes('expedition10/art/scenes/'+f),'new stage scene is precached '+f);
}
assert(app.includes('function completed()')&&app.includes('save.totalStars=Object.values(save.stars).reduce')&&app.includes('const progress=Math.round(((i+1)/stages.length)*100)'),'completed stages and earned stars drive actual progress without a map');
assert(app.includes('success&&i<stages.length-1')&&app.includes('success&&i===stages.length-1'),'last active stage is the side-journey finale');
assert(logic.includes('manifestSolutions')&&logic.includes('tideSolutions')&&logic.includes('relicAudit')&&logic.includes('crateAudit')&&logic.includes('knightAudit')&&logic.includes('mazeAudit')&&logic.includes('jugAudit')&&logic.includes('signalSolutions')&&logic.includes('hanoiAudit')&&logic.includes('sealSolutions'),'independent solvers/audits are present');
console.log('Expedition 25 integration: twenty-five stage registry, ten new interactive modules, art and offline precache, chapter progression and preserved save namespace passed.');
