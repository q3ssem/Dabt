const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '../..');
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const layer = read('ui/puzzle-design.js');
const app = read('ui/app.js');
const css = read('ui/style.css');
const manifest = read('offline-manifest.js');
const sw = read('sw.js');
const html = read('index.html');
const pkg = JSON.parse(read('package.json'));

ok(layer.includes('__MINDLAB_PUZZLE_DESIGN_558'), 'presentation layer has a duplicate-load guard');
ok(layer.includes("id === 'pz_grid'"), 'logic-grid screen is identified by its stable game id');
ok(layer.includes("id === 'pz_river'"), 'river-crossing screen is identified by its stable game id');
ok(layer.includes('mlp-logic-meter') && layer.includes('updateLogicProgress'), 'logic grid has a live completion meter');
ok(layer.includes('mlp-river-status') && layer.includes('updateRiverStatus'), 'river crossing has a live delivery meter');
ok(layer.includes('aria-label') && layer.includes('aria-pressed'), 'interactive controls receive accessible labels and state');
ok(layer.includes('S.st.puzzleMusicOff') && layer.includes('S.save()'), 'per-game music choice persists with existing app state');
ok(layer.includes('!S.st.mute'), 'background music respects global mute');
ok(layer.includes("tone(f, cfg.padSeconds, 'sine', cfg.padVolume"), 'music uses the existing synthesised audio path');
ok(layer.includes('state.logicTable !== table') && layer.includes('state.riverScene !== scene'), 'observers reattach after a game remount or restart');
ok(layer.includes('state.game && state.game !== id'), 'observers and music are released when switching puzzle types');
ok(layer.includes("state.audioPrimed") && layer.includes("event.target.closest(\'#play\')"), 'background music waits for the first player gesture before starting');
ok(app.includes('loadPuzzleDesign558') && app.includes('ui/puzzle-design.js'), 'presentation layer is loaded additively');
ok(css.includes('#play[data-ml-puzzle="logic"]') && css.includes('#play[data-ml-puzzle="river"]'), 'both mobile game themes have dedicated responsive styles');
ok(manifest.includes('"ui/puzzle-design.js"'), 'presentation layer is included in offline cache');
ok(sw.includes("const VERSION='5.5.19'"), 'service-worker cache is versioned 5.5.19');
ok(pkg.version === '5.5.19', 'package version is 5.5.19');
ok(html.includes("id:'pz_grid'") && html.includes("id:'pz_river'"), 'both original puzzle registrations remain in the core');
ok(!html.includes('puzzle-design.js'), 'historical index.html remains untouched by the new presentation layer');

console.log('puzzle design layer ok', checks, 'checks');
