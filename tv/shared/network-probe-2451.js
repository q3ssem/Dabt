/* Isolated opt-in broker echo measurement. No quiz traffic or persistent data. */
(function(root){'use strict';
function NetworkProbe(urls,opts){
 opts=opts||{};var now=opts.now||function(){return performance.now()},schedule=opts.schedule||function(f){return setInterval(f,100)},unschedule=opts.unschedule||clearInterval,make=opts.make||function(u,m,s){return MQ([u],m,s)},started=now(),rows=[],timer=null,closed=false,limit=6;
 var topic='majlis/diagnostic/'+(opts.id||Array.from(crypto.getRandomValues(new Uint32Array(4))).map(function(x){return x.toString(16).padStart(8,'0')}).join(''));
 function q(a,p){if(!a.length)return null;var s=a.slice().sort(function(x,y){return x-y});return Math.round(s[Math.ceil(s.length*p)-1])}
 function view(){return rows.map(function(r){var dif=[];for(var i=1;i<r.samples.length;i++)dif.push(Math.abs(r.samples[i]-r.samples[i-1]));return {url:r.url,state:r.done?r.samples.length?'done':'unavailable':r.up?'testing':'connecting',sent:r.sent,received:r.samples.length,lost:r.lost,rtt:q(r.samples,.5),p95:q(r.samples,.95),jitter:q(dif,.5)}})}
 function release(r){if(r.client){r.client.close();r.client=null}}
 function stop(){if(closed)return;closed=true;if(timer!==null)unschedule(timer);rows.forEach(release)}
 function tick(){if(closed)return;var t=now();rows.forEach(function(r){if(r.done)return;
  if(r.pending&&t-r.pending.at>=1500){r.lost++;r.pending=null;r.next=t+500}
  if(t-started>=16000||(!r.connected&&t-started>=6000)){if(r.pending){r.lost++;r.pending=null}r.done=true;release(r);return}
  if(r.sent>=limit&&!r.pending){r.done=true;release(r);return}
  if(!r.up||r.pending||t<r.next)return;
  var n=topic+'/'+r.index+'/'+(++r.sent);r.pending={n:n,at:t};try{if(!r.client.publish(topic,n)){r.lost++;r.pending=null;r.next=t+500}}catch(e){r.lost++;r.pending=null;r.next=t+500}
 });var result=view(),done=rows.every(function(r){return r.done});if(done)stop();if(opts.update)opts.update(result,done)}
 urls.slice(0,3).forEach(function(u,i){var r={url:u,index:i,up:false,connected:false,done:false,client:null,sent:0,lost:0,samples:[],pending:null,next:started};rows.push(r);
 try{r.client=make(u,function(t,m){if(closed||r.done||t!==topic||!r.pending||m!==r.pending.n)return;var elapsed=now()-r.pending.at;r.pending=null;if(elapsed>=1500)r.lost++;else r.samples.push(elapsed);r.next=now()+500},function(n){if(closed||r.done)return;r.up=!!n;if(n){r.connected=true;r.next=now()+800}});r.client.subscribe(topic)}catch(e){r.done=true;release(r)}
 });timer=schedule(tick);if(opts.update)opts.update(view(),false);return {stop:stop,snapshot:view};
}
root.DabtNetworkProbe=NetworkProbe;if(typeof module==='object'&&module.exports)module.exports=NetworkProbe;
})(typeof globalThis!=='undefined'?globalThis:this);
