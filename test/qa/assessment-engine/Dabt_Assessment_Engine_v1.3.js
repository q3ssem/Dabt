(function(root){
"use strict";
const SCHEMA_VERSION=4;
const DOMAINS=Object.freeze({
 "working-memory":{label:"الذاكرة العاملة",description:"الاحتفاظ بالمعلومات ومعالجتها مؤقتاً"},
 "sustained-attention":{label:"الانتباه المستمر",description:"المحافظة على التركيز عبر الزمن"},
 "selective-attention":{label:"الانتباه الانتقائي",description:"اختيار المعلومات المهمة وتجاهل المشتتات"},
 "cognitive-flexibility":{label:"المرونة المعرفية",description:"تبديل القواعد والاستراتيجيات عند الحاجة"},
 "processing-speed":{label:"سرعة المعالجة",description:"سرعة تنفيذ معالجة بسيطة مع الحفاظ على الدقة"},
 "visuospatial":{label:"المهارات البصرية المكانية",description:"تحليل العلاقات والأشكال والمواقع"},
 "reasoning":{label:"الاستدلال",description:"اكتشاف العلاقات واستخلاص النتائج"},
 "child-learning":{label:"التعلم المبكر",description:"مهارات تأسيسية مناسبة لعمر الطفل"}
});
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const isObj=v=>!!v&&typeof v==="object"&&!Array.isArray(v);
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
function median(a){if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;}
function sd(a){if(a.length<2)return 0;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));}
function isoDate(v,fallback){if(v===undefined||v===null||v==="")return fallback||null;const d=new Date(v);if(Number.isNaN(d.getTime()))throw new Error("Invalid date");return d.toISOString();}
function nonEmpty(v,fallback,max=120){const s=v==null?"":String(v).trim();return (s||fallback).slice(0,max);}
function newId(prefix){return prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);}
function normalizeMode(v){if(v!=="training"&&v!=="assessment")throw new Error("Mode must be training or assessment");return v;}
function normalizeResponse(r,i){
 if(!isObj(r))throw new Error("Invalid response at index "+i);
 if(typeof r.ok!=="boolean")throw new Error("Response ok must be boolean at index "+i);
 const rt=(r.rt===null||r.rt===undefined||r.rt==="")?null:Number(r.rt);
 if(rt!==null&&(!Number.isFinite(rt)||rt<0))throw new Error("Invalid response time at index "+i);
 return {trial:Number.isInteger(Number(r.trial))&&Number(r.trial)>0?Number(r.trial):i+1,correct:r.ok,responseTimeMs:rt,expected:r.target==null?"":String(r.target).slice(0,500),given:r.value==null?"":String(r.value).slice(0,500),errorType:r.ok?"none":nonEmpty(r.errorType,"incorrect-choice",80)};
}
function scoreSession(input){
 if(!isObj(input)||!Array.isArray(input.responses)||!input.responses.length)throw new Error("Session responses are required");
 if(input.responses.length>10000)throw new Error("Too many responses");
 const domain=input.domainId||"reasoning";
 if(!own(DOMAINS,domain))throw new Error("Unknown domainId: "+domain);
 const mode=normalizeMode(input.mode||"training"),responses=input.responses.map(normalizeResponse);
 const times=responses.map(r=>r.responseTimeMs).filter(x=>x!==null);
 const correct=responses.filter(r=>r.correct).length,attempts=responses.length,accuracy=correct/attempts;
 const rawThreshold=input.passThreshold===undefined?.75:Number(input.passThreshold);
 if(!Number.isFinite(rawThreshold)||rawThreshold<0||rawThreshold>1)throw new Error("passThreshold must be between 0 and 1");
 return {schemaVersion:SCHEMA_VERSION,sessionId:nonEmpty(input.sessionId,newId("dabt"),160),sequenceId:input.sequenceId?String(input.sequenceId).slice(0,160):null,gameId:nonEmpty(input.gameId,"unknown",120),gameVersion:nonEmpty(input.gameVersion,"1.0.0",40),stageId:nonEmpty(input.stageId,"1",80),stageIndex:Number.isInteger(input.stageIndex)&&input.stageIndex>0?input.stageIndex:null,stageTitle:nonEmpty(input.stageTitle,"",160),domainId:domain,domainLabel:DOMAINS[domain].label,mode,startedAt:isoDate(input.startedAt,null),completedAt:isoDate(input.completedAt,new Date().toISOString()),attempts,correct,errors:attempts-correct,accuracy:Number(accuracy.toFixed(4)),passThreshold:rawThreshold,passed:accuracy>=rawThreshold,responseTime:{count:times.length,meanMs:times.length?Math.round(mean(times)):null,medianMs:times.length?Math.round(median(times)):null,sdMs:times.length?Math.round(sd(times)):null,minMs:times.length?Math.round(Math.min(...times)):null,maxMs:times.length?Math.round(Math.max(...times)):null},errorCounts:responses.reduce((a,r)=>{if(!r.correct)a[r.errorType]=(a[r.errorType]||0)+1;return a;},{}),responses};
}
function validResult(r){
 if(!isObj(r)||typeof r.sessionId!=="string"||!r.sessionId.trim()||typeof r.gameId!=="string"||!["training","assessment"].includes(r.mode))return false;
 const n=Number(r.attempts),c=Number(r.correct),e=Number(r.errors),a=Number(r.accuracy);
 if(!Number.isInteger(n)||n<1||!Number.isInteger(c)||c<0||c>n||!Number.isInteger(e)||e!==n-c||!Number.isFinite(a)||a<0||a>1)return false;
 if(Math.abs(a-c/n)>.0011)return false;
 if(r.domainId!==undefined&&!own(DOMAINS,r.domainId))return false;
 if(r.responses!==undefined&&(!Array.isArray(r.responses)||r.responses.length!==n))return false;
 return true;
}
function normalizeImported(r){
 if(!validResult(r))throw new Error("Invalid imported record");
 const domain=own(DOMAINS,r.domainId)?r.domainId:"reasoning",c=Number(r.correct),n=Number(r.attempts);
 return {...r,schemaVersion:SCHEMA_VERSION,domainId:domain,domainLabel:DOMAINS[domain].label,attempts:n,correct:c,errors:n-c,accuracy:Number((c/n).toFixed(4)),startedAt:isoDate(r.startedAt,null),completedAt:isoDate(r.completedAt,new Date().toISOString())};
}
function validateImport(payload){
 if(!isObj(payload)||!Array.isArray(payload.results))throw new Error("Invalid results file");
 const version=Number(payload.schemaVersion||1);
 if(!Number.isInteger(version)||version<1||version>SCHEMA_VERSION)throw new Error("Unsupported schema version");
 if(payload.results.length>100000)throw new Error("Import exceeds maximum record count");
 const rejected=[],seen=new Set(),results=[];
 payload.results.forEach((r,i)=>{if(!validResult(r)){rejected.push({index:i,reason:"invalid-record"});return;}if(seen.has(r.sessionId)){rejected.push({index:i,reason:"duplicate-session"});return;}seen.add(r.sessionId);try{results.push(normalizeImported(r));}catch(e){rejected.push({index:i,reason:"invalid-record"});}});
 return {schemaVersion:SCHEMA_VERSION,results,rejected};
}
function groupStats(a){
 const attempts=a.reduce((n,x)=>n+x.attempts,0),correct=a.reduce((n,x)=>n+x.correct,0);
 return {sessions:a.length,attempts,correct,errors:attempts-correct,attemptWeightedAccuracy:attempts?Number((correct/attempts).toFixed(4)):null,meanSessionAccuracy:a.length?Number(mean(a.map(x=>x.accuracy)).toFixed(4)):null,bestSessionAccuracy:a.length?Math.max(...a.map(x=>x.accuracy)):null};
}
function summarize(results){
 const valid=(Array.isArray(results)?results:[]).filter(validResult),byDomain={},byMode={training:[],assessment:[]};
 valid.forEach(r=>{(byDomain[r.domainId||"reasoning"]||=[]).push(r);byMode[r.mode].push(r);});
 return {sessions:valid.length,byMode:{training:groupStats(byMode.training),assessment:groupStats(byMode.assessment)},byDomain:Object.fromEntries(Object.entries(byDomain).map(([k,v])=>[k,{label:DOMAINS[k]?.label||k,...groupStats(v)}]))};
}
function dashboard(results){
 const valid=(Array.isArray(results)?results:[]).filter(validResult),sorted=[...valid].sort((a,b)=>new Date(b.completedAt||0)-new Date(a.completedAt||0));
 const assessment=valid.filter(r=>r.mode==="assessment"),training=valid.filter(r=>r.mode==="training"),latestByDomain={};
 assessment.forEach(r=>{const old=latestByDomain[r.domainId];if(!old||new Date(r.completedAt||0)>new Date(old.completedAt||0))latestByDomain[r.domainId]=r;});
 const trendByDomain={};
 for(const domainId of Object.keys(DOMAINS)){const rows=assessment.filter(r=>r.domainId===domainId).sort((a,b)=>new Date(a.completedAt||0)-new Date(b.completedAt||0));if(rows.length)trendByDomain[domainId]=rows.slice(-12).map(r=>({sessionId:r.sessionId,accuracy:r.accuracy,completedAt:r.completedAt}));}
 const allAttempts=assessment.reduce((n,r)=>n+r.attempts,0),allCorrect=assessment.reduce((n,r)=>n+r.correct,0);
 return {totals:{sessions:valid.length,trainingSessions:training.length,assessmentSessions:assessment.length,attempts:valid.reduce((n,r)=>n+r.attempts,0)},assessment:{attempts:allAttempts,correct:allCorrect,errors:allAttempts-allCorrect,attemptWeightedAccuracy:allAttempts?Number((allCorrect/allAttempts).toFixed(4)):null,meanSessionAccuracy:assessment.length?Number(mean(assessment.map(r=>r.accuracy)).toFixed(4)):null},domainSnapshot:Object.entries(latestByDomain).map(([domainId,r])=>({domainId,label:DOMAINS[domainId].label,accuracy:r.accuracy,completedAt:r.completedAt})),trendByDomain,recentSessions:sorted.slice(0,10).map(r=>({sessionId:r.sessionId,sequenceId:r.sequenceId,gameId:r.gameId,stageTitle:r.stageTitle,domainId:r.domainId,domainLabel:DOMAINS[r.domainId]?.label||r.domainId,mode:r.mode,accuracy:r.accuracy,attempts:r.attempts,completedAt:r.completedAt}))};
}
function scoreProgram(input){
 if(!isObj(input)||!Array.isArray(input.stages)||!input.stages.length)throw new Error("Program stages are required");
 if(input.stages.length>200)throw new Error("Too many stages");
 const sequenceId=nonEmpty(input.sequenceId,newId("seq"),160),mode=normalizeMode(input.mode||"training");
 const sessions=input.stages.map((stage,index)=>scoreSession({...stage,sequenceId,stageIndex:index+1,stageId:stage.stageId??index+1,mode:stage.mode||mode,gameId:stage.gameId||input.gameId,startedAt:stage.startedAt||input.startedAt}));
 const attempts=sessions.reduce((n,s)=>n+s.attempts,0),correct=sessions.reduce((n,s)=>n+s.correct,0);
 return {sequenceId,gameId:nonEmpty(input.gameId,sessions[0].gameId,120),mode,startedAt:isoDate(input.startedAt,null),completedAt:isoDate(input.completedAt,new Date().toISOString()),stageCount:sessions.length,completedStages:sessions.length,attempts,correct,errors:attempts-correct,accuracy:Number((correct/attempts).toFixed(4)),stages:sessions,summary:summarize(sessions)};
}
function createStore(storage,key){
 let target=storage;
 if(target===undefined){try{target=typeof localStorage!=="undefined"?localStorage:null;}catch(e){target=null;}}
 const storeKey=key||"dabt.assessment.v1";
 function read(){if(!target)return [];try{const raw=target.getItem(storeKey);if(!raw)return [];return validateImport(JSON.parse(raw)).results;}catch(e){return [];}}
 function write(results){if(!target)throw new Error("Storage is unavailable");try{target.setItem(storeKey,JSON.stringify({app:"Dabt PRO",schemaVersion:SCHEMA_VERSION,results}));}catch(e){const err=new Error("Unable to save assessment data: "+(e&&e.message||"storage error"));err.cause=e;throw err;}return results.length;}
 function addMany(items){
  if(!Array.isArray(items))throw new Error("Sessions must be an array");
  const all=read(),ids=new Set(all.map(r=>r.sessionId));let added=0,duplicates=0,rejected=0;
  items.forEach(item=>{if(!validResult(item)){rejected++;return;}if(ids.has(item.sessionId)){duplicates++;return;}all.push(normalizeImported(item));ids.add(item.sessionId);added++;});
  if(added)write(all);return {added,duplicates,rejected,count:all.length};
 }
 return {available:!!target,getAll:read,add(session){if(!validResult(session))throw new Error("Invalid session record");const result=addMany([session]);return {added:result.added===1,reason:result.duplicates?"duplicate-session":undefined,count:result.count};},addMany,addProgram(program){if(!program||!Array.isArray(program.stages))throw new Error("Invalid program");return addMany(program.stages);},clear(){if(!target)throw new Error("Storage is unavailable");target.removeItem(storeKey);},exportData(){return {app:"Dabt PRO",schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),results:read()};},importData(payload){const parsed=validateImport(payload),result=addMany(parsed.results);return {...result,rejected:result.rejected+parsed.rejected.length,invalidRecords:parsed.rejected};}};
}
const api={SCHEMA_VERSION,DOMAINS,scoreSession,scoreProgram,summarize,dashboard,validateImport,validResult,createStore};
root.DabtAssessmentEngine=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);