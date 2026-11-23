"""Four-viewport test of the authored track entry, touch, live hint and resume."""
import os

from playwright.sync_api import expect, sync_playwright

URL = os.environ.get('MINDLAB_URL', 'http://127.0.0.1:8765/index.html')
ENGINE = os.environ.get('ENGINE', 'chromium')
BOARDS = {'pz_river': '.ml-river-board', 'pz_rush': '.rhcar.red', 'pz_pipe': '.pp10', 'pz_ice': '.icb2',
          'pz_flow': '.fl10', 'pz_tan': '.tg10', 'pz_untangle': '.unb'}


def open_track(page, puzzle):
    page.evaluate('(id) => startRun([id])', puzzle)
    picker = page.locator('.ml-authored-picker')
    picker.wait_for()
    assert picker.locator('.ml-authored-levels button').count() == 20
    return picker


def start_stage(page, picker, puzzle):
    picker.locator('.go-btn').tap()
    opening = page.locator('#fit-op-start')
    board = page.locator(BOARDS[puzzle]).first
    opening.or_(board).first.wait_for()
    if opening.is_visible():
        opening.tap()
    board.wait_for()


def river_first_stage(page):
    for destination, item in [(1, 'خروف'), (0, None), (1, 'ذئب'), (0, 'خروف'),
                              (1, 'عشب'), (0, None), (1, 'خروف')]:
        if item:
            page.locator(f'[data-river-item="{item}"]').tap()
        page.locator(f'[data-river-to="{destination}"]').tap()
    page.locator('#stage .res').wait_for()
    saved = page.evaluate("JSON.parse(localStorage.getItem('mindlab:authored-stages:v1')).pz_river")
    assert saved == {'last': 2, 'cleared': 1}, saved


def river_scene_motion(page):
    # Start with the animations enabled to observe the actual transfer and docking.
    page.emulate_media(reduced_motion='no-preference')
    picker = open_track(page, 'pz_river')
    start_stage(page, picker, 'pz_river')
    board = page.locator('.ml-river-board')
    banks = board.locator('.ml-river-place')
    vessel = board.locator('.ml-river-vessel')
    sheep_ashore = banks.locator('[data-river-item="خروف"]')
    sheep_seated = vessel.locator('[data-river-item="خروف"]')
    flight = board.locator('.ml-river-hop')
    assert banks.nth(0).bounding_box()['x'] < banks.nth(1).bounding_box()['x']
    box = board.bounding_box()
    assert abs(box['width'] - box['height']) < 1
    expect(vessel.locator('.ml-river-captain')).to_have_attribute('src', 'expedition10/art/crew/poses/ward-curious.webp')
    expect(sheep_ashore.locator('img')).to_have_attribute('src', 'ui/designs_art/river_stage1/03_passengers/sheep_bank.png')

    sheep_ashore.tap()
    expect(flight).to_have_count(1)
    expect(sheep_ashore).to_have_count(0)
    expect(sheep_seated).to_be_enabled()
    expect(sheep_seated.locator('img')).to_have_attribute('src', 'ui/designs_art/river_stage1/03_passengers/sheep_seated.png')
    wolf = banks.locator('[data-river-item="ذئب"]')
    wolf.tap()  # Capacity one: the second passenger remains ashore.
    expect(wolf).to_be_enabled()
    expect(vessel.locator('[data-river-item="ذئب"]')).to_have_count(0)
    sheep_seated.tap()
    expect(sheep_ashore).to_be_enabled()
    expect(sheep_seated).to_have_count(0)

    sheep_ashore.tap()
    expect(sheep_seated).to_be_enabled()
    page.locator('[data-river-to="1"]').tap()
    expect(board).to_have_class('ml-river-board sailing')
    expect(sheep_seated).to_be_disabled()
    expect(banks.nth(1).locator('[data-river-item="خروف"]')).to_be_enabled()
    expect(sheep_seated).to_have_count(0)
    expect(flight).to_have_count(0)
    assert vessel.evaluate("el => el.style.getPropertyValue('--dock')") == '70%'
    page.locator('[data-river-to="0"]').tap()
    expect(vessel).to_have_attribute('data-heading', 'left')
    expect(page.locator('[data-river-to="1"]')).to_be_enabled()

    page.evaluate('() => closePlay()')
    page.emulate_media(reduced_motion='reduce')


def flow_fast_straight_swipe(page):
    grid = page.locator('#fl10')
    start = grid.locator('[data-i="22"]').bounding_box()
    end = grid.locator('[data-i="20"]').bounding_box()
    page.mouse.move(start['x'] + start['width'] / 2, start['y'] + start['height'] / 2)
    page.mouse.down()
    page.mouse.move(end['x'] + end['width'] / 2, end['y'] + end['height'] / 2, steps=1)
    page.mouse.up()
    expect(grid.locator('[data-i="21"] .fl10-track')).to_be_visible()
    expect(grid.locator('[data-i="20"] .fl10-track')).to_be_visible()


with sync_playwright() as playwright:
    if ENGINE == 'webkit':
        browser = playwright.webkit.launch()
    else:
        options = {'args': ['--no-sandbox']}
        if 'CHROME' in os.environ:
            options['executable_path'] = os.environ['CHROME']
        browser = playwright.chromium.launch(**options)
    for width, height in [(320, 640), (390, 844), (430, 932), (844, 390)]:
        context = browser.new_context(viewport={'width': width, 'height': height},
                                      has_touch=True, is_mobile=True, reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='load')
        page.evaluate('() => window.mindlabPlayLayers.start()')
        mode = page.locator('.mpc[data-m=main]')
        if mode.is_visible():
            mode.tap()
        legacy = page.evaluate('() => JSON.stringify(S.st.lv)')
        if width == 390:
            river_scene_motion(page)
        for puzzle, selector in BOARDS.items():
            picker = open_track(page, puzzle)
            assert picker.locator('.ml-authored-levels button:disabled').count() == 19
            start_stage(page, picker, puzzle)
            visible = page.locator(selector).first
            box = visible.bounding_box()
            assert box and 0 <= box['x'] < box['x'] + box['width'] <= width + 1, (puzzle, box)
            page.locator('#pzh').tap()
            page.locator('#pzt').wait_for()
            if puzzle == 'pz_river':
                river_first_stage(page)
            if puzzle == 'pz_flow' and width == 390:
                flow_fast_straight_swipe(page)
            page.evaluate('() => closePlay()')
        assert page.evaluate('() => JSON.stringify(S.st.lv)') == legacy
        page.reload(wait_until='load')
        page.evaluate('() => window.mindlabPlayLayers.start()')
        picker = open_track(page, 'pz_river')
        assert picker.locator('.go-btn').get_attribute('data-level') == '2'
        assert picker.locator('.ml-authored-levels button:enabled').count() == 2
        assert not errors, errors
        context.close()
        print(f'PASS {ENGINE} {width}×{height}')
    browser.close()
