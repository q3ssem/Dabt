'use strict';
(function(){
if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
window.addEventListener('load',()=>{navigator.serviceWorker.register(new URL('sw.js',document.baseURI).href).then(r=>r.update()).catch(()=>{/* App still works online if installation is unavailable. */});
 // 5.4.8: once a worker controls the app, ask it to keep the island's board art for offline play (skipped on Save-Data).
 const saveData=!!(navigator.connection&&navigator.connection.saveData);
 if(!saveData)navigator.serviceWorker.ready.then(r=>setTimeout(()=>{try{const w=r.active||navigator.serviceWorker.controller;if(w)w.postMessage({type:'warm-journey'});}catch(e){}},4000)).catch(()=>{});});
})();
