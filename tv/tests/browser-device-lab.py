import os, json, functools, http.server, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers_239 import LocalBrokers,BROKERS
root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
engine=os.environ.get('QA_ENGINE','chromium')
broker=LocalBrokers()
try:
 with sync_playwright() as p:
  b=getattr(p,engine).launch();c=b.new_context(viewport={'width':1280,'height':720})
  broker.install(c)
  c.route('https://fonts.googleapis.com/**',lambda r:r.abort())
  c.route('https://fonts.gstatic.com/**',lambda r:r.abort())
  c.add_init_script("if(!sessionStorage.seeded){localStorage.setItem('dabt:v2',JSON.stringify({room:'123456',config:{brokers:"+json.dumps(BROKERS)+"}}));sessionStorage.seeded='1'}")
  pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  pg.goto(f'http://127.0.0.1:{server.server_port}/?tv=1')
  pg.locator('#settings').click();pg.locator('#device-lab').click()
  pg.locator('#device-start').click()
  pg.wait_for_function("document.querySelector('#device-status').textContent.includes('اكتملت')",timeout=20000)
  pg.locator('#device-report').click()
  report=json.loads(pg.locator('#device-report-text').input_value())
  assert report['benchmark']['status']=='complete',report
  assert len(report['benchmark']['tests'])==2
  assert [(x['width'],x['height']) for x in report['benchmark']['tests']]==[(1280,720),(1920,1080)]
  assert all(x['frames']>0 and x['fps']>0 for x in report['benchmark']['tests'])
  assert report['capabilities']['caps']['canvas2d'] is True
  pg.locator('#device-start').click();pg.locator('#device-stop').click()
  pg.wait_for_function("document.querySelector('#device-status').textContent.includes('cancelled')")
  pg.locator('#device-start').click();pg.locator('#device-close').click();pg.wait_for_timeout(1000)
  assert pg.locator('#modal').is_hidden()
  pg.locator('#device-lab').click();pg.locator('#device-audio').click()
  pg.wait_for_function("!document.querySelector('#device-audio-status').textContent.includes('جارٍ')",timeout=5000)
  pg.locator('#device-report').click();audio=json.loads(pg.locator('#device-report-text').input_value())['audio'];assert audio!='not-tested'
  assert not errors,errors
  print(json.dumps({'engine':engine,'benchmark':report['benchmark'],'audioState':audio,'cancelled':True,'closed':True,'pageErrors':errors}))
  b.close()
finally:
 server.shutdown();server.server_close()
