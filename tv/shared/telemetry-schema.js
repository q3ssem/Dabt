/* Strict technical events only; no names, IDs, questions, URLs, tokens or raw errors. */
(function(root){'use strict';
var ranges={connection:[3,20,3],phase:[8,20,120],pause:[2,20,3],error:[2,0,0],canvas:[1080,2400,10000],broker:[3,60000,6],capabilities:[2047,999,0],audio:[5,0,0]};
function integer(n,max){return Number.isInteger(n)&&n>=0&&n<=max}
function event(e){if(!e||typeof e!=='object'||Object.keys(e).sort().join(',')!=='a,b,c,kind,minute'||!Object.prototype.hasOwnProperty.call(ranges,e.kind))return false;var r=ranges[e.kind];return integer(e.minute,43200)&&integer(e.a,r[0])&&integer(e.b,r[1])&&integer(e.c,r[2])}
function report(v){return !!(v&&typeof v==='object'&&Object.keys(v).sort().join(',')==='events,id,schema,version'&&v.schema===1&&typeof v.id==='string'&&/^[a-f0-9]{32}$/.test(v.id)&&typeof v.version==='string'&&/^\d{1,3}\.\d{1,3}\.\d{1,3}(?:\.\d{1,3})?$/.test(v.version)&&Array.isArray(v.events)&&v.events.length>0&&v.events.length<=120&&v.events.every(event))}
var api={event:event,report:report};root.MajlisTelemetrySchema=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);