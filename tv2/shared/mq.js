/* MQTT 3.1.1 over WSS, QoS 0. Application messages use request IDs + ACKs. */
(function(root){'use strict';
function MQ(urls,onMessage,onState,WS){WS=WS||root.WebSocket;var self={up:0,subs:[],conns:[]},closed=false,cid='dabt2'+Math.random().toString(36).slice(2),MAX=1500000;
function utf(s){if(typeof TextEncoder!=='undefined')return Array.from(new TextEncoder().encode(s));var x=unescape(encodeURIComponent(s));return Array.from(x).map(function(c){return c.charCodeAt(0)})}
function dec(a){if(typeof TextDecoder!=='undefined')return new TextDecoder().decode(new Uint8Array(a));return decodeURIComponent(escape(String.fromCharCode.apply(null,a)))}
function str(s){var a=utf(s);if(a.length>65535)throw Error('MQTT string too long');return [a.length>>8,a.length&255].concat(a)}
function packet(h,b){var n=b.length,a=[];do{var d=n%128;n=Math.floor(n/128);a.push(d|(n?128:0))}while(n);return new Uint8Array([h].concat(a,b))}
function count(){var n=self.conns.filter(function(c){return c.ok}).length;if(n!==self.up){self.up=n;if(onState)onState(n)}}
function one(url,index){var c={url:url,ok:false,ws:null,buf:[],retry:0,ping:0,watch:0,attempt:0,pid:0,lastRx:0};
function send(p){if(c.ws&&c.ws.readyState===1)c.ws.send(p)}
c.sub=function(t){c.pid=c.pid%65535+1;send(packet(0x82,[c.pid>>8,c.pid&255].concat(str(t),[0])))};
c.pub=function(t,m){if(!c.ok)return false;var body=str(t).concat(utf(m));if(body.length>MAX)throw Error('الرسالة أكبر من حد الاتصال');send(packet(0x30,body));return true};
function retry(){if(closed)return;clearTimeout(c.retry);c.retry=setTimeout(open,Math.min(15000,1000*Math.pow(1.7,Math.min(c.attempt++,6)))+Math.random()*500)}
function fail(){if(closed)return;var ws=c.ws;c.ws=null;c.ok=false;c.buf=[];clearInterval(c.ping);clearTimeout(c.watch);if(ws){ws.onclose=null;ws.onerror=null;try{ws.close()}catch(e){}}count();retry()}
function parse(){var b=c.buf;while(b.length>=2){var mul=1,len=0,i=1,d,n=0;do{if(i>=b.length)return;d=b[i++];len+=(d&127)*mul;mul*=128;if(++n>4||len>MAX){fail();return}}while(d&128);if(b.length<i+len)return;var h=b[0],type=h>>4,body=b.slice(i,i+len);b=c.buf=b.slice(i+len);c.lastRx=Date.now();if(type===2){if(body.length!==2||body[1]!==0){fail();return}c.ok=true;c.attempt=0;clearTimeout(c.watch);self.subs.forEach(c.sub);count()}else if(type===3){if(body.length<2)continue;var tl=(body[0]<<8)|body[1],off=2+tl+((h>>1)&3?2:0);if(off>body.length)continue;try{onMessage(dec(body.slice(2,2+tl)),dec(body.slice(off)))}catch(e){if(self.onError)self.onError(e)}}}}
function open(){if(closed)return;c.buf=[];try{var ws=c.ws=new WS(url,['mqtt']);ws.binaryType='arraybuffer';ws.onopen=function(){if(c.ws!==ws||closed)return;c.lastRx=Date.now();send(packet(0x10,str('MQTT').concat([4,2,0,40],str(cid+index))));c.watch=setTimeout(fail,9000);clearInterval(c.ping);c.ping=setInterval(function(){if(Date.now()-c.lastRx>60000){fail();return}try{send(new Uint8Array([0xc0,0]))}catch(e){fail()}},20000)};ws.onmessage=function(e){if(c.ws!==ws||closed)return;var a=Array.from(new Uint8Array(e.data));if(c.buf.length+a.length>MAX+8){fail();return}c.buf=c.buf.concat(a);parse()};ws.onerror=fail;ws.onclose=fail;}catch(e){retry()}}
c.close=function(){clearTimeout(c.retry);clearTimeout(c.watch);clearInterval(c.ping);c.ok=false;if(c.ws){c.ws.onclose=null;c.ws.onerror=null;try{c.ws.close()}catch(e){}}};c.open=open;return c;}
self.conns=urls.map(one);self.conns.forEach(function(c){c.open()});self.subscribe=function(t){if(self.subs.includes(t))return;self.subs.push(t);self.conns.forEach(function(c){if(c.ok)c.sub(t)})};self.publish=function(t,m){if(typeof m!=='string')m=JSON.stringify(m);var n=0;self.conns.forEach(function(c){try{if(c.pub(t,m))n++}catch(e){if(self.onError)self.onError(e)}});return n};self.close=function(){closed=true;self.conns.forEach(function(c){c.close()});self.up=0;if(onState)onState(0)};return self;}
root.MQ=MQ;if(typeof module==='object'&&module.exports)module.exports=MQ;
})(typeof globalThis!=='undefined'?globalThis:this);
