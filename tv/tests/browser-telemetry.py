import os,json,functools,http.server,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_mqtt_brokers_239 import LocalBrokers,BROKERS
root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
broker=LocalBrokers()
endpoint='https://abcdefghijklmnopqrst.supabase.co/functions/v1/majlis-telemetry'
token='ab'*32
calls=[]
fail=[True]
def route(r):
 if r.request.method=='OPTIONS':
  r.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'});return
 body=r.request.post_data_json
 calls.append(body)
 assert r.request.headers.get('authorization')=='Bearer '+token
 assert set(body)=={'schema','version','id','events'}
 assert all(set(e)=={'kind','minute','a','b','c'} for e in body['events'])
 r.fulfill(status=503 if fail[0] else 200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps({'accepted':not fail[0],'id':body['id']}))
try:
 with sync_playwright() as p:
  b=getattr(p,os.environ.get('QA_ENGINE','chromium')).launch();c=b.new_context(viewport={'width':1280,'height':720})
  broker.install(c);c.route(endpoint,route)
  c.route('https://fonts.googleapis.com/**',lambda r:r.abort())
  c.route('https://fonts.gstatic.com/**',lambda r:r.abort())
  c.add_init_script("if(!sessionStorage.seeded){localStorage.setItem('dabt:v2',JSON.stringify({room:'123456',config:{brokers:"+json.dumps(BROKERS)+"}}));sessionStorage.seeded='1'}")
  pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  pg.goto(f'http://127.0.0.1:{server.server_port}/?tv=1')
  pg.locator('#settings').click();pg.locator('#dev-reports').click()
  assert pg.locator('#dev-send').is_disabled()
  assert 'متوقف' in pg.locator('#dev-status').inner_text()
  pg.locator('#dev-toggle').click();pg.locator('#dev-preview').click()
  expected=json.loads(pg.locator('#dev-preview-text').input_value())
  assert expected['events'];assert not calls
  assert token not in json.dumps(expected)
  pg.locator('#dev-url').fill(endpoint);pg.locator('#dev-token').fill(token);pg.locator('#dev-send').click()
  pg.wait_for_function("document.querySelector('#dev-status').textContent.includes('تعذر الإرسال')")
  assert len(calls)==1 and calls[0]==expected
  assert pg.locator('#dev-preview-text').input_value()
  fail[0]=False
  pg.locator('#dev-token').fill(token);pg.locator('#dev-send').click()
  pg.wait_for_function("document.querySelector('#dev-status').textContent.includes('استلم الخادم')")
  assert len(calls)==2 and calls[1]==expected
  assert pg.locator('#dev-token').input_value()==''
  assert not pg.evaluate("(t)=>Object.keys(localStorage).some(k=>localStorage.getItem(k).includes(t))",token)
  pg.locator('#dev-toggle').click()
  assert pg.locator('#dev-send').is_disabled()
  assert json.loads(pg.evaluate("localStorage.getItem('majlis:dev-report:v1')"))['events']==[]
  assert not errors,errors
  print(json.dumps({'previewRequired':True,'noAutoSend':True,'failedUploadPreserved':True,'receiptMatched':True,'tokenNotPersisted':True,'erase':True,'mockServer':True,'pageErrors':errors}))
  b.close()
finally:
 server.shutdown();server.server_close()
