"""Native-player acceptance for the five previously unproved library games.
Read generated boards only for planning; never call test setters, check/win,
game commit functions or storage writers. Victory and persistence are observed.
"""
import asyncio, itertools, json, os, sys
from functools import lru_cache
from pathlib import Path
from playwright.async_api import async_playwright
from jaziran_sea_six_native_ui import tap
from player_openings import dismiss_opening

async def open_training_board(page,gid,level):
    # Training games can prepare a story introduction after startRun; unlike
    # the Sea-only helper, never silently skip a temporarily hidden Start.
    await page.evaluate("([id,lv])=>{pzSetLv(id,lv);startRun([id]);RUN.replay={id,lv,seed:4000+lv}}",
        [gid,level])
    starter=page.locator('#stage #go')
    await starter.wait_for(state='visible',timeout=20000)
    await starter.click(timeout=9000)
    await dismiss_opening(page,wait=1400)
    try:await page.wait_for_function("()=>!document.querySelector('#stage .cd')",timeout=18000)
    except Exception:pass
    try:await page.locator('#pzb').wait_for(state='visible',timeout=18000)
    except Exception as e:
        diag=await page.evaluate("""()=>({
            stage:document.querySelector('#stage')?.innerText.slice(0,300),
            go:!!document.querySelector('#stage #go'),
            playHidden:document.querySelector('#play')?.hidden,
            opening:!!document.querySelector('#fit-opening-overlay #fit-op-start'),
            board:!!document.querySelector('#pzb')
        })""")
        raise AssertionError(f'{gid}@{level}: board did not open: {diag}') from e
    await page.wait_for_function("id=>document.querySelector('#play')?.dataset.laGame===id",
        arg=gid,timeout=10000)


URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8806/'
ENGINE=sys.argv[2] if len(sys.argv)>2 else 'chromium'
GROUP=sys.argv[3] if len(sys.argv)>3 else 'movement'
OUT=Path(sys.argv[4]) if len(sys.argv)>4 else Path('/tmp/mindlab-final-training')
GROUPS={'movement':['pz_rush','pz_flow','pz_tan','pz_untangle'],
        'balance':['pz_scale']}
assert ENGINE in ('chromium','webkit') and GROUP in GROUPS
OUT.mkdir(parents=True,exist_ok=True)

async def rush(page):
    steps=await page.evaluate("()=>rhSolve(__test.pz.P.vs,200000)")
    assert steps,'rush solver must find a legitimate solution'
    current=-1
    actions=0
    for i,target in steps:
        before=await page.evaluate("(i)=>{const v=__test.pz.vs[i];return {coord:v.h?v.c:v.r,h:v.h}}",i)
        if current!=i:
            await tap(page,f'#rhb .rhcar[data-i="{i}"]')
            current=i
        delta=target-before['coord']
        key=('ArrowRight' if delta>0 else 'ArrowLeft') if before['h'] else ('ArrowDown' if delta>0 else 'ArrowUp')
        for _ in range(abs(delta)):
            await page.keyboard.press(key)
            actions+=1
            await page.wait_for_timeout(30)
        coord=await page.evaluate("(i)=>{const v=__test.pz.vs[i];return v.h?v.c:v.r}",i)
        assert coord==target,(i,target,coord)
    return actions

async def flow(page):
    segs=await page.evaluate("()=>__test.pz.P.segs")
    assert segs and all(len(x)>=2 for x in segs)
    n=await page.evaluate("()=>__test.pz.P.n")
    actions=0
    for seg in segs:
        for k,i in enumerate(seg):
            cell=page.locator(f'#flg .flc[data-i="{i}"]')
            box=await cell.bounding_box()
            assert box and box['width']>0,(i,box)
            x,y=box['x']+box['width']/2,box['y']+box['height']/2
            await page.mouse.move(x,y,steps=1)
            if not k: await page.mouse.down()
            else: await page.wait_for_timeout(35)
            actions+=1
        await page.mouse.up()
        await page.wait_for_timeout(110)
    return actions

def norm(points):
    mx=min(p[0] for p in points);my=min(p[1] for p in points)
    return tuple(sorted(((p[0]-mx,p[1]-my) for p in points),key=lambda p:(p[1],p[0])))
def rot(points):return norm([(-y,x) for x,y in points])
def flip(points):return norm([(-x,y) for x,y in points])
def orient(source,target):
    goal=norm(target)
    for reflect in (False,True):
        shape=flip(source) if reflect else norm(source)
        for spins in range(4):
            if norm(shape)==goal:return reflect,spins
            shape=rot(shape)
    raise AssertionError('no player rotation or flip matches generated piece')

async def tangram(page):
    meta=await page.evaluate("""()=>({n:__test.pz.P.n,
       pieces:__test.pz.P.pieces.map(p=>({sol:p.sol,shape:p.shape})),
       current:__test.pz.pcs.map(p=>p.shape)})""")
    n=meta['n'];actions=0
    for i,p in enumerate(meta['pieces']):
        await tap(page,f'#tgt .tgp[data-p="{i}"]');actions+=1
        mirror,turns=orient(meta['current'][i],p['shape'])
        if mirror:
            await tap(page,'#tgf');actions+=1
        for _ in range(turns):
            await tap(page,'#tgr');actions+=1
        shape=norm(p['shape'])
        xs=[v%n for v in p['sol']];ys=[v//n for v in p['sol']]
        anchor=(min(ys)+shape[0][1])*n+min(xs)+shape[0][0]
        await tap(page,f'#tgb .tgc[data-i="{anchor}"]');actions+=1
        state=await page.evaluate("(i)=>__test.pz.pcs[i].at",i)
        assert state is not None,(i,anchor)
    return actions

async def untangle(page):
    P=await page.evaluate("()=>({sol:__test.pz.P.sol,pos:__test.pz.pos,fixed:__test.pz.P.fixed||[]})")
    actions=0
    board=page.locator('#unsv')
    for i,goal in enumerate(P['sol']):
        if i in P['fixed']:continue
        if await page.evaluate("()=>!!document.querySelector('#pzb.solved')"):break
        node=page.locator(f'#unsv .unode[data-i="{i}"]')
        bounds=await node.bounding_box()
        area=await board.bounding_box()
        assert bounds and area and area['width']>0 and area['height']>0
        origin=(bounds['x']+bounds['width']/2,bounds['y']+bounds['height']/2)
        target=(area['x']+area['width']*goal[0]/100,area['y']+area['height']*goal[1]/100)
        await page.mouse.move(*origin)
        await page.mouse.down()
        await page.mouse.move(*target,steps=12)
        await page.mouse.up()
        actions+=1
        await page.wait_for_timeout(80)
    return actions

def coins_in(H):
    return frozenset(c for c,_ in H)
def outcome(H,where):
    groups={'L':[],'R':[],'E':[]}
    for c,sign in H:
        z=where.get(c,0)
        k='E' if not z else ('L' if z*sign>0 else 'R')
        groups[k].append((c,sign))
    return {k:tuple(v) for k,v in groups.items() if v}

@lru_cache(maxsize=25000)
def plan(H,remaining,n):
    suspects=tuple(sorted(coins_in(H)))
    if len(suspects)==1:return ()
    if remaining==0 or len(suspects)>3**remaining:return None
    good=tuple(c for c in range(n) if c not in suspects)
    proposals=[]
    for signs in itertools.product((-1,0,1),repeat=len(suspects)):
        left=signs.count(1);right=signs.count(-1)
        if max(left,right)==0 or abs(left-right)>len(good):continue
        where={c:z for c,z in zip(suspects,signs) if z}
        split=outcome(H,where)
        if len(split)<2 or any(len(v)==len(H) for v in split.values()):continue
        worst=max(len(coins_in(v)) for v in split.values())
        if worst>3**(remaining-1):continue
        score=(worst,max(len(v) for v in split.values()),left+right)
        proposals.append((score,signs,split))
    proposals.sort(key=lambda x:x[0])
    for _,signs,split in proposals:
        if all(len(coins_in(v))==1 or plan(v,remaining-1,n) is not None
               for v in split.values()):
            l=[c for c,z in zip(suspects,signs) if z==1]
            r=[c for c,z in zip(suspects,signs) if z==-1]
            if len(l)>len(r):r.extend(good[:len(l)-len(r)])
            elif len(r)>len(l):l.extend(good[:len(r)-len(l)])
            assert len(l)==len(r)>0
            return tuple(l),tuple(r)
    return None

async def scale(page):
    setting=await page.evaluate("()=>__test.pz.P")
    n,mode,limit=setting['n'],setting['mode'],setting['W']
    H=tuple((c,s) for c in range(n) for s in ((1,-1) if mode=='u' else (1,)))
    actions=0
    for round_index in range(limit):
        if len(coins_in(H))==1:break
        if round_index==0:
            a=n//3 if mode=='h' else {4:1,9:3,12:4,13:4}[n]
            left=tuple(range(a));right=tuple(range(a,2*a))
        else:
            selection=plan(H,limit-round_index,n)
            assert selection is not None,('no information-theoretic player strategy',n,mode,limit,round_index,len(H))
            left,right=selection
        where={c:1 for c in left}
        where.update({c:-1 for c in right})
        for c in range(n):
            desired=1 if c in left else (2 if c in right else 0)
            current=await page.evaluate("(c)=>__test.pz.pos[c]",c)
            for _ in range((desired-current)%3):
                await tap(page,f'#pzb .coin2[data-c="{c}"]')
                actions+=1
        await tap(page,'#sgo');actions+=1
        await page.wait_for_function("()=>['L','R','E'].includes(document.querySelector('#sclw')?.dataset.r)",timeout=15000)
        # The physical weighing resolves in two UI phases: outcome at 720ms,
        # history + auto-accusation at 800ms. Waiting only for the outcome
        # races with #sac's auto-toggle in slower WebKit mobile emulation.
        await page.wait_for_function("(completed)=>document.querySelectorAll('#slg li').length===completed",
            arg=round_index+1,timeout=12000)
        actual=await page.evaluate("()=>document.querySelector('#sclw').dataset.r")
        split=outcome(H,where)
        H=split.get(actual,())
        assert H,('no matching hypothesis for measured outcome',actual)
        visible=await page.evaluate("()=>[...__test.pz.sus()].sort((a,b)=>a-b)")
        assert visible==sorted(coins_in(H)),(actual,visible,sorted(coins_in(H)))
    assert len(coins_in(H))==1,('cannot identify a unique fake coin',n,mode,limit,H)
    selected=next(iter(coins_in(H)))
    if 'أعرف' in await page.locator('#sac').inner_text():
        await tap(page,'#sac');actions+=1
    # Confirm that the real player accusation UI, not just a test hook, is active.
    await page.wait_for_function("()=>document.querySelector('#sac')?.classList.contains('on')",
        timeout=5000)
    await tap(page,f'#pzb .coin2[data-c="{selected}"]')
    return actions+1

async def solve(page,gid):
    return await {'pz_rush':rush,'pz_flow':flow,'pz_tan':tangram,
                  'pz_untangle':untangle,'pz_scale':scale}[gid](page)

async def main():
    rows=[];errors=[]
    async with async_playwright() as pw:
        browser=await (pw.webkit.launch() if ENGINE=='webkit' else pw.chromium.launch(
            executable_path=os.getenv('CHROME','/usr/bin/google-chrome'),args=['--no-sandbox']))
        ctx=await browser.new_context(viewport={'width':390,'height':844},
            has_touch=True,is_mobile=True,locale='ar-SA',reduced_motion='reduce')
        await ctx.add_init_script('window.__test={}')
        page=await ctx.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            await page.goto(URL,wait_until='load',timeout=55000)
            profile=page.locator('.mpc[data-m=main]')
            if await profile.count() and await profile.first.is_visible():await profile.first.click()
            await page.evaluate("()=>tab('puz')")
            await page.evaluate("async()=>await mindlabPlayLayers.start()")
            await page.wait_for_function("()=>mindlabPlayLayers?.ready===true",timeout=45000)
            await page.evaluate("()=>{S.st.mute=true}")
            for gid in GROUPS[GROUP]:
                count=await page.evaluate("id=>pzMax(id)",gid)
                assert 1<=count<=8,(gid,count)
                for level in range(1,count+1):
                    row={'id':gid,'level':level};baseline=len(errors)
                    try:
                        await open_training_board(page,gid,level)
                        assert await page.evaluate("()=>RUN.last?.lv")==level
                        assert not await page.evaluate("()=>!!document.querySelector('#pzb.solved')"),'auto-win before player action'
                        prev=await page.evaluate("id=>pzState().n[id]||0",gid)
                        row['actions']=await solve(page,gid)
                        await page.wait_for_function("()=>!!document.querySelector('#pzb.solved')",timeout=25000)
                        await page.wait_for_function("([id,prev])=>(pzState().n[id]||0)>prev",
                            arg=[gid,prev],timeout=12000)
                        await page.wait_for_function("""([id,prev])=>
                            (JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n?.[id]||0)>prev
                        """,arg=[gid,prev],timeout=12000)
                        new=await page.evaluate("id=>pzState().n[id]||0",gid)
                        assert new==prev+1,(gid,level,prev,new)
                        row['win']=True
                        await page.wait_for_timeout(500)
                    except Exception as e:
                        row['error']=str(e)[:700]
                        try:await page.screenshot(path=str(OUT/f'{ENGINE}-{GROUP}-{gid}-{level}.png'),timeout=7000)
                        except Exception:pass
                    if len(errors)>baseline:row['jsErrors']=errors[baseline:][:4]
                    rows.append(row)
                    print('TRAINING_CASE='+json.dumps(row,ensure_ascii=True),flush=True)
            await page.reload(wait_until='load',timeout=55000)
            stored=await page.evaluate("()=>JSON.parse(localStorage.getItem('miran:v2')||'{}').puz?.n||{}")
            for row in rows:
                if row.get('win') and stored.get(row['id'],0)<1:row['error']='win not saved after reload'
        finally:
            gaps=[r for r in rows if r.get('error') or r.get('jsErrors')]
            summary={'engine':ENGINE,'group':GROUP,'wins':sum(1 for r in rows if r.get('win') and not r.get('error') and not r.get('jsErrors')),
                'total':len(rows),'gaps':gaps,'pageErrors':errors,'rows':rows}
            (OUT/f'training-{ENGINE}-{GROUP}.json').write_text(json.dumps(summary,ensure_ascii=True,indent=2))
            print('TRAINING_SUMMARY='+json.dumps({k:v for k,v in summary.items() if k!='rows'},ensure_ascii=True),flush=True)
            await browser.close()
        assert len(rows)==sum(8 if gid!='pz_scale' else 7 for gid in GROUPS[GROUP]) and not gaps and not errors

if __name__=='__main__':asyncio.run(main())
