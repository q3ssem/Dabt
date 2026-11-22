"""Use the same start/continue buttons as the player; do not mark scenes seen in storage."""
async def dismiss_opening(page, wait=0):
    """Close the story opening if it is up; with wait (ms), keep looking that long for it to appear."""
    opening=page.locator('#fit-opening-overlay #fit-op-start')
    for _ in range(max(1, wait // 100)):
        if await opening.count() and await opening.is_visible():
            await opening.click()
            await page.wait_for_timeout(100)
            return True
        if wait: await page.wait_for_timeout(100)
    return False

async def close_transition(page):
    for _ in range(12):
        close=page.locator('#mlj-tr-close')
        if not await close.count() or not await close.is_visible(): break
        await close.click()
        await page.wait_for_timeout(100)

async def open_side_map(page):
    """Open the optional original side-journey map through its visible native controls.
    In the folder-first release, use its explicit compatibility entry rather than
    redirecting to the new hub; never unlock or complete any stage in this helper."""
    launch = page.locator('.ex10-launch-go')
    if await launch.count() and await launch.first.is_visible():
        await launch.first.click()
    else:
        await page.evaluate("()=>window.ML10&&(ML10.legacyRenderMap?.()||ML10.renderMap())")
    await page.wait_for_timeout(250)
    await close_transition(page)
