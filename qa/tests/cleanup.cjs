'use strict';
/* Guardrails for the 2026-11-19 removal of retired content. */
const fs = require('node:fs'), assert = require('node:assert/strict'), vm = require('node:vm');
const read = file => fs.readFileSync(file, 'utf8');
const gone = [
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
assert.ok(openings.includes('function openOpening(') && openings.includes('countdown0.apply('), 'start/timer gating stays intact');
assert.ok(hub.includes('function showStationOpening(') && !hub.includes('station.openingBackground'), 'journey gate survives without background atlas');
assert.ok(!hub.includes('fit-opening-scene" style="background-image'), 'journey preplay is text-first');
const metadata = JSON.parse(read('ui/designs_art/openings/manifest.json'));
assert.equal(metadata.puzzles.length, 80);
assert.ok(metadata.puzzles.every(x=>!x.background && !x.source_rect), 'no stale manifest background references');
const data = read('ui/openings-data.js');
const records = JSON.parse(data.slice(data.indexOf('window.__MINDLAB_OPENINGS_DATA = ')+'window.__MINDLAB_OPENINGS_DATA = '.length).trim().replace(/;\s*$/,''));
assert.equal(Object.keys(records).length, 88);
assert.ok(Object.values(records).every(x=>!x.bg && !x.rect), 'all library intros text-only');
const mapSrc=read('ui/designs_art/journey/v3/stations.js');
const map=JSON.parse(mapSrc.slice(mapSrc.indexOf('window.__MINDLAB_JOURNEY_MAP = ')+'window.__MINDLAB_JOURNEY_MAP = '.length).trim().replace(/;\s*$/,''));
assert.ok(map.stations.length>=80 && map.stations.every(x=>!x.openingBackground), 'all journey stations omit unused preplay backgrounds');
const manifest = read('offline-manifest.js'), realm={self:{}};vm.runInNewContext(manifest,realm);
const all = [...realm.self.MINDLAB_OFFLINE_FILES,...realm.self.MINDLAB_JOURNEY_ART,...realm.self.MINDLAB_GAME_ART,...realm.self.MINDLAB_CORRECTION_ART,...Object.values(realm.self.MINDLAB_EXPEDITION_ART).flat()];
assert.ok(all.every(x=>!x.startsWith('hasad/') && !gone.includes(x)), 'precache must not reference removed files');
// The cache generation must have moved past the generation that still held the deleted assets.
assert.ok(/PATCH='(retired-art-cleanup-1|perf-cleanup-\d+|engines-\d+)'/.test(read('sw.js')), 'cache generation must change after deleting assets');
assert.ok(openings.includes("motion/art10/char_"),'lightweight heroine intro art retained');
assert.ok(hub.includes('ابدأ اللغز') && openings.includes('ابدأ اللغز'),'start action retained in both journeys');
console.log('MindLab cleanup passed: 80 lightweight puzzle records, 88 library intros, '+map.stations.length+' journey stations; retired assets absent.');
