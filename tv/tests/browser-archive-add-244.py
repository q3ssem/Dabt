"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.4.4-archive-add'; out.mkdir(parents=True,exist_ok=True)
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
seed=json.loads(subprocess.check_output(['node','-e',"const D=require('./shared/core.js');const d=D.initial();d.room='123456';d.config=D.config({sound:false,music:'off',shuffle:false});const q=(id,t)=>D.question({id,t,o:['A','B','C','D'],a:0,s:20});d.bank.questions=[q('old1','Duplicate'),q('old2','Archive two'),q('old3','Archive three')];d.session=D.newSession(d.bank,d.config,1000);D.player(d.session,'oldplayer','Old player',0);D.start(d.session,d.bank,d.config,1000);D.end(d.session,2000);D.archive(d,2000);d.bank.questions=[q('existing','Keep current'),q('differentid','Duplicate')];d.session=D.newSession(d.bank,d.config,3000);D.player(d.session,'currentplayer','Current player',1);console.log(JSON.stringify(d))"],cwd=root))
seed['config']['brokers']=BROKERS
broker=LocalBrokers()
with sync_playwright() as p:
    b=getattr(p,engine).launch();tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1')
    tv.locator('#kahoot').click();tv.locator('#add-from-history').click()
    aid=seed['archives'][0]['id'];tv.locator('#add-archive-'+aid).click()
    assert tv.locator('#archive-pick-0').is_disabled()
    assert tv.locator('#archive-add-save').is_disabled()
    tv.locator('#archive-pick-1').click();assert tv.locator('#archive-pick-1').get_attribute('aria-pressed')=='true'
    tv.locator('#archive-add-save').click();tv.locator('#add-from-history').wait_for()
    snap=tv.evaluate('DabtTV.snapshot()')
    assert [q['t'] for q in snap['bank']['questions']]==['Keep current','Duplicate','Archive two']
    assert snap['bank']['id']==seed['bank']['id'] and snap['session']['id']==seed['session']['id']
    assert snap['session']['players']==seed['session']['players'] and snap['archives']==seed['archives']
    tv.locator('#add-from-history').click();tv.locator('#open-'+aid).click();tv.locator('#add-current-archive').click()
    assert tv.locator('#archive-pick-0').is_disabled() and tv.locator('#archive-pick-1').is_disabled()
    tv.locator('#archive-select-all').click();tv.locator('#archive-add-save').click();tv.locator('#add-from-history').wait_for()
    final=tv.evaluate('DabtTV.snapshot()')
    assert [q['t'] for q in final['bank']['questions']]==['Keep current','Duplicate','Archive two','Archive three']
    assert final['session']['questions']==final['bank']['questions'] and final['archives']==snap['archives']
    assert len(set(q['id'] for q in final['bank']['questions']))==4
    tv.reload();tv.locator('#kahoot').click();assert tv.evaluate('DabtTV.snapshot().bank.questions')==final['bank']['questions']
    broker.assert_clean();assert not errors,errors
    result={'passed':True,'engine':engine,'appendNotReplace':True,'duplicateBlocked':True,'selectedAndAll':True,'archiveUnchanged':True,'playersPreserved':True,'reloadPreserved':True,'pageErrors':errors}
    (out/(engine+'.json')).write_text(json.dumps(result));print(json.dumps(result));b.close()
