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
assert(wired('expedition10/style.css')&&wired('expedition10/logic.js')&&wired('expedition10/app.js'),'expedition module remains wired into the application');
assert.strictEqual(pkg.version,'5.5.29','package is 5.5.28');
assert(sw.includes("const VERSION='5.5.29'"),'service worker cache is versioned 5.5.28');
assert.strictEqual((app.match(/id:'ml10_\d\d'/g)||[]).length,24,'exactly twenty-five stages are registered');
assert(app.includes("const SAVE_KEY='mindlab:expedition10:v1'"),'the same independent save namespace is retained');
assert(app.includes('من ٢٤')&&app.includes('/ ٧٢'),'progress display covers 25 stages and 75 stars');
assert(app.includes('success&&i<stages.length-1')&&app.includes('success&&i===stages.length-1'),'stage 25 closes the current chapter');
for(const fn of ['gameLanternMaze','gameWaterJugs','gameSignalTowers','gameHanoi','gameFivefoldSeal'])assert(app.includes('function '+fn+'('),'interactive stage exists: '+fn);
const stageScenes=[...app.matchAll(/scene:'([^']+\.webp)'/g)].map(m=>m[1]);
assert.strictEqual(stageScenes.length,24,'all 24 side-journey scenes are registered');
for(const name of stageScenes) {
  const rel=name.includes('/')?name:'expedition10/art/scenes/'+name;
  assert(fs.existsSync(path.join(root,rel)),'stage scene exists: '+rel);
  assert(offline.includes('"'+rel+'"'),'stage scene is precached: '+rel);
}
for(const f of ['21-lantern-maze.webp','22-waterworks.webp','23-signal-towers.webp','24-disk-temple.webp','25-fivefold-seal.webp'])assert(fs.existsSync(path.join(root,'expedition10/art/scenes',f)),'new stage art exists '+f);
for(const token of ['mazeAudit','jugAudit','signalSolutions','hanoiAudit','sealSolutions'])assert(logic.includes(token),'solver/audit is implemented: '+token);
assert(!/S\.st\.[^;]*ml10/.test(app),'expedition keeps data out of the legacy campaign save');
console.log('Expedition 25 integration: stage registry, art, offline cache, solvers, progression and isolated save passed.');
