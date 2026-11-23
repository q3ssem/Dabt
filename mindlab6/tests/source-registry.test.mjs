import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const source='7327fdc6c6f36deaf63a2b20a7b6db9a315ad446';
const where='research/experiments/EXP-0001-dependency-inventory/results/parsed-source-registry.json';
const stored=readFileSync(resolve(root,where),'utf8');
const report=JSON.parse(stored);
function git(path){return execFileSync('git',['show',source+':'+path],{
 cwd:resolve(root,'..'),encoding:'utf8',maxBuffer:12*1024*1024
});}
test('Pinned source scanner deterministically reproduces the committed candidate snapshot',()=>{
 const generated=execFileSync(process.execPath,['tools/audit-v5-catalog.mjs','--json'],
  {cwd:root,encoding:'utf8',maxBuffer:12*1024*1024});
 assert.equal(generated,stored);
});
test('Source has 42 brain declarations and 26 unique child registrations',()=>{
 assert.equal(report.source_commit,source);
 assert.equal(report.status,'static-source-registration-candidates-not-runtime-verified');
 assert.equal(report.counts.brain,42);
 assert.equal(report.counts.kids,26);
 assert.deepEqual(report.duplicates,{brain:[],kids:[]});
 assert.deepEqual(report.unresolved_child_registration_sites,[]);
 for(const r of [...report.brain,...report.kids]){
   assert.ok(r.source_line>0);
   assert.ok(['index.html','upgrade/games.js'].includes(r.source_file));
   assert.ok(r.id&&r.evidence_kind==='literal-array');
 }
});
test('All 40 brain-art IDs match engine source; delay and tol are extra special entries',()=>{
 const sourceUI=git('ui/app.js');
 const list=sourceUI.match(/const ML_GAME_ART = (\[[\s\S]*?\]);/);
 assert.ok(list);
 const visual=[...list[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
 assert.equal(visual.length,40);
 const declared=new Set(report.brain.map(r=>r.id));
 assert.ok(visual.every(id=>declared.has(id)));
 assert.deepEqual([...declared].filter(id=>!visual.includes(id)).sort(),['delay','tol']);
});
test('Children registry uses real IDs, not the presentation-only 26 artwork names',()=>{
 const idList=report.kids.map(x=>x.id);
 assert.ok(idList.includes('k_mem'));
 assert.ok(idList.includes('dx_k_letters'));
 assert.ok(idList.includes('k_go'));
 assert.equal(new Set(idList).size,26);
});
