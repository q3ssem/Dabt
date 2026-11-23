#!/usr/bin/env node
// Creates a numbered research-only experiment, not a production feature.
// Usage: npm run experiment:new -- "عنوان التجربة" slug [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const dryRun=args.includes('--dry-run');
const parts=args.filter(v=>v!=='--dry-run');
const [title,slug]=parts;
if(!title?.trim()||!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){
  console.error('Usage: npm run experiment:new -- "عنوان واضح" short-kebab-slug [--dry-run]');
  process.exit(2);
}
const registryFile=path.join(root,'research','REGISTRY.json');
const registry=JSON.parse(fs.readFileSync(registryFile,'utf8'));
const n=Math.max(0,...registry.experiments.map(e=>Number(e.id.slice(4))))+1;
const id='EXP-'+String(n).padStart(4,'0');
const folder='research/experiments/'+id+'-'+slug;
const absolute=path.join(root,folder);
const record={
  id,slug,title:title.trim(),status:'planned',started:null,completed:null,
  path:folder+'/README.md',
  source_commit:JSON.parse(fs.readFileSync(path.join(root,'PROJECT_STATE.json'),'utf8')).source_baseline.commit,
  hypothesis:'غير محددة بعد؛ يجب صياغتها قبل تشغيل التجربة',
  results:null,next:'تعريف سؤال البحث وخطة قابلة للتكرار وقياسات القبول'
};
if(registry.experiments.some(e=>e.id===id||e.slug===slug)||fs.existsSync(absolute)){
  console.error('Experiment already exists: '+id+' or slug '+slug);
  process.exit(1);
}
if(dryRun){
  console.log('DRY_RUN '+id+' -> '+folder+' (no changes made)');
  process.exit(0);
}
fs.mkdirSync(path.join(absolute,'code'),{recursive:true});
fs.mkdirSync(path.join(absolute,'data'),{recursive:true});
fs.mkdirSync(path.join(absolute,'results'),{recursive:true});
const text=[
  '# '+id+' — '+title.trim(),'',
  '**الحالة:** planned','**مصدر القراءة المثبت:** '+record.source_commit,'',
  '## الفرضية','غير محددة — تُملأ قبل أي تجربة.','',
  '## الأدلة والخطوات','اذكر أوامر قابلة للتكرار والمدخلات الصناعية والنتائج المتوقعة.','',
  '## النتائج','لم يبدأ البحث بعد.','',
  '## قرار النقل','غير محسوم؛ لا يُنسخ إلى src/ قبل اعتماد الدليل.','',
  '## التسليم','تحديث REGISTRY.json وPROJECT_STATE.json وhandoff/CURRENT_TASK.md وSESSION_LOG.md حين تصبح هذه التجربة المهمة الحالية.',''
].join('\n');
fs.writeFileSync(path.join(absolute,'README.md'),text);
fs.writeFileSync(path.join(absolute,'code','README.md'),'# كود التجربة\n\nهذا الكود لا يدخل حزمة اللاعب.\n');
fs.writeFileSync(path.join(absolute,'data','README.md'),'# بيانات التجربة\n\nاستخدم بيانات اصطناعية أو عامة فقط، دون أسرار أو حفظ مستخدمين.\n');
fs.writeFileSync(path.join(absolute,'results','README.md'),'# نتائج قابلة للإعادة\n\nأضف تاريخ التشغيل وSHA وأوامر إعادة الإنتاج والإخفاقات.\n');
registry.experiments.push(record);
registry.updated=new Date().toISOString().slice(0,10);
// New records do NOT silently switch the active task in another chat.
const temp=registryFile+'.tmp';
fs.writeFileSync(temp,JSON.stringify(registry,null,2)+'\n');
fs.renameSync(temp,registryFile);
console.log('CREATED '+id+' -> '+folder+'; current task remains '+registry.current);
