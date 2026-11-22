"""Phase 2: compare real win-validator result with source-provided QA witnesses.

This is explicitly an ENGINE-WITNESS test, not evidence a human solved the
puzzle using physical controls. We never invoke a win handler directly. The
only accepted proof is a game-generated result / native progress after the
engine's own validator sees the witness. Exercises the actual HTML game in
Chromium and WebKit, and reports unsupported puzzles honestly.

Uses same CLI and launch method as jaziran_86_mechanics_probe.py.
"""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
from jaziran_86_mechanics_probe import URL,ENGINE,CHAPTER,OUT,SECTIONS,launch
from player_openings import dismiss_opening

OUT.mkdir(parents=True,exist_ok=True)

WITNESS=r"""async (gid)=>{
  const h=window.__test?.pz, P=h?.P||{}, errs=[],actions=[],w=ms=>new Promise(r=>setTimeout(r,ms));
  const call=async(name,...args)=>{
    if(typeof h?.[name]!=='function')return false;
    try{actions.push(name);await h[name](...args);await w(50);return true}
    catch(e){errs.push(name+': '+String(e).slice(0,180));return false}
  };
  const didWin=()=>{
    const a=document.querySelector('#play #ag'), stage=document.querySelector('#stage');
    return !!(a&&!a.hidden&&a.offsetParent!==null) ||
      document.querySelector('#play')?.hidden === true ||
      !!document.querySelector('#stage .res.good,#stage .result.win,#pzb.solved');
  };
  if(!h)return {supported:false,reason:'no engine witness interface'};
  if(gid==='pz_aroot'||gid==='pz_aherd'){
    for(const dir of P.sol||[]){await call('act',dir);await w(90);if(didWin())break;}
  }else if(gid==='pz_abridge'){
    const path=typeof h.solve==='function'?await h.solve():[];
    actions.push('solve(read path)');
    for(const k of (path||[]).slice(1)){await call('tap',k);await w(60);if(didWin())break;}
    await call('check');
  }else if(gid==='pz_aheart'){
    for(let i=0;i<(P.ops||[]).length;i++) await call('reverse');
    await call('pick',P.ans);await call('check');
  }else if(gid==='pz_asilent'){
    for(let i=0;i<26;i++){if(didWin())break;if(h.ready&&!h.ready()){await w(250);continue;}
      await call('answer');await w(300);}
  }else if(gid==='pz_aport'){
    await call('pick',P.t0);await call('go');
  }else if(gid==='pz_acity'){
    await call('pick',P.gone);await call('check');
  }else if(gid==='pz_aecho'){
    await call('pick',P.src);await call('check');
  }else if(['pz_ashade','pz_agiant','pz_aflow','pz_wlake'].includes(gid)){
    await call('pick',P.ans);await call('check');
  }else if(typeof h.set==='function'){
    await call('set');
    if(!didWin()){if(typeof h.check==='function')await call('check');
      else if(typeof h.go==='function')await call('go');
      else if(typeof h.open==='function')await call('open');
      else if(typeof h.release==='function')await call('release');}
  }else if(typeof h.solve==='function'){
    await call('solve');if(!didWin())await call('check');
  }else if(typeof h.check==='function'){
    if(typeof h.pick==='function' && P.ans!==undefined)await call('pick',P.ans);
    await call('check');
  }else if(typeof h.answer==='function'){
    await call('answer',P.ans===undefined?undefined:P.ans);
  }else{
    return {supported:false,reason:'no automated witness action (manual UI test needed)',
      witnessKeys:Object.keys(h)};
  }
  await w(500);
  const a=document.querySelector('#play #ag');
  return {supported:true,win:didWin(),actions,errors:errs,
    native:{pDone:typeof pState==='function'?pState()?.done?.[gid]:null,
      nextButton:!!(a&&!a.hidden&&a.offsetParent!==null),
      playHidden:!!document.querySelector('#play')?.hidden,
      stageResult:document.querySelector('#stage .res')?.innerText?.slice(0,150)||''},
    witnessKeys:Object.keys(h).sort()};
}"""

async def run():
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),
            args=['--no-sandbox']))
        context=await browser.new_context(viewport={'width':390,'height':844},
                    is_mobile=True,has_touch=True,locale='ar-SA',reduced_motion='reduce')
        page=await context.new_page()
        await page.add_init_script('window.__test={}')
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(URL,wait_until='load',timeout=50000)
        pick=page.locator('.mpc[data-m=main]')
        if await pick.count() and await pick.is_visible():await pick.click()
        await page.evaluate("()=>tab('puz')")
        await page.evaluate("async()=>await mindlabPlayLayers.start()")
        await page.wait_for_function("()=>mindlabPlayLayers?.ready===true",timeout=45000)
        await page.evaluate("()=>{S.st.mute=true}")
        await page.wait_for_timeout(650)
        rows=[]
        for gid in SECTIONS[CHAPTER]:
            row={'id':gid};prior=len(errors)
            try:
                row['route']=await launch(page,gid)
                row.update(await page.evaluate(WITNESS,gid))
            except Exception as exc:row['error']=str(exc)[:380]
            if len(errors)>prior:row['pageErrors']=errors[prior:][:3]
            rows.append(row)
            print('JAZIRAN_WITNESS='+json.dumps({
                k:row.get(k) for k in ('id','supported','win','actions','error','pageErrors','reason')},
                ensure_ascii=True),flush=True)
        summary={'engine':ENGINE,'chapter':CHAPTER,'count':len(rows),
            'witnessWins':sum(r.get('win') is True for r in rows),
            'unsupported':[r['id'] for r in rows if not r.get('supported')],
            'notWinning':[r['id'] for r in rows if r.get('supported') and not r.get('win')],
            'pageErrors':[{'id':r['id'],'errors':r['pageErrors']} for r in rows if r.get('pageErrors')],
            'cases':rows}
        (OUT/f'jaziran-witness-{ENGINE}-{CHAPTER}.json').write_text(
            json.dumps(summary,ensure_ascii=True,indent=2),encoding='utf8')
        print('JAZIRAN_WITNESS_SUMMARY='+json.dumps({
            k:v for k,v in summary.items() if k!='cases'},ensure_ascii=True),flush=True)
        await browser.close()
        # A diagnostic job accepts honest missing witnesses; JS crashes never pass.
        assert not summary['pageErrors'],str(summary['pageErrors'])

if __name__=='__main__':asyncio.run(run())
