"""Mind Lab performance bench (Chromium lab measurements, not field data).
Usage: python3 qa/browser/perf_bench.py URL [OUT.json]
  RUNS=3 · THROTTLE=1 (adds a slow-network + 4x CPU pass) · PUZZLES=pz_river,pz_rush,... · CYCLES=10 (open/close leak loop)
What it measures, per scenario (cold = new profile, no HTTP cache, no service worker; warm = same profile reloaded
after the service worker took control; offline = warm profile with the network cut):
  FCP, LCP, CLS, long tasks (count / total), TBT-lab (sum of long-task time above 50 ms from FCP to +5 s),
  DOMContentLoaded, load, app-ready (home tabs painted and startRun defined), requests, transferred bytes,
  uncompressed bytes, gzip-estimated bytes for text files (GitHub Pages compresses text), JS heap after GC,
  DOM nodes, JS event listeners.
Then: puzzle open time (Start pressed -> board built and its images decoded) and an open/close loop that records
heap, nodes and listeners after GC to spot leaks. Every number printed is measured in this run; nothing is estimated
except the gzip column, which is labelled as such."""
import asyncio, gzip, json, os, statistics, sys, time, pathlib, urllib.parse
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8150/'
OUT = sys.argv[2] if len(sys.argv) > 2 else None
ROOT = pathlib.Path(os.environ.get('ROOT', pathlib.Path(__file__).resolve().parents[2]))
RUNS = int(os.environ.get('RUNS', '3'))
PUZZLES = os.environ.get('PUZZLES', 'pz_river,pz_rush,pz_stat,pz_lock,pz_pliar,pz_aarch,pz_xbottle,pz_wlog').split(',')
CYCLES = int(os.environ.get('CYCLES', '10'))
TEXT = ('.html', '.js', '.css', '.json', '.svg', '.webmanifest', '.txt')
_gz = {}

def gz_size(url):
    p = urllib.parse.urlparse(url).path
    base = urllib.parse.urlparse(URL).path
    rel = p[len(base):] if p.startswith(base) else p.lstrip('/')
    rel = rel or 'index.html'
    f = ROOT / urllib.parse.unquote(rel)
    if not f.suffix.lower() in TEXT or not f.is_file(): return None
    if f not in _gz: _gz[f] = len(gzip.compress(f.read_bytes(), 6))
    return _gz[f]

INIT = r"""(()=>{const M=window.__perf={fcp:null,lcp:null,cls:0,lt:[],t0:performance.timeOrigin};
 try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint')M.fcp=e.startTime}).observe({type:'paint',buffered:true})}catch(e){}
 try{new PerformanceObserver(l=>{for(const e of l.getEntries())M.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true})}catch(e){}
 try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)M.cls+=e.value}).observe({type:'layout-shift',buffered:true})}catch(e){}
 try{new PerformanceObserver(l=>{for(const e of l.getEntries())M.lt.push([e.startTime,e.duration])}).observe({type:'longtask',buffered:true})}catch(e){}
 const ready=()=>{if(M.ready==null&&document.querySelector('.tabs .tab')&&typeof window.startRun==='function')M.ready=performance.now();else if(M.ready==null)requestAnimationFrame(ready)};requestAnimationFrame(ready);
})()"""

async def open_session(ctx, throttle=False):
    pg = await ctx.new_page()
    cdp = await ctx.new_cdp_session(pg)
    await cdp.send('Network.enable'); await cdp.send('Performance.enable')
    reqs = {}
    def on_resp(e):
        r = e['response']; reqs.setdefault(e['requestId'], {})
        reqs[e['requestId']].update(url=r['url'], sw=r.get('fromServiceWorker', False), disk=r.get('fromDiskCache', False), status=r['status'], type=e.get('type'))
    def on_fin(e):
        reqs.setdefault(e['requestId'], {})['enc'] = e.get('encodedDataLength', 0)
    def on_fail(e):
        reqs.setdefault(e['requestId'], {})['failed'] = e.get('errorText')
    cdp.on('Network.responseReceived', on_resp); cdp.on('Network.loadingFinished', on_fin); cdp.on('Network.loadingFailed', on_fail)
    if throttle:
        await cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 150, 'downloadThroughput': 200000, 'uploadThroughput': 90000})
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    return pg, cdp, reqs

async def heap(cdp, pg):
    await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage')
    h = await cdp.send('Runtime.getHeapUsage')
    c = await cdp.send('Memory.getDOMCounters')
    return {'heapMB': round(h['usedSize'] / 1048576, 2), 'nodes': c['nodes'], 'listeners': c['jsEventListeners'], 'docs': c['documents']}

async def load_once(ctx, label, throttle=False, offline=False):
    pg, cdp, reqs = await open_session(ctx, throttle)
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    if offline: await ctx.set_offline(True)
    t = time.time()
    try:
        await pg.goto(URL, wait_until='load', timeout=180000)
        try: await pg.wait_for_load_state('networkidle', timeout=60000)
        except Exception: pass
    except Exception as e:
        errors.append('navigation: ' + str(e)[:120])
    await pg.wait_for_timeout(3000 if not throttle else 6000)
    m = await pg.evaluate("""()=>{const M=window.__perf||{},n=performance.getEntriesByType('navigation')[0]||{};const f=M.fcp||0;
      const tbt=(M.lt||[]).filter(([s])=>s>=f&&s<=f+5000).reduce((a,[s,d])=>a+Math.max(0,d-50),0);
      return {fcp:M.fcp,lcp:M.lcp,cls:+(M.cls||0).toFixed(4),longTasks:(M.lt||[]).length,longTaskMs:Math.round((M.lt||[]).reduce((a,[s,d])=>a+d,0)),tbt:Math.round(tbt),
        dcl:Math.round(n.domContentLoadedEventEnd||0),load:Math.round(n.loadEventEnd||0),ready:M.ready!=null?Math.round(M.ready):null,
        sw:!!(navigator.serviceWorker&&navigator.serviceWorker.controller),domNodes:document.getElementsByTagName('*').length,
        scripts:document.scripts.length,styles:document.querySelectorAll('link[rel=stylesheet],style').length}}""")
    if offline: await ctx.set_offline(False)
    rs = [r for r in reqs.values() if r.get('url', '').startswith('http')]
    net = [r for r in rs if not r.get('sw') and not r.get('disk')]
    m['requests'] = len(rs); m['networkRequests'] = len(net)
    m['transferKB'] = round(sum(r.get('enc', 0) for r in net) / 1024, 1)
    gz = 0
    for r in net:
        g = gz_size(r['url']); gz += g if g is not None else r.get('enc', 0)
    m['gzipEstKB'] = round(gz / 1024, 1)
    m['failed'] = [r['url'].split('/', 3)[-1] for r in rs if r.get('failed') or (r.get('status') or 200) >= 400][:12]
    m.update(await heap(cdp, pg)); m['errors'] = errors[:5]; m['label'] = label
    byType = {}
    for r in net: byType[r.get('type') or '?'] = byType.get(r.get('type') or '?', 0) + 1
    m['netByType'] = byType
    return pg, cdp, m

async def puzzle_times(pg, cdp):
    sys.path.insert(0, str(pathlib.Path(__file__).parent)); from smoke import dismiss_opening
    if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]'); await pg.wait_for_timeout(600)
    out = {}
    for g in PUZZLES:
        try:
            await pg.evaluate('(g)=>startRun([g])', g)
            await pg.locator('#stage #go').wait_for(state='visible', timeout=20000)
            t0 = await pg.evaluate('performance.now()')
            await pg.locator('#stage #go').click()
            await dismiss_opening(pg)
            await pg.wait_for_function("()=>{const b=document.querySelector('#pzb');return b&&b.children.length&&!document.querySelector('#stage .cd')}", timeout=30000)
            await pg.evaluate("async()=>{const ims=[...document.querySelectorAll('#pzb img')];await Promise.all(ims.map(i=>i.decode?i.decode().catch(()=>0):0))}")
            t1 = await pg.evaluate('performance.now()')
            out[g] = round(t1 - t0)
        except Exception as e:
            out[g] = 'error: ' + str(e)[:80]
        await pg.evaluate('()=>{try{closePlay()}catch(e){}}'); await pg.wait_for_timeout(300)
    return out

async def leak_loop(pg, cdp):
    rows = [await heap(cdp, pg)]
    sys.path.insert(0, str(pathlib.Path(__file__).parent)); from smoke import open_game
    for c in range(CYCLES):
        for g in PUZZLES[:4]:
            try: await open_game(pg, g)
            except Exception: pass
            await pg.evaluate('()=>{try{closePlay()}catch(e){}}'); await pg.wait_for_timeout(150)
        rows.append(await heap(cdp, pg))
    timers = await pg.evaluate("()=>window.__perfTimers||null")
    return rows

def med(xs):
    xs = [x for x in xs if isinstance(x, (int, float))]
    return round(statistics.median(xs), 1) if xs else None

async def main():
    res = {'url': URL, 'runs': RUNS, 'engine': 'chromium', 'when': time.strftime('%Y-%m-%d %H:%M'), 'scenarios': {}}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox', '--enable-precise-memory-info', '--js-flags=--expose-gc'])
        vp = {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True, 'locale': 'ar-SA', 'device_scale_factor': 2}
        cold, warm = [], []
        for i in range(RUNS):
            ctx = await b.new_context(**vp); await ctx.add_init_script(INIT)
            pg, cdp, m = await load_once(ctx, 'cold'); cold.append(m)
            # let the service worker finish installing, then reload as a returning player would
            try: await pg.wait_for_function('()=>navigator.serviceWorker&&navigator.serviceWorker.controller', timeout=60000)
            except Exception: pass
            await pg.wait_for_timeout(1500); await pg.close()
            pg, cdp, m = await load_once(ctx, 'warm'); warm.append(m)
            if i == 0:
                res['puzzleOpenMs'] = await puzzle_times(pg, cdp)
                res['leakLoop'] = await leak_loop(pg, cdp)
                await pg.close()
                pg, cdp, m = await load_once(ctx, 'offline', offline=True); res['scenarios']['offline'] = m
            await ctx.close()
        res['scenarios']['cold'] = cold; res['scenarios']['warm'] = warm
        if os.environ.get('THROTTLE', '1') != '0':
            ctx = await b.new_context(**vp); await ctx.add_init_script(INIT)
            pg, cdp, m = await load_once(ctx, 'cold-slow', throttle=True); res['scenarios']['coldSlow'] = m
            await ctx.close()
        await b.close()
    keys = ['fcp', 'lcp', 'cls', 'tbt', 'longTasks', 'longTaskMs', 'dcl', 'load', 'ready', 'requests', 'networkRequests', 'transferKB', 'gzipEstKB', 'heapMB', 'nodes', 'listeners', 'domNodes']
    res['median'] = {s: {k: med([r.get(k) for r in res['scenarios'][s]]) for k in keys} for s in ('cold', 'warm')}
    print(json.dumps({'median': res['median'], 'coldSlow': {k: res['scenarios'].get('coldSlow', {}).get(k) for k in keys},
                      'offline': {k: res['scenarios']['offline'].get(k) for k in keys + ['failed', 'errors', 'sw']},
                      'puzzleOpenMs': res['puzzleOpenMs'], 'leakLoop': [res['leakLoop'][0], res['leakLoop'][-1]],
                      'coldFailed': res['scenarios']['cold'][0]['failed'], 'coldErrors': res['scenarios']['cold'][0]['errors'],
                      'coldNetByType': res['scenarios']['cold'][0]['netByType']}, ensure_ascii=False, indent=1))
    if OUT: json.dump(res, open(OUT, 'w'), ensure_ascii=False, indent=1)

asyncio.run(main())
