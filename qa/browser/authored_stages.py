"""Four-viewport test of the authored track entry, touch, live hint and resume."""
import os

from playwright.sync_api import sync_playwright

URL = os.environ.get('MINDLAB_URL', 'http://127.0.0.1:8765/index.html')
ENGINE = os.environ.get('ENGINE', 'chromium')
BOARDS = {'pz_river': '.ml-river-board', 'pz_stat': '.st10-s', 'pz_rush': '.rhcar.red'}


def open_track(page, puzzle):
    page.evaluate('(id) => startRun([id])', puzzle)
    page.locator('#stage .ml-authored-open').tap()
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
