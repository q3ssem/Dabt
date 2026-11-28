"""Focused real Web Audio verification on a normal HTTP origin; no load tests."""
import functools,http.server,json,os,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.4.7-audio';out.mkdir(parents=True,exist_ok=True)
engine=os.environ.get('QA_ENGINE','chromium')
class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path=='/audio-test':
            body=b'<!doctype html><html><body><button id="start">Start</button><button id="stop">Stop</button><script src="/shared/av.js"></script></body></html>'
            self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
        else:super().do_GET()
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=getattr(p,engine).launch()
        page=browser.new_page()
        errors=[];console=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:console.append({'type':m.type,'text':m.text}))
        page.goto(f'http://127.0.0.1:{server.server_port}/audio-test')
        page.evaluate("""()=>{
          const AC=window.AudioContext||window.webkitAudioContext;
          if(!AC)throw Error('Web Audio unavailable');
          window.probe={nodes:0,buffers:0,contexts:0,events:[],resume:[],stops:0,frequencies:[]};
          const osc=AC.prototype.createOscillator,buf=AC.prototype.createBuffer,resume=AC.prototype.resume,gain=AC.prototype.createGain;
          AC.prototype.createOscillator=function(){probe.nodes++;const node=osc.apply(this,arguments),start=node.start,stop=node.stop;node.start=function(t){probe.frequencies.push({f:node.frequency.value,t});return start.apply(this,arguments)};node.stop=function(){probe.stops++;return stop.apply(this,arguments)};return node};
          AC.prototype.createGain=function(){const g=gain.apply(this,arguments);if(!window.masterProbe)window.masterProbe=g;return g};
          AC.prototype.createBuffer=function(){probe.buffers++;return buf.apply(this,arguments)};
          AC.prototype.resume=function(){const c=this;return resume.apply(c,arguments).then(()=>{probe.resume.push(c.state)},e=>{probe.resume.push(String(e));throw e})};
          const Wrapped=function(){probe.contexts++;const c=new AC();window.audioProbeContext=c;c.addEventListener('statechange',()=>probe.events.push(c.state));return c};
          Wrapped.prototype=AC.prototype;
          if(window.AudioContext)window.AudioContext=Wrapped;else window.webkitAudioContext=Wrapped;
          window.music=DabtMusic();
          document.querySelector('#start').onclick=()=>{probe.activation=navigator.userActivation&&navigator.userActivation.isActive;music.unlock();music.start(0);music.volume(.2)};
          document.querySelector('#stop').onclick=()=>music.stop();
        }""")
        try:
            page.locator('#start').click()
            page.wait_for_function('!music.blocked() && probe.nodes>0',timeout=15000)
            assert page.evaluate('music.themes.length')==3
            assert page.evaluate('probe.buffers')==1
            for theme in range(3):
                prior=page.evaluate('probe.nodes')
                page.evaluate('(t)=>{music.start(t);music.hurry(true);music.volume(.1)}',theme)
                page.wait_for_function('(n)=>probe.nodes>n',arg=prior)
                assert page.evaluate('music.playing()')
                assert abs(page.evaluate('masterProbe.gain.value')-.1)<.001
            page.evaluate('music.volume(0)')
            assert page.evaluate('masterProbe.gain.value')==0
            page.evaluate('music.volume(.35)')
            assert abs(page.evaluate('masterProbe.gain.value')-.35)<.001
            page.locator('#stop').click()
            assert not page.evaluate('music.playing()')
            assert page.evaluate('masterProbe.gain.value')==0
            count=page.evaluate('probe.nodes')
            page.wait_for_timeout(300)
            assert page.evaluate('probe.nodes')==count
            page.locator('#start').click()
            page.wait_for_function('(n)=>probe.nodes>n',arg=count)
            assert page.evaluate('probe.buffers===1 && probe.contexts===1')
            page.locator('#stop').click()
            assert not errors,errors
            result={'passed':True,'engine':engine,'themes':3,'singleNoiseBuffer':True,'singleContext':True,'stopScheduling':True,'mutedGain':True,'volumeRestore':True,'restart':True,'pageErrors':errors,'physicalAudioMeasured':False}
            (out/f'{engine}.json').write_text(json.dumps(result));print(json.dumps(result))
        except Exception:
            state=page.evaluate("()=>({probe:window.probe,state:window.audioProbeContext&&audioProbeContext.state,currentTime:window.audioProbeContext&&audioProbeContext.currentTime,blocked:window.music&&music.blocked(),playing:window.music&&music.playing()})")
            result={'passed':False,'engine':engine,'diagnostics':state,'pageErrors':errors,'console':console}
            (out/f'{engine}-failure.json').write_text(json.dumps(result));print(json.dumps(result));raise
        finally:browser.close()
finally:
    server.shutdown();server.server_close()
