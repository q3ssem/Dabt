/* Majlis TV only: versioned, immutable app shell; never cache game traffic. */
'use strict';
const PREFIX='majlis-tv-shell-', CACHE=PREFIX+'2.4.8-reports-p4', ROOT=new URL(self.registration.scope);
const ASSETS=["index.html","remote.html","tv/index.html","tv/remote.html","remote/remote.html","tv/styles.css","tv/layout-231.css","tv/roster-242.css","tv/game-246.css","tv/app.js","remote/styles.css","remote/layout-232.css","remote/guide-240.css","remote/identity-241.css","remote/simple-242.css","remote/fit-246.css","remote/app.js","shared/core.js","shared/av.js","shared/fit.js","shared/majlis-brand.css","shared/mq.js","shared/network-probe-2451.js","shared/network-guard-248.js","shared/device-lab.js","shared/telemetry-schema.js","shared/telemetry.js","shared/qr.js","shared/sec.js","shared/themes-233.css","shared/ui.js","shared/cache-247.js","vendor/nacl-fast.min.js","assets/majlis-corner.webp"];
const urls=new Set(ASSETS.map(p=>new URL(p,ROOT).href));
const marker=new URL('__majlis_shell_ready__',ROOT).href;
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll([...urls].map(url=>new Request(url,{cache:'reload',credentials:'same-origin'})));
    await cache.put(marker,new Response('2.4.8'));
  })());
  // No skipWaiting: never replace an open game with a new version.
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin!==ROOT.origin||!u.pathname.startsWith(ROOT.pathname))return;
  const canonical=new URL(u.href);
  if(req.mode==='navigate'){
    canonical.search='';canonical.hash='';
    if(canonical.pathname.endsWith('/'))canonical.pathname+='index.html';
  }
  // Only known static resources. Never persist PINs, QR query strings, requests,
  // data URLs, user questions, external fonts, or MQTT traffic.
  if(!urls.has(canonical.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(canonical.href);
    return hit||fetch(req);
  })());
});
self.addEventListener('message',event=>{
  if(!event.data||event.data.type!=='majlis-cache-status'||!event.ports[0])return;
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const complete=!!(await cache.match(marker))&&(await Promise.all([...urls].map(u=>cache.match(u)))).every(Boolean);
    event.ports[0].postMessage({complete,count:urls.size,version:'2.4.8'});
  })());
});
