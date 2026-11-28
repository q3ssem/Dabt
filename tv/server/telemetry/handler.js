/* Shared receiver contract; only strictly validated technical reports reach storage. */
(function(root){'use strict';
function createHandler(opts){var origin=opts.origin,S=opts.schema,headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 function response(status,data){return new Response(JSON.stringify(data),{status:status,headers:Object.assign({},headers,{'Content-Type':'application/json'})})}
 async function equal(a,b){var enc=new TextEncoder(),x=new Uint8Array(await root.crypto.subtle.digest('SHA-256',enc.encode(a))),y=new Uint8Array(await root.crypto.subtle.digest('SHA-256',enc.encode(b))),z=0;for(var i=0;i<x.length;i++)z|=x[i]^y[i];return z===0}
 return async function(req){if(req.headers.get('origin')!==origin)return response(403,{error:'origin'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers});
 if(req.method!=='POST')return response(405,{error:'method'});
 var got=(req.headers.get('authorization')||'').replace(/^Bearer /,'');if(!/^[a-fA-F0-9]{64}$/.test(got))return response(401,{error:'unauthorized'});
 try{var allowed=opts.authorize?await opts.authorize(got):await (async function(){var expected=opts.token();return /^[a-fA-F0-9]{64}$/.test(expected)&&await equal(got,expected)})();if(!allowed)return response(401,{error:'unauthorized'})}catch(e){return response(503,{error:'authorization unavailable'})}
 if(!req.body||Number(req.headers.get('content-length')||0)>16000)return response(413,{error:'size'});
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')||''))return response(415,{error:'content type'});
 var v;try{var reader=req.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true}),size=0,raw='';while(true){var chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>16000){await reader.cancel();return response(413,{error:'size'})}raw+=decoder.decode(chunk.value,{stream:true})}raw+=decoder.decode();v=JSON.parse(raw)}catch(e){return response(400,{error:'invalid JSON'})}
 if(!S.report(v))return response(400,{error:'schema'});
 try{var result=await opts.store(v);if(result==='rate_limited')return response(429,{error:'rate limit'});if(result==='conflict')return response(409,{error:'conflict'});if(result!=='accepted'&&result!=='duplicate')return response(503,{error:'storage'});return response(200,{accepted:true,id:v.id})}catch(e){return response(503,{error:'storage'})}
 }
}
root.MajlisTelemetryReceiver={createHandler:createHandler};if(typeof module==='object'&&module.exports)module.exports=root.MajlisTelemetryReceiver;
})(typeof globalThis!=='undefined'?globalThis:this);
