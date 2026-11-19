"""Trace the final station after actual progression through all Palace rounds."""
import asyncio,json,sys,pathlib,types
sys.path.insert(0,str(pathlib.Path('qa/browser').resolve()))
suite=types.ModuleType('journey_completion_diagnostic')
exec(pathlib.Path('qa/browser/journey_completion.py').read_text().replace('\nasyncio.run(main())',''),suite.__dict__)
from playwright.async_api import async_playwright
original_boot=suite.boot
page=None
async def boot(*args,**kwargs):
 global page
 ctx,page=await original_boot(*args,**kwargs)
 await page.evaluate('''()=>{
 window.__diagTrace=[];const trace=x=>__diagTrace.push([Date.now(),...x]);
 const timer=window.setTimeout,clear=window.clearTimeout;const watched=new Set();
 window.setTimeout=function(fn,ms,...args){const watch=ms===1500||ms===8600;let id;
 id=timer(()=>{if(watch)trace(['fire',id,ms]);fn(...args)},ms);
 if(watch){watched.add(id);trace(['schedule',id,ms,String(fn).slice(0,100)])}return id};
 window.clearTimeout=function(id){if(watched.has(id))trace(['clear',id]);return clear(id)};
 const stop=stopAll;stopAll=function(){if(curGame()?.id==='pz_pheart')trace(['stopAll',new Error().stack]);return stop()};
 const done=finish;finish=function(r){trace(['finish',curGame()?.id]);return done(r)};
 }''')
 return ctx,page
suite.boot=boot
suite.ENGINE='webkit'
async def main():
 async with async_playwright() as p:
  b=await p.webkit.launch()
  try:await suite.palace(b)
  except Exception as e:
   print('FAILURE',str(e),flush=True)
   try:
    print('DIAGNOSTIC',json.dumps(await page.evaluate("()=>({text:document.querySelector('#stage').innerText.slice(-4000),html:document.querySelector('#stage').innerHTML.slice(-3000),hidden:document.hidden,paused:DX.clock.paused(),game:curGame()?.id,stage:txStageOf('pz_pheart'),ended:!!document.querySelector('.res'),solved:!!document.querySelector('#pzb.solved'),trace:__diagTrace})"),ensure_ascii=False),flush=True)
    await page.screenshot(path='qa/browser/completion-shots/pheart-failure.png',timeout=8000)
   except Exception as x:print('DIAGNOSTIC ERROR',str(x),flush=True)
   raise
  finally:await b.close()
asyncio.run(main())
