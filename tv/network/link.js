/* Majlis Network 3.0 P1: isolated one-TV/one-controller experimental link. */
(function(root){'use strict';
const VERSION=1,MAX=48000,enc=new TextEncoder(),dec=new TextDecoder();
function token(n){return Array.from(crypto.getRandomValues(new Uint8Array(n)),v=>v.toString(16).padStart(2,'0')).join('')}
function bytes(s){if(typeof s!=='string'||!/^([a-f0-9]{2})+$/.test(s))throw Error('invalid hex');return Uint8Array.from(s.match(/../g),x=>parseInt(x,16))}
function hex(a){return Array.from(new Uint8Array(a),x=>x.toString(16).padStart(2,'0')).join('')}
function createInvite(){return {room:token(16),secret:token(32)}}
function validInvite(i){return i&&/^[a-f0-9]{32}$/.test(i.room)&&/^[a-f0-9]{64}$/.test(i.secret)}
function quantile(a,p){if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y);return Math.round(s[Math.ceil(p*s.length)-1])}
function metric(){return {rtt:[],sent:0,received:0,lost:0,pending:new Map(),last:0}}
function summary(m){let j=[];for(let i=1;i<m.rtt.length;i++)j.push(Math.abs(m.rtt[i]-m.rtt[i-1]));return {samples:m.rtt.length,rtt:quantile(m.rtt,.5),p95:quantile(m.rtt,.95),jitter:quantile(j,.5),lost:m.lost,sent:m.sent,pending:m.pending.size}}
function clamp(v){return Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0}
async function createLink(opts){
 if(!validInvite(opts.invite)||!['host','remote'].includes(opts.role)||typeof opts.send!=='function')throw Error('invalid link options');
 if(!crypto.subtle)throw Error('secure browser context required');
 const role=opts.role,other=role==='host'?'remote':'host',room=opts.invite.room,id=token(12),key=await crypto.subtle.importKey('raw',bytes(opts.invite.secret),'AES-GCM',false,['encrypt','decrypt']);
 const aad=enc.encode('majlis-network-v1:'+room),metrics={direct:metric(),relay:metric()},seen=new Set();
 let peer='',pc=null,dc=null,closed=false,ready=false,relayReady=false,offer=null,answer=null,offerPending=false,queue=Promise.resolve(),sendQueue=Promise.resolve(),seq=0,lastInput=0,lastMove=0,lastHello=0,route='none',lastRouteChange=0,previousSample=0,lastError='',neutral=true,timer,iceType='unknown';
 const clock=()=>performance.now();
 function emit(name,value){try{if(typeof opts[name]==='function')opts[name](value)}catch(e){lastError='callback: '+String(e)}}
 function error(e){lastError=String(e&&e.message||e);emit('onError',lastError)}
 function wrap(body){return {v:VERSION,role,id,to:peer,body}}
 function relay(body){if(closed)return Promise.resolve(false);const data=wrap(body);
  sendQueue=sendQueue.then(async()=>{if(closed)return false;const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,enc.encode(JSON.stringify(data)));if(closed)return false;return opts.send(JSON.stringify({v:VERSION,iv:hex(iv),data:hex(cipher)}))!==false}).catch(e=>{error(e);return false});return sendQueue}
 function direct(body){if(!dc||dc.readyState!=='open'||dc.bufferedAmount>16384)return false;try{dc.send(JSON.stringify(body));return true}catch(e){error(e);return false}}
 function sendPath(p,body){return p==='direct'?direct(body):relay(body)}
 function select(){const now=clock(),d=metrics.direct,r=metrics.relay,liveD=ready&&dc&&dc.readyState==='open'&&(!d.last?now-lastRouteChange<5000:now-d.last<5000),liveR=relayReady&&(!r.last||now-r.last<6000);
  let next=liveD?'direct':liveR?'relay':'none';
  if(liveD&&liveR&&d.rtt.length>=4&&r.rtt.length>=4&&quantile(d.rtt,.95)>quantile(r.rtt,.95)+35)next='relay';
  if(next!==route){if(route==='none'||next==='none'||(route==='direct'&&!liveD)||(route==='relay'&&!liveR)||now-lastRouteChange>2500){route=next;lastRouteChange=now;emit('onRoute',route)}}return route}
 function receiveBody(body,path){if(!body||typeof body!=='object')return;
  if(body.t==='ping'&&typeof body.n==='string'&&/^[a-f0-9]{16}$/.test(body.n)){sendPath(path,{t:'pong',n:body.n});return}
  if(body.t==='pong'){let m=metrics[path],at=m.pending.get(body.n);if(at===undefined)return;m.pending.delete(body.n);m.rtt.push(clock()-at);if(m.rtt.length>40)m.rtt.shift();m.received++;m.last=clock();select();return}
  if(role==='host'&&body.t==='move'&&Number.isSafeInteger(body.s)&&body.s>lastInput&&body.s<=Number.MAX_SAFE_INTEGER&&typeof body.action==='boolean'&&Number.isFinite(body.x)&&Number.isFinite(body.y)){lastInput=body.s;lastMove=clock();neutral=false;emit('onInput',{x:clamp(body.x),y:clamp(body.y),action:body.action,seq:body.s,path})}}
 function bindChannel(channel){dc=channel;dc.onopen=()=>{if(closed)return;ready=true;metrics.direct.last=clock();select();probe('direct')};dc.onclose=()=>{ready=false;select()};dc.onerror=()=>{ready=false;select()};dc.onmessage=e=>{if(closed||typeof e.data!=='string'||e.data.length>2048)return;try{receiveBody(JSON.parse(e.data),'direct')}catch(_){}}}
 function makePC(){if(pc)return pc;if(!root.RTCPeerConnection)throw Error('WebRTC not supported');pc=new RTCPeerConnection({iceServers:opts.iceServers||[]});pc.ondatachannel=e=>{if(role==='remote'&&e.channel.label==='majlis-motion'&&!dc)bindChannel(e.channel);else e.channel.close()};pc.onconnectionstatechange=()=>{if(['failed','closed','disconnected'].includes(pc.connectionState)){ready=false;select()}else if(pc.connectionState==='connected'&&dc&&dc.readyState==='open'){ready=true;metrics.direct.last=clock();select()}};return pc}
 function gather(p){return new Promise(resolve=>{if(p.iceGatheringState==='complete')return resolve();let timeout;const done=()=>{clearTimeout(timeout);p.removeEventListener('icegatheringstatechange',check);resolve()};const check=()=>{if(p.iceGatheringState==='complete')done()};p.addEventListener('icegatheringstatechange',check);timeout=setTimeout(done,5000)})}
 async function hostOffer(){if(offer){await relay({t:'offer',sdp:offer});return}if(offerPending||closed)return;offerPending=true;try{const p=makePC();bindChannel(p.createDataChannel('majlis-motion',{ordered:false,maxRetransmits:0}));await p.setLocalDescription(await p.createOffer());await gather(p);if(closed)return;offer=p.localDescription.sdp;await relay({t:'offer',sdp:offer})}catch(e){error(e)}finally{offerPending=false}}
 async function accept(raw){if(closed||typeof raw!=='string'||raw.length>MAX)return;let env,obj;
  try{env=JSON.parse(raw);if(env.v!==VERSION||typeof env.iv!=='string'||! /^[a-f0-9]{24}$/.test(env.iv)||typeof env.data!=='string'||seen.has(env.iv))return;obj=JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(env.iv),additionalData:aad},key,bytes(env.data))))}catch(_){return}
  if(closed||obj.v!==VERSION||obj.role!==other||! /^[a-f0-9]{24}$/.test(obj.id)||!obj.body||(obj.to&&obj.to!==id)||peer&&peer!==obj.id)return;
  if(!peer&& !((role==='host'&&obj.body.t==='hello')||(role==='remote'&&obj.body.t==='offer'&&obj.to===id)||(role==='remote'&&obj.body.t==='welcome'&&obj.to===id)))return;
  seen.add(env.iv);if(seen.size>1024)seen.delete(seen.values().next().value);peer=obj.id;relayReady=true;metrics.relay.last=clock();select();let b=obj.body;
  if(b.t==='hello'&&role==='host'){await relay({t:'welcome'});if(!ready)await hostOffer();return}
  if(b.t==='welcome')return;
  if(b.t==='offer'&&role==='remote'&&typeof b.sdp==='string'&&b.sdp.length<16000){if(answer){await relay({t:'answer',sdp:answer});return}try{const p=makePC();await p.setRemoteDescription({type:'offer',sdp:b.sdp});await p.setLocalDescription(await p.createAnswer());await gather(p);if(closed)return;answer=p.localDescription.sdp;await relay({t:'answer',sdp:answer})}catch(e){error(e)}return}
  if(b.t==='answer'&&role==='host'&&pc&&pc.signalingState==='have-local-offer'&&typeof b.sdp==='string'&&b.sdp.length<16000){try{await pc.setRemoteDescription({type:'answer',sdp:b.sdp})}catch(e){error(e)}return}
  receiveBody(b,'relay')
 }
 function probe(path){const m=metrics[path],n=token(8);m.pending.set(n,clock());m.sent++;if(path==='direct'&&!direct({t:'ping',n})){m.pending.delete(n);m.lost++}else if(path==='relay')relay({t:'ping',n})}
 async function iceStats(){if(!pc||!ready)return;try{const s=await pc.getStats();let pair;s.forEach(x=>{if(x.type==='transport'&&x.selectedCandidatePairId)pair=s.get(x.selectedCandidatePairId);if(!pair&&x.type==='candidate-pair'&&x.state==='succeeded'&&x.nominated)pair=x});if(pair){const a=s.get(pair.localCandidateId),b=s.get(pair.remoteCandidateId);iceType=a&&b?(a.candidateType==='relay'||b.candidateType==='relay'?'turn':a.candidateType==='host'&&b.candidateType==='host'?'host':'stun/other'):'unknown'}}catch(_){}}
 function tick(){if(closed)return;const now=clock();if(role==='remote'&&!ready&&now-lastHello>1800){lastHello=now;relay({t:'hello'})}for(const m of Object.values(metrics)){for(const [n,at] of m.pending)if(now-at>2500){m.pending.delete(n);m.lost++}}if(now-previousSample>=1000){previousSample=now;if(ready)probe('direct');if(relayReady)probe('relay');iceStats();emit('onMetrics',snapshot())}select();if(role==='host'&&!neutral&&now-lastMove>350){neutral=true;emit('onInput',{x:0,y:0,action:false,seq:lastInput,path:'watchdog'})}}
 function snapshot(){return {role,route,peer:!!peer,direct:summary(metrics.direct),relay:summary(metrics.relay),iceType,rtcState:pc?pc.connectionState:'new',error:lastError}}
 timer=setInterval(tick,100);lastRouteChange=clock();if(role==='remote'){lastHello=clock();relay({t:'hello'})}
 return {receive(raw){if(closed)return Promise.resolve();queue=queue.then(()=>accept(raw)).catch(error);return queue},move(x,y,action){if(closed||role!=='remote')return false;const path=select();if(path==='none')return false;const body={t:'move',s:++seq,x:clamp(x),y:clamp(y),action:!!action};if(path==='direct'){if(direct(body))return true;return false}relay(body);return true},snapshot,close(){if(closed)return;closed=true;clearInterval(timer);if(dc)dc.close();if(pc)pc.close();if(role==='host'&&!neutral)emit('onInput',{x:0,y:0,action:false,seq:lastInput,path:'closed'});route='none';seen.clear();Object.values(metrics).forEach(m=>m.pending.clear())}}
}
root.MajlisNetwork={createInvite,validInvite,createLink};
})(globalThis);
