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
assert(wired('expedition10/style.css')&&wired('expedition10/logic.js')&&wired('expedition10/app.js'),'adventure chapter scripts and stylesheet are wired after existing engines');
assert(!app.includes('function renderMap()')&&!app.includes('nativeMapMode'),'obsolete map renderer is absent');
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
assert(app.includes("const SAVE_KEY='mindlab:expedition10:v1'"),'experimental chapter retains its isolated save namespace and existing first-ten progress');
assert(!/S\.st\.[^;]*ml10/.test(app),'new chapter does not write into legacy campaign state');
assert.strictEqual((app.match(/id:'ml10_\d\d'/g)||[]).length,24,'exactly twenty-four active stages are registered');
assert(!app.includes('قصر المرايا')&&!app.includes('الفصل الثاني'),'side journey neither reveals nor unlocks official chapters');
assert(app.includes('function openStations()')&&app.includes('function renderIntro(i)')&&app.includes('function renderEpilogue()'),'station folders, puzzle intro, and chapter epilogue exist');
assert(app.includes('ex10-stage-prop')&&app.includes('ex10-game-scene'),'stage-specific painterly scene and prop assets are used during play');
for(const fn of ['gamePipes','gameIce','gameNim','gameShadows'])assert(app.includes('function '+fn+'('),'interactive stage implementation exists: '+fn);
assert(logic.includes('function pipeOrientations()')&&logic.includes('function iceAudit()')&&logic.includes('function nimWinningMoves(')&&logic.includes('function shadowSolutions()')&&logic.includes('function cipherSolutions()'),'independent solvers and audits exist for stages 11–15');
assert(sw.includes("const VERSION='5.5.30'"),'service worker cache version advanced');
assert(pkg.version==='5.5.29','package version advanced');
for(const f of ['treasure/art/story5/ch3_s2_piece_stone.webp','treasure/art/story5/tool_lens.webp','treasure/art/story5/ch1_secret_letter.webp'])assert(offline.includes(f),'stage prop is included in Offline Precache: '+f);
console.log('Expedition 25 integration: 24 active scene assets, 3 main heroine assets, independent save, new solvers and offline precache passed.');
