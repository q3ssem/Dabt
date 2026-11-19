'use strict';
importScripts('./offline-manifest.js');
const VERSION='5.5.28',PATCH='expedition-art-2',PREFIX='mindlab-',CORE=PREFIX+VERSION+'-'+PATCH+'-core',RUNTIME=PREFIX+VERSION+'-'+PATCH+'-images',BASE=new URL('./',self.location.href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CORE).then(cache=>cache.addAll(self.MINDLAB_OFFLINE_FILES.map(p=>new URL(p,BASE).href))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith(PREFIX)&&![CORE,RUNTIME].includes(n)).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
const rel=url.pathname.slice(BASE.pathname.length);if(rel.startsWith('tv/')||rel.startsWith('tools/')||rel.startsWith('qa/tests/')||rel.startsWith('qa/browser/'))return;
const image=/\.(?:webp|png|jpe?g|svg)$/i.test(url.pathname),documentRequest=req.mode==='navigate';
if(documentRequest){event.respondWith((async()=>{try{const response=await fetch(req);if(response.ok){const cache=await caches.open(CORE);await cache.put(req,response.clone());}return response;}catch(e){const cache=await caches.open(CORE),hit=await cache.match(req,{ignoreSearch:true});return hit||new Response('هذه الصفحة لم تُحفظ للعمل دون اتصال. افتحها أولًا أثناء الاتصال.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}})());return;}
if(image||/\.(?:js|css|woff2|webmanifest|json)$/i.test(url.pathname)){event.respondWith((async()=>{const cache=await caches.open(image?RUNTIME:CORE),hit=await cache.match(req)||(image?await (await caches.open(CORE)).match(req):null);if(hit)return hit;try{const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response;}catch(e){return new Response('',{status:503});}})());}
});
/* Warm the journey kit or the installed assets used by one visited puzzle. */
self.addEventListener('message', event => {
  if (!event.data) return;
  const {type, puzzleId} = event.data;
  let files;
  if (type === 'warm-puzzle-art') {
    files = self.MINDLAB_EXPEDITION_ART[puzzleId];
    if (!Array.isArray(files)) return;
  } else {
    if (event.data.type!=='warm-journey') return;
    files = [...(self.MINDLAB_JOURNEY_ART||[]),...(self.MINDLAB_GAME_ART||[]),...(self.MINDLAB_CORRECTION_ART||[])];
  }
  event.waitUntil(caches.open(RUNTIME).then(async cache => {
    for (const file of files) {
      const url = new URL(file, BASE).href;
      try {
        if (await cache.match(url)) continue;
        const response = await fetch(url);
        if (response.ok) await cache.put(url, response);
      } catch (_) { /* Offline visits retain previously cached artwork. */ }
    }
  }));
});
