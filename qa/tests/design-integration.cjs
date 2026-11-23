'use strict';
/* Regression gate for Gemini 5.5.28 design bindings:
   real asset paths, chapter dispatch, Palace launch, river dock/travel structure.
   The separate Playwright smoke confirms movement in a browser. */
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const exists=p=>fs.existsSync(path.join(ROOT,p));
let checks=0;
const ok=(v,why)=>{assert.ok(v,why);checks++;};
const journey=JSON.parse(read('ui/designs_art/journey/manifest.json'));
const openings=JSON.parse(read('ui/designs_art/openings/manifest.json'));
const boardSource=read('ui/board-art-data.js');
const board=JSON.parse(boardSource.slice(boardSource.indexOf('{'),boardSource.lastIndexOf('}')+1));
const stage=JSON.parse(read('ui/designs_art/river_stage1/anchors_manifest.json'));
const riverJs=read('motion/lab10.js'),riverCss=read('motion/lab10.css'),hubJs=read('ui/journey-hub.js'),hubCss=read('ui/journey-hub.css'),load=read('ui/app.js');
ok(openings.puzzles.length===78&&new Set(openings.puzzles.map(x=>x.puzzle_id)).size===78,'78 current puzzle opening records');
ok(journey.chapters.length===4,'four journey choices');
ok(journey.chapters.every(c=>!('x' in c)&&!('y' in c)),'retired navigation coordinates removed from the design manifest; sprite transition crops are independent');
for(const [id,n] of [['seven_seas',21],['palace',19],['atheran',21],['side',24]]){
  const c=journey.chapters.find(c=>c.id===id);
  ok(c&&c.stations.length===n,'chapter stations '+id);
}
ok(exists('ui/designs_art/journey/v3/chapters/ch1_seven_seas.webp'),'illustrated chapter selector');
ok(exists('ui/designs_art/journey/transitions_atlas.png'),'illustrated journey transitions');
ok(exists('ui/art/series_mirrors.webp'),'Palace chapter artwork');
ok(board.priority7.length>=50,'priority art bindings are registered');
for(const asset of board.priority7)ok(exists(asset.path),'priority art missing: '+asset.path);
for(const [id,rec] of Object.entries(board.fourPuzzles)){
  function walk(v){if(typeof v==='string'&&/\.(png|webp|svg)$/.test(v))ok(exists(v),'board '+id+' missing '+v);
    else if(v&&typeof v==='object')Object.values(v).forEach(walk);}
  walk(rec);
}
ok(load.includes('ui/journey-hub.js')&&load.includes('motion/lab10.js'),'design runtime scripts are loaded');
ok(load.includes('ui/board-art-data.js')&&load.includes('ui/openings-data.js'),'board and opening registries are loaded');

const currentRiver=read('motion/stages60/play.css');
ok(currentRiver.includes('river-day.webp')&&currentRiver.includes('--dock'), 'current river uses the shared painting and moving dock coordinates');
ok(riverCss.includes('.rv10:not(.at1).sail .rv10-boat')&&riverCss.includes('.rv10.at1.sail .rv10-boat'),'CSS supplies movement in both directions');
ok(riverJs.includes('classList.add('+"'sail'"+')')&&riverJs.includes('classList.remove('+"'sail'"+')'),'board transitions in and out of sailing state');
ok(riverJs.includes('data-slot="boat"')&&riverJs.includes('class="rv10-water"')&&
   riverJs.indexOf('class="rv10-boat"')>riverJs.indexOf('class="rv10-bank goal"'),
   'boat is positioned in the whole scene rather than inside narrow water cell');
ok(riverJs.includes('const t = s ^ F ^ m'),'original move generator and crossing rules remain');
ok(stage.boat_local_anchors_px.passenger_cargo_slot.x===102,'boat passenger seat aligned to supplied asset');
for(const direction of ['go','return'])
  for(const name of ['boat_shadow','boat_hull','farmer','boat_oar','fx_wake']){
    const folder=name==='fx_wake'?'04_effects':'02_boat_and_farmer';
    ok(exists('ui/designs_art/river_stage1/'+folder+'/'+name+'_'+direction+'.png'),'boat movement layer '+name+'_'+direction);
  }
for(const animal of ['wolf','sheep','grass'])
  for(const pose of ['bank','boarding','seated']){
    ok(exists('ui/designs_art/river_stage1/03_passengers/'+animal+'_'+pose+'.png'),'passenger '+animal+'_'+pose);
  }
ok(exists('motion/adventure35/river-day.webp'),'current river painting');
ok(exists('ui/designs_art/journey/v3/chapters/ch2_mirror_palace.webp'),'illustrated Palace chapter selector');

/* Runtime acceptance for navigation is exercised in Chromium/WebKit; this
   build gate rejects abandoned map launchers and checks the canonical counts. */
const stationScript=read('ui/designs_art/journey/v3/stations.js');
const stationData=JSON.parse(stationScript.slice(stationScript.indexOf(' = ')+3).trim().replace(/;\s*$/,''));
const storyScript=read('ui/journey-story-data.js');
const storyData=JSON.parse(storyScript.slice(storyScript.indexOf(' = ')+3).trim().replace(/;\s*$/,''));
new vm.Script(hubJs,{filename:'ui/journey-hub.js'});
for(const [id,n] of [['seven_seas',21],['palace',19],['atheran',21],['side',24]])
 ok(stationData.stations.filter(s=>s.chapter===id).length===n,'map-free chapter stage count '+id);
ok(stationData.stations.every(s=>!('x' in s)&&!('y' in s)&&!('clusterGroup' in s)),'obsolete map coordinates are removed');
ok(!('clusters' in stationData)&&!('viewports' in stationData),'map-only clusters/viewports removed');
ok(!('mapImage' in storyData),'narrative retains no world-map dependency');
ok(storyData.chapterOrder.join(',')==='seven_seas,palace,atheran','official chapter story order');
ok(hubJs.includes('function mountStationFolders()')&&hubJs.includes('function openChapters('),'one functional folder navigation');
ok(!/function (?:openPalaceMap|mountLegacyHub|mountUnifiedHub)/.test(hubJs),'legacy map controllers deleted');
ok(!/mlj-v3-pin|mlj-palace-map|world_map_vertical/.test(hubJs),'no map pins or assets rendered');
ok(hubJs.includes("(id==='side'?sideGrid:grid).append(b)"),'side journey visibly separated');
ok(hubJs.includes('canOpenStation(i)')&&hubJs.includes('ML10?.unlocked(i)')&&hubJs.includes('T7?.unlocked(i)'),'native Atheran/side/sea locks still enforced');
ok(!hubCss.includes('.mlj-palace-station')&&!hubCss.includes('world_map_vertical'),'retired Palace and world atlas styles absent');
console.log(JSON.stringify({status:'passed',checks,openings:78,chapters:4,stations:85,priorityArt:board.priority7.length},null,2));
