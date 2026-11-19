"""Journey acceptance: real start gating and milestone discovery, responsive maps,
and all 57 Palace rounds from a fresh save. Solvers use the existing QA hooks;
they never call pWin/aWin or write a completed Palace save.
MODE=palace or scenes; ENGINE=chromium or webkit; OUT=artifact directory.
"""
import asyncio,json,os,pathlib
from playwright.async_api import async_playwright
from player_openings import dismiss_opening,close_transition

URL=os.environ.get('MINDLAB_URL','http://127.0.0.1:8765/index.html')
OUT=pathlib.Path(os.environ.get('OUT','qa/browser/completion-shots'));OUT.mkdir(parents=True,exist_ok=True)
ENGINE=os.environ.get('ENGINE','chromium');MODE=os.environ.get('MODE','scenes')
checks=[]
def check(value,label):
    assert value,label
    checks.append(label);print('PASS '+label,flush=True)

async def boot(browser,w=390,h=844,url=None):
    ctx=await browser.new_context(viewport={'width':w,'height':h},has_touch=True,locale='ar-SA',**({'is_mobile':True} if ENGINE=='chromium' else {}))
    pg=await ctx.new_page();await pg.add_init_script('window.__test={}')
    await pg.goto(url or URL,wait_until='load');await pg.wait_for_function('()=>!!window.mindlabJourneyHub&&!!window.fitOpenings')
    pick=pg.locator('.mpc[data-m=main]')
    if await pick.count() and await pick.is_visible():await pick.click()
    await pg.click('.tab[data-tab=puz]');return ctx,pg

async def scenes(browser):
    for w,h in [(320,640),(390,844),(430,932)]:
        ctx,pg=await boot(browser,w,h);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
        ev=pg.evaluate
        check(await ev('()=>mindlabJourneyHub.discoveredTransitions().map(t=>t.id)')==['departure'],f'{w}: fresh profile reveals only departure')
        await pg.click('#mlj-open-trans')
        await pg.wait_for_function('()=>!document.querySelector(".mlj-tr-scene[aria-busy]")')
        check(await pg.locator('#mlj-tr-next').is_disabled(),f'{w}: future scenes cannot be browsed')
        check('رسالة الجد' not in await pg.locator('#mlj-tr-modal').inner_text(),f'{w}: finale title is not exposed')
        await pg.screenshot(path=str(OUT/f'{w}-fresh-scene.png'));await close_transition(pg)
        # The actual engine must stay unstarted while a first-play scene is open.
        await ev("()=>{const old=GM.pz_pclock.run;window.__started=0;GM.pz_pclock.run=function(){window.__started++;return old.apply(this,arguments)};startRun(['pz_pclock'])}")
        await pg.click('#stage #go');await pg.locator('#fit-op-start').wait_for(state='visible')
        await pg.wait_for_timeout(2200)
        check(await ev('()=>window.__started===0&&!document.querySelector("#pzb")'),f'{w}: engine and timer wait for Start')
        await pg.screenshot(path=str(OUT/f'{w}-three-heroines.png'))
        check(await pg.locator('.fit-opening-hero').count()==3,f'{w}: all three heroines appear')
        await pg.keyboard.press('Escape')
        check(await ev('()=>window.__started===0&&!localStorage.getItem("mindlab:openings:seen:v1")'),f'{w}: cancelling does not start or mark a scene seen')
        await pg.click('#stage #go');await dismiss_opening(pg);await pg.locator('#pzb').wait_for()
        check(await ev('()=>window.__started===1'),f'{w}: Start invokes engine exactly once')
        await ev('()=>closePlay()')
        # Controlled progress fixtures exercise disclosure boundaries, not a solved campaign claim.
        await ev("()=>{const x=T7.state();T7.data.stations.slice(0,3).forEach(s=>x.done[s.id]={at:1});S.save();window.dispatchEvent(new CustomEvent('mindlab:journey-progress',{detail:{chapter:'seven_seas',station:2}}))}")
        check(await pg.locator('#mlj-tr-modal').get_attribute('data-transition')=='coral_light',f'{w}: sea completion opens its own scene')
        await close_transition(pg)
        await ev("()=>window.dispatchEvent(new CustomEvent('mindlab:journey-progress',{detail:{chapter:'seven_seas',station:2}}))")
        check(await pg.locator('#mlj-tr-modal').count()==0,f'{w}: replay does not reopen an already seen scene')
        await pg.reload();await pg.wait_for_function('()=>!!window.mindlabJourneyHub')
        await pg.click('.tab[data-tab=puz]')
        check(await ev('()=>mindlabJourneyHub.discoveredTransitions().map(t=>t.id)')==['departure','coral_light'],f'{w}: scene discovery and progress survive reload')
        await ev("()=>{const x=T7.state();T7.data.stations.forEach(s=>x.done[s.id]={at:1});S.save();window.dispatchEvent(new CustomEvent('mindlab:journey-progress',{detail:{chapter:'seven_seas',station:20}}))}")
        check(await pg.locator('#mlj-tr-modal').get_attribute('data-transition')=='eighth_route',f'{w}: final sea opens eighth route')
        await pg.click('#mlj-tr-close')
        check(await pg.locator('#mlj-tr-modal').get_attribute('data-transition')=='letter',f'{w}: continue then shows grandfather letter')
        await close_transition(pg)
        await ev('()=>T7.hub()');await pg.locator('#mlj-unified-hub').wait_for()
        for skin in ['light','dark']:
            await ev('(skin)=>document.documentElement.dataset.skin=skin',skin)
            for chapter in ['seven_seas','palace','atheran','side']:
                await ev('(id)=>mindlabJourneyHub.openChapter(id)',chapter);await close_transition(pg);await pg.wait_for_timeout(250)
                check(await ev('()=>document.documentElement.scrollWidth<=innerWidth+2'),f'{w} {skin} {chapter}: no horizontal page overflow')
                await pg.screenshot(path=str(OUT/f'{w}-{skin}-{chapter}.png'))
                await pg.keyboard.press('Escape');await ev('()=>{document.querySelector("#mlj-palace-map")?.remove();if(LA.view==="atheran")ATHERAN_CAMPAIGN.back();T7.hub()}')
        check(not errors,f'{w}: no JavaScript errors: {errors}')
        await ctx.close()

SOLVE=r'''async id=>{
 const h=window.__test.pz,P=h.P||{},wait=ms=>new Promise(r=>setTimeout(r,ms));
 switch(id){
 case 'pz_plock':h.set(P.v);h.open();break;
 case 'pz_pliar':h.set();h.enter();await wait(1100);h.set();h.enter();break;
 case 'pz_pclock':h.set(P.T);h.ring();break;
 case 'pz_pboss1':case 'pz_pqueen':case 'pz_peng':case 'pz_plast':case 'pz_phall':
   for(let i=0;i<15&&!document.querySelector('.solved')&&!document.querySelector('.res');i++){h.answer();await wait(450)}break;
 case 'pz_plib':case 'pz_pmirror':case 'pz_pgarden':h.set();break;
 case 'pz_parm':case 'pz_pobs':h.solve();break;
 case 'pz_pjail':h.set();h.judge();break;
 case 'pz_pmaze':for(const m of P.sol){h.go(m);await wait(70)}break;
 case 'pz_pcrypt':h.set();h.check();break;
 case 'pz_pvalve':for(const m of P.sol){h.op(m);await wait(70)}break;
 case 'pz_pdragon':h.set();h.check();break;
 case 'pz_pheart':h.set(P.sol);h.release();break;
 default:throw Error('Missing Palace solver '+id);
 }
}'''

async def palace(browser):
    ctx,pg=await boot(browser);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));ev=pg.evaluate
    check(await ev('()=>!aOpen()&&pState().prog===0'), 'fresh Palace profile starts at zero and Atheran is locked')
    stations=await ev('()=>PW.map(s=>s.id)')
    check(len(stations)==19,'Palace has all 19 stations')
    for i,gid in enumerate(stations):
        await ev('()=>T7.hub()');await pg.locator('#mlj-unified-hub').wait_for()
        await pg.click('#mlj-unified-hub .mlj-ch-card[data-mlj-ch=palace]');await close_transition(pg)
        await pg.click(f'#mlj-palace-map [data-mlj-puzzle="{gid}"]')
        for k in range(3):
            go=pg.locator('#stage #go')
            if await go.count() and await go.is_visible():await go.click()
            await dismiss_opening(pg)
            await pg.locator('#pzb').wait_for();await pg.wait_for_timeout(250)
            check(await ev('(id)=>txStageOf(id)?.k',[gid][0])==k+1,f'{gid}: stage {k+1} is the active campaign round')
            await ev(SOLVE,gid)
            await pg.locator('#stage .res').wait_for(timeout=30000)
            check(await ev('(id)=>!!pState().done[id]',gid)==(k==2),f'{gid}: completion is recorded only after round three ({k+1})')
            if k<2:
                await pg.click('#play #ag')
            else:
                await pg.screenshot(path=str(OUT/f'palace-{i+1:02d}.png'))
                await ev('()=>closePlay()')
        check(await ev('()=>pState().prog')==i+1,f'{gid}: progress advances to {i+1}')
        check(await ev('()=>aOpen()')==(i==18),f'{gid}: Atheran gate respects all Palace stations')
    snapshot=await ev('()=>JSON.stringify({done:pState().done,prog:pState().prog,stg:S.st.stg})')
    await pg.reload();await pg.wait_for_function('()=>!!window.mindlabJourneyHub')
    check(await ev('()=>JSON.stringify({done:pState().done,prog:pState().prog,stg:S.st.stg})')==snapshot,'all 57 Palace rounds persist after reload')
    check(await ev('()=>aOpen()'),'Atheran remains open after reload')
    check(not await ev("()=>localStorage.getItem('mindlab:expedition10:v1')"),'Palace completion never creates side progress')
    check(not errors,f'Palace has no JavaScript errors: {errors}')
    await ctx.close()

SNAP=r'''()=>JSON.stringify({lv:S.st.lv,best:S.st.best,puzzle:pzState(),
 treasure:T7.state(),palace:pState(),partial:S.st.stg,skin:S.st.skin,mute:S.st.mute,
 side:localStorage.getItem('mindlab:expedition10:v1')})'''

async def oldsave(browser):
    oldctx,old=await boot(browser,url=os.environ.get('OLD_URL','http://127.0.0.1:8765/.baseline/index.html'))
    await old.evaluate('''()=>{
      S.st.skin='dark';S.st.mute=true;pzSetLv('pz_river',4);S.st.best.pz_river=72;
      const sea=T7.state();T7.data.stations.slice(0,2).forEach(s=>sea.done[s.id]={at:100,moves:7,hints:0});
      const palace=pState();palace.done=Object.fromEntries(PW.slice(0,3).map(s=>[s.id,1]));palace.prog=3;
      S.st.stg={[PW[3].id]:1};S.save();
      localStorage.setItem('mindlab:expedition10:v1',JSON.stringify({done:{ml10_01:true,ml10_02:true},stars:{ml10_01:3,ml10_02:2},best:{ml10_01:3,ml10_02:2},totalStars:5}));
    }''')
    # Stabilize through the old build's own migrations, then export its actual bytes.
    await old.reload();await old.wait_for_function('()=>!!window.mindlabJourneyHub')
    before=await old.evaluate(SNAP)
    files=await old.evaluate("()=>({main:localStorage.getItem('miran:v2'),side:localStorage.getItem('mindlab:expedition10:v1')})")
    check(bool(files['main']) and bool(files['side']),'old build exports both independent saves')
    ctx,pg=await boot(browser);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
    await pg.evaluate("v=>{localStorage.setItem('miran:v2',v.main);localStorage.setItem('mindlab:expedition10:v1',v.side)}",files)
    await pg.reload();await pg.wait_for_function('()=>!!window.mindlabJourneyHub')
    check(await pg.evaluate(SNAP)==before,'old save keeps levels, best scores, stations, partial rounds, settings and side save')
    check(await pg.evaluate('()=>!aOpen()&&pState().prog===3'),'partial old Palace save keeps Atheran locked')
    check(await pg.evaluate('()=>mindlabJourneyHub.discoveredTransitions().map(t=>t.id)')==['departure'],'partial old sea save reveals no future scenes')
    await pg.reload();await pg.wait_for_function('()=>!!window.mindlabJourneyHub')
    check(await pg.evaluate(SNAP)==before,'imported old save remains unchanged on a second reload')
    check(not errors,f'old save has no JavaScript errors: {errors}')
    await oldctx.close();await ctx.close()

async def main():
    async with async_playwright() as p:
        browser=await getattr(p,ENGINE).launch(**({'args':['--no-sandbox']} if ENGINE=='chromium' else {}))
        try:await ({'palace':palace,'scenes':scenes,'oldsave':oldsave}[MODE](browser))
        finally:await browser.close()
    result={'status':'passed','engine':ENGINE,'mode':MODE,'checks':len(checks),'palaceRounds':57 if MODE=='palace' else None}
    (OUT/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result))
asyncio.run(main())
