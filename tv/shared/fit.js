/* TV layout: coalesce structural changes; ignore timer/score-only DOM writes. */
(function(){var main,root=document.documentElement,busy=false,MIN=.74,t=0;
var LISTS=['settings','history','archive','league'];
function over(){return main.scrollHeight>main.clientHeight+2}
function fit(){if(busy||!main)return;if(t){cancelAnimationFrame(t);t=0}busy=true;try{
if(root.style.fontSize)root.style.fontSize='';
if(LISTS.indexOf(document.body.dataset.screen)>=0||!over())return;
var base=parseFloat(getComputedStyle(root).fontSize),lo=MIN,hi=1;
for(var i=0;i<7;i++){var m=(lo+hi)/2;root.style.fontSize=(base*m)+'px';if(over())hi=m;else lo=m}
root.style.fontSize=(base*lo)+'px';
}finally{busy=false}}
function soon(){if(t||busy)return;t=requestAnimationFrame(function(){t=0;fit()})}
function go(){main=document.getElementById('main');if(!main)return;
new MutationObserver(function(ms){if(busy)return;var structural=ms.some(function(m){return Array.from(m.addedNodes).concat(Array.from(m.removedNodes)).some(function(n){return n.nodeType===1})});if(structural)soon()}).observe(main,{childList:true,subtree:true});
main.addEventListener('load',function(e){if(e.target.tagName==='IMG')soon()},true);
addEventListener('resize',soon);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(soon).catch(function(){});soon()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();window.DabtFit=fit})();
