"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.3.5-themes'; out.mkdir(parents=True,exist_ok=True)
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
    ctx.route('**/*',route); ctx.route_web_socket('wss://**',route_ws)
    ctx.add_init_script('if(!sessionStorage.seeded){for(const [k,v] of Object.entries('+json.dumps(seed,ensure_ascii=True)+'))localStorage.setItem(k,JSON.stringify(v));sessionStorage.seeded=1;}')
def monitor(pg):pg.on('pageerror',lambda e:errors.append(str(e)))
def layout(pg,w,h,name):
    pg.set_viewport_size({'width':w,'height':h});pg.wait_for_timeout(250)
    dims=pg.evaluate("""()=>({pageOverflow:document.documentElement.scrollWidth>innerWidth, mainOverflow:!!document.querySelector('main')&&document.querySelector('main').scrollWidth>document.querySelector('main').clientWidth+2})""")
    layouts.append({'screen':name,'width':w,'height':h,**dims});pg.screenshot(path=out/f'{name}-{w}.png')
    assert not dims['pageOverflow'] and not dims['mainOverflow'],(name,dims)

looks=['plain','pearl','emerald','midnight','ramadan','eid','friday']
seed=json.loads(subprocess.check_output(['node','-e',"const D=require('./shared/core.js');const d=D.initial();d.room='123456';d.config=D.config({sound:false,music:'off'});console.log(JSON.stringify(d))"],cwd=root))
checks=[]
def palette(page):
    return page.evaluate("""()=>{const s=getComputedStyle(document.body);return ['--bg','--surface','--panel','--text','--muted','--accent','--on-accent'].map(k=>s.getPropertyValue(k).trim())}""")
def contrast(a,b):
    def lum(h):
        vals=[int(h[i:i+2],16)/255 for i in (1,3,5)]
        vals=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in vals]
        return sum(x*y for x,y in zip(vals,[.2126,.7152,.0722]))
    x,y=sorted([lum(a),lum(b)])
    return (y+.05)/(x+.05)
try:
    with sync_playwright() as p:
        b=p.chromium.launch()
        tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1')
        pc=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);setup(pc,{'dabt:remote:v2':{'id':'themephone','code':'123456','av':-1}});ph=pc.new_page();monitor(ph);ph.goto('http://127.0.0.1:8765/?remote=1');ph.wait_for_function('window.DabtRemote && DabtRemote.snapshot()')
        tv.locator('#settings').click()
        for look in looks:
            stage=look
            tv.locator('#look').select_option(look)
            tv.wait_for_function('v=>document.body.dataset.look===v',arg=look)
            ph.wait_for_function('v=>document.body.dataset.look===v && DabtRemote.snapshot().look===v',arg=look)
            a=palette(tv);assert a==palette(ph),(look,a,palette(ph))
            ratios=[contrast(a[0],a[3]),contrast(a[1],a[4]),contrast(a[5],a[6])]
            assert min(ratios)>=4.5,(look,ratios)
            assert tv.evaluate("DabtTV.snapshot().config.look")==look
            layout(tv,1280,720,'tv-'+look);layout(ph,320,568,'remote-'+look)
            checks.append({'look':look,'contrast':ratios,'matched':True})
        stage='persistence';tv.reload();tv.wait_for_function("document.body.dataset.look==='friday'");ph.reload();ph.wait_for_function("document.body.dataset.look==='friday' && DabtRemote.snapshot().look==='friday'")
        assert not errors,errors
        result={'passed':True,'themes':checks,'layouts':layouts,'pageErrors':errors,'physicalTV':False,'physicalPhone':False,'publicBrokers':False}
        (out/'theme-result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
        b.close()
except Exception:
    (out/'theme-result.json').write_text(json.dumps({'passed':False,'stage':stage,'checks':checks,'traceback':traceback.format_exc(),'pageErrors':errors},indent=2));raise
