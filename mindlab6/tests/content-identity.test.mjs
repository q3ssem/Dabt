import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GameRegistry } from '../src/core/game-registry.js';

const root=resolve(import.meta.dirname,'..');
const folder='research/experiments/EXP-0001-dependency-inventory/results/';
const inv=JSON.parse(readFileSync(resolve(root,folder+'dependency-inventory.json'),'utf8'));
const source=JSON.parse(readFileSync(resolve(root,folder+'parsed-source-registry.json'),'utf8'));
test('Exactly 40 story stations share an engine ID with library puzzles',()=>{
 const lib=new Set(inv.library_puzzles.map(x=>x.id));
 const overlap=inv.story_stations.filter(x=>lib.has(x.id));
 assert.equal(overlap.length,40);
 assert.deepEqual(overlap.reduce((acc,r)=>(acc[r.chapter]=(acc[r.chapter]||0)+1,acc),{}),{
  palace:19,atheran:21
 });
 assert.ok(overlap.every(x=>x.id.startsWith('pz_')));
});
test('V6 registry accepts every distinct V5 game/station ID unchanged',()=>{
 const entries=[...inv.library_puzzles,...inv.story_stations,...source.brain,...source.kids];
 assert.equal(entries.length,239);
 const ids=[...new Set(entries.map(x=>x.id))];
 assert.equal(ids.length,199);
 const registry=new GameRegistry();
 for(const id of ids)registry.register({id,renderer:'dom',load:async()=>({mount:()=>({dispose(){}})})});
 assert.deepEqual(registry.list().map(x=>x.id),ids);
 assert.ok(ids.includes('pz_pclock'));
 assert.ok(ids.includes('sea7_0'));
 assert.ok(ids.includes('dx_k_letters'));
});
