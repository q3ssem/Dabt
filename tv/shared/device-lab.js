/* Majlis device calibration P2. ES5-style syntax, no external endpoints or identity telemetry. */
(function(root){'use strict';
function q(a,p){if(!a.length)return null;var s=a.slice().sort(function(a,b){return a-b});return Math.round(s[Math.ceil(s.length*p)-1]*10)/10}
function stats(samples){if(!samples.length)return null;var sum=samples.reduce(function(a,b){return a+b},0);return {frames:samples.length,fps:Math.round(10000*samples.length/sum)/10,p50:q(samples,.5),p95:q(samples,.95),over50:samples.filter(function(x){return x>50}).length}}
function recommend(a,b){function pass(x,f,p){return x&&x.frames>=30&&x.fps>=f&&x.p95<=p&&x.over50<=Math.max(1,x.frames*.03)}if(pass(b,55,24))return 'high';if(pass(b,42,34))return 'balanced';if(pass(a,27,45))return 'lite';return 'unverified'}
function inspect(){var n=root.navigator||{},d=root.document,caps={};function check(name,fn){try{caps[name]=fn()}catch(e){caps[name]=false}}
 check('canvas2d',function(){var c=d.createElement('canvas');var ok=!!c.getContext('2d');c.width=c.height=1;return ok});
 check('webgl',function(){var c=d.createElement('canvas'),gl=c.getContext('webgl2')||c.getContext('webgl')||c.getContext('experimental-webgl');if(!gl)return false;var ver=gl.getParameter(gl.VERSION),ext=gl.getExtension('WEBGL_lose_context');if(ext)ext.loseContext();c.width=c.height=1;return String(ver).slice(0,120)});
 check('webRTC',function(){var C=root.RTCPeerConnection||root.webkitRTCPeerConnection;if(!C)return false;var p=new C({iceServers:[]});try{var ch=p.createDataChannel('probe',{ordered:false,maxRetransmits:0});ch.close();return true}finally{p.close()}});
 check('webSocket',function(){return typeof root.WebSocket==='function'});
 check('audioAPI',function(){return !!(root.AudioContext||root.webkitAudioContext)});
 check('localStorage',function(){var s=root.localStorage,k='majlis:device-test:'+Math.random().toString(36).slice(2);try{s.setItem(k,'ok');return s.getItem(k)==='ok'}finally{s.removeItem(k)}});
 check('serviceWorker',function(){return !!(root.isSecureContext&&n.serviceWorker)});
 check('cacheStorage',function(){return !!(root.isSecureContext&&root.caches)});
 check('secureContext',function(){return root.isSecureContext===true});
 check('animationFrame',function(){return typeof root.requestAnimationFrame==='function'&&typeof root.cancelAnimationFrame==='function'});
 check('crypto',function(){return !!(root.crypto&&root.crypto.subtle)});
 var ua=String(n.userAgent||'').slice(0,400),m=ua.match(/(?:Chrome|Chromium)\/([\d.]+)/),v=ua.match(/Version\/([\d.]+)/);
 return {schema:1,ua:ua,engine:m?'Chromium '+m[1]:/Firefox\//.test(ua)?'Firefox':/AppleWebKit\//.test(ua)?'WebKit'+(v?' '+v[1]:''):'unknown',viewport:{width:root.innerWidth||0,height:root.innerHeight||0,dpr:root.devicePixelRatio||1},screen:{width:root.screen&&root.screen.width||0,height:root.screen&&root.screen.height||0},memoryGB:typeof n.deviceMemory==='number'?n.deviceMemory:null,threads:typeof n.hardwareConcurrency==='number'?n.hardwareConcurrency:null,caps:caps};
}
function run(canvas,opts){opts=opts||{};var stop=false,raf=0,timeout=0,phase=0,started=0,last=0,values=[],results=[],ctx=null,stages=[{w:1280,h:720},{w:1920,h:1080}];
 function cleanup(){if(raf)root.cancelAnimationFrame(raf);clearTimeout(timeout);root.document.removeEventListener('visibilitychange',visibility);canvas.width=canvas.height=1;ctx=null}
 function end(reason){if(stop)return;stop=true;cleanup();if(opts.done)opts.done({status:reason,tests:results,profile:reason==='complete'?recommend(results[0],results[1]):'unverified'})}
 function visibility(){if(root.document.hidden)end('hidden')}
 function stage(){if(phase>=stages.length){end('complete');return}var s=stages[phase];canvas.width=s.w;canvas.height=s.h;ctx=canvas.getContext('2d');if(!ctx){end('unsupported');return}started=last=0;values=[];if(opts.progress)opts.progress(phase+1,s);raf=root.requestAnimationFrame(frame)}
 function frame(t){if(stop)return;if(root.document.hidden){end('hidden');return}try{if(!started){started=t;last=t}var elapsed=t-started;if(elapsed>=500&&t>last)values.push(t-last);last=t;
 var w=canvas.width,h=canvas.height;ctx.fillStyle='#142438';ctx.fillRect(0,0,w,h);ctx.fillStyle='#23394e';for(var j=0;j<12;j++)ctx.fillRect(0,j*h/12,w,2);
 for(var i=0;i<48;i++){var x=(i*173+elapsed*(.05+i%4*.025))%w,y=(i*97+Math.sin(elapsed/450+i)*h*.12+h)%h;ctx.fillStyle=i%2?'#76b8aa':'#e3ba72';ctx.beginPath();ctx.arc(x,y,12+i%5*3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e5eef4';ctx.fillRect(x-10,y+20,20,3)}
 ctx.fillStyle='#e5eef4';ctx.font='24px sans-serif';ctx.fillText('Majlis • '+w+' × '+h,24,36);
 if(elapsed>=2500){var v=stats(values);if(!v){end('insufficient');return}v.width=w;v.height=h;results.push(v);phase++;stage()}else raf=root.requestAnimationFrame(frame)
 }catch(e){end('error')}}
 if(!canvas||typeof root.requestAnimationFrame!=='function'||typeof root.cancelAnimationFrame!=='function'||root.document.hidden){if(opts.done)opts.done({status:'unsupported',tests:[],profile:'unverified'});return {stop:function(){}}}
 root.document.addEventListener('visibilitychange',visibility);timeout=setTimeout(function(){end('timeout')},12000);try{stage()}catch(e){end('error')}return {stop:function(){end('cancelled')}}}
function testAudio(done){var C=root.AudioContext||root.webkitAudioContext,c=null,finished=false,timer;function finish(s){if(finished)return;finished=true;clearTimeout(timer);if(c)try{var p=c.close();if(p&&p.catch)p.catch(function(){})}catch(e){}done(s)}if(!C){finish('unsupported');return function(){}}try{c=new C();timer=setTimeout(function(){finish('timeout')},2500);var p=c.resume?c.resume():null;if(p&&p.then)p.then(function(){finish(c.state==='running'?'running':'blocked')},function(){finish('blocked')});else finish(c.state==='running'?'running':'blocked')}catch(e){finish('error')}return function(){finish('cancelled')}}
var api={inspect:inspect,run:run,stats:stats,recommend:recommend,testAudio:testAudio};root.MajlisDeviceLab=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
