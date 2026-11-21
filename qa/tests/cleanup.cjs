'use strict';
/* Guardrails for the 2026-11-19 removal of retired content. */
const fs = require('node:fs'), assert = require('node:assert/strict'), vm = require('node:vm');
const read = file => fs.readFileSync(file, 'utf8');
const gone = [
  'ui/designs_art/work_review/pz_river/river-base--light.webp',
  'ui/designs_art/work_review/pz_river/river-base--dark-corrected.webp',
  'hasad/data.js', 'hasad/engine.js', 'hasad/game.js', 'hasad/style.css',
  'qa/tests/hasad.integration.cjs', 'ui/designs_art/journey/v3/games/hasad.webp',
  'ui/designs_art/river_stage1/05_opening_and_icon/05_opening_scene.png',
  'ui/designs_art/journey/v3/openings/bg_coral_sea.webp',
  'ui/designs_art/journey/v3/openings/bg_mirror_palace.webp',
  'ui/designs_art/journey/v3/openings/bg_atheran_ruins.webp',
  ...Array.from({length:8},(_,i)=>'ui/designs_art/openings/batch'+String(i+1).padStart(2,'0')+'.png')
];
for (const file of gone) assert.ok(!fs.existsSync(file), 'retired file still in release: '+file);
assert.ok(!fs.existsSync('hasad'), 'Hasad data directory must be absent');
const ui = read('ui/app.js'), openings = read('ui/openings.js'), hub = read('ui/journey-hub.js');
assert.ok(!ui.includes('loadHasadLayer') && !ui.includes('hasad/data.js'), 'Hasad must not be eagerly loaded');
assert.ok(!read('package.json').includes('hasad.integration.cjs'), 'retired Hasad test must be removed');
assert.ok(!openings.includes('entry.bg') && !openings.includes('bgUrl'), 'no large opening background in library');
assert.ok(openings.includes('function openOpening(') && openings.includes('oldCountdown.apply('), 'start/timer gating stays intact');
assert.ok(hub.includes('function showStationOpening(') && !hub.includes('station.openingBackground'), 'journey gate survives without background atlas');
assert.ok(!hub.includes('fit-opening-scene" style="background-image'), 'journey preplay is text-first');
const metadata = JSON.parse(read('ui/designs_art/openings/manifest.json'));
assert.equal(metadata.puzzles.length, 78);
assert.ok(metadata.puzzles.every(x=>!x.background && !x.source_rect), 'no stale manifest background references');
const data = read('ui/openings-data.js');
const records = JSON.parse(data.slice(data.indexOf('window.__MINDLAB_OPENINGS_DATA = ')+'window.__MINDLAB_OPENINGS_DATA = '.length).trim().replace(/;\s*$/,''));
assert.equal(Object.keys(records).length, 86);
assert.ok(Object.values(records).every(x=>!x.bg && !x.rect), 'all library intros text-only');
const mapSrc=read('ui/designs_art/journey/v3/stations.js');
const map=JSON.parse(mapSrc.slice(mapSrc.indexOf('window.__MINDLAB_JOURNEY_MAP = ')+'window.__MINDLAB_JOURNEY_MAP = '.length).trim().replace(/;\s*$/,''));
assert.ok(map.stations.length>=80 && map.stations.every(x=>!x.openingBackground), 'all journey stations omit unused preplay backgrounds');
const manifest = read('offline-manifest.js'), realm={self:{}};vm.runInNewContext(manifest,realm);
const all = [...realm.self.MINDLAB_OFFLINE_FILES,...realm.self.MINDLAB_JOURNEY_ART,...realm.self.MINDLAB_GAME_ART,...realm.self.MINDLAB_CORRECTION_ART,...Object.values(realm.self.MINDLAB_EXPEDITION_ART).flat()];
assert.ok(all.every(x=>!x.startsWith('hasad/') && !gone.includes(x)), 'precache must not reference removed files');
// The cache generation must have moved past the generation that still held the deleted assets.
assert.ok(read('sw.js').includes("PATCH='on-demand-assets-12'"), 'cache generation must change after deleting assets');
const pwa = read('pwa.js');
assert.ok(pwa.includes('window.mindlabOffline.prepareAll = function prepareAll()'), 'offline bulk download must be opt-in');
assert.ok(pwa.includes('window.mindlabOffline.clearOptionalCaches'), 'optional image cache cleanup available');
assert.ok(!read('legacy/art.js').match(/\['pz_river','pz_rush','pz_stat'/), 'retired statue not shown in library section');
assert.ok(!read('ui/fit.css').includes('pz_xbottle'), 'retired bottle CSS must be gone');
assert.ok(!read('motion/correction-art.css').includes('pz_xbottle'), 'retired bottle correction CSS must be gone');
assert.ok(!read('qa/browser/authored_stages.py').includes("'pz_stat':"), 'retired statue browser stage test removed');
assert.ok(!read('qa/browser/perf_bench.py').includes('pz_stat,pz_'), 'retired statue performance scenario removed');
assert.ok(openings.includes("treasure/art/story5/crew_full_"),'lightweight heroine intro art retained');
assert.ok(hub.includes('إغلاق القواعد') && openings.includes('إغلاق القواعد'),'rules can be dismissed in both journeys');
console.log('MindLab cleanup passed: 78 lightweight puzzle records, 86 library intros, '+map.stations.length+' journey stations; retired assets absent.');
