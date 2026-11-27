"""Focused real Web Audio verification; no load/pressure tests."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
out=root/'tests/results/2.4.7-audio';out.mkdir(parents=True,exist_ok=True)
engine=os.environ.get('QA_ENGINE','chromium')
with sync_playwright() as p:
    browser=getattr(p,engine).launch()
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<button id="start">Start</button><button id="stop">Stop</button>')
    page.add_script_tag(path=str(root/'shared/av.js'))
    page.evaluate("""()=>{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)throw Error('Web Audio unavailable');
      window.probe={nodes:0,buffers:0,contexts:0};
      const osc=AC.prototype.createOscillator,buf=AC.prototype.createBuffer;
      AC.prototype.createOscillator=function(){probe.nodes++;return osc.apply(this,arguments)};
      AC.prototype.createBuffer=function(){probe.buffers++;return buf.apply(this,arguments)};
      const Wrapped=function(){probe.contexts++;return new AC()};
      Wrapped.prototype=AC.prototype;
      if(window.AudioContext)window.AudioContext=Wrapped;else window.webkitAudioContext=Wrapped;
      window.music=DabtMusic();
      document.querySelector('#start').onclick=()=>{music.unlock();music.start(0);music.volume(.2)};
      document.querySelector('#stop').onclick=()=>music.stop();
    }""")
    page.locator('#start').click()
    page.wait_for_function('!music.blocked() && probe.nodes>0',timeout=10000)
    assert page.evaluate('music.themes.length')==3
    assert page.evaluate('probe.buffers')==1
    for theme in range(3):
        prior=page.evaluate('probe.nodes')
        page.evaluate('(t)=>{music.start(t);music.hurry(true);music.volume(.1)}',theme)
        page.wait_for_function('(n)=>probe.nodes>n',arg=prior)
        assert page.evaluate('music.playing()')
    page.locator('#stop').click()
    assert not page.evaluate('music.playing()')
    count=page.evaluate('probe.nodes')
    page.wait_for_timeout(300)
    assert page.evaluate('probe.nodes')==count
    page.locator('#start').click()
    page.wait_for_function('(n)=>probe.nodes>n',arg=count)
    assert page.evaluate('probe.buffers===1 && probe.contexts===1')
    page.locator('#stop').click()
    assert not errors,errors
    result={'passed':True,'engine':engine,'themes':3,'singleNoiseBuffer':True,'singleContext':True,'stopScheduling':True,'restart':True,'pageErrors':errors,'physicalAudioMeasured':False}
    (out/f'{engine}.json').write_text(json.dumps(result));print(json.dumps(result))
    browser.close()
