// Deploy only in a dedicated approved Majlis Supabase project.
import './telemetry-schema.js';
import './handler.js';
const S=(globalThis as any).MajlisTelemetrySchema;
const H=(globalThis as any).MajlisTelemetryReceiver;
Deno.serve(H.createHandler({
 origin:'https://q3ssem.github.io',
 schema:S,
 token:()=>Deno.env.get('MAJLIS_REPORT_WRITE_TOKEN')||'',
 store:async(v:unknown)=>{
  const base=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!base||!key)return 'unavailable';
  const r=await fetch(base+'/rest/v1/rpc/majlis_accept_report',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_report:v})});
  if(!r.ok)return 'unavailable';return await r.json();
 }
}));
