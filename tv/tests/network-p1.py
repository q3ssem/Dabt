import functools,http.server,os,threading,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
engine=os.environ.get('QA_ENGINE','chromium')
try:
 with sync_playwright() as p:
  b=getattr(p,engine).launch()
  c=b.new_context()
  a=c.new_page();r=c.new_page()
  errors=[]
  for pg in [a,r]:
   pg.on('pageerror',lambda e:errors.append(str(e)))
   pg.goto(f'http://127.0.0.1:{server.server_port}/network/README.md')
   pg.add_script_tag(url=f'http://127.0.0.1:{server.server_port}/network/link.js')
  invite=a.evaluate('MajlisNetwork.createInvite()')
  for pg,role in [(a,'host'),(r,'remote')]:
   pg.evaluate("""async ({invite,role})=>{window.inputs=[];window.wire=[];window.bus=new BroadcastChannel(invite.room);window.link=await MajlisNetwork.createLink({invite,role,send:s=>{wire.push(s);bus.postMessage(s);return true},onInput:m=>inputs.push(m)});bus.onmessage=e=>link.receive(e.data)}""",{'invite':invite,'role':role})
  a.wait_for_function("link.snapshot().peer")
  r.wait_for_function("link.snapshot().route==='direct'",timeout=25000)
  a.wait_for_function("link.snapshot().route==='direct'",timeout=25000)
  r.evaluate('link.move(.5,-.25,true)')
  a.wait_for_function("inputs.some(x=>x.action&&x.x===.5&&x.y===-.25&&x.path==='direct')")
  a.wait_for_function("inputs.some(x=>x.path==='watchdog')")
  r.wait_for_function("link.snapshot().direct.samples>=3",timeout=10000)
  # Wire contains ciphertext only; the invite key and plaintext SDP must not appear.
  assert not r.evaluate("(s)=>wire.some(x=>x.includes(s)||x.includes('sdp')||x.includes('hello'))",invite['secret'])
  # Force relay-only pair by removing WebRTC support, without changing encryption.
  for pg in [a,r]:pg.evaluate('link.close();bus.close();window.RTCPeerConnection=undefined')
  invite=a.evaluate('MajlisNetwork.createInvite()')
  for pg,role in [(a,'host'),(r,'remote')]:
   pg.evaluate("""async ({invite,role})=>{window.inputs=[];window.wire=[];window.bus=new BroadcastChannel(invite.room);window.link=await MajlisNetwork.createLink({invite,role,send:s=>{wire.push(s);bus.postMessage(s);return true},onInput:m=>inputs.push(m)});bus.onmessage=e=>link.receive(e.data)}""",{'invite':invite,'role':role})
  r.wait_for_function("link.snapshot().route==='relay'",timeout=10000)
  r.evaluate('link.move(-1,1,true)')
  a.wait_for_function("inputs.some(x=>x.path==='relay'&&x.x===-1&&x.y===1)")
  a.wait_for_function("inputs.some(x=>x.path==='watchdog')")
  before=a.evaluate('inputs.length')
  # Tamper ciphertext and replay all previously sent messages.
  for raw in r.evaluate('wire.slice()'):
   obj=json.loads(raw);obj['data']='00'+obj['data'][2:]
   a.evaluate('s=>link.receive(s)',json.dumps(obj))
   a.evaluate('s=>link.receive(s)',raw)
  assert a.evaluate('inputs.length')==before
  assert not errors,errors
  print(json.dumps({'engine':engine,'direct':True,'relay':True,'watchdog':True,'encrypted':True,'replayRejected':True,'tamperRejected':True,'pressure':False}))
  b.close()
finally:
 server.shutdown();server.server_close()
