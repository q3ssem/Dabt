/* Non-blocking local shell preparation. No game state, no forced reload. */
(function(){
'use strict';
var sw=navigator.serviceWorker, reg=null, pending=null, status='لم يبدأ التحميل', buttons=[];
var root=new URL('../',document.currentScript.src);
function show(t){status=t;buttons=buttons.filter(function(b){return b.isConnected});buttons.forEach(function(b){b.textContent='التخزين السريع: '+t})}
function inspect(worker){return new Promise(function(resolve){
  if(!worker){resolve(null);return}
  var c=new MessageChannel(),timer=setTimeout(function(){c.port1.close();resolve(null)},2500);
  c.port1.onmessage=function(e){clearTimeout(timer);c.port1.close();resolve(e.data)};
  try{worker.postMessage({type:'majlis-cache-status'},[c.port2])}catch(e){clearTimeout(timer);c.port1.close();resolve(null)}
})}
async function check(){
  if(!reg)return;
  if(reg.installing){show('جارٍ التحميل…');return}
  var v=await inspect(reg.waiting||reg.active);
  if(v&&v.complete){show(reg.waiting?'تحديث جاهز بعد إغلاق الصفحات':'جاهز · '+v.count+' ملفًا');return}
  show('غير مكتمل؛ أعد المحاولة عبر الإنترنت')
}
function watch(w){if(!w)return;w.addEventListener('statechange',function(){check()});}
function prepare(){
  if(!sw||!window.isSecureContext){show('غير مدعوم على هذا الجهاز');return Promise.resolve()}
  if(pending)return pending;
  show('جارٍ التحميل…');
  pending=sw.register(new URL('sw.js',root).href,{scope:root.href,updateViaCache:'none'}).then(function(r){
    if(reg!==r){reg=r;r.addEventListener('updatefound',function(){watch(r.installing);check()})}
    watch(r.installing);return check()
  }).catch(function(){show('تعذر التحميل؛ أعد المحاولة')}).finally(function(){pending=null});
  return pending;
}
function bind(id){var b=document.getElementById(id);if(!b)return;if(buttons.indexOf(b)<0)buttons.push(b);b.textContent='التخزين السريع: '+status;b.onclick=function(){prepare().then(function(){if(reg&&!reg.installing)reg.update().then(check).catch(function(){check()})})}}
window.MajlisCache={prepare:prepare,bind:bind};
if(sw){sw.addEventListener('controllerchange',check);window.addEventListener('online',prepare)}
function boot(){if('requestIdleCallback' in window)requestIdleCallback(prepare,{timeout:2000});else setTimeout(prepare,750)}
if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();
