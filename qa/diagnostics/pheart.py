"""Focused WebKit final-station diagnostic. Prior Palace stations are fixtures."""
import asyncio,json,pathlib
from playwright.async_api import async_playwright
OUT=pathlib.Path('qa/browser/completion-shots');OUT.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.webkit.launch();pg=await b.new_page(viewport={'width':390,'height':844},has_touch=True)
  errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('crash',lambda:errs.append('PAGE CRASH'))
  await pg.add_init_script('window.__test={}')
  await pg.goto('http://127.0.0.1:8765/index.html');await pg.wait_for_function('()=>!!window.fitOpenings')
  if await pg.locator('.mpc[data-m=main]').count():await pg.click('.mpc[data-m=main]')
  await pg.evaluate('''()=>{
   window.__diagTrace=[];const trace=x=>__diagTrace.push([Date.now(),...x]);
   const timer=window.setTimeout,clear=window.clearTimeout;const watched=new Set();
   window.setTimeout=function(fn,ms,...args){const watch=ms===1500||ms===8600;let id;
     id=timer(()=>{if(watch)trace(['fire',id,ms]);fn(...args)},ms);
     if(watch){watched.add(id);trace(['schedule',id,ms,String(fn).slice(0,100)])}return id};
   window.clearTimeout=function(id){if(watched.has(id))trace(['clear',id]);return clear(id)};
   const stop=stopAll;stopAll=function(){trace(['stopAll',new Error().stack]);return stop()};
   const fin=finish;finish=function(r){trace(['finish',r]);return fin(r)};
  }''')
  await pg.evaluate("()=>{const a=pState();a.done=Object.fromEntries(PW.slice(0,18).map(s=>[s.id,1]));a.prog=18;S.save();startRun(['pz_pheart'])}")
  await pg.click('#stage #go');await pg.click('#fit-op-start');await pg.locator('#pzb').wait_for()
  async def snap(label):
   try:
    s=await asyncio.wait_for(pg.evaluate("()=>({text:document.querySelector('#stage').innerText.slice(-3000),hook:window.__test.pz.P,hidden:document.hidden,stage:txStageOf('pz_pheart'),ended:!!document.querySelector('.res'),solved:!!document.querySelector('#pzb.solved'),trace:window.__diagTrace,errors:window.__diagErrors||[]})"),8)
    print(label,json.dumps(s,ensure_ascii=False),flush=True)
    await pg.screenshot(path=str(OUT/(label+'.png')),timeout=8000)
   except Exception as e:print(label,'DIAGNOSTIC ERROR',str(e),flush=True)
  await snap('before')
  print('SOLVING',flush=True)
  await asyncio.wait_for(pg.evaluate("()=>{const h=window.__test.pz;h.set(h.P.sol);h.release()}"),10)
  await snap('released')
  await pg.wait_for_timeout(14000);await snap('after14')
  print('PAGE ERRORS',json.dumps(errs,ensure_ascii=False),flush=True)
  await b.close()
asyncio.run(main())
