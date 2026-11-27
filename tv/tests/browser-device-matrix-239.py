"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers_239 import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.3.9-device-matrix'; out.mkdir(parents=True,exist_ok=True)
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


import time
engine=os.environ.get('QA_ENGINE','chromium')
seed=json.loads(subprocess.check_output(['node','-e',"const D=require('./shared/core.js');const d=D.initial();d.room='123456';d.config=D.config({sound:false,music:'off'});console.log(JSON.stringify(d))"],cwd=root))
seed['config']['brokers']=BROKERS
broker=LocalBrokers()
def wait_online(ph):
    ph.wait_for_function("window.DabtRemote && DabtRemote.pairingStatus()==='approved' && document.querySelector('#status').dataset.connection==='online'",timeout=25000)
with sync_playwright() as p:
    b=getattr(p,engine).launch()
    tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1')
    tv.locator('#pair').click();tv.locator('#pair-done').click()
    fp=tv.evaluate('DabtSec.fingerprint(DabtTV.publicKey())')
    from urllib.parse import urlencode
    def fresh(name,params,viewport):
        # Fresh storage: no pre-seeded device ID, name, pin or secret.
        pc=b.new_context(viewport=viewport,has_touch=True)
        setup(pc,{});pg=pc.new_page();monitor(pg)
        pg.goto('http://127.0.0.1:8765/remote/remote.html?'+urlencode(params))
        return pc,pg
    # QR-equivalent full link, including expected TV fingerprint and broker list.
    c1,first=fresh('qr',{'c':'123456','k':fp,'b':json.dumps(BROKERS)},{'width':390,'height':844})
    wait_online(first);first.locator('.dpad').wait_for()
    id1=first.evaluate('DabtRemote.identity()');pin=first.evaluate('DabtRemote.pinnedKey()')
    assert pin==tv.evaluate('DabtTV.publicKey()')
    # Manual code from a clean browser, with broker list supplied as test configuration.
    c2,second=fresh('manual',{'b':json.dumps(BROKERS)},{'width':320,'height':568})
    second.locator('#code').fill('١٢٣٤٥٦');second.locator('#pair-form button').click()
    wait_online(second);second.locator('.dpad').wait_for()
    id2=second.evaluate('DabtRemote.identity()');assert id1!=id2
    tv.wait_for_function('ids=>ids.every(x=>!!DabtTV.snapshot().keys[x])',arg=[id1,id2])
    original=tv.evaluate('DabtTV.snapshot().keys')
    # New phone with wrong QR fingerprint must not be silently trusted.
    c3,third=fresh('wrong-qr',{'c':'123456','k':'AAAAAAAAAAAAAAAA','b':json.dumps(BROKERS)},{'width':430,'height':932})
    third.locator('#trust-tv').wait_for(timeout=25000)
    assert third.evaluate('DabtRemote.mismatchKind()')=='qr' and third.locator('.dpad').count()==0
    assert third.evaluate('DabtRemote.pinnedKey()')==''
    c3.close()
    # Background / online event and full reload preserve identity, pairing, and arrows.
    first.evaluate("window.dispatchEvent(new Event('online'))");wait_online(first)
    first.reload();wait_online(first);first.locator('.dpad').wait_for()
    assert first.evaluate('DabtRemote.identity()')==id1 and first.evaluate('DabtRemote.pinnedKey()')==pin
    assert tv.evaluate('DabtTV.snapshot().keys')==original
    # Open question author page then return; selected control is not changed.
    first.locator('#nav button[data-tab=questions]').click()
    first.locator('#author-name').fill('QA');first.locator('[data-avatar="0"]').click();first.locator('#save-identity').click()
    first.locator('#new-question').wait_for();first.locator('#nav button[data-tab=pad]').click();first.locator('.dpad').wait_for()
    assert tv.evaluate('DabtTV.snapshot().config.control')=='all'
    second.locator('.dpad').wait_for()
    # TV restart (no data reset) and phone reconnection.
    tv.reload();tv.locator('#pair').wait_for()
    for ph in [first,second]:wait_online(ph);ph.locator('.dpad').wait_for()
    assert tv.evaluate('DabtTV.snapshot().keys')==original
    broker.assert_clean();assert not errors,errors
    result={'passed':True,'engine':engine,'freshQr':True,'manualArabicDigits':True,'wrongQrRejected':True,'distinctIdentity':True,'phoneReload':True,'tvReload':True,'questionsControlPreserved':True,'pageErrors':errors}
    (out/(engine+'.json')).write_text(json.dumps(result));print(json.dumps(result));b.close()
