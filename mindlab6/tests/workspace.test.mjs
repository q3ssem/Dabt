import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Research registry is coherent and every reference resolves',()=>{
  const registry=JSON.parse(read('research/REGISTRY.json'));
  const ids=registry.experiments.map(e=>e.id);
  assert.equal(ids.length,new Set(ids).size,'experiment IDs unique');
  assert.ok(ids.includes(registry.current),'active experiment is indexed');
  for(const e of registry.experiments){
    assert.match(e.id,/^EXP-\d{4}$/);
    assert.ok(fs.existsSync(new URL('../'+e.path,import.meta.url)));
  }
});
test('Current task, source baseline and session handoff agree',()=>{
  const state=JSON.parse(read('PROJECT_STATE.json'));
  const registry=JSON.parse(read('research/REGISTRY.json'));
  const task=read('handoff/CURRENT_TASK.md');
  const start=read('START_HERE.md');
  assert.equal(state.current_experiment,registry.current);
  assert.ok(task.includes(registry.current));
  assert.ok(task.includes(state.source_baseline.commit));
  assert.ok(start.includes(state.branch));
  assert.equal(state.source_baseline.read_only,true);
  assert.equal(state.boundaries.main_untouched,true);
});
test('Foundation does not claim migrated games',()=>{
  const state=JSON.parse(read('PROJECT_STATE.json'));
  assert.deepEqual(
    [state.content_status.brain_games_migrated,state.content_status.puzzles_migrated,state.content_status.story_stations_migrated,state.content_status.child_games_migrated],
    [0,0,0,0]
  );
  assert.ok(read('index.html').includes('لم نُدخل'));
});
test('Experiment generator allocates a safe next number without changing files',()=>{
  const registryBefore=read('research/REGISTRY.json');
  const out=execFileSync(process.execPath,[new URL('../tools/new-experiment.mjs',import.meta.url).pathname,'اختبار توليد الأبحاث','preview-only','--dry-run'],{encoding:'utf8'});
  const r=JSON.parse(registryBefore);
  const next=Math.max(...r.experiments.map(e=>Number(e.id.slice(4))))+1;
  assert.ok(out.includes('DRY_RUN EXP-'+String(next).padStart(4,'0')));
  assert.equal(read('research/REGISTRY.json'),registryBefore);
});
test('Workspace checks pass independently',()=>{
  const out=execFileSync(process.execPath,[new URL('../tools/check-workspace.mjs',import.meta.url).pathname],{encoding:'utf8'});
  assert.match(out,/workspace PASS/);
});
