"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.4.0-guided'; out.mkdir(parents=True,exist_ok=True)
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



engine=os.environ.get('QA_ENGINE','chromium')
seed=json.loads(subprocess.check_output(['node','-e',"const D=require('./shared/core.js');const d=D.initial();d.room='123456';d.config=D.config({sound:false,music:'off'});console.log(JSON.stringify(d))"],cwd=root))
seed['config']['brokers']=BROKERS
broker=LocalBrokers()
with sync_playwright() as p:
    b=getattr(p,engine).launch();tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1')
    tv.locator('#kahoot').click()
    def phone(pid,name='',av=-1,code='123456'):
        c=b.new_context(viewport={'width':390,'height':844},has_touch=True);setup(c,{'dabt:remote:v2':{'id':pid,'code':code,'name':name,'av':av,'brokers':BROKERS}});ph=c.new_page();monitor(ph);ph.goto('http://127.0.0.1:8765/?remote=1');return ph
    def online(ph):ph.wait_for_function("window.DabtRemote && DabtRemote.pairingStatus()==='approved' && document.querySelector('#status').dataset.connection==='online'")
    host=phone('guidehost','Host',0);online(host)
    newcomer=phone('guidenew','',-1,'')
    assert newcomer.locator('#guide-link').get_attribute('data-step')=='current'
    assert newcomer.locator('#guide-actions').is_hidden()
    newcomer.locator('#code').fill('١٢٣٤٥٦');newcomer.locator('#pair-form button').click();online(newcomer)
    assert newcomer.locator('#guide-link').get_attribute('data-step')=='done'
    assert newcomer.locator('#guide-profile').get_attribute('data-step')=='current'
    assert newcomer.locator('#guide-write').is_disabled()
    host.wait_for_function("document.querySelector('#device-assist-banner').textContent.includes('1 غير منضم')")
    newcomer.locator('#guide-identity').click();newcomer.locator('#guide-name').fill('Writer');newcomer.locator('#modal [data-avatar="2"]').click();newcomer.locator('#guide-save').click()
    assert newcomer.locator('#guide-profile').get_attribute('data-step')=='done'
    newcomer.locator('#guide-write').click();newcomer.locator('#new-question').wait_for()
    newcomer.locator('#nav button[data-tab=pad]').click();newcomer.locator('.dpad').wait_for()
    assert tv.evaluate('DabtTV.snapshot().config.control')=='all'
    # Select one controller, then enable manual approval.
    host.locator('#nav button[data-tab=control]').click();host.locator('#host-guidehost').click();host.locator('#cfyes').click()
    newcomer.wait_for_function("DabtRemote.snapshot().control.mode==='selected'")
    assert newcomer.locator('#device-assist-banner').is_hidden()
    assert newcomer.evaluate("async()=>{try{await DabtRemote.request('deviceList',{});return false}catch(e){return true}}")
    tv.locator('#pair').click();tv.locator('#pair-requests').click();tv.locator('#pair-mode').click();tv.locator('#confirm-yes').click()
    guest=phone('guideguest')
    guest.wait_for_function("DabtRemote.pairingStatus()==='pending'")
    host.wait_for_function("DabtRemote.snapshot().pairPending===1")
    assert guest.locator('#guide-link').get_attribute('data-step')!='done'
    host.locator('#device-assist-banner').click();host.locator('#accept-device-guideguest').click();host.locator('#cfyes').click()
    online(guest)
    assert guest.locator('#guide-link').get_attribute('data-step')=='done'
    assert guest.locator('#ask-control').is_visible()
    guest.locator('#guide-help').click()
    host.wait_for_function("DabtRemote.snapshot().assistPending===1")
    host.locator('#assist-refresh').click();host.locator('#join-device-guideguest').click();host.locator('#assist-name').fill('Assisted player');host.locator('#assist-avatar').select_option('3');host.locator('#assist-save').click()
    guest.wait_for_function("DabtRemote.snapshot().session.players.some(p=>p.id==='guideguest'&&p.name==='Assisted player'&&p.av===3)")
    assert guest.locator('#guide-profile').get_attribute('data-step')=='done'
    guest.locator('.player-summary').wait_for()
    host.wait_for_function("DabtRemote.snapshot().assistPending===0")
    assert tv.evaluate("DabtTV.snapshot().session.players.filter(p=>p.id==='guideguest').length")==1
    assert host.evaluate("""async()=>{const l=await DabtRemote.request('deviceList',{});const d=l.connected.find(x=>x.id==='guideguest');try{await DabtRemote.request('deviceJoin',{target:d.id,fp:d.fp,sid:l.sid,name:'overwrite',av:0});return false}catch(e){return true}}""")
    assert tv.evaluate("DabtTV.snapshot().session.players.find(p=>p.id==='guideguest').name")=='Assisted player'
    instance=host.evaluate('DabtRemote.snapshot().instance');tv.evaluate("window.dispatchEvent(new Event('online'))");tv.wait_for_timeout(2500)
    assert host.evaluate('DabtRemote.snapshot().instance')==instance
    guest.reload();online(guest);assert guest.evaluate('DabtRemote.identity()')=='guideguest'
    assert guest.evaluate("DabtRemote.snapshot().session.players.some(p=>p.id==='guideguest')")
    layout(newcomer,320,568,'small-remote')
    broker.assert_clean();assert not errors,errors
    result={'passed':True,'engine':engine,'guideSteps':True,'manualPairFromHost':True,'manualJoin':True,'noUnauthorizedList':True,'duplicateRejected':True,'onlinePreservedInstance':True,'reloadPreservedPlayer':True,'pageErrors':errors}
    (out/(engine+'.json')).write_text(json.dumps(result));print(json.dumps(result));b.close()
