"""Before/after screenshots of the main pages (games, puzzles, home, Treasure Island map) at several sizes."""
import argparse, asyncio
from playwright.async_api import async_playwright
async def main(a):
    async with async_playwright() as p:
        b = await (p.webkit.launch() if a.engine == 'webkit' else p.chromium.launch(args=['--no-sandbox'], **({'executable_path': a.chrome} if a.chrome else {})))
        for w, h in [tuple(map(int, s.split('x'))) for s in a.sizes.split(',')]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, has_touch=True, is_mobile=w < 700 and a.engine != 'webkit', locale='ar-SA')
            if a.skin != 'default':
                await ctx.add_init_script("(()=>{const k='miran:v2',s=JSON.parse(localStorage.getItem(k)||'null')||{v:1,hist:[],best:{},lv:{},days:{}};s.skin='%s';localStorage.setItem(k,JSON.stringify(s))})()" % a.skin)
            pg = await ctx.new_page(); await pg.goto(a.url); await pg.wait_for_timeout(900)
            if await pg.locator('.mpc[data-m=main]').count(): await pg.click('.mpc[data-m=main]'); await pg.wait_for_timeout(400)
            for t in a.tabs.split(','):
                await pg.click(f'.tab[data-tab={t}]'); await pg.wait_for_timeout(700)
                if t == 'puz': await pg.evaluate("()=>{const l=document.querySelector('.v5-hublib');l&&l.scrollIntoView()}"); await pg.wait_for_timeout(500)
                else: await pg.evaluate("()=>{const l=document.querySelector('#uiCatalog');l&&t!=='home'&&l.scrollIntoView()}".replace('t!==', "'%s'!==" % t)); await pg.wait_for_timeout(300)
                await pg.screenshot(path=f'{a.out}/{a.tag}_{t}_{w}x{h}.png')
            await ctx.close()
        await b.close()
ap = argparse.ArgumentParser(); ap.add_argument('--url'); ap.add_argument('--chrome'); ap.add_argument('--engine', default='chromium'); ap.add_argument('--out'); ap.add_argument('--tag')
ap.add_argument('--sizes', default='390x844'); ap.add_argument('--tabs', default='games,puz'); ap.add_argument('--skin', default='light')
asyncio.run(main(ap.parse_args()))
