"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.4.3-roster'; out.mkdir(parents=True,exist_ok=True)
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
    b=getattr(p,engine).launch()
    tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1');tv.locator('#kahoot').click()
    phones=[];contexts=[]
    for i in range(6):
        pc=b.new_context(viewport={'width':390,'height':844},has_touch=True);contexts.append(pc);setup(pc,{'dabt:remote:v2':{'id':'roster'+str(i),'code':'123456','name':'Family '+str(i),'av':i,'brokers':BROKERS}})
        ph=pc.new_page();monitor(ph);ph.goto('http://127.0.0.1:8765/?remote=1');ph.wait_for_function("window.DabtRemote && DabtRemote.pairingStatus()==='approved'")
        phones.append(ph)
        if i<4:
            ph.locator('#nav button[data-tab=quiz]').click();ph.locator('#join').click()
            tv.wait_for_function('id=>DabtTV.snapshot().session.players.some(p=>p.id===id)',arg='roster'+str(i))
    tv.wait_for_function("document.querySelector('#roster-connected').textContent==='6' && document.querySelector('#roster-joined').textContent==='4' && document.querySelector('#roster-unjoined').textContent==='2'")
    assert tv.locator('[data-roster-state=unjoined]').count()==2
    assert tv.locator('[data-roster-state=online]').count()==4
    assert tv.locator('[data-roster-id=roster4]').inner_text().find('Family 4')>=0
    assert tv.locator('[data-roster-id=roster5]').inner_text().find('Family 5')>=0
    layout(tv,1280,720,'six-connected-four-joined')
    # No automatic admission or score changes; explicit TV-side addition.
    assert len(tv.evaluate('DabtTV.snapshot().session.players'))==4
    tv.locator('#manage-players').click();tv.locator('#tv-join-roster4').click();tv.locator('#tv-assist-name').fill('Assisted');tv.locator('#tv-assist-av-4').click();tv.locator('#tv-assist-save').click()
    tv.wait_for_function("DabtTV.snapshot().session.players.some(p=>p.id==='roster4'&&p.name==='Assisted')")
    phones[4].locator('.player-summary').wait_for()
    tv.locator('#players-done').click()
    tv.wait_for_function("document.querySelector('#roster-joined').textContent==='5' && document.querySelector('#roster-unjoined').textContent==='1'")
    host=phones[0];host.locator('#nav button[data-tab=pad]').click()
    assert host.locator('#nav button').count()==4
    assert host.locator('#mode-touch,#remote-pause,#device-assist-banner,#rename-bank').count()==0
    assert host.locator('#quick-guide').is_hidden()
    host.locator('#nav button[data-tab=questions]').click()
    assert host.locator('#new-question').is_visible()
    assert host.locator('#rename-bank,#lock-bank,#export-bank,#import-bank').count()==0
    host.locator('#nav button[data-tab=control]').click()
    assert host.locator('#device-assist-banner').is_visible()
    assert host.locator('#mode-touch').is_hidden() and host.locator('#rename-bank').is_hidden()
    host.locator('[data-option-group=bank] summary').click()
    assert host.locator('#rename-bank').is_visible()
    host.locator('#return-pad').click();assert host.locator('.dpad').is_visible()
    # A registered device disconnects; registration and score remain, live status expires.
    contexts[1].close()
    tv.wait_for_function("document.querySelector('[data-roster-id=roster1]').dataset.rosterState==='offline'",timeout=45000)
    assert tv.locator('#roster-joined').inner_text()=='5'
    assert tv.locator('#roster-connected').inner_text()=='5'
    assert tv.locator('#roster-unjoined').inner_text()=='1'
    broker.assert_clean();assert not errors,errors
    result={'passed':True,'engine':engine,'sixConnectedFourJoined':True,'manualTvJoin':True,'offlinePlayerPreserved':True,'singleOptionsTab':True,'noDuplicateControls':True,'pageErrors':errors}
    (out/(engine+'.json')).write_text(json.dumps(result));print(json.dumps(result));b.close()
