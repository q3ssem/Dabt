/* Dabt — توقيع الرسائل بين التلفزيون والجوال (Ed25519 عبر TweetNaCl، متزامن ويعمل دون سياق آمن).
   كل جهاز يملك مفتاحًا سريًا لا يغادره. كل رسالة تُرسل كغلاف {v:3,b,s,k}:
   b = نص JSON للرسالة، s = توقيع b، k = المفتاح العام للمرسل. المستقبل يتحقق قبل أي قراءة. */
(function(root,factory){var api=factory(root.nacl||(typeof require==='function'?require('../vendor/nacl-fast.min.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.DabtSec=api;})(typeof globalThis!=='undefined'?globalThis:this,function(nacl){'use strict';
if(!nacl||!nacl.sign)throw Error('مكتبة التوقيع غير محملة');
var A='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64(u){var s='',i;for(i=0;i+2<u.length;i+=3){var n=u[i]<<16|u[i+1]<<8|u[i+2];s+=A[n>>18&63]+A[n>>12&63]+A[n>>6&63]+A[n&63]}if(i<u.length){var m=u[i]<<16|(i+1<u.length?u[i+1]<<8:0);s+=A[m>>18&63]+A[m>>12&63]+(i+1<u.length?A[m>>6&63]:'=')+'='}return s}
function unb64(s){if(typeof s!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(s)||s.length%4)return null;var p=s.charAt(s.length-1)==='='?s.charAt(s.length-2)==='='?2:1:0,out=new Uint8Array(s.length/4*3-p),j=0;for(var i=0;i<s.length;i+=4){var n=A.indexOf(s[i])<<18|A.indexOf(s[i+1])<<12|(s[i+2]==='='?0:A.indexOf(s[i+2]))<<6|(s[i+3]==='='?0:A.indexOf(s[i+3]));out[j++]=n>>16&255;if(j<out.length)out[j++]=n>>8&255;if(j<out.length)out[j++]=n&255}return out}
function utf8(s){var bin=unescape(encodeURIComponent(s)),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
function fromSecret(sk){var k=unb64(sk);if(!k||k.length!==64)return null;var kp=nacl.sign.keyPair.fromSecretKey(k);return {sk:kp.secretKey,pk:kp.publicKey,pub:b64(kp.publicKey)}}
function create(){var kp=nacl.sign.keyPair();return {sk:kp.secretKey,pk:kp.publicKey,pub:b64(kp.publicKey)}}
function secret(kp){return b64(kp.sk)}
/* بصمة قصيرة للمفتاح العام تُوضع في رابط QR لتثبيت التلفزيون الصحيح */
function fingerprint(pub){var k=unb64(pub);if(!k||k.length!==32)return '';return b64(nacl.hash(k).subarray(0,12)).replace(/\+/g,'-').replace(/\//g,'_')}
function seal(obj,kp){var b=JSON.stringify(obj);return {v:3,b:b,s:b64(nacl.sign.detached(utf8(b),kp.sk)),k:kp.pub}}
/* يرجع {body,key} فقط إذا كان التوقيع صحيحًا؛ أي شيء آخر يُرفض بصمت */
/* parse: يفك الغلاف دون تحقق (للتصفية الرخيصة فقط، مثل الرسائل القديمة أو المكررة). لا يُعتمد على محتواه قبل verify. */
function parse(raw){var m;try{m=typeof raw==='string'?JSON.parse(raw):raw}catch(e){return null}if(!m||m.v!==3||typeof m.b!=='string'||typeof m.s!=='string'||typeof m.k!=='string'||m.b.length>1450000)return null;var body;try{body=JSON.parse(m.b)}catch(e){return null}if(!body||typeof body!=='object'||Array.isArray(body))return null;return {m:m,body:body,key:m.k}}
function verify(p){if(!p)return false;var k=unb64(p.m.k),s=unb64(p.m.s);if(!k||k.length!==32||!s||s.length!==64)return false;try{return nacl.sign.detached.verify(utf8(p.m.b),s,k)}catch(e){return false}}
/* يرجع {body,key} فقط إذا كان التوقيع صحيحًا؛ أي شيء آخر يُرفض بصمت */
function open(raw){var p=parse(raw);return p&&verify(p)?{body:p.body,key:p.key}:null}
function validKey(pub){var k=unb64(pub);return !!k&&k.length===32}
return {b64:b64,unb64:unb64,create:create,fromSecret:fromSecret,secret:secret,fingerprint:fingerprint,seal:seal,open:open,parse:parse,verify:verify,validKey:validKey};
});
