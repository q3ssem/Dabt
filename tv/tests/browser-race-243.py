"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.4.3-race'; out.mkdir(parents=True,exist_ok=True)
peers=[]; errors=[]; layouts=[]; stage='startup'
def encode(topic,raw):
    t=topic.encode(); body=len(t).to_bytes(2,'big')+t+raw; n=len(body); buf=[]
    while True:
        d=n%128; n//=128; buf.append(d|(128 if n else 0))
        if not n: break
    return bytes([0x30,*buf])+body
def route_ws(ws):
    peer={'ws':ws,'subs':set(),'open':True}; peers.append(peer)
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
                if p['open'] and t in p['subs']:p['ws'].send(encode(t,raw))
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

legacy=os.environ.get('QA_EXPECT_LEGACY')=='1'
seed=json.loads(subprocess.check_output(['node','-e',"const D=require('./shared/core.js');const d=D.initial();d.room='123456';d.config=D.config({sound:false,music:'off',shuffle:false,motion:'off'});d.bank.questions=[D.question({id:'raceq',t:'اختبار التزامن',o:['أ','ب','ج','د'],a:0,s:60})];console.log(JSON.stringify(d))"],cwd=root))
seed['config']['brokers']=BROKERS
broker=LocalBrokers()
with sync_playwright() as p:
    b=p.chromium.launch()
    tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1');tv.locator('#kahoot').click()
    phones=[]
    for i in range(2):
        pc=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);setup(pc,{'dabt:remote:v2':{'id':f'racephone{i}','code':'123456','av':-1,'brokers':BROKERS}});ph=pc.new_page();monitor(ph);ph.goto('http://127.0.0.1:8765/?remote=1');ph.wait_for_function('window.DabtRemote && DabtRemote.snapshot() && DabtRemote.pairingStatus()==="approved"');ph.locator('#nav button[data-tab=quiz]').click();ph.locator('#player-name').fill('لاعب '+str(i));ph.locator(f'[data-avatar="{i}"]').click();ph.evaluate("window.__joinNode=document.querySelector('#join')");ph.wait_for_timeout(2300);assert ph.evaluate("window.__joinNode===document.querySelector('#join') && window.__joinNode.isConnected"),'heartbeat replaced join button';ph.locator('#join').click();tv.wait_for_function('id=>DabtTV.snapshot().session.players.some(p=>p.id===id)',arg=f'racephone{i}');phones.append(ph)
    tv.locator('#start').click();tv.locator('#confirm-yes').click();tv.wait_for_function("DabtTV.snapshot().session.phase==='question'")
    for ph in phones:ph.locator('[data-answer="0"]').wait_for()
    a,bp=phones
    target=bp.locator('[data-answer="0"]');target.scroll_into_view_if_needed();box=target.bounding_box()
    bp.evaluate("window.__qaNode=document.querySelector('[data-answer=\\'0\\']')")
    bp.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);bp.mouse.down()
    a.evaluate("document.querySelector('[data-answer=\\'1\\']').click()")
    bp.wait_for_function("DabtRemote.snapshot().session.received.includes('racephone0')")
    stable=bp.evaluate("window.__qaNode===document.querySelector('[data-answer=\\'0\\']') && window.__qaNode.isConnected")
    if legacy:
        assert not stable,'legacy button replacement not reproduced'
        bp.mouse.up()
    else:
        assert stable,'peer receipt replaced the pressed answer button'
        bp.mouse.up()
        tv.wait_for_function("DabtTV.snapshot().session.rounds.length===1",timeout=12000)
        r=tv.evaluate("DabtTV.snapshot().session.rounds[0]")
        assert set(r['answers'])=={'racephone0','racephone1'} and r['answers']['racephone0']['index']==1 and r['answers']['racephone1']['index']==0,r['answers']
    broker.assert_clean();assert not errors,errors
    result={'passed':True,'legacy':legacy,'answerNodePreserved':stable,'pageErrors':errors}
    (out/('legacy.json' if legacy else 'fixed.json')).write_text(json.dumps(result));print(json.dumps(result))
    b.close()
