'use strict';
(function(root){
const KEY='miran:v2',FIELD='assessmentV4',E=root.DabtAssessmentEngine;
function readRoot(storage=localStorage){const raw=storage.getItem(KEY);if(!raw)return {v:1,hist:[],best:{},lv:{},days:{}};const state=JSON.parse(raw);if(!state||typeof state!=='object'||Array.isArray(state))throw Error('الحفظ غير صالح؛ لم يتم استبداله.');return state;}
function createStore(storage=localStorage){
 const adapter={getItem(){const st=readRoot(storage);return st[FIELD]?JSON.stringify(st[FIELD]):null;},
 setItem(_key,value){const incoming=E.validateImport(JSON.parse(value)),st=readRoot(storage),old=st[FIELD]?E.validateImport(st[FIELD]).results:[],seen=new Set(old.map(r=>r.sessionId)),merged=old.slice();incoming.results.forEach(r=>{if(!seen.has(r.sessionId)){seen.add(r.sessionId);merged.push(r);}});if(merged.length>10000)throw Error('عدد النتائج كبير؛ صدّر نتائجك قبل إضافة المزيد.');st[FIELD]={schemaVersion:E.SCHEMA_VERSION,results:merged};st.savedAt=Date.now();storage.setItem(KEY,JSON.stringify(st));},
 removeItem(){throw Error('مسح الحفظ من لوحة النتائج غير مسموح.');}};
 return E.createStore(adapter,KEY);
}
function text(tag,value,cls){const n=document.createElement(tag);n.textContent=String(value);if(cls)n.className=cls;return n;}
function message(value,bad=false){const n=document.getElementById('message');if(n){n.textContent=value;n.className=bad?'message error':'message';}}
root.MindLabAssessment={KEY,FIELD,readRoot,createStore,text,message};
})(typeof globalThis!=='undefined'?globalThis:this);
