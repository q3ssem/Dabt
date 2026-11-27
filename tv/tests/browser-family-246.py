"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.4.6-family'; out.mkdir(parents=True,exist_ok=True)
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
seed=json.loads(subprocess.check_output(['node','-e',"const D=require('./shared/core.js');const d=D.initial();d.room='123456';d.config=D.config({sound:false,music:'off',shuffle:false,wager:false});d.bank.questions=[D.question({id:'familyq',t:'Best picture question',o:['A','B','C','D'],a:0,s:60,img:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB9kAAAAASUVORK5CYII='})];console.log(JSON.stringify(d))"],cwd=root))
seed['config']['brokers']=BROKERS
broker=LocalBrokers()
with sync_playwright() as p:
    b=getattr(p,engine).launch()
    tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1');tv.locator('#kahoot').click()
    def phone(pid,pin='',known=True,history=False):
        pc=b.new_context(viewport={'width':390,'height':844},has_touch=True)
        saved={'id':pid,'code':'123456' if known else '','name':pid,'av':1,'brokers':BROKERS}
        if history:saved['mine']=[{'room':'123456','bankId':'pastbank','q':{'id':'pastq','t':'Old authored question','k':'mc','o':['a','b','c','d'],'a':1,'s':20,'authorId':pid,'author':pid},'status':'ok','bankName':'Past competition'}]
        setup(pc,{'dabt:remote:v2':saved});ph=pc.new_page();monitor(ph);ph.goto('http://127.0.0.1:8765/?remote=1')
        if not known:
            ph.locator('#code').fill('123456');ph.locator('#entry-pin').fill(pin);ph.locator('#pair-form button[type=submit]').click()
        return pc,ph
    def online(ph):ph.wait_for_function("window.DabtRemote && DabtRemote.pairingStatus()==='approved' && document.querySelector('#status').dataset.connection==='online'")
    c1,host=phone('family1',history=True);online(host)
    host.locator('#nav button[data-tab=questions]').click();host.locator('#my-question-history').click();assert 'Old authored question' in host.locator('#modal-body').inner_text();host.locator('#history-close').click()
    host.locator('#nav button[data-tab=quiz]').click();host.locator('#join').click();host.locator('.player-summary').wait_for()
    prior=tv.evaluate('DabtTV.snapshot()');instance=host.evaluate('DabtRemote.snapshot().instance')
    def rotate():
        tv.locator('#pair').click();tv.locator('#renew-room').click();tv.locator('#confirm-yes').click()
        tv.wait_for_function("!!DabtTV.snapshot().entryPin")
        pin=tv.evaluate('DabtTV.snapshot().entryPin');tv.locator('#pair-done').click();return pin
    pin1=rotate();pin2=rotate();assert pin1!=pin2 and pin2!='123456'
    assert tv.evaluate('DabtTV.snapshot().room')==prior['room']
    assert tv.evaluate('DabtTV.snapshot().keys')==prior['keys']
    assert host.evaluate('DabtRemote.snapshot().instance')==instance
    assert host.evaluate('DabtRemote.pairingStatus()')=='approved'
    c2,guest=phone('family2',pin1,False);guest.wait_for_function("DabtRemote.pairingStatus()==='entry'")
    assert not tv.evaluate("!!DabtTV.snapshot().keys.family2")
    guest.locator('#retry-entry-pin').fill(pin2);guest.locator('#entry-pin-save').click();online(guest)
    guest.locator('#nav button[data-tab=quiz]').click();guest.locator('#join').click();guest.locator('.player-summary').wait_for()
    tv.locator('#start').click();tv.locator('#confirm-yes').click();host.locator('[data-answer="0"]').wait_for();guest.locator('[data-answer="0"]').wait_for()
    for w,h in [(320,568),(390,844),(430,932),(844,390)]:
        layout(host,w,h,'square-'+str(w))
        box=host.locator('[data-answer="0"]').bounding_box()
        assert box and abs(box['width']-box['height'])<=3,box
    assert host.locator('.question-image').evaluate('(e)=>getComputedStyle(e).objectFit==="contain" && e.clientHeight>=100')
    assert tv.locator('.question-image').evaluate('(e)=>e.clientHeight>=innerHeight*0.3')
    tvbox=tv.locator('.option').first.bounding_box();assert tvbox and abs(tvbox['width']-tvbox['height'])<=3,tvbox
    host.locator('[data-answer="0"]').click();guest.locator('[data-answer="0"]').click()
    tv.wait_for_function("DabtTV.snapshot().session.phase==='final'",timeout=30000)
    old=tv.evaluate('DabtTV.snapshot().session');host.locator('#vote-best').click();host.locator('#best-0').click();host.wait_for_function("DabtRemote.snapshot().session.best.voters.includes('family1')")
    assert host.evaluate("async()=>{try{await DabtRemote.request('bestVote',{sid:DabtRemote.snapshot().session.id,index:0});return false}catch(e){return true}}")
    guest.locator('#vote-best').click();guest.locator('#best-0').click()
    tv.wait_for_function("document.querySelector('#best-result').textContent.includes('2 / 2')")
    assert tv.evaluate('DabtTV.snapshot().session.players')==old['players']
    tv.locator('#replay-session').click();tv.locator('#confirm-yes').click();tv.wait_for_function("DabtTV.snapshot().session.phase==='lobby'")
    snap=tv.evaluate('DabtTV.snapshot()')
    assert snap['entryPin']!=pin2 and snap['room']==prior['room'] and len(snap['session']['players'])==2
    assert len(snap['archives'])==1 and len(snap['archives'][0]['bestVotes'])==2
    tv.reload();tv.locator('#kahoot').click();assert tv.evaluate('DabtTV.snapshot().entryPin')==snap['entryPin']
    online(host);online(guest)
    broker.assert_clean();assert not errors,errors
    result={'passed':True,'engine':engine,'history':True,'squareOptions':True,'rotatedWithoutDisconnect':True,'stalePinRejected':True,'bestVote':True,'voteArchivePreserved':True,'pageErrors':errors}
    (out/(engine+'.json')).write_text(json.dumps(result));print(json.dumps(result));b.close()
