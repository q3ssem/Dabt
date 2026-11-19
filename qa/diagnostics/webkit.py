"""Focused rendering diagnostic; preceding campaign progress is a fixture, not a playthrough."""
import asyncio,json,os,pathlib
from playwright.async_api import async_playwright
MODE=os.environ.get('CASE','heart');OUT=pathlib.Path('qa/browser/completion-shots');OUT.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.webkit.launch();pg=await b.new_page(viewport={'width':390,'height':844},has_touch=True)
  pg.on('pageerror',lambda e:print('PAGEERROR',str(e),flush=True));pg.on('console',lambda m:print('CONSOLE',m.text,flush=True) if m.type=='error' or m.text.startswith('TRACE') else None)
  await pg.add_init_script('window.__test={}')
  await pg.goto('http://127.0.0.1:8765/index.html');await pg.wait_for_function('()=>!!window.fitOpenings')
  if await pg.locator('.mpc[data-m=main]').count():await pg.click('.mpc[data-m=main]')
  await pg.evaluate('''()=>{
   window.__trace=[];const log=(...x)=>{__trace.push([Date.now(),...x]);console.log('TRACE',JSON.stringify(x))};
   const timer=setTimeout,clear=clearTimeout;const ids=new Set();
   window.setTimeout=function(fn,ms,...args){let id;const watch=ms===1500||ms===8600;id=timer(()=>{if(watch)log('fire',id,ms);fn(...args)},ms);if(watch){ids.add(id);log('schedule',id,ms)}return id};
   window.clearTimeout=function(id){if(ids.has(id))log('clear',id);return clear(id)};
   const win0=sfx.win;sfx.win=function(){log('sfx.before');const r=win0();log('sfx.after');return r};
   const stamp0=pzStamp;pzStamp=function(t){log('stamp.before');const r=stamp0(t);log('stamp.after');return r};
   const finish0=finish;finish=function(r){log('finish');return finish0(r)};
   const stop0=stopAll;stopAll=function(){log('stop');return stop0()};
  }''')
  if MODE.startswith('heart'):
   if MODE.endswith('muted'):await pg.evaluate('()=>S.st.mute=true')
   await pg.evaluate("()=>{const a=pState();a.done=Object.fromEntries(PW.slice(0,18).map(s=>[s.id,1]));a.prog=18;S.save();startRun(['pz_pheart'])}")
   await pg.click('#stage #go');await pg.click('#fit-op-start');await pg.locator('#pzb').wait_for()
   await pg.evaluate('()=>{const h=__test.pz;h.set(h.P.sol);h.release()}')
  else:
   await pg.click('.tab[data-tab=puz]')
   await pg.evaluate("()=>{const x=T7.state();T7.data.stations.forEach(s=>x.done[s.id]={at:1});x.rewards=[0,1,2,3,4,5,6];S.save();T7.map()}")
   await pg.wait_for_timeout(800)
   print('CLICKING REPLAY',flush=True)
   try:await pg.get_by_role('button',name='إعادة مشاهدة الخاتمة').click(timeout=15000)
   except Exception as e:print('CLICK ERROR',str(e),flush=True)
  for n in range(12):
   await pg.wait_for_timeout(2000)
   try:
    data=await asyncio.wait_for(pg.evaluate("()=>({text:(document.querySelector('#stage')?.innerText||'').slice(-900),trace:__trace.slice(-15),paused:DX.clock.paused(),hidden:document.hidden,result:!!document.querySelector('#stage .res'),solved:!!document.querySelector('#pzb.solved'),finale:!!document.querySelector('.v5-finale'),playHidden:document.querySelector('#play').hidden})"),5)
    print('SNAP',n,json.dumps(data,ensure_ascii=False),flush=True)
   except Exception as e:print('SNAP ERROR',str(e),flush=True);break
  if MODE.startswith('heart'):assert await pg.locator('#stage .res').count()==1,'final result must render with audio enabled and muted'
  else:assert await pg.locator('.v5-finale').count()==1,'replay must open the finale by a real click'
  try:await pg.screenshot(path=str(OUT/(MODE+'.png')),timeout=8000)
  except Exception as e:print('SCREEN ERROR',str(e),flush=True)
  await b.close()
asyncio.run(main())
