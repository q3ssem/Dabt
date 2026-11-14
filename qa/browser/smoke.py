"""Browser smoke test for مختبر العقل (phone viewport, real Chrome).

  pip install playwright  # uses an installed Chrome/Chromium
  python3 start.py &       # serve the app on http://localhost:8080
  python3 qa/browser/smoke.py [--url http://localhost:8080/] [--chrome /usr/bin/google-chrome] [--shots out/]

Opens every brain game and every original puzzle, plays through all 21 Treasure
Island stations (solving each with the in-game assist), and fails on any page error
or horizontal overflow. Optional screenshots help the visual review.
"""
import argparse, asyncio, json, pathlib, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
KNOWN = {('delay', 'g.run is not a function')}  # hidden delayed-recall id: launched only from inside other games

async def main(a):
    inv = json.loads((ROOT / 'legacy/inventory.json').read_text(encoding='utf-8'))
    shots = pathlib.Path(a.shots) if a.shots else None
    if shots: shots.mkdir(parents=True, exist_ok=True)
    problems = []
    async with async_playwright() as p:
        kw = {'executable_path': a.chrome} if a.chrome else {}
        b = await p.chromium.launch(args=['--no-sandbox'], **kw)
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='ar-SA')
        page = await ctx.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(a.url, wait_until='load'); await page.wait_for_timeout(1000)
        if await page.locator('.mpc[data-m=main]').count():
            await page.click('.mpc[data-m=main]'); await page.wait_for_timeout(800)
        title = await page.title()
        if title != 'مختبر العقل': problems.append(f'title is {title!r}')
        overflow_js = "()=>{const W=document.documentElement.clientWidth,st=document.querySelector('#stage'),sx=st&&getComputedStyle(st).overflowX;return (document.documentElement.scrollWidth>W+2&&getComputedStyle(document.documentElement).overflowX!=='hidden')||(st&&/auto|scroll/.test(sx)&&st.scrollWidth>st.clientWidth+8)}"
        for gid in [g['id'] for g in inv['brain']] + [g['id'] for g in inv['puzzles']]:
            n = len(errs)
            await page.evaluate(f"()=>startRun(['{gid}'])"); await page.wait_for_timeout(1500)
            await page.evaluate("()=>{const b=[...document.querySelectorAll('#play button')].filter(b=>b.offsetParent&&/^ابدأ/.test(b.textContent.trim())).at(-1);b&&b.click()}")
            await page.wait_for_timeout(2500)
            wide = await page.evaluate(overflow_js)
            if shots: await page.screenshot(path=str(shots / f'{gid}.png'))
            await page.evaluate("()=>closePlay()"); await page.wait_for_timeout(300)
            new = [e for e in errs[n:] if (gid, e) not in KNOWN]
            if new: problems.append(f'{gid}: {new[:2]}')
            if wide: problems.append(f'{gid}: page scrolls sideways')
        await page.click('.tab[data-tab=puz]'); await page.wait_for_timeout(600)
        for i in range(21):
            n = len(errs)
            await page.evaluate(f"()=>{{const x=T7.state();T7.data.stations.forEach((s,j)=>{{if(j<{i})x.done[s.id]={{at:1}};else delete x.done[s.id]}});x.rewards=[...Array(Math.floor({i}/3)).keys()];S.save();T7.open({i})}}")
            for _ in range(12):
                if await page.locator('#t7-board').count(): break
                if not await page.evaluate("()=>{const b=[...document.querySelectorAll('#v-puz button')].filter(b=>!b.closest('.t7-tools')&&b.offsetParent&&!b.disabled).at(-1);if(!b)return false;b.click();return true}"): break
                await page.wait_for_timeout(200)
            ok = await page.evaluate(f"()=>{{const L=T7.logic,s=T7.data.stations[{i}],x=T7.state();let v=x.work[s.id]||L.initial(s),n=0;if(s.kind==='map')v=[1,2,3,4,5,6,7,8,0];else while(!L.solved(s,v)&&n++<60){{const nx=L.assist(s,v);if(!nx)break;v=nx}}x.work[s.id]=v;S.save();T7.render();return L.solved(s,v)}}")
            await page.get_by_text('اختبر الحل').click(); await page.wait_for_timeout(900)
            done = await page.evaluate(f"()=>!!T7.state().done[T7.data.stations[{i}].id]")
            if shots: await page.screenshot(path=str(shots / f'station{i+1:02d}.png'))
            if not (ok and done): problems.append(f'station {i+1}: not completed')
            if len(errs) > n: problems.append(f'station {i+1}: {errs[n:][:2]}')
        await b.close()
    print(json.dumps({'status': 'failed' if problems else 'passed', 'games': len(inv['brain']), 'puzzles': len(inv['puzzles']), 'stations': 21, 'problems': problems}, ensure_ascii=False, indent=2))
    return 1 if problems else 0

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--url', default='http://localhost:8080/'); ap.add_argument('--chrome'); ap.add_argument('--shots')
    sys.exit(asyncio.run(main(ap.parse_args())))
