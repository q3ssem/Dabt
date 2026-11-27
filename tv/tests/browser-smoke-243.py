"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.4.3-smoke'; out.mkdir(parents=True,exist_ok=True)
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
    if name!='pair':
        logo=pg.locator('.majlis-logo');assert logo.count()==1
        logo.wait_for();assert logo.evaluate('(e)=>e.complete && e.naturalWidth===160 && e.naturalHeight>0')
        box=logo.bounding_box();assert box and box['x']>=0 and box['x']+box['width']<=w+1 and box['y']+box['height']<=h+1
        assert box['x']+box['width']/2>w/2,('logo not in right corner',name,box)
        assert 'Majlis TV' in pg.title()
seed=json.loads(subprocess.check_output(['node','-e',"const D=require('./shared/core.js');const d=D.initial();d.room='123456';d.config=D.config({sound:false,music:'off',shuffle:false});d.bank.name='اختبار التطوير';d.bank.questions=[D.question({id:'q1',t:'ما الإجابة الصحيحة؟',o:['أ','ب','ج','د'],a:0,s:60})];console.log(JSON.stringify(d))"],cwd=root))
seed['config']['brokers']=BROKERS
broker=LocalBrokers()
try:
    with sync_playwright() as p:
        b=p.chromium.launch(**({'executable_path':os.environ['DABT_CHROMIUM_PATH']} if os.environ.get('DABT_CHROMIUM_PATH') else {}))
        ctx=b.new_context(viewport={'width':1920,'height':1080});setup(ctx,{'dabt:v2':seed});tv=ctx.new_page();monitor(tv)
        try:
            stage='home';tv.goto('http://127.0.0.1:8765/?tv=1');tv.locator('#kahoot').wait_for();assert tv.locator('#version').inner_text()=='2.4.3'
            for w,h in [(1280,720),(1920,1080),(3840,2160)]:layout(tv,w,h,'home')
            tv.locator('#kahoot').focus();tv.keyboard.press('ArrowRight');assert tv.locator('#settings').evaluate('(e)=>document.activeElement===e');tv.keyboard.press('ArrowLeft');assert tv.locator('#kahoot').evaluate('(e)=>document.activeElement===e');tv.keyboard.press('ArrowLeft');assert tv.locator('#history').evaluate('(e)=>document.activeElement===e')
            tv.set_viewport_size({'width':1920,'height':1080});tv.locator('#kahoot').click()
            stage='join';phones=[]
            for i,name in enumerate(['أحمد','بدر']):
                c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);setup(c,{'dabt:remote:v2':{'id':f'phone{i}','code':('' if i==0 else '123456'),'av':-1,'brokers':BROKERS}});ph=c.new_page();monitor(ph);ph.goto('http://127.0.0.1:8765/?remote=1');
                if i==0:
                    ph.locator('#pair-form').wait_for();layout(ph,320,568,'pair');ph.locator('#code').fill('١٢٣٤٥٦');ph.locator('#pair-form button').click()
                ph.wait_for_function('window.DabtRemote && DabtRemote.snapshot()');ph.locator('[data-tab="quiz"]').click();ph.locator('#player-name').fill(name);ph.locator(f'[data-avatar="{i}"]').click();ph.locator('#join').click();tv.wait_for_function('id=>DabtTV.snapshot().session.players.some(p=>p.id===id)',arg=f'phone{i}');phones.append(ph)
            for w,h in [(1280,720),(1920,1080),(3840,2160)]:layout(tv,w,h,'lobby')
            for w,h in [(320,568),(390,844),(430,932),(844,390)]:layout(phones[0],w,h,'phone-lobby')
            phones[0].set_viewport_size({'width':390,'height':844});phones[0].reload();phones[0].wait_for_function("window.DabtRemote && DabtRemote.snapshot() && DabtRemote.snapshot().session.players.some(p=>p.id===DabtRemote.identity())");phones[0].wait_for_function("DabtRemote.pairingStatus()==='approved'",timeout=15000);phones[0].locator('[data-tab="quiz"]').click();phones[0].locator('.player-summary').wait_for(state='visible',timeout=15000);assert phones[0].locator('.player-summary').is_visible();assert phones[0].locator('#status').get_attribute('data-connection')=='online'
            stage='question';tv.locator('#start').click();tv.locator('#confirm-yes').click();tv.wait_for_function("DabtTV.snapshot().session.phase==='question'")
            for ph in phones:
                ph.wait_for_function("DabtRemote.pairingStatus()==='approved' && DabtRemote.snapshot().session.phase==='question'",timeout=10000)
                ph.wait_for_function("document.querySelectorAll('[data-answer]').length===4",timeout=2000)
            for w,h in [(1280,720),(1920,1080),(3840,2160)]:layout(tv,w,h,'question')
            for w,h in [(320,568),(390,844),(430,932),(844,390)]:
                layout(phones[0],w,h,'phone-question');assert phones[0].locator('[data-answer]').count()==4
                assert phones[0].locator('[data-answer]').first.bounding_box()['height']>=44
            phones[0].set_viewport_size({'width':390,'height':844});phones[0].locator('[data-answer="1"]').click();phones[0].wait_for_function("DabtRemote.snapshot().session.received.includes(DabtRemote.identity())");assert phones[0].locator('#answer-status').get_attribute('role')=='status';phones[1].locator('[data-answer="0"]').click()
            stage='ranking';tv.wait_for_function("DabtTV.snapshot().session.phase==='board'");assert 'بدر' in tv.locator('.rank-row').first.inner_text()
            layout(tv,1280,720,'board')
            stage='archive';tv.wait_for_function("DabtTV.snapshot().session.phase==='final'");tv.locator('#archive-session').click();tv.wait_for_function('DabtTV.snapshot().archives.length===1');layout(tv,1280,720,'archive');tv.reload();tv.wait_for_function('window.DabtTV && DabtTV.snapshot().archives.length===1');broker.assert_clean();assert not errors,errors
            result={'passed':True,'browser':b.version,'transport':'3 independent loopback native WebSocket MQTT brokers','physicalTV':False,'physicalPhone':False,'publicBrokers':False,'pageErrors':errors,'layouts':layouts,'flow':'join two phones, answer, ranking, archive, reload'}
            (out/'browser-smoke.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
        except Exception:
            try:tv.screenshot(path=out/'failure-tv.png')
            except Exception:pass
            raise
        finally:b.close()
except Exception:
    result={'passed':False,'stage':stage,'physicalTV':False,'physicalPhone':False,'publicBrokers':False,'pageErrors':errors,'layouts':layouts,'traceback':traceback.format_exc()}
    (out/'browser-smoke.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2));raise
