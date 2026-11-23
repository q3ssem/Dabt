const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
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
ok(!/puzzleMusicOff|startMusic|setInterval/.test(layer), 'the presentation layer adds no ambient music');
ok(layer.includes('state.logicTable !== table') && layer.includes('state.riverScene !== scene'), 'observers reattach after a game remount or restart');
ok(layer.includes('state.game && state.game !== id'), 'observers are released when switching puzzle types');
ok(app.includes('loadPuzzleDesign558') && app.includes('ui/puzzle-design.js'), 'presentation layer is loaded additively');
ok(css.includes('#play[data-ml-puzzle="logic"]') && css.includes('#play[data-ml-puzzle="river"]'), 'both mobile game themes have dedicated responsive styles');
ok(manifest.includes('"ui/puzzle-design.js"'), 'presentation layer is included in offline cache');
ok(sw.includes("const VERSION='5.5.30'"), 'service-worker cache is versioned 5.5.28');
ok(pkg.version === '5.5.30', 'package version is 5.5.28');
ok(html.includes("id:'pz_grid'") && html.includes("id:'pz_river'"), 'both original puzzle registrations remain in the core');
ok(!html.includes('puzzle-design.js'), 'historical index.html remains untouched by the new presentation layer');

const designsFile = 'ui/puzzle-designs-data.js';
const inventory = JSON.parse(read('legacy/inventory.json'));
const style = new Map();
const play = { dataset: {}, style: {
  setProperty: (key, value) => style.set(key, value),
  removeProperty: key => style.delete(key)
} };
const context = vm.createContext({
  window: {}, URL, RUN: {}, countdown() {}, showIntro() {}, closePlay() {},
  curGame: () => context.game,
  document: {
    baseURI: 'https://example.invalid/Dabt/',
    querySelector: selector => selector === '#play' ? play : selector === '#quit' ? {} : null
  }
});
vm.runInContext(read(designsFile), context);
vm.runInContext(read('ui/openings.js'), context);
const designs = context.window.mindlabPuzzleDesigns;
assert.deepEqual(Object.keys(designs).sort(), inventory.puzzles.map(p => p.id).sort());
ok(app.indexOf(designsFile) < app.indexOf('ui/openings.js') && manifest.includes(`"${designsFile}"`),
  'design catalog loads before opening code and is included in offline cache');
const alreadyThemed = new Set([
  'pz_river', 'pz_rush', 'pz_pipe', 'pz_flow', 'pz_tan', 'pz_tent',
  'pz_untangle', 'pz_ice', 'pz_pmirror'
]);
const boardCss = read('ui/fullscreen-puzzles.css');
const hues = new Set();
for (const { id } of inventory.puzzles) {
  const { scene, piece, tone, action, materials, reaction, board, hue } = designs[id];
  ok(Number.isInteger(hue) && hue >= 0 && hue < 360 && !hues.has(hue), `${id} has its own hue`);
  hues.add(hue);
  ok(alreadyThemed.has(id) ? board === undefined : typeof board === 'string' &&
    (board === 'parchment' || boardCss.includes(`[data-puzzle-board="${board}"]`)),
    `${id} has a playable board treatment`);
  ok([tone, action, materials, reaction].every(value => typeof value === 'string' && value.length),
    `${id} has a complete specification`);
  ok([piece, ...(scene ? [scene] : [])].every(file => fs.existsSync(path.join(root, file))),
    `${id} uses existing art`);
  context.game = { id, puz: true };
  context.showIntro();
  ok(style.get('--puzzle-hue') === String(hue) && play.dataset.puzzleBoard === board && play.dataset.puzzleTone === tone && play.dataset.puzzleIllustration === (scene ? 'scene' : 'emblem') &&
    style.get('--puzzle-piece') === `url("https://example.invalid/Dabt/${piece}")`,
    `${id} applies art through the ordinary introduction`);
}
context.game = { id: 'non-puzzle', puz: false };
context.showIntro();
ok(!Object.keys(play.dataset).length && !style.size, 'switching to a non-puzzle clears the design');
context.game = { id: 'pz_river', puz: true };
context.showIntro();
context.closePlay();
ok(!Object.keys(play.dataset).length && !style.size, 'closing a puzzle clears the design');

console.log('puzzle design layer ok', checks, 'checks');
