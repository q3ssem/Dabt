"""Real HTTP origin /Dabt/tv/; exercise actual service-worker installation and offline launch."""
import functools, http.server, json, os, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[2]
out=root/'tv/tests/results/2.4.7-cache';out.mkdir(parents=True,exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self,path):
        if path.startswith('/Dabt/'):path=path[5:]
        return super().translate_path(path)
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
url=origin+'/Dabt/tv/'
engine=os.environ.get('QA_ENGINE','chromium')
try:
    with sync_playwright() as p:
        b=getattr(p,engine).launch()
        ctx=b.new_context(viewport={'width':1280,'height':720},service_workers='allow')
        ctx.route('https://**/*',lambda r:r.abort())
        pg=ctx.new_page()
        errors=[]
        pg.on('pageerror',lambda e:errors.append(str(e)))
        pg.goto(url+'tv/index.html?tv=1',wait_until='domcontentloaded')
        pg.wait_for_function("window.DabtTV && DabtTV.version==='2.4.8'")
        pg.wait_for_function("navigator.serviceWorker.controller!==null",timeout=30000)
        keys=pg.evaluate("""async()=>{let c=await caches.open('majlis-tv-shell-2.4.8-reports-p1');return (await c.keys()).map(r=>r.url)}""")
        assert len(keys)==35,keys
        assert all(k.startswith(url) and '?' not in k for k in keys),keys
        pg.locator('#settings').click()
        pg.wait_for_function("document.querySelector('#local-cache').textContent.includes('34')")
        pg.screenshot(path=out/f'{engine}-cache-status.png')
        saved=pg.evaluate("localStorage.getItem('dabt:v2')")
        # Stop the real HTTP origin rather than using the WebKit offline emulator,
        # which returned an internal error before the app could handle navigation.
        # The same reload and fresh navigation assertions remain mandatory.
        server.shutdown();server.server_close()
        import socket
        with socket.socket() as probe:
            probe.settimeout(2)
            assert probe.connect_ex(('127.0.0.1',server.server_port))!=0, 'HTTP origin still reachable'
        pg.reload(wait_until='domcontentloaded')
        pg.wait_for_function("window.DabtTV && DabtTV.version==='2.4.8'")
        assert pg.locator('#kahoot').is_visible()
        assert pg.evaluate("JSON.parse(localStorage.getItem('dabt:v2')).room") == json.loads(saved)['room']
        pg.screenshot(path=out/f'{engine}-offline-tv.png')
        phone=ctx.new_page()
        phone.goto(url+'remote/remote.html?c=123456&p=345678',wait_until='domcontentloaded')
        phone.wait_for_function("window.DabtRemote && DabtRemote.version==='2.4.8'")
        assert phone.evaluate("location.search")=='?c=123456&p=345678'
        assert phone.locator('#status').is_visible()
        phone.screenshot(path=out/f'{engine}-offline-remote.png')
        assert not errors,errors
        ctx.close();b.close()
        result={'passed':True,'engine':engine,'assets':34,'offlineTV':True,'offlineRemote':True,'queryNotCached':True,'realOriginStopped':True,'pageErrors':errors}
        (out/f'{engine}.json').write_text(json.dumps(result));print(json.dumps(result))
finally:
    server.shutdown();server.server_close()
