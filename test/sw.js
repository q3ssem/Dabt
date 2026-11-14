'use strict';
importScripts('./offline-manifest.js');
const VERSION='4.2.1',PREFIX='mindlab-',CORE=PREFIX+VERSION+'-core',RUNTIME=PREFIX+VERSION+'-images',BASE=new URL('./',self.location.href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CORE).then(cache=>cache.addAll(self.MINDLAB_OFFLINE_FILES.map(p=>new URL(p,BASE).href))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith(PREFIX)&&![CORE,RUNTIME].includes(n)).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
const rel=url.pathname.slice(BASE.pathname.length);if(rel.startsWith('tv/')||rel.startsWith('tools/')||rel.startsWith('qa/tests/')||rel.startsWith('qa/browser/'))return;
const image=/\.(?:webp|png|jpe?g|svg)$/i.test(url.pathname),documentRequest=req.mode==='navigate';
if(documentRequest){event.respondWith((async()=>{try{const response=await fetch(req);if(response.ok){const cache=await caches.open(CORE);await cache.put(req,response.clone());}return response;}catch(e){const cache=await caches.open(CORE),hit=await cache.match(req,{ignoreSearch:true});return hit||new Response('هذه الصفحة لم تُحفظ للعمل دون اتصال. افتحها أولًا أثناء الاتصال.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}})());return;}
if(image||/\.(?:js|css|woff2|webmanifest|json)$/i.test(url.pathname)){event.respondWith((async()=>{const cache=await caches.open(image?RUNTIME:CORE),hit=await cache.match(req);if(hit)return hit;try{const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response;}catch(e){return new Response('',{status:503});}})());}
});
