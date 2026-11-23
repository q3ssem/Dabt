// Read-only V5 asset existence audit. This verifies Git blobs, not runtime usage.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const REF='7327fdc6c6f36deaf63a2b20a7b6db9a315ad446';
const root='research/experiments/EXP-0001-dependency-inventory/results/';
const inventory=JSON.parse(readFileSync(root+'dependency-inventory.json','utf8'));
const visual=JSON.parse(readFileSync(root+'brain-kids-art-candidates.json','utf8'));
const records=[];
function insert(kind,id,asset) {
 if(typeof asset!=='string'||!asset)return;
 records.push({kind,id,path:asset});
}
for(const g of inventory.library_puzzles)
 for(const a of g.assets||[])insert('library-puzzle',g.id,a.path);
for(const s of inventory.story_stations)
 for(const a of s.assets||[])insert('story-station',s.id,a.path);
for(const b of visual.brain_visual_id_candidates)
 insert('brain-art',b.id,b.art_candidate);
for(const k of visual.kid_visual_name_candidates)
 insert('kid-art-name',k.name,k.art_candidate);
const unique=new Map(records.map(v=>[v.kind+'|'+v.id+'|'+v.path,v]));
const result=[];
for(const r of unique.values()){
 let existence='unverified',reason=null;
 if(/^(?:https?:|data:|blob:)/i.test(r.path)){
   existence='external-not-tested';reason='not a repository blob';
 }else if(r.path.startsWith('/')||r.path.includes('..')||r.path.includes('?')||r.path.includes('#')){
   existence='invalid-path';reason='absolute, parent or query path';
 }else{
   const check=spawnSync('git',['cat-file','-e',REF+':'+r.path],{encoding:'utf8'});
   existence=check.status===0?'exists-at-source-sha':'missing-at-source-sha';
   if(check.error)reason=String(check.error);
 }
 result.push({...r,existence,reason});
}
const counts={};
const byKind={};
for(const r of result){
 counts[r.existence]=(counts[r.existence]||0)+1;
 byKind[r.kind]??={};
 byKind[r.kind][r.existence]=(byKind[r.kind][r.existence]||0)+1;
}
const output={schema_version:1,source_commit:REF,status:'source-blob-only-not-proven-runtime-used',
 total_candidates:result.length,counts,by_kind:byKind,
 note:'Missing candidate does not prove the actual game broken; some routes use alternative assets. Never delete V5 files using this report.',
 candidates:result};
const json=JSON.stringify(output,null,2)+'\n';
if(process.argv.includes('--json')){process.stdout.write(json);process.exit(0);}
const file=root+'asset-evidence.json';mkdirSync(dirname(file),{recursive:true});writeFileSync(file,json);
console.log('V5_ASSET_SUMMARY '+JSON.stringify({total:output.total_candidates,counts:output.counts,by_kind:output.by_kind,
 missing:result.filter(x=>x.existence==='missing-at-source-sha').slice(0,30).map(x=>x.path)}));
const b64=Buffer.from(json).toString('base64');
for(let i=0,n=0;i<b64.length;i+=4096,n++)console.log('V5ASSETCHUNK '+n+' '+b64.slice(i,i+4096));
console.log('V5ASSETEND chunks='+Math.ceil(b64.length/4096));
