// Static V5 registry scan. No V5 code is executed.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const REF='7327fdc6c6f36deaf63a2b20a7b6db9a315ad446';
const read=f=>execFileSync('git',['show',REF+':'+f],{encoding:'utf8',maxBuffer:12*1024*1024});
const html=read('index.html'),upgrade=read('upgrade/games.js');
function lineAt(s,n){let x=1;for(let i=0;i<n;i++)if(s.charCodeAt(i)===10)x++;return x;}
function close(s,start){
 const pairs={'[':']','{':'}','(':')'},stack=[];
 let quote=null,esc=false,comment=null;
 for(let i=start;i<s.length;i++){
  const c=s[i],n=s[i+1];
  if(comment==='line'){if(c==='\n')comment=null;continue;}
  if(comment==='block'){if(c==='*'&&n==='/'){comment=null;i++;}continue;}
  if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote=null;continue;}
  if(c==='/'&&n==='/'){comment='line';i++;continue;}
  if(c==='/'&&n==='*'){comment='block';i++;continue;}
  if(c==='"'||c==="'"||c.charCodeAt(0)===96){quote=c;continue;}
  if(pairs[c]){stack.push(pairs[c]);continue;}
  if(c===']'||c==='}'||c===')'){
   if(stack.pop()!==c)throw Error('Unbalanced at '+i);
   if(!stack.length)return i+1;
  }
 }
 throw Error('Unclosed source at '+start);
}
function findArray(s,name,property=false){
 const escaped=name.replaceAll('.','\\.');
 const re=new RegExp(property?escaped+'\\s*=\\s*\\[':'\\b(?:const|let|var)\\s+'+escaped+'\\s*=\\s*\\[','g');
 const matches=[...s.matchAll(re)];
 if(matches.length!==1)throw Error('Expected one '+name+' array, saw '+matches.length);
 const m=matches[0],start=m.index+m[0].lastIndexOf('[');
 return {start,end:close(s,start)};
}
function entries(s,file,name,property=false,prefix=''){
 const a=findArray(s,name,property),out=[];let i=a.start+1;
 while(i<a.end-1){
  while(i<a.end-1&&/[\s,]/.test(s[i]))i++;
  if(i>=a.end-1)break;
  if(s[i]!=='{')throw Error('Unexpected array expression '+name+' at '+i);
  const end=close(s,i),o=s.slice(i,end);
  const id=o.match(/^\{\s*id\s*:\s*(['"])([a-z][a-z0-9_-]*)\1/);
  if(!id)throw Error('No literal id '+name+':'+lineAt(s,i));
  const field=k=>{
   const re=new RegExp('\\b'+k+"\\s*:\\s*(['\"])([^'\"\\r\\n]*?)\\1");
   return o.match(re)?.[2]||null;
  };
  const run=o.match(/\brun\s*:\s*([A-Za-z_$][\w$.]*)/)?.[1]||null;
  out.push({id:prefix+id[2],name:field('name'),category:field('cat'),type:field('type'),
   run_binding:run,source_file:file,source_array:name,source_line:lineAt(s,i),evidence_kind:'literal-array'});
  i=end;
 }
 return out;
}
const brainPrimary=entries(html,'index.html','G');
const kidsPrimary=entries(html,'index.html','KID_GAMES');
const brainUpgrade=entries(upgrade,'upgrade/games.js','DX.brain',true);
const kidsUpgrade=entries(upgrade,'upgrade/games.js','DX.child',true,'dx_k_')
 .map(x=>({...x,generated_id_rule:'DX.child.forEach => dx_k_ + c.id'}));
const kidsLater=[],unresolved=[];
for(const match of html.matchAll(/KID_GAMES\.push\s*\(\s*g\s*\)/g)){
 const before=html.slice(Math.max(0,match.index-8000),match.index);
 const parents=[...before.matchAll(/\b([A-Za-z_$][\w$]*)\.forEach\s*\(/g)];
 const name=parents.at(-1)?.[1];
 if(!name||name==='KID_GAMES'){unresolved.push({line:lineAt(html,match.index),array:name});continue;}
 try{kidsLater.push(...entries(html,'index.html',name).map(x=>({...x,
  registration_evidence:{source_file:'index.html',line:lineAt(html,match.index),method:'KID_GAMES.push'}})));}
 catch(e){unresolved.push({line:lineAt(html,match.index),array:name,error:String(e)});}
}
const brain=[...brainPrimary,...brainUpgrade],kids=[...kidsPrimary,...kidsUpgrade,...kidsLater];
const duplicateIds=a=>a.map(x=>x.id).filter((id,i,ids)=>ids.indexOf(id)!==i);
const report={schema_version:1,source_commit:REF,status:'static-source-registration-candidates-not-runtime-verified',
 counts:{brain:brain.length,kids:kids.length,brain_primary:brainPrimary.length,
 brain_upgrade:brainUpgrade.length,kids_primary:kidsPrimary.length,
 kids_upgrade:kidsUpgrade.length,kids_later:kidsLater.length},
 duplicates:{brain:duplicateIds(brain),kids:duplicateIds(kids)},
 unresolved_child_registration_sites:unresolved,
 limitations:['V5 browser registry not executed or verified','No per-game save/asset schema proof','No gameplay code migrated'],brain,kids};
const path='research/experiments/EXP-0001-dependency-inventory/results/parsed-source-registry.json';
mkdirSync(dirname(path),{recursive:true});
const output=JSON.stringify(report,null,2)+'\n';writeFileSync(path,output);
console.log('V5_REGISTRY_SUMMARY '+JSON.stringify({counts:report.counts,duplicates:report.duplicates,
 unresolved,brainIds:brain.map(x=>x.id),kidIds:kids.map(x=>x.id)}));
const b64=Buffer.from(output).toString('base64');
for(let i=0,n=0;i<b64.length;i+=4096,n++)console.log('V5REGCHUNK '+n+' '+b64.slice(i,i+4096));
console.log('V5REGEND chunks='+Math.ceil(b64.length/4096));
