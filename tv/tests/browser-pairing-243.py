"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.4.3-pairing'; out.mkdir(parents=True,exist_ok=True)
peers=[]; errors=[]; layouts=[]; stage='startup'
def encode(topic,raw):
    t=topic.encode(); body=len(t).to_bytes(2,'big')+t+raw; n=len(body); buf=[]
    while True:
        d=n%128; n//=128; buf.append(d|(128 if n else 0))
        if not n: break
    return bytes([0x30,*buf])+body
def route_ws(ws):
    peer={'ws':ws,'subs':set(),'open':True,'broker':ws.url}; peers.append(peer)
    ws.on_close(lambda *_:peer.update(open=False))
    def msg(a):
        if not isinstance(a,bytes): return
        i=1; n=0; mul=1
        while True:
            b=a[i]; i+=1; n+=(b&127)*mul; mul*=128
            if not b&128:break
        body=a[i:i+n]; typ=a[0]>>4
        if typ==1:ws.send(bytes([0x20,2,0,0]))
        elif typ==8:
            l=int.from_bytes(body[2:4],'big'); peer['subs'].add(body[4:4+l].decode()); ws.send(bytes([0x90,3,body[0],body[1],0]))
        elif typ==12:ws.send(bytes([0xd0,0]))
        elif typ==3:
            l=int.from_bytes(body[:2],'big'); t=body[2:2+l].decode(); raw=body[2+l:]
            for p in peers:
                if p['open'] and p['broker']==peer['broker'] and t in p['subs']:p['ws'].send(encode(t,raw))
    ws.on_message(msg)
def setup(ctx,seed):
    def route(r):
        u=urlparse(r.request.url)
        if u.netloc!='127.0.0.1:8765':return r.abort()
        f=(root/unquote(u.path).lstrip('/')).resolve()
        if f.is_dir():f=f/'index.html'
        if not f.is_file() or not f.is_relative_to(root):return r.fulfill(status=404,body='missing')
        r.fulfill(path=f,content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    ctx.route('**/*',route); broker.install(ctx)
    ctx.add_init_script('if(!sessionStorage.seeded){for(const [k,v] of Object.entries('+json.dumps(seed,ensure_ascii=True)+'))localStorage.setItem(k,JSON.stringify(v));sessionStorage.seeded=1;}')
def monitor(pg):pg.on('pageerror',lambda e:errors.append(str(e)))
def layout(pg,w,h,name):
    pg.set_viewport_size({'width':w,'height':h});pg.wait_for_timeout(250)
    dims=pg.evaluate("""()=>({pageOverflow:document.documentElement.scrollWidth>innerWidth, mainOverflow:!!document.querySelector('main')&&document.querySelector('main').scrollWidth>document.querySelector('main').clientWidth+2})""")
    layouts.append({'screen':name,'width':w,'height':h,**dims});pg.screenshot(path=out/f'{name}-{w}.png')
    assert not dims['pageOverflow'] and not dims['mainOverflow'],(name,dims)


from threading import Event
import time
allow_hello=Event();allow_ack=Event();hello_seen=Event();ack_seen=Event();stats={'helloDropped':0,'ackDropped':0};hello_ids=set()
def observe(topic,raw,broker_url):
    m=json.loads(json.loads(raw)['b'])
    if topic.endswith('/tv') and m.get('device')=='newphone' and m.get('type')=='hello':
        hello_ids.add(m['requestId']);hello_seen.set()
        if not allow_hello.is_set():stats['helloDropped']+=1;return True
    if topic.endswith('/phone/newphone') and m.get('requestId') in hello_ids and (m.get('result') or {}).get('pairing')=='approved':
        ack_seen.set()
        if not allow_ack.is_set():stats['ackDropped']+=1;return True
    return False

seed=json.loads(subprocess.check_output(['node','-e',"const D=require('./shared/core.js');const d=D.initial();d.room='123456';d.config=D.config({sound:false,music:'off'});console.log(JSON.stringify(d))"],cwd=root))
seed['config']['brokers']=BROKERS
broker=LocalBrokers(observe)
with sync_playwright() as p:
    b=p.chromium.launch();tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1')
    def phone(pid,name,code='123456'):
        c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);setup(c,{'dabt:remote:v2':{'id':pid,'code':code,'name':name,'av':0,'brokers':BROKERS}})
        pg=c.new_page();monitor(pg);pg.goto('http://127.0.0.1:8765/?remote=1');return pg
    def wait_status(ph,s):ph.wait_for_function('s=>window.DabtRemote && DabtRemote.pairingStatus()===s',arg=s,timeout=25000)
    def wait_event(event,ph):
        end=time.monotonic()+20
        while not event.is_set() and time.monotonic()<end:ph.wait_for_timeout(100)
        assert event.is_set()
    first=phone('newphone','New device','')
    first.locator('#code').fill('123456');first.locator('#pair-form button').click()
    wait_event(hello_seen,first);first.wait_for_function('DabtRemote.snapshot()!==null');assert first.locator('.dpad').count()==0
    assert not tv.evaluate("!!DabtTV.snapshot().keys.newphone")
    allow_hello.set();wait_event(ack_seen,first)
    assert tv.evaluate("!!DabtTV.snapshot().keys.newphone")
    assert first.locator('.dpad').count()==0 and first.evaluate("DabtRemote.pairingStatus()")!='approved'
    allow_ack.set();wait_status(first,'approved');first.locator('.dpad').wait_for()
    assert stats['helloDropped']>0 and stats['ackDropped']>0
    # Explicit opt-in to manual approval; previously approved device keeps working.
    tv.locator('#pair').click();tv.locator('#pair-requests').click();tv.locator('#pair-mode').click();tv.locator('#confirm-yes').click()
    assert tv.evaluate('DabtTV.snapshot().config.pairApproval')
    second=phone('pendingphone','Pending device');wait_status(second,'pending')
    assert second.locator('.dpad').count()==0 and not tv.evaluate("!!DabtTV.snapshot().keys.pendingphone")
    assert second.evaluate("async()=>{try{await DabtRemote.request('open',{});return false}catch(e){return true}}")
    # A valid signature without approved pairing must still be refused by TV.
    raw=second.evaluate("""()=>{let saved=JSON.parse(localStorage.getItem('dabt:remote:v2'));return JSON.stringify(DabtSec.seal({v:2,device:saved.id,requestId:'qaUnapprovedOpen',instance:DabtRemote.snapshot().instance,type:'open',payload:{},ts:DabtRemote.snapshot().ts},DabtSec.fromSecret(saved.sk)))}""")
    tv.evaluate("raw=>DabtTV.receive('dabt/v2/123456/tv',raw)",raw)
    assert not tv.evaluate("!!DabtTV.snapshot().keys.pendingphone") and not tv.evaluate("!!DabtTV.snapshot().session")
    tv.locator('#pair-refresh').click();tv.locator('#pair-accept-pendingphone').click()
    wait_status(second,'approved');second.locator('.dpad').wait_for();first.locator('.dpad').wait_for()
    assert tv.evaluate('DabtTV.snapshot().config.control')=='all'
    first_key=tv.evaluate('DabtTV.snapshot().keys.newphone');second_key=tv.evaluate('DabtTV.snapshot().keys.pendingphone')
    # Conflicting key for same device identity cannot overwrite the approved key.
    conflict=phone('newphone','Different device');wait_status(conflict,'conflict')
    assert conflict.locator('.dpad').count()==0 and tv.evaluate('DabtTV.snapshot().keys.newphone')==first_key
    # Refuse a different new device, leave existing approvals intact.
    third=phone('deniedphone','Denied device');wait_status(third,'pending')
    tv.locator('#pair-refresh').click();tv.locator('#pair-reject-deniedphone').click();wait_status(third,'denied')
    assert not tv.evaluate("!!DabtTV.snapshot().keys.deniedphone")
    second.reload();wait_status(second,'approved');second.locator('.dpad').wait_for()
    assert tv.evaluate('DabtTV.snapshot().keys.pendingphone')==second_key
    assert tv.evaluate('DabtTV.snapshot().keys.newphone')==first_key
    broker.assert_clean();assert not errors,errors
    (out/'pairing-result.json').write_text(json.dumps({'passed':True,'firstHelloRecovered':True,'lostAckRecovered':True,'manualApproved':True,'manualDenied':True,'conflictingKeyRejected':True,'unapprovedCommandRejected':True,'existingKeysPreserved':True,'pageErrors':errors,**stats}))
    print(json.dumps({'passed':True,**stats}),flush=True);b.close()
