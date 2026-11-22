"""Phase 2 training proofs: puzzle solution entered with real screen controls.

Unlike jaziran_86_engine_witness.py, these solvers NEVER call the test hook's
set/check/solve/win methods. They may *read* the generated solution/witness,
then tap the same controls a player can tap. All results, including deficits,
are written to artifacts. A blocked native tap is a genuine QA failure.

CLI same as jaziran_86_mechanics_probe.py, CHAPTER must be training.
"""
import asyncio,json,os
from collections import deque
from playwright.async_api import async_playwright
from jaziran_86_mechanics_probe import URL,ENGINE,CHAPTER,OUT,launch
assert CHAPTER=='training'
OUT.mkdir(parents=True,exist_ok=True)

TARGETS=['pz_lock','pz_laser','pz_sudo','pz_binary','pz_pipe','pz_stroke','pz_soko','pz_lights','pz_ice']
WINJS="""()=>{let a=document.querySelector('#play #ag'),p=document.querySelector('#play');
  return {next:!!(a&&!a.hidden&&a.offsetParent!==null),hidden:!!p?.hidden,
    solved:!!document.querySelector('#pzb.solved'),text:(document.querySelector('#stage .res')?.innerText||'').slice(0,90)};
}"""

async def win(page):
    return await page.evaluate(WINJS)

async def tap(page,sel):
    await page.locator(sel).first.click(timeout=6500)
    await page.wait_for_timeout(80)

async def witness(page):
    return await page.evaluate("()=>window.__test.pz?.P||null")

def route_sokoban(P):
    w,h=P['w'],P['h']
    wall=P['wall'];goals=set(P['goals']);boxes=tuple(sorted(P['boxes']))
    start=(P['player'],boxes)
    ds={'ArrowUp':-w,'ArrowDown':w,'ArrowLeft':-1,'ArrowRight':1}
    q=deque([(start,[])])
    seen={start}
    while q:
        (pos,bx),moves=q.popleft()
        if set(bx)==goals:return moves
        for label,diff in ds.items():
            to=pos+diff
            if to<0 or to>=w*h or wall[to] or (
                label in ('ArrowLeft','ArrowRight') and pos//w!=to//w):continue
            next_box=bx
            if to in bx:
                dest=to+diff
                if dest<0 or dest>=w*h or wall[dest] or dest in bx or (
                    label in ('ArrowLeft','ArrowRight') and to//w!=dest//w):continue
                next_box=tuple(sorted(dest if x==to else x for x in bx))
            s=(to,next_box)
            if s not in seen:
                seen.add(s);q.append((s,moves+[label]))
    raise AssertionError('BFS found no solution to generated Sokoban')

def lights_out(P):
    n=P['n'];N=n*n;init=P['on']
    def bits(i):
        r,c=divmod(i,n)
        return [j for j in (i,i-n,i+n,i-1,i+1) if 0<=j<N and (
            j==i or (abs(j-i)==n) or j//n==r)]
    rows=[]
    for cell in range(N):
        mask=0
        for button in range(N):
            if cell in bits(button):mask^=1<<button
        rows.append([mask,int(bool(init[cell]))])
    pivot=[]
    rank=0
    for c in range(N):
        k=next((r for r in range(rank,N) if rows[r][0]>>c&1),None)
        if k is None:continue
        rows[rank],rows[k]=rows[k],rows[rank]
        for r in range(N):
            if r!=rank and rows[r][0]>>c&1:
                rows[r][0]^=rows[rank][0];rows[r][1]^=rows[rank][1]
        pivot.append(c);rank+=1
    if any(not a and b for a,b in rows):raise AssertionError('Lights Out inconsistent')
    assignment=0
    for i,c in reversed(list(enumerate(pivot))):
        a,b=rows[i]
        bit=b^((a & assignment).bit_count()%2)
        if bit:assignment|=1<<c
    return [i for i in range(N) if assignment>>i&1]

async def solve(page,gid):
    P=await witness(page)
    assert P is not None,gid+' missing read-only P'
    if gid=='pz_lock':
        for k,d in enumerate(P['sec']):
            await tap(page,f'#pzb .lkdial[data-i="{k}"]')
            await tap(page,f'#pzb [data-k="{d}"]')
        await tap(page,'#pzb [data-k="🔓"]')
    elif gid=='pz_laser':
        for k,v in enumerate(P['sol']):
            current=P['ori'][k]
            if current!=v:await tap(page,f'#pzb .lzc.mir[data-m="{k}"]')
    elif gid=='pz_sudo':
        for k,v in enumerate(P['sol']):
            if P['puz'][k]!=-1:continue
            await tap(page,f'#pzb .sd10-p[data-tok="{v}"]')
            await tap(page,f'#pzb .sd10-c[data-i="{k}"]')
    elif gid=='pz_binary':
        for k,v in enumerate(P['sol']):
            if P['puz'][k]!=-1:continue
            for _ in range(3):
                if (await page.evaluate("k=>window.__test.pz.g[k]",k))==v:break
                await tap(page,f'#pzb .bic[data-i="{k}"]')
            else:raise AssertionError(f'binary cell {k} cannot reach {v}')
    elif gid=='pz_pipe':
        for k,v in enumerate(P['sol']):
            if k in P['fixed']:continue
            for _ in range(4):
                current=await page.evaluate("k=>window.__test.pz.P.cur[k]",k)
                if current==v:break
                await tap(page,f'#pzb .pp10-c[data-i="{k}"]')
            else:raise AssertionError(f'pipe {k} cannot rotate into solution')
    elif gid=='pz_stroke':
        for vertex in P['trail'][1:]:
            await tap(page,f'#pzb .osn[data-v="{vertex}"]')
    elif gid=='pz_soko':
        directions=route_sokoban(P)
        for d in directions:
            await tap(page,f'#pzb [data-d="{d}"]')
    elif gid=='pz_lights':
        actions=lights_out(P)
        for k in actions:await tap(page,f'#pzb .loc[data-i="{k}"]')
    elif gid=='pz_ice':
        # Level path is the engine's read-only shortest-route witness, not a
        # mutation of its active state. Only the arrow buttons perform moves.
        steps=await page.evaluate("()=>icSolve(window.__test.pz.P,window.__test.pz.P.start)")
        assert isinstance(steps,list) and steps,'ice route is absent'
        keys=['ArrowLeft','ArrowDown','ArrowRight','ArrowUp']
        for d in steps:await tap(page,f'#pzb [data-d="{keys[d]}"]')
    else:raise AssertionError(gid+' has no UI solver')

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
        await page.goto(URL,wait_until='load',timeout=45000)
        p=page.locator('.mpc[data-m=main]')
        if await p.count() and await p.is_visible():await p.click()
        await page.evaluate("()=>tab('puz')")
        await page.evaluate("async()=>await mindlabPlayLayers.start()")
        await page.wait_for_function("()=>mindlabPlayLayers.ready===true",timeout=45000)
        await page.evaluate("()=>{S.st.mute=true}")
        await page.wait_for_timeout(650)
        rows=[]
        for gid in TARGETS:
            row={'id':gid};at=len(errors)
            try:
                row['route']=await launch(page,gid)
                await solve(page,gid)
                # Success animations in native engines are async.
                for _ in range(30):
                    result=await win(page)
                    if result['next'] or result['hidden'] or result['solved']:break
                    await page.wait_for_timeout(120)
                row['win']=result['next'] or result['hidden'] or result['solved']
                row['outcome']=result
                row['saved']=await page.evaluate("id=>pState()?.done?.[id]??null",gid)
                if not row['win']:row['error']='no native win after real-control solution'
            except Exception as ex:row['error']=str(ex)[:450]
            if len(errors)>at:row['jsErrors']=errors[at:][:3]
            if row.get('error') or row.get('jsErrors'):
                try:await page.screenshot(path=str(OUT/f'{ENGINE}-{gid}-failed.png'),timeout=5000)
                except Exception:pass
            rows.append(row)
            print('JAZIRAN_REAL_UI='+json.dumps(row,ensure_ascii=True),flush=True)
        summary={'engine':ENGINE,'uiSolved':sum(bool(x.get('win')) for x in rows),
            'total':len(rows),'gaps':[r for r in rows if r.get('error') or r.get('jsErrors')],
            'results':rows}
        (OUT/f'jaziran-training-real-{ENGINE}.json').write_text(
            json.dumps(summary,ensure_ascii=True,indent=2),encoding='utf8')
        print('JAZIRAN_REAL_UI_SUMMARY='+json.dumps({
            k:v for k,v in summary.items() if k!='results'},ensure_ascii=True),flush=True)
        await browser.close()
        assert not summary['gaps'],f"{len(summary['gaps'])}/{len(rows)} need manual UI audit"

if __name__=='__main__':
    asyncio.run(run())
