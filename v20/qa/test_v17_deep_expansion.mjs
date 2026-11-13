import assert from 'node:assert/strict';
import { planetaryMissions } from '../src/adventures/planet-expansion-v17.js';
import { deepCognitionGames } from '../src/games/deep-cognition-v17.js';
assert.equal(planetaryMissions.length,9,'nine planetary stations');
assert.ok(planetaryMissions.every(x=>x.length===3),'three missions per station');
assert.equal(planetaryMissions.flat().length,27);
for(const [si,missions] of planetaryMissions.entries()) for(const [mi,q] of missions.entries()) {
 assert.ok(q.title&&q.prompt&&q.hint&&q.explain,`mission ${si}-${mi} has authored fields`);
 assert.ok(q.options.length>=2&&q.correct>=0&&q.correct<q.options.length,`mission ${si}-${mi} answer index valid`);
}
assert.equal(deepCognitionGames.length,8);
const ids=new Set();
for(const g of deepCognitionGames){
 assert.ok(!ids.has(g.id),`unique game id ${g.id}`);ids.add(g.id);
 for(let level=1;level<=6;level++) for(let round=1;round<=8;round++){
  const q=g.create(level,round);
  assert.ok(q.prompt&&q.explain&&q.options.length>=2,`${g.id} returns complete question`);
  assert.ok(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.options.length,`${g.id} answer index valid`);
 }
}
console.log('PASS: V17 contains 27 planetary field missions and 8 validated cognitive practice games.');
