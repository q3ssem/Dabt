"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers_239 import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.3.9-outage'; out.mkdir(parents=True,exist_ok=True)
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


seed=json.loads(subprocess.check_output(['node','-e',"const D=require('./shared/core.js');const d=D.initial();d.room='123456';d.config=D.config({sound:false,music:'off',shuffle:false});d.bank.questions=[D.question({id:'outageq',t:'QA',o:['A','B','C','D'],a:0,s:60})];console.log(JSON.stringify(d))"],cwd=root))
seed['config']['brokers']=BROKERS
broker=LocalBrokers()
with sync_playwright() as p:
    b=p.chromium.launch();tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1');tv.locator('#kahoot').click()
    phones=[]
    for i in range(3):
        pid=f'outagephone{i}';pc=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);setup(pc,{'dabt:remote:v2':{'id':pid,'code':'123456','av':i,'name':f'Player {i}','brokers':BROKERS}});ph=pc.new_page();monitor(ph);ph.goto('http://127.0.0.1:8765/?remote=1')
        ph.wait_for_function("window.DabtRemote && DabtRemote.pairingStatus()==='approved'")
        ph.locator('#nav button[data-tab=quiz]').click();ph.locator('#player-name').fill(f'Player {i}');ph.locator('#join').click()
        tv.wait_for_function('id=>DabtTV.snapshot().session.players.some(p=>p.id===id)',arg=pid);phones.append(ph)
    keys=tv.evaluate('DabtTV.snapshot().keys')
    instance=phones[0].evaluate('DabtRemote.snapshot().instance')
    pin=phones[0].evaluate('DabtRemote.pinnedKey()')
    tv.locator('#start').click();tv.locator('#confirm-yes').click();tv.wait_for_function("DabtTV.snapshot().session.phase==='question'")
    for ph in phones:ph.locator('[data-answer="0"]').wait_for()
    phones[0].locator('[data-answer="0"]').click()
    tv.wait_for_function("!!DabtTV.snapshot().session.answers.outagephone0")
    broker.outage(True)
    for ph in phones:ph.wait_for_function("document.querySelector('#status').dataset.connection!=='online'",timeout=15000)
    tv.wait_for_function("document.querySelector('#connection').textContent.includes('غير متصل')")
    tv.wait_for_timeout(2000);broker.outage(False)
    for ph in phones:
        ph.evaluate("window.dispatchEvent(new Event('online'))")
        ph.wait_for_function("DabtRemote.pairingStatus()==='approved' && document.querySelector('#status').dataset.connection==='online'",timeout=25000)
        assert ph.evaluate('DabtRemote.snapshot().instance')==instance
    assert phones[0].evaluate('DabtRemote.pinnedKey()')==pin
    assert tv.evaluate('DabtTV.snapshot().keys')==keys
    phones[0].wait_for_function("DabtRemote.snapshot().session.received.includes('outagephone0')")
    for ph in phones[1:]:ph.locator('[data-answer="0"]').click()
    tv.wait_for_function("DabtTV.snapshot().session.rounds.length===1",timeout=15000)
    r=tv.evaluate("DabtTV.snapshot().session.rounds[0]")
    assert set(r['answers'])=={'outagephone0','outagephone1','outagephone2'}
    assert all(x['index']==0 for x in r['answers'].values())
    broker.assert_clean();assert not errors,errors
    result={'passed':True,'allThreeBrokersInterrupted':True,'threePlayersRecovered':True,'answers':3,'identityPreserved':True,'instancePreserved':True,'pageErrors':errors}
    (out/'outage.json').write_text(json.dumps(result));print(json.dumps(result));b.close()
