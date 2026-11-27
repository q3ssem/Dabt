"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.4.2-identity'; out.mkdir(parents=True,exist_ok=True)
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
    tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1')
    pc=b.new_context(viewport={'width':390,'height':844},has_touch=True);setup(pc,{'dabt:remote:v2':{'id':'identityqa','code':'123456','name':'QA writer','av':2,'brokers':BROKERS}});ph=pc.new_page();monitor(ph);ph.goto('http://127.0.0.1:8765/?remote=1')
    ph.wait_for_function("window.DabtRemote && DabtRemote.pairingStatus()==='approved'")
    def choice(id,v):return ph.locator('[data-choice="'+id+'"][data-value="'+str(v)+'"]')
    def choose(id,v):
        choice(id,v).click();assert choice(id,v).get_attribute('aria-pressed')=='true';assert ph.locator('#'+id).input_value()==str(v)
    for w,h in [(320,568),(390,844),(430,932),(844,390)]:
        layout(ph,w,h,'pad-'+str(w))
        for key in ['U','R','D','L','OK']:
            box=ph.locator('[data-key="'+key+'"]').bounding_box();assert box and box['width']>=44 and box['height']>=44
        assert ph.locator('.dpad .r-icon').count()==4
    ph.set_viewport_size({'width':390,'height':844})
    ph.locator('#nav button[data-tab=control]').click();ph.locator('[data-option-group=remote] summary').click();ph.locator('#mode-touch').click();ph.locator('#return-pad').click();ph.locator('.dpad').wait_for()
    ph.locator('#nav button[data-tab=questions]').click();ph.locator('#new-question').click()
    assert ph.locator('select').count()==0 and ph.locator('[data-choice=qtype]').count()==5 and ph.locator('[data-choice=qseconds]').count()==6
    for typ in ['tf','vote','who','said','mc']:choose('qtype',typ)
    ph.locator('#qtext').fill('اختبار تصميم الاختيارات')
    choose('qseconds',45)
    for i,v in enumerate(['أ','ب','ج','د']):ph.locator('[data-option="'+str(i)+'"]').fill(v)
    ph.locator('[name=correct][value="2"]').check()
    ph.locator('#return-pad').click();ph.locator('.dpad').wait_for()
    ph.locator('#nav button[data-tab=questions]').click();ph.locator('#resume-draft').click()
    assert ph.locator('#qtext').input_value()=='اختبار تصميم الاختيارات'
    assert ph.locator('#qseconds').input_value()=='45' and choice('qseconds',45).get_attribute('aria-pressed')=='true'
    assert ph.locator('[name=correct][value="2"]').is_checked()
    for i,v in enumerate(['أ','ب','ج','د']):assert ph.locator('[data-option="'+str(i)+'"]').input_value()==v
    for w,h in [(320,568),(390,844),(430,932),(844,390)]:layout(ph,w,h,'editor-'+str(w))
    ph.locator('#save-question').click()
    tv.wait_for_function("DabtTV.snapshot().bank.questions.some(q=>q.t==='اختبار تصميم الاختيارات'&&q.s===45&&q.a===2)")
    ph.locator('#return-pad').click();ph.locator('.dpad').wait_for()
    broker.assert_clean();assert not errors,errors
    result={'passed':True,'engine':engine,'noDropdowns':True,'types':5,'durations':6,'returnPreservesDraft':True,'savedQuestion':True,'pageErrors':errors,'layouts':layouts}
    (out/(engine+'.json')).write_text(json.dumps(result));print(json.dumps(result));b.close()
