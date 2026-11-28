/* Opt-in local technical log. No transmission until explicit preview and send. */
(function(root){'use strict';
var KEY='majlis:dev-report:v1',MAX=120,AGE=30*86400000,S=root.MajlisTelemetrySchema;
function create(storage,clock,random,version){var data={enabled:false,start:clock(),events:[],id:''};
 function save(){try{storage.setItem(KEY,JSON.stringify(data));return true}catch(e){return false}}
 try{var x=JSON.parse(storage.getItem(KEY)||'null');if(x&&x.enabled===true&&Number.isFinite(x.start)&&clock()>=x.start&&clock()-x.start<AGE&&Array.isArray(x.events)&&x.events.every(S.event)&&/^[a-f0-9]{32}$/.test(x.id)){data={enabled:true,start:x.start,events:x.events.slice(-MAX),id:x.id}}}catch(e){}
 function reset(enabled){data={enabled:enabled,start:clock(),events:[],id:enabled?random():''};return save()}
 function enabled(){return data.enabled}
 function record(kind,a,b,c){if(!enabled())return false;if(clock()-data.start>=AGE||clock()<data.start)reset(true);var e={kind:kind,minute:Math.floor((clock()-data.start)/60000),a:a,b:b,c:c};if(!S.event(e))return false;data.events.push(e);if(data.events.length>MAX)data.events.shift();data.id=random();return save()}
 function preview(){if(!enabled()||!data.events.length||clock()-data.start>=AGE)return null;var v={schema:1,id:data.id,version:version,events:JSON.parse(JSON.stringify(data.events))};return S.report(v)?v:null}
 return {enabled:enabled,enable:function(v){if(v===true&&enabled())return true;return reset(v===true)},record:record,preview:preview,clear:function(){return reset(enabled())}}
}
function endpoint(v){try{var u=new URL(v);return u.protocol==='https:'&&/^[a-z0-9]{20}\.supabase\.co$/.test(u.hostname)&&!u.port&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/functions/v1/majlis-telemetry'?u.href:null}catch(e){return null}}
function send(url,token,report,fetcher){var dest=endpoint(url);if(!dest||typeof token!=='string'||! /^[a-fA-F0-9]{64}$/.test(token)||!S.report(report))return Promise.reject(Error('invalid report or endpoint'));if(typeof root.AbortController!=='function')return Promise.reject(Error('browser lacks safe upload support'));var ac=new root.AbortController(),timer=setTimeout(function(){ac.abort()},8000);return (fetcher||root.fetch)(dest,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(report),credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:ac.signal}).then(function(r){if(!r.ok)throw Error('server rejected report');return r.json()}).then(function(r){if(!r||r.id!==report.id||r.accepted!==true)throw Error('missing receipt');return r}).then(function(r){clearTimeout(timer);return r},function(e){clearTimeout(timer);throw e})}
root.MajlisTelemetry={create:create,send:send,endpoint:endpoint};
if(typeof module==='object'&&module.exports)module.exports=root.MajlisTelemetry;
})(typeof globalThis!=='undefined'?globalThis:this);