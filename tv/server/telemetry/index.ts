// Dedicated Majlis project; service-role key remains server-side.
import './telemetry-schema.js';
import './handler.js';
const S=(globalThis as any).MajlisTelemetrySchema;
const H=(globalThis as any).MajlisTelemetryReceiver;
async function rpc(name:string,args:unknown){
 const base=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!base||!key)throw new Error('configuration');
 const r=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(args)});
 if(!r.ok)throw new Error('database unavailable');return await r.json();
}
Deno.serve(H.createHandler({
 origin:'https://q3ssem.github.io',schema:S,
 authorize:async(token:string)=>{
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
  const digest=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return await rpc('majlis_authorize_report',{p_digest:digest})===true;
 },
 store:(v:unknown)=>rpc('majlis_accept_report',{p_report:v})
}));
