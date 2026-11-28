(function(){'use strict';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.hash.slice(1)),incoming={room:params.get('room'),secret:params.get('secret')},isRemote=MajlisNetwork.validInvite(incoming);
const brokers=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081/mqtt'];
let mq,link,epoch=0,hold=null,repeat=0,x=50,y=50,inviteURL='';
$('host').hidden=isRemote;$('remote').hidden=!isRemote;
function stop(){epoch++;clearInterval(repeat);repeat=0;hold=null;if(link){link.close();link=null}if(mq){mq.close();mq=null}$('status').textContent='غير متصل';$('metrics').textContent='—'}
async function start(i,role){stop();const e=epoch,topic='majlis/network/v1/'+i.room;$('status').textContent='جارٍ الاتصال';
 const l=await MajlisNetwork.createLink({invite:i,role,send:raw=>mq&&mq.publish(topic,raw)>0,onRoute:r=>{if(e===epoch)$('status').textContent='المسار: '+r},onMetrics:m=>{if(e===epoch)$('metrics').textContent=JSON.stringify(m,null,2)},onInput:m=>{if(e!==epoch)return;x=Math.max(4,Math.min(96,x+m.x*3));y=Math.max(10,Math.min(90,y+m.y*3));$('dot').style.left=x+'%';$('dot').style.top=y+'%';$('dot').style.background=m.action?'#ecc464':'#9adfce'}});
 if(e!==epoch){l.close();return}link=l;mq=MQ(brokers,(t,raw)=>{if(t===topic&&e===epoch)l.receive(raw)},n=>{if(e===epoch)$('status').textContent='الخوادم المتصلة: '+n});mq.subscribe(topic);
}
$('invite').onclick=async()=>{try{const i=MajlisNetwork.createInvite(),u=new URL(location.href);u.hash=new URLSearchParams(i).toString();inviteURL=u.href;$('url').href=inviteURL;$('inviteBox').hidden=false;await start(i,'host')}catch(e){$('status').textContent=String(e)}};
$('copy').onclick=()=>navigator.clipboard.writeText(inviteURL).catch(()=>{$('status').textContent='تعذر النسخ؛ اضغط مطولًا على الرابط'});
$('join').onclick=()=>start(incoming,'remote').catch(e=>{$('status').textContent=String(e)});
$('stop').onclick=stop;
function release(){clearInterval(repeat);repeat=0;hold=null;if(link)link.move(0,0,false)}
$('pad').querySelectorAll('button').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();release();hold={x:+b.dataset.x||0,y:+b.dataset.y||0,a:!!b.dataset.action};try{b.setPointerCapture(e.pointerId)}catch(_){}const send=()=>{if(link&&hold)link.move(hold.x,hold.y,hold.a)};send();repeat=setInterval(send,100)};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release});
window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});window.addEventListener('pagehide',stop);
})();