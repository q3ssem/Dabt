/* ملاءمة شاشة التلفزيون: إذا زاد المحتوى عن ارتفاع الشاشة يُصغَّر الخط (كل المقاسات بوحدة rem) حتى يظهر كاملًا بلا تمرير */
(function(){var main,root=document.documentElement,busy=false,MIN=.74;
function over(){return main.scrollHeight>main.clientHeight+2}
function fit(){if(busy||!main)return;busy=true;root.style.fontSize='';if(over()){var base=parseFloat(getComputedStyle(root).fontSize),lo=MIN,hi=1;for(var i=0;i<7;i++){var m=(lo+hi)/2;root.style.fontSize=(base*m)+'px';if(over())hi=m;else lo=m}root.style.fontSize=(base*lo)+'px'}busy=false}
var t=0;function soon(){if(t||busy)return;t=requestAnimationFrame(function(){t=0;fit()})}
function go(){main=document.getElementById('main');if(!main)return;new MutationObserver(function(){if(!busy)soon()}).observe(main,{childList:true,subtree:true});addEventListener('resize',soon);soon()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();window.DabtFit=fit})();
