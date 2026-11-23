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
    """Compatibility helper: open visible side chapter folders, never render an atlas.
    The player-facing stage cards preserve the original 24-stage unlock sequence.
    """
    await page.evaluate("async()=>{await window.mindlabSide.start();window.ML10?.openStations()}")
    await page.locator("#mlj-unified-hub .ml-folder-station").first.wait_for(state="visible")
    await close_transition(page)
