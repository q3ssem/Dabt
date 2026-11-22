'use strict';
// Preserve the user's independent side journey while locating genuine duplication.
// Same material/prop or mechanic family is NOT by itself a duplicate playable puzzle.
const fs=require('node:fs'),assert=require('node:assert/strict');
const side=fs.readFileSync('expedition10/app.js','utf8');
const story=fs.readFileSync('ui/journey-story-data.js','utf8');
const metas=[...side.matchAll(/\{id:'(ml10_\d{2})',name:'([^']+)',place:'([^']+)',kind:'([^']+)'/g)];
const stages=metas.map((m,i)=>{
  const block=side.slice(m.index,metas[i+1]?.index??side.indexOf('];',m.index));
  const field=k=>block.match(new RegExp(k+":'([^']+)'"))?.[1];
  return {id:m[1],name:m[2],place:m[3],kind:m[4],
    scene:field('scene'),prop:field('prop'),objective:field('objective'),story:field('story')};
});
assert.equal(stages.length,24);
for(const key of ['id','name','scene','objective','story'])
  assert.equal(new Set(stages.map(x=>x[key])).size,24,'side journey has repeated '+key);
const source=JSON.parse(story.slice(story.indexOf(' = ')+3).trim().replace(/;\s*$/,''));
assert.deepEqual(stages.map(x=>x.id),source.expeditionStations.map(x=>x.stageId));
for(const s of stages){
  assert(fs.existsSync('expedition10/art/scenes/'+s.scene),'missing side scene '+s.id);
  assert(s.objective.length>=20,'side stage needs its own playable goal '+s.id);
  assert(s.story.length>=40,'side stage needs distinct narrative '+s.id);
}
assert(!/\bpz_[a-z0-9]+\b/.test(side),'side adventure should not directly launch library puzzle IDs');
assert(side.includes("mindlab:expedition10:v1"),'side progress remains separately saved');
const activeScene=side.slice(side.indexOf('function commonGame('),side.indexOf('function bindCommon('));
assert(activeScene.includes("data-state=\"${save.done[s.id]?'done':'open'}\""),
  'active side-journey scene must not display a locked badge');
assert(activeScene.includes("${stateBadge(save.done[s.id]?'done':'open')}"),
  'active playable stage badge must announce open or done, not locked');

const props=new Map();
for(const s of stages){
  const ids=props.get(s.prop)||[];ids.push(s.id);props.set(s.prop,ids);
}
const shared=[...props.values()].filter(ids=>ids.length>1).map(ids=>ids.join('/')).sort();
assert.deepEqual(shared,['ml10_06/ml10_18','ml10_07/ml10_17','ml10_10/ml10_20'],
  'audit the three documented shared painted prop assets; do not confuse prop reuse with copied gameplay');
console.log('JAZIRAN_SIDE_IDENTITY=passed: 24 stage IDs/names/scenes/objectives/stories distinct, no direct library puzzle calls, 3 shared prop illustrations documented.');
