"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers import LocalBrokers, BROKERS
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.4.4-game-flow'; out.mkdir(parents=True,exist_ok=True)
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
seed=json.loads(subprocess.check_output(['node','-e',"const D=require('./shared/core.js');const d=D.initial();d.room='123456';d.config=D.config({sound:false,music:'off',shuffle:false,wager:false});d.bank.questions=[D.question({id:'replay-q',t:'Test question',o:['A','B','C','D'],a:0,s:60})];console.log(JSON.stringify(d))"],cwd=root))
seed['config']['brokers']=BROKERS
broker=LocalBrokers()
with sync_playwright() as p:
    b=getattr(p,engine).launch();tc=b.new_context(viewport={'width':1280,'height':720});setup(tc,{'dabt:v2':seed});tv=tc.new_page();monitor(tv);tv.goto('http://127.0.0.1:8765/?tv=1');tv.locator('#kahoot').click()
    phones=[]
    for i in range(2):
        pc=b.new_context(viewport={'width':390,'height':844},has_touch=True);setup(pc,{'dabt:remote:v2':{'id':'flow'+str(i),'code':'123456','name':'Player '+str(i),'av':i,'brokers':BROKERS}})
        ph=pc.new_page();monitor(ph);ph.goto('http://127.0.0.1:8765/?remote=1');ph.wait_for_function("window.DabtRemote && DabtRemote.pairingStatus()==='approved'")
        ph.locator('#nav button[data-tab=quiz]').click();ph.locator('#join').click()
        tv.wait_for_function('id=>DabtTV.snapshot().session.players.some(p=>p.id===id)',arg='flow'+str(i));phones.append(ph)
    host,guest=phones
    host.locator('#nav button[data-tab=control]').click();host.locator('[data-option-group=hosts] summary').click();host.locator('#host-flow0').click();host.locator('#cfyes').click()
    guest.wait_for_function("DabtRemote.snapshot().control.mode==='selected'")
    host.locator('#nav button[data-tab=quiz]').click()
    original=tv.evaluate('DabtTV.snapshot()');sid=original['session']['id'];bank=original['bank']['id']
    tv.locator('#start').click();tv.locator('#confirm-yes').click()
    host.locator('[data-answer="0"]').wait_for()
    guest.locator('[data-answer="0"]').wait_for();guest.locator('[data-answer="0"]').click()
    tv.wait_for_function("!!DabtTV.snapshot().session.answers.flow1")
    host.locator('#pause-game').click();tv.locator('#resume').wait_for()
    guest.wait_for_function("DabtRemote.snapshot().session.paused")
    assert guest.locator('#resume-game').count()==0
    assert guest.evaluate("async()=>{try{await DabtRemote.request('resume',{});return false}catch(e){return true}}")
    frozen=tv.evaluate('DabtTV.snapshot().session')
    tv.wait_for_timeout(1400)
    assert tv.evaluate('DabtTV.snapshot().session.deadline')==frozen['deadline']
    assert tv.evaluate('DabtTV.snapshot().session.answers')==frozen['answers']
    assert tv.evaluate('DabtTV.snapshot().session.phase')=='question'
    host.locator('#resume-game').click();host.locator('[data-answer="0"]').wait_for()
    after=tv.evaluate('DabtTV.snapshot().session')
    assert after['deadline']>=frozen['deadline']+1000
    assert after['roundStart']-frozen['roundStart']==after['deadline']-frozen['deadline']
    host.locator('[data-answer="0"]').click()
    tv.wait_for_function("DabtTV.snapshot().session.phase==='final'",timeout=30000)
    host.locator('#replay-game').wait_for();guest.wait_for_function("DabtRemote.snapshot().session.phase==='final'")
    assert guest.locator('#replay-game').count()==0
    previous=tv.evaluate('DabtTV.snapshot().session')
    host.locator('#replay-game').click();host.locator('#cfyes').click()
    tv.wait_for_function("DabtTV.snapshot().session.phase==='lobby'")
    replay=tv.evaluate('DabtTV.snapshot()')
    assert replay['session']['id']!=sid and replay['bank']['id']==bank and not replay['bank']['locked']
    assert replay['bank']['questions']==original['bank']['questions']
    assert len(replay['archives'])==1 and replay['archives'][0]['id']==sid and replay['archives'][0]['players']==previous['players']
    assert len(replay['session']['players'])==2 and all(x['score']==0 and x['right']==0 for x in replay['session']['players'])
    assert replay['keys']==original['keys']
    tv.locator('#start').click();tv.locator('#confirm-yes').click();tv.locator('#pause').click();tv.locator('#end-early').click();tv.locator('#confirm-yes').click()
    tv.locator('#new-session').click();tv.locator('#confirm-yes').click()
    tv.wait_for_function("DabtTV.snapshot().session.phase==='lobby'")
    new=tv.evaluate('DabtTV.snapshot()')
    assert len(new['archives'])==2 and new['bank']['id']!=bank and not new['bank']['questions']
    assert new['session']['id']!=replay['session']['id'] and len(new['session']['players'])==2
    assert all(x['score']==0 for x in new['session']['players']) and new['keys']==original['keys'] and new['room']==original['room']
    tv.reload();tv.locator('#kahoot').click();assert tv.evaluate('DabtTV.snapshot().session.id')==new['session']['id']
    broker.assert_clean();assert not errors,errors
    result={'passed':True,'engine':engine,'pausePreservesAnswers':True,'resumePreservesTime':True,'unauthorizedResumeRejected':True,'replayArchivesResult':True,'newGameEmptyBank':True,'preservedPlayersAndKeys':True,'pageErrors':errors}
    (out/(engine+'.json')).write_text(json.dumps(result));print(json.dumps(result));b.close()
