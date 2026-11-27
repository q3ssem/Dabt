"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.3.8.2-control'; out.mkdir(parents=True,exist_ok=True)
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


seed=json.loads(subprocess.check_output(['node','-e',"const D=require('./shared/core.js');const d=D.initial();d.room='123456';d.config=D.config({sound:false,music:'off'});console.log(JSON.stringify(d))"],cwd=root))
seed['config']['brokers']=BROKERS
broker=LocalBrokers()
with sync_playwright() as p:
    b=p.chromium.launch()
    tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1')
    phones=[]
    for i in range(3):
        pid=f'controlphone{i}';pc=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        setup(pc,{'dabt:remote:v2':{'id':pid,'code':'123456','name':f'Player {i}','av':i,'brokers':BROKERS}})
        ph=pc.new_page();monitor(ph);ph.goto('http://127.0.0.1:8765/?remote=1')
        ph.wait_for_function('window.DabtRemote && DabtRemote.snapshot() && DabtRemote.snapshot().control.mode==="all"');ph.locator('.dpad').wait_for()
        phones.append(ph)
    first,second,third=phones
    first.wait_for_function('DabtRemote.snapshot().phones.length===3')
    def mode(expected,hosts):
        for ph in phones:ph.wait_for_function('v=>{const c=DabtRemote.snapshot().control;return c.mode===v[0]&&JSON.stringify(c.hosts)===JSON.stringify(v[1])}',arg=[expected,hosts])
    def tab(ph,n):ph.locator('#nav button[data-tab="'+n+'"]').click()
    def arrows(ph):ph.locator('.dpad').wait_for()
    def no_arrows(ph):ph.locator('#ask-control').wait_for();assert ph.locator('.dpad').count()==0
    # Writing questions, submitting a real signed question, and returning preserve all-control.
    tab(first,'questions');first.locator('#new-question').wait_for()
    bank=first.evaluate('DabtRemote.snapshot().bank.id')
    first.evaluate("""async bankId=>DabtRemote.request('question',{bankId,question:{id:'qa-control-question',t:'QA question',o:['A','B','C','D'],a:0,s:60}})""",bank)
    tab(first,'pad');mode('all',[]);[arrows(ph) for ph in phones]
    # Selecting a name never changes permission until an explicit confirmation.
    tab(first,'control');first.locator('#host-controlphone0').click();first.locator('#cfno').click()
    mode('all',[]);tab(first,'pad');[arrows(ph) for ph in phones]
    tab(first,'control');first.locator('#host-controlphone0').click();first.locator('#cfyes').click()
    mode('selected',['controlphone0']);tab(first,'pad');arrows(first);no_arrows(second);no_arrows(third)
    assert 'Player 0' in second.locator('#content').inner_text()
    # Request control and approve everyone at TV, no question or identity lost.
    second.locator('#ask-control').click();tv.locator('#request-all').click()
    mode('all',[]);[arrows(ph) for ph in phones]
    assert tv.evaluate("DabtTV.snapshot().bank.questions.some(q=>q.id==='qa-control-question')")
    # TV-side selection also requires explicit confirmation.
    tv.locator('#settings').click();tv.locator('#controllers').click()
    tv.locator('#ctl-controlphone0').click();tv.locator('#confirm-no').click();mode('all',[])
    tv.locator('#ctl-controlphone0').click();tv.locator('#confirm-yes').click();mode('selected',['controlphone0'])
    tv.locator('#ctl-controlphone1').click();tv.locator('#confirm-yes').click();mode('selected',['controlphone0','controlphone1'])
    tv.locator('#control-done').click();third.locator('#ask-control').click()
    tv.locator('#request-all').wait_for();assert tv.locator('#confirm-yes').count()==0
    tv.locator('#request-all').click();mode('all',[]);[arrows(ph) for ph in phones]
    broker.assert_clean();assert not errors,errors
    (out/'control-result.json').write_text(json.dumps({'passed':True,'phones':3,'questionPreserved':True,'explicitConfirmation':True,'allControlRestored':True,'fullHostListNoEviction':True,'pageErrors':errors}))
    b.close()
