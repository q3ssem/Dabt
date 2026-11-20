"""Per-puzzle retention: open/close each puzzle 4 times (in-page, so test handles keep nothing alive), GC, and
measure DOM nodes/listeners kept per extra open. A puzzle that keeps >40 nodes or >1 listener per open fails.
Usage: python3 qa/browser/leak_per_puzzle.py URL OUT.json"""
import asyncio,sys,json
from playwright.async_api import async_playwright
ONE=r"""async (g)=>{await startRun([g]);await new Promise(r=>setTimeout(r,200));const go=document.querySelector('#stage #go');if(go)go.click();
 await new Promise(r=>setTimeout(r,250));const op=document.querySelector('#fit-opening-overlay #fit-op-start');if(op)op.click();
 for(let i=0;i<40&&document.querySelector('#stage .cd');i++)await new Promise(r=>setTimeout(r,100));
 await new Promise(r=>setTimeout(r,300));closePlay();await new Promise(r=>setTimeout(r,150));}"""
async def main(url,out):
    res={}
    async with async_playwright() as p:
        b=await p.chromium.launch(); c=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); pg=await c.new_page()
        s=await c.new_cdp_session(pg)
        await pg.goto(url); await pg.wait_for_timeout(1500)
        if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]')
        await pg.wait_for_function("()=>!window.mindlabPlayLayers||window.mindlabPlayLayers.ready",timeout=20000)
        await pg.evaluate("()=>{S.st.mute=true}")
        ids=await pg.evaluate("()=>Object.keys(GM).filter(k=>/^pz_/.test(k))")
        async def cnt():
            await s.send('HeapProfiler.collectGarbage'); d=await s.send('Memory.getDOMCounters'); return d['nodes'],d['jsEventListeners']
        for g in ids:
            try:
                await pg.evaluate(ONE,g); n0=await cnt()
                for _ in range(3): await pg.evaluate(ONE,g)
                n1=await cnt(); res[g]=[(n1[0]-n0[0])/3,(n1[1]-n0[1])/3]
            except Exception as e: res[g]=str(e)[:60]
        await b.close()
    json.dump(res,open(out,'w'))
    bad={k:v for k,v in res.items() if not isinstance(v,list) or v[0]>40 or v[1]>1}
    print(len(res),'puzzles; retained per open above threshold:',json.dumps(bad))
    sys.exit(1 if bad else 0)
asyncio.run(main(sys.argv[1],sys.argv[2]))
