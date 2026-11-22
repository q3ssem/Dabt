"""Phase-2: observe actual mechanics for all 86 live library puzzles.

Read-only engine witness probes, and player-visible controls, not a success
test. Never mutate scores, inject a winning answer, or call a win callback.
Per-chapter artifacts identify which engines can have a true UI solution
replayed, and which only expose internal QA witnesses.
Usage: python qa/browser/jaziran_86_mechanics_probe.py URL chromium|webkit CHAPTER OUTDIR
"""
import asyncio
import json
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright
from player_openings import dismiss_opening

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8791/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
CHAPTER=sys.argv[3] if len(sys.argv)>3 else 'training'
OUT=Path(sys.argv[4]) if len(sys.argv)>4 else Path('/tmp/jaziran86-mechanics')
ROOT=Path(__file__).resolve().parents[2]
IDX=json.loads((ROOT/'docs/JAZIRAN_PUZZLE_INDEX_2026-11-22.json').read_text('utf8'))
SECTIONS={sec['chapter']:[x['id'] for x in sec['entries'] if x['status']=='active']
          for sec in IDX['sections']}
assert ENGINE in ('chromium','webkit') and CHAPTER in SECTIONS
OUT.mkdir(parents=True,exist_ok=True)

PROBE=r"""()=> {
  const game=document.querySelector('#play'),stage=document.querySelector('#stage'),
    board=document.querySelector('#pzb'),hook=window.__test?.pz,
    reveal=v=>{
      if(v===null||v===undefined)return String(v);
      if(typeof v==='function')return 'fn:'+v.name;
      if(Array.isArray(v))return {kind:'array',n:v.length,
        sample:v.slice(0,4).map(x=>(typeof x==='object'?Object.keys(x||{}).slice(0,8):x))};
      if(typeof v==='object')return {kind:'object',keys:Object.keys(v).slice(0,40)};
      return String(v).slice(0,60);
    },
    controls=[...document.querySelectorAll('#pzb button,#pzb input,#pzb select,#pzb textarea,#stage button')].filter(
      el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden'
    ).map(el=>({tag:el.tagName,selector:(el.id?'#'+el.id:el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).join('.'):el.tagName.toLowerCase()),
      label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,60),
      data:Object.fromEntries(Object.entries(el.dataset).slice(0,6)),
      disabled:el.disabled||false})).slice(0,40);
  return {liveId:game?.dataset.laGame||'',title:document.querySelector('#pt')?.textContent?.trim(),
    status:document.querySelector('#pzt')?.textContent?.slice(0,160)||'',
    hooked:!!hook,hookKeys:hook?Object.keys(hook).sort():[],
    witness:hook?.P?Object.fromEntries(Object.entries(hook.P).slice(0,46).map(([k,v])=>[k,reveal(v)])):null,
    controls,controlCount:controls.length,htmlHints:document.querySelector('#pzh')?.outerHTML.slice(0,240),
    pzbState:board?.dataset||{},stageState:stage?.dataset||{},
    authoredPicker:!!document.querySelector('#stage .ml-authored-picker'),
    boardNodes:board?.querySelectorAll('*').length||0
  };
}"""

async def launch(page,gid):
    await page.evaluate('(id)=>startRun([id])',gid)
    # Authored engines load asynchronously after their level-selector bundle.
    if gid in ('pz_river','pz_rush','pz_pipe','pz_flow','pz_tan','pz_tent','pz_untangle','pz_ice'):
        await page.locator('#stage .ml-authored-picker .go-btn[data-level]').first.wait_for(
            state='visible',timeout=18000)
    else:
        await page.wait_for_timeout(250)
    picker=page.locator('#stage .ml-authored-picker .go-btn[data-level]')
    go=page.locator('#stage #go')
    route='direct'
    if await picker.count() and await picker.first.is_visible():
        await picker.first.click(timeout=6500)
        route='authored'
    elif await go.count() and await go.first.is_visible():
        await go.first.click(timeout=6500)
        route='classic'
    await dismiss_opening(page,wait=850)
    try:await page.wait_for_function("()=>!document.querySelector('#stage .cd')",timeout=8500)
    except Exception:pass
    await page.wait_for_timeout(180)
    return route

async def main():
    async with async_playwright() as pw:
        browser=(await pw.webkit.launch()) if ENGINE=='webkit' else (
            await pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),
                                     args=['--no-sandbox']))
        context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,
                                          has_touch=True,locale='ar-SA',reduced_motion='reduce')
        page=await context.new_page()
        await page.add_init_script("window.__test={};")
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(URL,wait_until='load',timeout=50000)
        pick=page.locator('.mpc[data-m=main]')
        if await pick.count() and await pick.is_visible():await pick.click()
        await page.evaluate("()=>tab('puz')")
        await page.evaluate("async()=>await window.mindlabPlayLayers.start()")
        await page.wait_for_function("()=>window.mindlabPlayLayers?.ready===true",timeout=45000)
        await page.evaluate("()=>{S.st.mute=true}")
        await page.wait_for_timeout(600)
        results=[]
        for gid in SECTIONS[CHAPTER]:
            row={'id':gid}
            n=len(errors)
            try:
                row['route']=await launch(page,gid)
                row.update(await page.evaluate(PROBE))
                if row['liveId']!=gid:
                    row['error']='incorrect live puzzle id '+str(row['liveId'])
                if row['boardNodes']<8:
                    row['error']='no gameplay DOM elements'
            except Exception as exc:
                row['error']=str(exc)[:300]
            if errors[n:]:row['pageErrors']=errors[n:][:3]
            results.append(row)
            print('JAZIRAN_MECH_PROBE='+json.dumps({
                'id':gid,'route':row.get('route'),'hooked':row.get('hooked'),
                'hookKeys':row.get('hookKeys'),'count':row.get('controlCount'),
                'error':row.get('error'),'pageErrors':row.get('pageErrors')
            },ensure_ascii=True),flush=True)
        summary={'engine':ENGINE,'chapter':CHAPTER,'count':len(results),
                 'hooked':sum(bool(r.get('hooked')) for r in results),
                 'failures':[{'id':r['id'],'error':r.get('error') or r.get('pageErrors')}
                             for r in results if r.get('error') or r.get('pageErrors')],
                 'results':results}
        (OUT/f'jaziran-mechanics-probe-{ENGINE}-{CHAPTER}.json').write_text(
            json.dumps(summary,ensure_ascii=True,indent=2),encoding='utf8')
        print('JAZIRAN_MECH_PROBE_SUMMARY='+json.dumps({
            k:v for k,v in summary.items() if k!='results'},ensure_ascii=True),flush=True)
        await browser.close()
        assert not summary['failures'],str(summary['failures'])

if __name__=='__main__':
    asyncio.run(main())
