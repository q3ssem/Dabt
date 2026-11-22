"""Native user-control acceptance for fourteen Athran library engines, 8 levels each.

No test-hook state changes, no win function calls, no editing persistence. Hooks
are read to choose a legal user action, then the native UI is clicked. A case
is accepted only when the actual engine awards exactly one saved native win.
"""
import asyncio,json,os,sys
from collections import deque
from pathlib import Path
from playwright.async_api import async_playwright
from jaziran_sea_six_native_ui import tap,open_board

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8800/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
GROUP=sys.argv[3] if len(sys.argv)>3 else 'coast'
OUT=Path(sys.argv[4]) if len(sys.argv)>4 else Path('/tmp/mindlab-athran-native')
GROUPS={
 'coast':['pz_aport','pz_alight','pz_aecho','pz_agiant','pz_aflow','pz_aring','pz_aswarm','pz_ashade'],
 'journey':['pz_aheart','pz_abridge','pz_asong','pz_aroot','pz_aherd','pz_asilent']
}
assert GROUP in GROUPS and ENGINE in ('chromium','webkit')
OUT.mkdir(parents=True,exist_ok=True)

def bridge_route(P):
    start,goal=P['s'],P['goal']
    seen={start:None}
    q=deque([start])
    while q:
        a=q.popleft()
        if a==goal:break
        for u,v in P['E']:
            if u!=a and v!=a:continue
            b=v if u==a else u
            if b in seen:continue
            if P['stairs']:
                if abs(P['h'][a]-P['h'][b])>1:continue
            else:
                if P['h'][a]!=P['h'][b]:continue
            seen[b]=a;q.append(b)
    assert goal in seen,'no legal bridge path exists'
    out=[];v=goal
    while v!=start:
        out.append(v);v=seen[v]
    out.reverse()
    return out

async def solve(page,gid):
    if gid=='pz_aport':
        hour=await page.evaluate("()=>__test.pz.P.t0")
        button=page.locator(f'#aptc .aptb[data-h="{hour}"]').first
        # Visible touch first; accessible focus+Enter if a fixed overlay intercepts.
        try:
            await button.click(timeout=2600)
        except Exception:
            await button.focus()
            await page.keyboard.press('Enter')
        await page.wait_for_function("""h=>
            [...document.querySelectorAll('#aptc .aptb.sel')].some(b=>+b.dataset.h===+h)
            """,arg=hour,timeout=5000)
        await tap(page,'#aptgo')
        return 2
    if gid=='pz_alight':
        P=await page.evaluate("()=>({disk:__test.pz.P.disk,stuck:__test.pz.P.stuck})")
        n=0
        for i,v in enumerate(P['disk']):
            if v and i not in P['stuck']:
                await tap(page,f'#altd button[data-i="{i}"]')
                n+=1
        await tap(page,'#altgo')
        return n+1
    if gid=='pz_aecho':
        P=await page.evaluate("()=>({posts:__test.pz.P.posts,src:__test.pz.P.src})")
        for k in P['posts'][:2]:
            await tap(page,f'#aecgrid button[data-k="{k}"]')
        await tap(page,f'#aecgrid button[data-k="{P["src"]}"]')
        await tap(page,'#aecgo')
        return min(len(P['posts']),2)+2
    if gid=='pz_agiant':
        P=await page.evaluate("()=>({ans:__test.pz.P.ans,habit:__test.pz.P.hist[0][0].t})")
        await tap(page,f'#pzb [data-habit="{P["habit"]}"]')
        await tap(page,f'#pzb .agig button[data-k="{P["ans"]}"]')
        await tap(page,'#agigo')
        return 3
    if gid=='pz_aflow':
        ans=await page.evaluate("()=>__test.pz.P.ans")
        await tap(page,'#afltracego')
        await page.wait_for_timeout(700)
        await tap(page,f'#pzb .aflb button[data-b="{ans}"]')
        await tap(page,'#aflgo')
        return 3
    if gid=='pz_aring':
        P=await page.evaluate("()=>({ends:__test.pz.P.S.map(s=>s.end)})")
        moves=0
        for k,v in enumerate(P['ends']):
            await tap(page,f'#pzb .ring-wood[data-wood="{k}"]')
            current=await page.evaluate("k=>__test.pz.positions()[k]",k)
            step=1 if v>current else -1
            for _ in range(abs(v-current)):
                await tap(page,f'#pzb .ring-position button[data-step="{step}"]')
                moves+=1
        await tap(page,'#arggo')
        return moves+len(P['ends'])+1
    if gid=='pz_aswarm':
        P=await page.evaluate("()=>({rp:__test.pz.P.rp,cp:__test.pz.P.cp})")
        moves=0
        for i,val in enumerate(P['rp']):
            for _ in range(val):
                await tap(page,f'#aswg button[data-r="{i}"]');moves+=1
        for j,val in enumerate(P['cp']):
            for _ in range(val):
                await tap(page,f'#aswg button[data-c="{j}"]');moves+=1
        await tap(page,'#aswgo')
        return moves+1
    if gid=='pz_ashade':
        P=await page.evaluate("()=>({hs:__test.pz.P.hs,ans:__test.pz.P.ans,prev:__test.pz.P.prev})")
        moves=0
        if P['prev']:
            for h in P['hs']:
                await tap(page,f'#pzb .shade-hours button[data-h="{h}"]')
                moves+=1
        await tap(page,f'#asdg button[data-k="{P["ans"]}"]')
        await tap(page,'#asdgo')
        return moves+2
    if gid=='pz_aheart':
        P=await page.evaluate("()=>({ops:__test.pz.P.ops,ans:__test.pz.P.ans})")
        for op in reversed(P['ops']):
            axis='r' if op.get('r') is not None else 'c'
            index=op.get('r') if axis=='r' else op.get('c')
            direction=-1 if op['k']>0 else 1
            await tap(page,f'#pzb .heart-shift[data-axis="{axis}"][data-index="{index}"][data-dir="{direction}"]')
        await tap(page,f'#pzb .ahtc button[data-i="{P["ans"]}"]')
        await tap(page,'#ahtgo')
        return len(P['ops'])+2
    if gid=='pz_abridge':
        P=await page.evaluate("()=>{let p=__test.pz.P;return {s:p.s,goal:p.goal,E:p.E,h:p.h,stairs:p.stairs}}")
        path=bridge_route(P)
        for i in path:
            await tap(page,f'#abrtop .fogbridge-node[data-i="{i}"]')
        await tap(page,'#abrgo')
        return len(path)+1
    if gid=='pz_asong':
        P=await page.evaluate("()=>({abs:__test.pz.P.abs,pres:__test.pz.P.pres,gone:__test.pz.P.gone})")
        answer=[P['gone']] if P['abs'] else P['pres']
        for i in answer:
            await tap(page,f'#pzb .asol button[data-i="{i}"]')
        await tap(page,'#asogo')
        return len(answer)+1
    if gid=='pz_aroot':
        path=await page.evaluate("()=>__test.pz.P.sol")
        for a in path:
            await tap(page,f'#pzb .roots-actions button[data-a="{a}"]')
            await tap(page,'#artexec')
        return len(path)*2
    if gid=='pz_aherd':
        path=await page.evaluate("()=>__test.pz.P.sol")
        for a in path:
            await tap(page,f'#ahepreview button[data-a="{a}"]')
            await tap(page,'#ahecommit')
        return len(path)*2
    if gid=='pz_asilent':
        P=await page.evaluate("()=>({qs:__test.pz.P.qs})")
        for q in P['qs']:
            await page.wait_for_function("()=>__test?.pz?.ready?.()===true",timeout=25000)
            await tap(page,f'#pzb #asiq button[data-o="{q["a"]}"]')
        return len(P['qs'])
    raise AssertionError('missing native control plan '+gid)

async def main():
    rows=[];errors=[]
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else
            pw.chromium.launch(executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox']))
        ctx=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,
            has_touch=True,locale='ar-SA',reduced_motion='reduce')
        await ctx.add_init_script('window.__test={}')
        page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            await page.goto(URL,wait_until='load',timeout=50000)
            profile=page.locator('.mpc[data-m=main]')
            if await profile.count() and await profile.is_visible():await profile.click()
            await page.evaluate("()=>tab('puz')")
            await page.evaluate("async()=>await mindlabPlayLayers.start()")
            await page.wait_for_function("()=>mindlabPlayLayers?.ready===true",timeout=45000)
            await page.evaluate("()=>{S.st.mute=true}")
            for gid in GROUPS[GROUP]:
                for level in range(1,9):
                    row={'id':gid,'level':level};prior=len(errors)
                    try:
                        await open_board(page,gid,level)
                        assert await page.evaluate("()=>RUN.last?.lv")==level
                        before=await page.evaluate("id=>pzState().n[id]||0",gid)
                        assert not await page.evaluate("()=>!!document.querySelector('#pzb.solved')"),'won at opening'
                        row['actions']=await solve(page,gid)
                        await page.wait_for_function("()=>!!document.querySelector('#pzb.solved')",timeout=36000)
                        await page.wait_for_function("([id,n])=>(pzState().n[id]||0)>n",arg=[gid,before],timeout=12000)
                        await page.wait_for_function("""([id,n])=>{
                          return (JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n?.[id]||0)>n
                        }""",arg=[gid,before],timeout=12000)
                        after=await page.evaluate('id=>pzState().n[id]||0',gid)
                        assert after==before+1,f'duplicate award: {before}->{after}'
                        row['nativeWin']=True
                        await page.wait_for_timeout(850)
                    except Exception as ex:
                        row['error']=str(ex)[:450]
                        try:await page.screenshot(path=str(OUT/f'{ENGINE}-{gid}-lv{level}.png'),timeout=8000)
                        except Exception:pass
                    if len(errors)>prior:row['jsErrors']=errors[prior:][:4]
                    rows.append(row);print('ATHRAN_NATIVE_CASE='+json.dumps(row,ensure_ascii=True),flush=True)
            await page.reload(wait_until='load',timeout=50000)
            stored=await page.evaluate("()=>JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n||{}")
            for row in rows:
                if row.get('nativeWin') and stored.get(row['id'],0)==0:row['error']='save lost after reload'
        finally:
            summary={'engine':ENGINE,'group':GROUP,'solved':sum(r.get('nativeWin') and not r.get('error') and not r.get('jsErrors') for r in rows),
             'total':len(rows),'gaps':[r for r in rows if r.get('error') or r.get('jsErrors')],
             'pageErrors':errors,'cases':rows}
            (OUT/f'athran-native-{ENGINE}-{GROUP}.json').write_text(json.dumps(summary,indent=2,ensure_ascii=True))
            print('ATHRAN_NATIVE_SUMMARY='+json.dumps({k:v for k,v in summary.items() if k!='cases'},ensure_ascii=True),flush=True)
            await browser.close()
        assert not summary['gaps'] and len(rows)==8*len(GROUPS[GROUP])

if __name__=='__main__':asyncio.run(main())
