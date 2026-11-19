"""Use the same start/continue buttons as the player; do not mark scenes seen in storage."""
async def dismiss_opening(page):
    opening=page.locator('#fit-opening-overlay #fit-op-start')
    if await opening.count() and await opening.is_visible():
        await opening.click()
        await page.wait_for_timeout(100)

async def close_transition(page):
    for _ in range(12):
        close=page.locator('#mlj-tr-close')
        if not await close.count() or not await close.is_visible(): break
        await close.click()
        await page.wait_for_timeout(100)
