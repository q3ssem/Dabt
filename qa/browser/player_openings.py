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
    """The side journey's map. 5.5.28 moved its entry into the journey hub (the old «افتح الخريطة» card is hidden),
    so open it the way the hub's side-chapter card does: ML10.renderMap()."""
    launch = page.locator('.ex10-launch-go')
    if await launch.count() and await launch.first.is_visible():
        await launch.first.click()
    else:
        await page.evaluate("()=>window.ML10&&ML10.renderMap()")
    await page.wait_for_timeout(250)
    await close_transition(page)
