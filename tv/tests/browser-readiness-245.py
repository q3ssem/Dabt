"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.4.5-readiness'; out.mkdir(parents=True,exist_ok=True)
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
seed=json.loads(subprocess.check_output(['node','-e',"const D=require('./shared/core.js');const d=D.initial();d.room='123456';d.config=D.config({sound:false,music:'off',shuffle:false});d.bank.questions=[D.question({id:'readyq',t:'Ready test',o:['A','B','C','D'],a:0,s:60})];console.log(JSON.stringify(d))"],cwd=root))
seed['config']['brokers']=BROKERS
broker=LocalBrokers()
with sync_playwright() as p:
    b=getattr(p,engine).launch();tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1');tv.locator('#kahoot').click()
    def phone(pid,join=True):
        pc=b.new_context(viewport={'width':390,'height':844},has_touch=True);setup(pc,{'dabt:remote:v2':{'id':pid,'code':'123456','name':pid,'av':1,'brokers':BROKERS}});ph=pc.new_page();monitor(ph);ph.goto('http://127.0.0.1:8765/?remote=1')
        ph.wait_for_function("window.DabtRemote && DabtRemote.pairingStatus()==='approved'")
        ph.locator('#nav button[data-tab=quiz]').click()
        if join:
            ph.locator('#join').click();ph.locator('.player-summary').wait_for()
        return pc,ph
    c1,p1=phone('ready1');c2,p2=phone('ready2')
    assert tv.locator('#start').is_enabled()
    tv.locator('#ready-setting').click();tv.locator('#confirm-yes').click()
    assert tv.locator('#start').is_disabled()
    for ph in [p1,p2]:ph.locator('#player-ready').wait_for()
    assert p1.locator('#start-game').is_disabled()
    assert p1.evaluate("async()=>{try{await DabtRemote.request('start',{sid:DabtRemote.snapshot().session.id});return false}catch(e){return true}}")
    def confirm_ready(ph):
        ph.wait_for_function("document.querySelector('.ready-check')?.dataset.ready==='no'")
        ph.locator('#player-ready').click();ph.wait_for_function("document.querySelector('.ready-check')?.dataset.ready==='yes'")
    confirm_ready(p1);tv.wait_for_function("document.querySelector('#ready-count').textContent.includes('1 / 2')")
    assert tv.locator('#start').is_disabled()
    confirm_ready(p2);tv.wait_for_function("!document.querySelector('#start').disabled")
    p2.locator('#player-ready').click();p2.wait_for_function("document.querySelector('.ready-check').dataset.ready==='no'")
    tv.wait_for_function("document.querySelector('#start').disabled")
    confirm_ready(p2);tv.wait_for_function("!document.querySelector('#start').disabled")
    c3,p3=phone('ready3',False);old=p1.evaluate('DabtRemote.snapshot().session.readyEpoch')
    assert p3.evaluate("async()=>{const s=DabtRemote.snapshot().session;try{await DabtRemote.request('playerReady',{sid:s.id,epoch:s.readyEpoch,ready:true});return false}catch(e){return true}}")
    p3.locator('#join').click();p3.locator('#player-ready').wait_for()
    tv.wait_for_function("document.querySelector('#ready-count').textContent.includes('0 / 3')")
    assert tv.locator('#start').is_disabled()
    p1.wait_for_function("DabtRemote.snapshot().session.readyIds.length===0")
    assert p1.evaluate("(old)=>DabtRemote.snapshot().session.readyEpoch!==old",old)
    assert p1.evaluate("async(old)=>{try{await DabtRemote.request('playerReady',{sid:DabtRemote.snapshot().session.id,epoch:old,ready:true});return false}catch(e){return true}}",old)
    for ph in [p1,p2,p3]:confirm_ready(ph)
    tv.wait_for_function("!document.querySelector('#start').disabled")
    c3.close();tv.wait_for_function("document.querySelector('#start').disabled && document.querySelector('#ready-count').textContent.includes('2 / 3')",timeout=45000)
    assert tv.evaluate('DabtTV.snapshot().session.players.length')==3
    tv.locator('#manage-players').click();tv.locator('#remove-ready3').click();tv.locator('#players-done').click()
    tv.wait_for_function("document.querySelector('#ready-count').textContent.includes('0 / 2')")
    for ph in [p1,p2]:confirm_ready(ph)
    tv.wait_for_function("!document.querySelector('#start').disabled")
    tv.reload();tv.locator('#kahoot').click()
    tv.wait_for_function("document.querySelector('#ready-count').textContent.includes('0 / 2')")
    for ph in [p1,p2]:
        ph.wait_for_function("DabtRemote.pairingStatus()==='approved' && document.querySelector('.ready-check')?.dataset.ready==='no'")
        confirm_ready(ph)
    tv.wait_for_function("!document.querySelector('#start').disabled")
    tv.locator('#start').click();tv.locator('#confirm-yes').click()
    tv.wait_for_function("DabtTV.snapshot().session.phase==='question'")
    assert tv.evaluate('DabtTV.snapshot().session.players.length')==2
    broker.assert_clean();assert not errors,errors
    result={'passed':True,'engine':engine,'optIn':True,'prematureStartBlocked':True,'cancelReadiness':True,'nonPlayerRejected':True,'staleEpochRejected':True,'rosterReset':True,'offlineBlocksStart':True,'reloadResetsReadiness':True,'allConfirmedStart':True,'pageErrors':errors}
    (out/(engine+'.json')).write_text(json.dumps(result));print(json.dumps(result));b.close()
