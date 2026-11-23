import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const file='research/experiments/EXP-0001-dependency-inventory/results/asset-evidence.json';
const stored=readFileSync(resolve(root,file),'utf8'),report=JSON.parse(stored);
test('Pinned 5.5.30 candidate asset audit matches reproducible source evidence',()=>{
 const check=execFileSync(process.execPath,['tools/audit-v5-assets.mjs','--json'],
  {cwd:root,encoding:'utf8',maxBuffer:5*1024*1024});
 assert.equal(check,stored);
});
test('All 258 candidate art paths exist on the fixed V5 source commit',()=>{
 assert.equal(report.source_commit,'7327fdc6c6f36deaf63a2b20a7b6db9a315ad446');
 assert.equal(report.total_candidates,258);
 assert.deepEqual(report.counts,{'exists-at-source-sha':258});
 assert.deepEqual(Object.fromEntries(Object.entries(report.by_kind).map(([k,v])=>[k,v['exists-at-source-sha']])),{
  'library-puzzle':168,'story-station':24,'brain-art':40,'kid-art-name':26
 });
 assert.ok(report.candidates.every(x=>x.existence==='exists-at-source-sha'));
 const keys=report.candidates.map(x=>x.kind+'|'+x.id+'|'+x.path);
 assert.equal(new Set(keys).size,keys.length);
});
