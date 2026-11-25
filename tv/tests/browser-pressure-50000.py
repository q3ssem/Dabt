"""Chromium acceptance; local HTTP resources and simulated MQTT only."""
import json, os, subprocess, mimetypes, traceback
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
GAME=int(os.environ['QA_GAME']); PILOT=os.environ.get('QA_PILOT')=='1'
assert 0<=GAME<500
P,N=(20,20) if GAME<50 else (20,5) if GAME<150 else (10,8) if GAME<300 else (5,8)
MODE={0:'drop',1:'reload',2:'late',3:'help',4:'overlap'}.get(GAME%25,'standard')
LOOK=['plain','pearl','emerald','midnight','ramadan','eid','friday'][GAME%7]
MOTION=['full','reduced','off'][GAME%3]
OUTROOT=Path(os.environ.get('QA_OUTPUT',str(root/'tests/results/2.3.8')))
out=OUTROOT/f'game-{GAME:03d}';out.mkdir(parents=True,exist_ok=True)
keep_images=PILOT or GAME%5==0
faults={'droppedAnswerCopies':0,'reloaded':False,'lateElapsedMs':None,'help':False,'objection':False,'overlap':False};heap=[]
peers=[]; errors=[]; layouts=[]; stage='startup'; requests={}; replies={}; failure_detail={}
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
            if t.endswith('/tv') or '/phone/' in t:
                try:
                    m=json.loads(json.loads(raw)['b']); rid=m.get('requestId')
                    if t.endswith('/tv') and m.get('type')=='answer':
                        p0=m['payload']; entry=requests.setdefault(rid,{'device':m['device'],'qIndex':p0['qIndex'],'answer':p0['answer'],'count':0});entry['count']+=1
                        if MODE=='drop' and m['device']=='stressphone0' and p0['qIndex']==0 and entry['count']<=3:
                            faults['droppedAnswerCopies']+=1
                            return
                    elif rid in requests and '/phone/' in t:
                        replies[rid]={'ok':m.get('ok'),'error':m.get('error','')}
                except (KeyError,ValueError,TypeError):pass
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
    layouts.append({'screen':name,'width':w,'height':h,**dims})
    if keep_images:pg.screenshot(path=out/f'{name}-{w}.png')
    assert not dims['pageOverflow'] and not dims['mainOverflow'],(name,dims)

# Distinct stress acceptance; all 20 players use independent browser contexts and native UI.
# One simulated WSS broker isolates application capacity from external broker availability.
import math, time
SHARD=GAME;os.environ['QA_ROUNDS']=str(N);os.environ['QA_LOOK']=LOOK;os.environ['QA_MOTION']=MOTION
assert 3<=N<=120 and 5<=P<=20
seed=json.loads(subprocess.check_output(['node','-e',"""const D=require('./shared/core.js');const d=D.initial();d.room=String(654000+Number(process.env.QA_GAME));d.config=D.config({sound:false,music:'off',shuffle:false,motion:process.env.QA_MOTION,look:process.env.QA_LOOK,speed:true,wager:true});d.bank.name='اختبار الضغط';d.bank.questions=Array.from({length:Number(process.env.QA_ROUNDS||22)},(_,i)=>D.question({id:'stressq'+i,t:'السؤال '+(i+1),o:['أ','ب','ج','د'],a:i%4,s:60}));console.log(JSON.stringify(d))"""],cwd=root))
started=time.monotonic(); checks=0; processed=0; witness=[]; stage='setup'; tv=None
def check(condition,msg):
    global checks
    assert condition,msg
    checks+=1
def snapshot():return tv.evaluate('DabtTV.snapshot()')
def phase(name,q=None):
    tv.wait_for_function("""([name,q])=>{const s=DabtTV.snapshot().session;return s&&s.phase===name&&(q===null||s.qIndex===q)}""",arg=[name,q],timeout=90000)
def rejected(ph,sid,q,answer):
    return ph.evaluate("""async ([sid,q,answer])=>{try{await DabtRemote.request('answer',{sid,qIndex:q,answer});return false}catch(e){return /متأخرة|سبق تسجيلها|لا تخص السؤال/.test(e.message)}}""",[sid,q,answer])
def assert_round(r,q,answers,bets):
    check(not r['voided'],f'round {q+1} unexpectedly voided')
    check(set(r['answers'])==set(answers),f'round {q+1} missing or extra answers')
    check(r['question']['a']==q%4,f'round {q+1} wrong answer key')
    check(r.get('bets',{})==bets,f'round {q+1} incorrect wagers')
    check(bool(r['speed'])==(q==N-2),f'round {q+1} incorrect multiplier')
    old={p['id']:p for p in r['before']}; new={p['id']:p for p in r['after']}
    check(len(old)==P and set(old)==set(new),f'round {q+1} inconsistent player roster')
    for pid,a in answers.items():
        entry=r['answers'][pid]; p=old[pid]; n=new[pid]; correct=a==q%4
        check(entry['index']==a,f'round {q+1} {pid} wrong recorded answer')
        elapsed=entry['elapsed'];check(0<=elapsed<60000,f'round {q+1} {pid} answer outside deadline')
        streak=p['streak']+1 if correct else 0
        base=400+math.floor(600*max(0,min(1,1-elapsed/60000))+.5)+(min(500,100*(streak-2)) if streak>=3 else 0)
        delta=(base+(bets.get(pid,0)) if q==N-1 else base*(2 if q==N-2 else 1)) if correct else -min(bets.get(pid,0),p['score'])
        check(n['score']==p['score']+delta and n['delta']==delta and n['score']>=0,f'round {q+1} {pid} score mismatch')
        check(n['right']==p['right']+int(correct) and n['streak']==streak,f'round {q+1} {pid} streak mismatch')
try:
    with sync_playwright() as p:
        b=p.chromium.launch()
        ctx=b.new_context(viewport={'width':1920,'height':1080});setup(ctx,{'dabt:v2':seed});tv=ctx.new_page();monitor(tv)
        tv.goto('http://127.0.0.1:8765/?tv=1');tv.locator('#kahoot').wait_for();check(tv.locator('#version').inner_text()=='2.3.7.1','wrong version');tv.locator('#kahoot').click()
        phones=[]; contexts=[ctx]
        for i in range(P):
            stage=f'join-{i+1}'
            pid=f'stressphone{i}'
            c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);contexts.append(c)
            setup(c,{'dabt:remote:v2':{'id':pid,'code':str(654000+GAME),'av':-1}})
            c.add_init_script("""window.__qaAnswerEvents=[];for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,e=>{const b=e.target.closest&&e.target.closest('[data-answer]');if(b){const s=window.DabtRemote&&DabtRemote.snapshot();window.__qaAnswerEvents.push({type,answer:+b.dataset.answer,qIndex:s&&s.session&&s.session.qIndex,connected:b.isConnected,time:Date.now()});if(window.__qaAnswerEvents.length>120)window.__qaAnswerEvents.shift()}},true);""")
            ph=c.new_page();monitor(ph);ph.goto('http://127.0.0.1:8765/?remote=1')
            try:ph.wait_for_function('window.DabtRemote && DabtRemote.snapshot()',timeout=30000)
            except Exception:
                ph.screenshot(path=out/f'join-failure-{i}.png');print('join diagnostic',ph.url,ph.locator('body').inner_text()[:2000],flush=True);raise
            ph.locator('[data-tab="quiz"]').click();ph.locator('#player-name').fill(f'لاعب {i+1}');ph.locator(f'[data-avatar="{i%12}"]').click();ph.locator('#join').click()
            tv.wait_for_function('id=>DabtTV.snapshot().session.players.some(p=>p.id===id)',arg=pid,timeout=30000)
            phones.append((pid,ph));print('joined',i+1,flush=True)
        check(len(snapshot()['session']['players'])==P,'player roster not joined')
        check(tv.locator('.player-chip').count()==P,'lobby cards missing')
        check(snapshot()['config']['look']==LOOK and snapshot()['config']['motion']==MOTION,'TV preferences mismatch')
        for pid,ph in phones:
            ph.wait_for_function('v=>document.body.dataset.look===v[0] && document.body.dataset.motion===v[1]',arg=[LOOK,MOTION])
            check(True,'remote preference witness')
        for w,h in [(1280,720),(1920,1080),(3840,2160)]:layout(tv,w,h,'lobby-20')
        tv.set_viewport_size({'width':1920,'height':1080})
        tv.locator('#start').click();tv.locator('#confirm-yes').click()
        sid=snapshot()['session']['id']
        for q in range(N):
            stage=f'round-{q+1}';bets={}; t=time.monotonic()
            if q==N-1:
                phase('wager',q)
                for pid,ph in phones:
                    button=ph.locator('[data-bet]').last
                    amount=int(button.get_attribute('data-bet',timeout=15000));bets[pid]=amount;button.click(timeout=15000)
                tv.wait_for_function("p=>Object.keys(DabtTV.snapshot().session.bets||{}).length===p",arg=P,timeout=20000)
            phase('question',q)
            planned={pid:(i+2*q+SHARD)%4 for i,(pid,ph) in enumerate(phones)}
            if q==0 and MODE=='reload':
                pid,ph=phones[0]; pin=ph.evaluate('DabtRemote.pinnedKey()');ph.reload();ph.wait_for_function("q=>window.DabtRemote && DabtRemote.snapshot() && DabtRemote.snapshot().session && DabtRemote.snapshot().session.phase==='question' && DabtRemote.snapshot().session.qIndex===q",arg=q,timeout=20000)
                check(ph.evaluate('DabtRemote.identity()')==pid and ph.evaluate('DabtRemote.pinnedKey()')==pin,'identity lost after in-game reload');ph.locator('#nav button[data-tab=quiz]').click();faults['reloaded']=True
            if q==0 and MODE=='help':
                pid,ph=phones[0];planned[pid]=q%4;ph.locator('#help-fifty').click();ph.wait_for_function("document.querySelectorAll('[data-answer]:disabled').length===2")
                check(ph.locator(f'[data-answer="{q%4}"]').is_enabled(),'help hid correct answer');faults['help']=True
                phones[1][1].locator('#object').click();tv.wait_for_function('id=>DabtTV.snapshot().session.objections.includes(id)',arg=phones[1][0]);faults['objection']=True
            for i,(pid,ph) in enumerate(phones):
                if q==0 and MODE=='overlap' and i==0:
                    pid1,p1=phones[1];target=p1.locator(f'[data-answer="{planned[pid1]}"]');target.scroll_into_view_if_needed();box=target.bounding_box();p1.evaluate("window.__heldAnswer=document.querySelector('[data-answer=\\\"'+"+str(planned[pid1])+"+'\\\"]')")
                    p1.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);p1.mouse.down();ph.locator(f'[data-answer="{planned[pid]}"]').click(timeout=15000)
                    p1.wait_for_function('id=>DabtRemote.snapshot().session.received.includes(id)',arg=pid);check(p1.evaluate('window.__heldAnswer.isConnected'),'overlap removed held button');p1.mouse.up();faults['overlap']=True
                elif q==0 and MODE=='overlap' and i==1:pass
                else:
                    if q==0 and MODE=='late' and i==P-1:
                        tv.wait_for_function("()=>{const s=DabtTV.snapshot().session;return s.phase==='question' && s.deadline-Date.now()<=4500 && s.deadline>Date.now()}",timeout=65000)
                    ph.locator(f'[data-answer="{planned[pid]}"]').click(timeout=15000)
                if i==0 and q in (0,1):
                    tv.wait_for_function('id=>!!DabtTV.snapshot().session.answers[id]',arg=pid,timeout=10000)
                    check(rejected(ph,sid,q,(planned[pid]+1)%4),'duplicate answer accepted')
                    if q==1:check(rejected(ph,sid,q-1,0),'stale answer accepted')
            tv.wait_for_function('q=>DabtTV.snapshot().session.rounds.length===q+1',arg=q,timeout=90000)
            r=snapshot()['session']['rounds'][q]
            if q==0 and MODE=='late' and phones[-1][0] in r['answers']:
                faults['lateElapsedMs']=r['answers'][phones[-1][0]]['elapsed'];check(55000<=faults['lateElapsedMs']<60000,'late answer not within final five seconds')
            if q==0 and MODE=='help':
                check(r.get('helps',{}).get(phones[0][0])=='fifty' and r['objections']==[phones[1][0]],'help/objection not recorded')
            if set(r['answers'])!=set(planned):
                missing=set(planned)-set(r['answers']); extra=set(r['answers'])-set(planned)
                failure_detail.update({'round':q+1,'missing':sorted(missing),'extra':sorted(extra),'recorded':r['answers'],'planned':planned,'elapsedSeconds':time.monotonic()-t,'transport':[{**v,'requestId':rid,'ack':replies.get(rid)} for rid,v in requests.items() if v['qIndex']==q],'inputEvents':{}})
                for pid,ph in phones:
                    if pid in missing:
                        try:failure_detail['inputEvents'][pid]=ph.evaluate('window.__qaAnswerEvents.filter(e=>e.qIndex==='+str(q)+')');ph.screenshot(path=out/f'failure-{pid}.png')
                        except Exception as e:failure_detail['inputEvents'][pid]=str(e)
                (out/'answer-diagnostic.json').write_text(json.dumps(failure_detail,indent=2,ensure_ascii=False))
                tv.screenshot(path=out/'failure-round.png')
            assert_round(r,q,planned,bets);processed+=len(r['answers'])
            witness.append({'round':q+1,'answers':len(r['answers']),'seconds':round(time.monotonic()-t,2),'wager':q==N-1})
            print('verified',json.dumps(witness[-1]),flush=True)
            if q==0:
                phase('board',q)
                check(tv.locator('.rank-row').count()==P,'ranking must show all players')
                check(tv.locator('.rank-row').first.get_attribute('data-player')==r['after'][max(range(len(r['after'])),key=lambda i:r['after'][i]['score'])]['id'] or int(tv.locator('.rank-row').first.locator('.score').get_attribute('data-to'))==max(p['score'] for p in r['after']),'incorrect displayed leader')
                for w,h in [(1280,720),(1920,1080),(3840,2160)]:layout(tv,w,h,'board-20')
                tv.set_viewport_size({'width':1920,'height':1080})
            if q in (0,N//2,N-1):
                if keep_images:tv.screenshot(path=out/f'round-{q+1}.png')
                heap.append({'round':q+1,'tvJsHeapBytes':tv.evaluate('performance.memory ? performance.memory.usedJSHeapSize : null'),'phoneJsHeapBytes':phones[0][1].evaluate('performance.memory ? performance.memory.usedJSHeapSize : null')})
        stage='final';phase('final');s=snapshot()['session']
        check(len(s['rounds'])==N and processed==P*N,'missing rounds or answers')
        check(all(p['score']>=0 for p in s['players']),'negative final score')
        check(tv.locator('.podium .pod strong').count()==3 and tv.locator('.rest-grid .rest').count()==P-3,'final roster missing')
        for w,h in [(1280,720),(1920,1080),(3840,2160)]:layout(tv,w,h,'final-20')
        tv.set_viewport_size({'width':1920,'height':1080})
        if keep_images:phones[0][1].screenshot(path=out/'final-phone.png')
        stage='archive';tv.locator('#archive-session').click();tv.wait_for_function('DabtTV.snapshot().archives.length===1')
        archived=snapshot()['archives'][0];check(archived['id']==sid and len(archived['rounds'])==N,'archive missing rounds')
        tv.reload();tv.wait_for_function('window.DabtTV && DabtTV.snapshot().archives.length===1')
        check(snapshot()['archives'][0]['rounds']==archived['rounds'],'archive changed on reload')
        check(not errors,errors)
        if MODE=='drop':check(faults['droppedAnswerCopies']==3 and any(x['device']=='stressphone0' and x['qIndex']==0 and x['count']>3 for x in requests.values()),'retry after lost copies not proven')
        if MODE=='reload':check(faults['reloaded'],'reload scenario not executed')
        if MODE=='late':check(faults['lateElapsedMs'] is not None,'late answer missing')
        if MODE=='help':check(faults['help'] and faults['objection'],'help/objection scenario not executed')
        if MODE=='overlap':check(faults['overlap'],'overlap scenario not executed')
        result={'passed':True,'game':GAME,'sessionId':sid,'profile':MODE,'look':LOOK,'motion':MOTION,'faults':faults,'heapSamples':heap,'browser':b.version,'players':P,'browserPhoneContexts':P,'questions':N,'answers':processed,'assertions':checks,'rounds':witness,'seconds':round(time.monotonic()-started,2),'transport':'simulated MQTT WebSocket brokers','shard':SHARD,'physicalTV':False,'physicalPhone':False,'publicBrokers':False,'pageErrors':errors}
        (out/'stress-result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2),flush=True)
        b.close()
except Exception:
    result={'passed':False,'game':GAME,'profile':MODE,'faults':faults,'shard':SHARD,'stage':stage,'playersRequested':P,'questionsRequested':N,'answersVerified':processed,'assertions':checks,'rounds':witness,'pageErrors':errors,'traceback':traceback.format_exc(),'answerDiagnostic':failure_detail}
    (out/'stress-result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2),flush=True)
    raise
