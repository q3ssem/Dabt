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
const env=JSON.parse(read('ui/designs_art/river_v2/env_anchors_manifest.json'));
const stage=JSON.parse(read('ui/designs_art/river_stage1/anchors_manifest.json'));
const riverJs=read('motion/lab10.js'),riverCss=read('motion/lab10.css'),hubJs=read('ui/journey-hub.js'),hubCss=read('ui/journey-hub.css'),load=read('ui/app.js');
ok(openings.puzzles.length===80&&new Set(openings.puzzles.map(x=>x.puzzle_id)).size===80,'80 unique puzzle opening records');
ok(journey.chapters.length===4,'four journey choices');
for(const [id,n] of [['seven_seas',21],['palace',19],['atheran',21],['side',25]]){
  const c=journey.chapters.find(c=>c.id===id);
  ok(c&&c.stations.length===n,'chapter stations '+id);
}
ok(exists('ui/designs_art/journey/journey_map.png'),'illustrated unified journey map');
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

const dock=env.boat_crossing_anchors_scene_px;
const total=env.full_canvas_px.width;
const left=dock.dock_left.x/total*100,right=dock.dock_right.x/total*100;
ok(left<right&&right-left>=15,'two physically distinct river docking positions');
ok(Math.abs(left-40.116)<.05&&Math.abs(right-59.884)<.05,'river dock percentages match the original design');
ok(riverCss.includes('--rv-dock-left:40.116%')&&riverCss.includes('--rv-dock-right:59.884%'),'boat uses design coordinates');
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
for(const file of ['01_background/01_sky_and_mountains','03_water/04_water_surface','02_banks/02_bank_left','02_banks/03_bank_right','05_sky_anim/cloud_01','05_sky_anim/cloud_02','05_sky_anim/cloud_03'])
  ok(exists('ui/designs_art/river_v2/'+file+'.png'),'river scene '+file);
ok(hubCss.includes('.mlj-palace-station')&&hubCss.includes('art/series_mirrors.webp'),'illustrated Palace map has responsive station links');

/* Exercise actual chapter routing with a small DOM; no static name-only guesses. */
const called=[];
class Node {
  constructor(tag){this.tag=tag;this.dataset={};this.children=[];this.isConnected=false;this.events={};}
  set innerHTML(s){this.markup=s;if(s.includes('mlj-palace-stations')){this.slots=new Node('div');this.closeButton=new Node('button');}}
  querySelector(q){if(q==='.mlj-palace-stations')return this.slots;if(q==='.mlj-palace-close')return this.closeButton;return null;}
  querySelectorAll(q){if(q==='[data-mlj-puzzle]')return this.slots.children;if(q.startsWith('button:'))return [this.closeButton,...this.slots.children];return [];}
  setAttribute(k,v){this[k]=v;}
  append(...items){this.children.push(...items);items.forEach(x=>x.isConnected=true);}
  addEventListener(k,fn){this.events[k]=fn;}
  focus(){this.focused=true;}
  remove(){this.isConnected=false;doc.dialog=null;}
}
const tile={dataset:{legacyPuzzle:'pz_p0'},click(){called.push('puzzle');}};
const doc={readyState:'loading',activeElement:{isConnected:false},dialog:null,
  addEventListener(){},createElement:t=>new Node(t),
  querySelector:q=>q==='#mlj-palace-map'?doc.dialog:null,
  querySelectorAll:q=>q==='#v-puz [data-legacy-puzzle]'?[tile]:[],
  body:{append(modal){doc.dialog=modal;modal.isConnected=true;}}};
const win={LA:{librarySections:()=>[['قصر المرايا',Array.from({length:19},(_,i)=>({id:'pz_p'+i,name:'لغز '+(i+1)}))]]},
  T7:{map:()=>called.push('seven_seas')},
  ATHERAN_CAMPAIGN:{open:()=>called.push('atheran')},
  ML10:{renderMap:()=>called.push('side')}};
vm.runInNewContext(hubJs,{window:win,document:doc,LA:win.LA,T7:win.T7,console});
ok(typeof win.mindlabJourneyHub.openChapter==='function','chapter map dispatcher exposed for real interactions');
win.mindlabJourneyHub.openChapter('seven_seas');
win.mindlabJourneyHub.openChapter('atheran');
win.mindlabJourneyHub.openChapter('side');
ok(called.join(',')==='seven_seas,atheran,side','three available campaigns invoke their real playable maps');
win.mindlabJourneyHub.openChapter('palace');
ok(doc.dialog&&doc.dialog.slots.children.length===19,'Palace click opens modal with 19 original library stations');
doc.dialog.slots.children[0].onclick();
ok(called.at(-1)==='puzzle','Palace station launches existing puzzle engine via its library tile');
ok(!doc.dialog,'Palace closes its map before starting the puzzle');
console.log(JSON.stringify({status:'passed',checks,openings:80,chapters:4,palaceStations:19,priorityArt:board.priority7.length,riverDockPercentages:[left,right]},null,2));
