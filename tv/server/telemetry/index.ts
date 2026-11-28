// Dedicated Supabase Edge Function, deploy only after provisioning a separate project.
import './telemetry-schema.js';
const S=(globalThis as any).MajlisTelemetrySchema;
const origin='https://q3ssem.github.io';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
const response=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
async function equal(a:string,b:string){const e=new TextEncoder(),x=new Uint8Array(await crypto.subtle.digest('SHA-256',e.encode(a))),y=new Uint8Array(await crypto.subtle.digest('SHA-256',e.encode(b)));let z=0;for(let i=0;i<x.length;i++)z|=x[i]^y[i];return z===0}
Deno.serve(async(req:Request)=>{
 if(req.headers.get('origin')!==origin)return response(403,{error:'origin'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return response(405,{error:'method'});
 const expected=Deno.env.get('MAJLIS_REPORT_WRITE_TOKEN')||'',got=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
 if(!/^[a-fA-F0-9]{64}$/.test(expected)||! /^[a-fA-F0-9]{64}$/.test(got)||!await equal(got,expected))return response(401,{error:'unauthorized'});
 if(!req.body||Number(req.headers.get('content-length')||0)>16000)return response(413,{error:'size'});
 try{const reader=req.body.getReader(),decoder=new TextDecoder();let size=0,raw='';while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16000){await reader.cancel();return response(413,{error:'size'})}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode();const v=JSON.parse(raw);if(!S.report(v))return response(400,{error:'schema'});
 const base=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!base||!key)return response(503,{error:'configuration'});
 const r=await fetch(base+'/rest/v1/majlis_dev_reports?on_conflict=id',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({id:v.id,version:v.version,report:v})});
 if(!r.ok)return response(503,{error:'storage'});return response(200,{accepted:true,id:v.id})
 }catch(_){return response(400,{error:'invalid request'})}
});