'use strict';
(function(){
if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
window.addEventListener('load',()=>{navigator.serviceWorker.register(new URL('sw.js',document.baseURI).href).then(r=>r.update()).catch(()=>{/* App still works online if installation is unavailable. */});});
})();
