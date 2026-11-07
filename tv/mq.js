/* Tiny MQTT 3.1.1 client over WebSocket (QoS 0 only), no dependencies, works on old TV browsers.
   Connects to every broker in the list at once so the TV and the phone always share at least one. */
function MQ(urls,onMsg,onState){
  var self={up:0,subs:[],conns:[]};
  function utf8(s){if(window.TextEncoder)return Array.prototype.slice.call(new TextEncoder().encode(s));var u=unescape(encodeURIComponent(s)),o=[];for(var i=0;i<u.length;i++)o.push(u.charCodeAt(i));return o}
  function dec(a){if(window.TextDecoder)return new TextDecoder().decode(new Uint8Array(a));var s='';for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);try{return decodeURIComponent(escape(s))}catch(e){return s}}
  function str(s){var b=utf8(s);return [b.length>>8,b.length&255].concat(b)}
  function rl(n){var o=[];do{var d=n%128;n=Math.floor(n/128);if(n>0)d|=128;o.push(d)}while(n>0);return o}
  function pkt(h,body){return new Uint8Array([h].concat(rl(body.length),body))}
  var cid='dabt'+Math.random().toString(36).slice(2,10);
  function one(url){var c={url:url,ws:null,ok:false,buf:[],pid:1,ping:0,retry:0};
    function send(p){try{if(c.ws&&c.ws.readyState===1)c.ws.send(p)}catch(e){}}
    c.sub=function(t){send(pkt(0x82,[c.pid>>8,c.pid&255].concat(str(t),[0])));c.pid=(c.pid%60000)+1};
    c.pub=function(t,m,ret){if(!c.ok)return;send(pkt(0x30|(ret?1:0),str(t).concat(utf8(m))))};
    function parse(){var b=c.buf;while(b.length>=2){var mul=1,len=0,i=1,d;do{if(i>=b.length)return;d=b[i++];len+=(d&127)*mul;mul*=128}while(d&128);if(b.length<i+len)return;
      var type=b[0]>>4,q=(b[0]>>1)&3,body=b.slice(i,i+len);b=c.buf=b.slice(i+len);
      if(type===2){if(body[1]===0){c.ok=true;self.subs.forEach(c.sub);recount()}}
      else if(type===3){var tl=(body[0]<<8)|body[1],t=dec(body.slice(2,2+tl)),off=2+tl+(q?2:0);try{onMsg(t,dec(body.slice(off)))}catch(e){}}}}
    function open(){try{c.ws=new WebSocket(url,['mqtt'])}catch(e){later();return}c.ws.binaryType='arraybuffer';
      c.ws.onopen=function(){send(pkt(0x10,str('MQTT').concat([4,2,0,45],str(cid+self.conns.indexOf(c)))));clearInterval(c.ping);c.ping=setInterval(function(){send(new Uint8Array([0xC0,0]))},25000)};
      c.ws.onmessage=function(ev){c.buf=c.buf.concat(Array.prototype.slice.call(new Uint8Array(ev.data)));parse()};
      c.ws.onclose=function(){c.ok=false;clearInterval(c.ping);recount();later()};c.ws.onerror=function(){}}
    function later(){clearTimeout(c.retry);c.retry=setTimeout(open,3000)}
    open();return c}
  function recount(){var n=self.conns.filter(function(c){return c.ok}).length;if(n!==self.up){self.up=n;onState&&onState(n)}}
  self.subscribe=function(t){if(self.subs.indexOf(t)<0)self.subs.push(t);self.conns.forEach(function(c){if(c.ok)c.sub(t)})};
  self.publish=function(t,m,ret){self.conns.forEach(function(c){c.pub(t,m,ret)})};
  self.conns=urls.map(one);
  return self}
var MQ_BROKERS=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081/mqtt'];
(function(){var m=/[?&]broker=([^&]+)/.exec(location.search);if(m)MQ_BROKERS=[decodeURIComponent(m[1])]})();
var MQ_BASE='dabt-q3ssem/tv/';
