'use strict';
/* Guardrails for the 2026-11-19 removal of retired content. */
const fs = require('node:fs'), assert = require('node:assert/strict'), vm = require('node:vm');
const read = file => fs.readFileSync(file, 'utf8');
const gone = [
  'docs/SCENE_ASSET_SPEC_AR.md',
  'qa/source_http_4_2.json',
  'qa/assets_4_2.json', 'qa/npm_test_4_2.txt', 'qa/browser/result_4_2.txt',
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
const uniqueAssets = [...new Set(all.filter(file => file && file !== './'))];
const missingAssets = uniqueAssets.filter(file => !fs.existsSync(file));
assert.deepEqual(missingAssets, [], 'all optional offline pack resources must exist');
assert.ok(!read('ui/app.js').includes('ui/engines/scene-kit.js'), 'unneeded engine loader removed from startup');
assert.ok(!read('offline-manifest.js').includes('ui/engines/scene-kit.js'), 'unused renderer loader removed from precache');
for (const dead of ['ui/engines/scene-kit.js', ...['flow','ice','pipe','rush','tan','untangle'].map(id=>'ui/engines/scenes/pz_'+id+'.json'), 'vendor/pixi/pixi.min.js', 'vendor/konva/konva.min.js']) assert.ok(!fs.existsSync(dead), 'unused external scene runtime removed: '+dead);
assert.ok(!read('sw.js').includes('warm-journey'), 'no redundant warm-journey service');
assert.ok(!read('pwa.js').includes('warm-journey'), 'opening the journey must not queue unrelated art');
assert.ok(!fs.existsSync('qa/browser/stat_pixi.py'), 'removed statue-only browser test absent');
assert.ok(!read('ui/journey-hub.css').includes('pz_stat'), 'deleted statue artwork not referenced by journey CSS');
assert.ok(!read('motion/lab10.css').includes('.st10'), 'deleted statue engine CSS removed');
assert.ok(!read('ui/fullscreen-puzzles.css').includes('.st10'), 'deleted statue full-screen styles removed');
assert.ok(!read('qa/browser/design10_play.py').includes('pz_stat'), 'deleted design replay removed');
assert.ok(!read('qa/browser/motion_batch_fixes.py').includes('pz_xbottle'), 'deleted bottle replay removed');

// The cache generation must have moved past the generation that still held the deleted assets.
assert.ok(read('sw.js').includes("const VERSION='"+require('../../package.json').version+"'") && read('sw.js').includes("PATCH='map-free-2'"), 'cache generation includes the current release and retired-map cleanup');
const pwa = read('pwa.js');
assert.ok(pwa.includes('window.mindlabOffline.prepareAll = function prepareAll()'), 'offline bulk download must be opt-in');
assert.ok(pwa.includes('window.mindlabOffline.clearOptionalCaches'), 'optional image cache cleanup available');
assert.ok(pwa.includes("progressPort?.postMessage({type:'cancel'})"), 'stopping optional preload must cancel the worker job');
assert.ok(pwa.includes('skip.hidden = false'), 'manual download has a visible stop control');
const swSource = read('sw.js');
assert.ok(swSource.includes('pendingFetches') && swSource.includes('controller.abort()'), 'worker cancels active downloads');
assert.ok(swSource.includes('++imageWrites % 32 === 0'), 'image eviction scan is not repeated for every image');


const runtime = read('sw.js');
const startUi = read('ui/app.js');
assert.ok(runtime.includes("PATCH='map-free-2'"), 'reviewed cache generation differs from pre-cleanup builds');
const shell = runtime.slice(runtime.indexOf('const shell = ['), runtime.indexOf('];', runtime.indexOf('const shell = ['))+2);
const listed = [...shell.matchAll(/'([^']+)'/g)].map(m=>m[1]);
assert.equal(listed.length,19,'core shell includes 11 startup resources and 8 assessment dependencies');
assert.ok(listed.includes('ui/tide-scroll.css'),'responsive tide-hour stylesheet remains in offline startup shell');
assert.ok(listed.every(file=>fs.existsSync(file)),'core shell resources exist');
assert.ok(!startUi.includes('idle(startSide)'), 'side journey never loads automatically');
assert.ok(!startUi.includes("document.addEventListener('pointerdown', start"), 'unrelated taps do not preload play bundle');
assert.ok(startUi.includes("if (target === 'puz') start()"), 'puzzle tab requests its dependencies on demand');

assert.ok(!read('legacy/art.js').match(/\['pz_river','pz_rush','pz_stat'/), 'retired statue not shown in library section');
assert.ok(!read('ui/fit.css').includes('pz_xbottle'), 'retired bottle CSS must be gone');
assert.ok(!read('motion/correction-art.css').includes('pz_xbottle'), 'retired bottle correction CSS must be gone');
assert.ok(!read('qa/browser/authored_stages.py').includes("'pz_stat':"), 'retired statue browser stage test removed');
assert.ok(!read('qa/browser/perf_bench.py').includes('pz_stat,pz_'), 'retired statue performance scenario removed');
assert.ok(openings.includes("treasure/art/story5/crew_full_"),'lightweight heroine intro art retained');
assert.ok(hub.includes('إغلاق القواعد') && openings.includes('إغلاق القواعد'),'rules can be dismissed in both journeys');
assert.ok(JSON.parse(read('package.json')).scripts.test.includes('node qa/tests/journey-transitions.cjs'), 'journey integrity gate must run in npm test');
// Preserve the actual, dynamically generated gameplay art. In wreck-painted.js
// the filename is assembled from the puzzle state, not present as a full literal.
const wreckSource = read('motion/wreck-painted.js');
assert.ok(wreckSource.includes("sprite('hold/' + type)") &&
          wreckSource.includes("sprite(scene + '/player')"),
          'wrecker dynamically resolves its hold scene and interactive sprites');
for (const asset of ['scene','player','barrel','door','hatch','key','lever'])
  assert.ok(fs.existsSync('motion/pirate-revised/hold/'+asset+'.webp'),
    'retain active dynamically selected wreck illustration '+asset);

// All work_review images are active. Two large visual layers plus corrections
// reference them via CSS and must never be swept based on directory naming.
const reviewRoot='ui/designs_art/work_review';
const reviewFiles=[];
function walkReview(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const name=dir+'/'+ent.name;
    if(ent.isDirectory()) walkReview(name);
    else if(/\.(?:png|webp)$/.test(ent.name)) reviewFiles.push(name);
  }
}
walkReview(reviewRoot);
const paintedCSS=['motion/expedition-art.css','motion/correction-art.css',
                  'motion/lab10.css','motion/adventure35.css'].map(read).join('\n');
assert.equal(reviewFiles.length,372,'review artwork remains complete after safe cleanup');
for(const asset of reviewFiles)
  assert.ok(paintedCSS.includes(asset),'active painted asset must have a CSS consumer: '+asset);


// Assets consolidated across campaign and side journey have identical Git
// object hashes. The side journey must reuse the canonical campaign files
// rather than keep another 15 full image copies.
const expeditionSource=read('expedition10/app.js');
const duplicates=[
  ['01-lighthouse.webp','ch1_s3_scene.webp'],
  ['02-river.webp','ch3_s3_scene.webp'],
  ['03-map.webp','ch2_s2_scene.webp'],
  ['04-balance.webp','ch3_s2_scene.webp'],
  ['05-crystal.webp','ch2_s3_scene.webp'],
  ['06-mirror.webp','ch4_s3_scene.webp'],
  ['07-hourglass.webp','ch5_s2_scene.webp'],
  ['08-islands.webp','ch6_s3_scene.webp'],
  ['09-library.webp','ch7_s2_scene.webp'],
  ['10-heart.webp','ch7_s3_scene.webp'],
  ['12-ice.webp','ch4_s2_scene.webp'],
  ['13-dragon.webp','ch6_s2_scene.webp']
];
for(const [oldName,sharedName] of duplicates){
  const former='expedition10/art/scenes/'+oldName;
  const canonical='treasure/art/story5/'+sharedName;
  assert.ok(!fs.existsSync(former),'retired duplicated side art returned '+former);
  assert.ok(fs.existsSync(canonical),'campaign art must remain available '+canonical);
  assert.ok(expeditionSource.includes("scene:'"+canonical+"'"),'side stage points to shared image '+canonical);
  assert.ok(manifest.includes('"'+canonical+'"'),'offline pack contains shared image '+canonical);
}
for(const [oldName,sharedName] of [['roaa','rawaa'],['noha','nuha'],['ward','ward']]){
  const former='expedition10/art/crew/'+oldName+'.webp';
  const canonical='treasure/art/story5/crew_full_'+sharedName+'.webp';
  assert.ok(!fs.existsSync(former),'retired copied heroine '+former);
  assert.ok(fs.existsSync(canonical),'shared heroine still exists '+canonical);
  assert.ok(expeditionSource.includes("src:'"+canonical+"'"),'side journey uses canonical heroine '+canonical);
  assert.ok(manifest.includes('"'+canonical+'"'),'offline pack includes shared heroine '+canonical);
}
assert.ok(expeditionSource.includes("const scenePaths=st=>st.scene.includes('/')?st.scene:SC+st.scene;"),
  'scene path resolver handles both original short names and shared full paths');

// Scan production code and asset metadata, not just the side-journey module:
// the same background can also appear in a library card or story thumbnail.
// This protects against deleting an image while a secondary view still loads it.
const staleScenePaths=duplicates.map(([oldName])=>'expedition10/art/scenes/'+oldName);
const staleCrewPaths=['roaa','noha','ward'].map(name=>'expedition10/art/crew/'+name+'.webp');
const retiredPaths=[...staleScenePaths,...staleCrewPaths];
const runtimeFiles=['index.html','offline-manifest.js','sw.js','pwa.js'];
function walkRuntime(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const name=dir+'/'+ent.name;
    if(ent.isDirectory()) walkRuntime(name);
    else if(/\.(?:js|css|json|html|csv|webmanifest)$/.test(ent.name)) runtimeFiles.push(name);
  }
}
for(const dir of ['ui','motion','expedition10','treasure','atheran','legacy',
                  'watercolor','ds','audio','upgrade','assessment','tv'])
  if(fs.existsSync(dir)) walkRuntime(dir);
const staleReferences=[];
for(const path of runtimeFiles){
  const source=read(path);
  for(const stale of retiredPaths) if(source.includes(stale))
    staleReferences.push(path+' -> '+stale);
}
assert.deepEqual(staleReferences,[],
  'retired duplicate art cannot remain referenced by production views');


console.log('MindLab cleanup passed: 78 lightweight puzzle records, 86 library intros, '+map.stations.length+' journey stations; retired assets absent.');
