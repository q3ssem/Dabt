'use strict';
(function(){
if(typeof S==='undefined'||typeof DabtAssessmentEngine==='undefined')return;
const E=DabtAssessmentEngine,field='assessmentV4',key='miran:v2';
function merge(){try{const latest=JSON.parse(localStorage.getItem(key)||'{}'),own=S.st[field],external=latest[field];if(!own&&!external)return;const map=new Map();[own,external].filter(Boolean).forEach(p=>E.validateImport(p).results.forEach(r=>{if(!map.has(r.sessionId))map.set(r.sessionId,r);}));S.st[field]={schemaVersion:E.SCHEMA_VERSION,results:[...map.values()]};}catch(e){/* The original save/restore path retains its existing error handling. */}}
const save0=S.save;S.save=function(){merge();return save0.apply(this,arguments);};
window.addEventListener('pageshow',merge);window.addEventListener('storage',e=>{if(e.key===key)merge();});merge();
})();
