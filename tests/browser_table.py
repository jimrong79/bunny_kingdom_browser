"""Check the illustrated table, overlapping hand, and existing-save color update."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_smoke import snapshot


def table(page, url, bots, width, height, screenshots):
    page.set_viewport_size({'width': width, 'height': height})
    page.goto(url)
    page.locator('[name=bots]').select_option(str(bots))
    page.locator('[name=seed]').fill('1788624816571')
    page.locator('#setup button').click()
    hand = page.locator('.hand-dock').bounding_box()
    board = page.locator('.board').bounding_box()
    assert hand['y'] >= board['y'] + board['height'] - 1
    assert hand['y'] + hand['height'] <= height
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert page.locator('.cell .terrain-art').count() == 100
    assert page.locator('.cell .city-art').count() == 18
    if width >= 1300:
        assert board['width'] >= 390
    ids = page.locator('[data-card]').evaluate_all('(els)=>els.map(el=>el.dataset.card)')
    # Each card must remain reachable despite overlap, raised neighbors, and scrolling.
    for card_id in ids:
        card = page.locator(f'[data-card="{card_id}"]')
        card.hover()
        assert page.locator('#card-preview h3').inner_text() == card.locator('h3').inner_text()
        preview = page.locator('#card-preview').bounding_box()
        assert preview['y'] >= 0 and preview['y'] + preview['height'] <= hand['y']
        if card_id.startswith('territory_'):
            assert page.locator('.preview-target').get_attribute('data-cell') == card_id.removeprefix('territory_')
        card.click()
        assert card.get_attribute('aria-pressed') == 'true'
        card.click()
        assert card.get_attribute('aria-pressed') == 'false'
    if bots == 3:
        assert snapshot(page)['players'][3]['color'] == '#23834b'
        page.evaluate("""()=>{
            const saved=JSON.parse(localStorage.getItem('bunny-kingdom-save-v1'));
            saved.game.players[3].color='#655bb5';
            localStorage.setItem('bunny-kingdom-save-v1',JSON.stringify(saved));
        }""")
        page.reload()
        page.locator('#resume-game').click()
        assert snapshot(page)['players'][3]['color'] == '#23834b'
    if screenshots:
        page.mouse.move(0, 0)
        page.screenshot(path=str(screenshots / f'table-{bots+1}p-{width}x{height}.png'), full_page=True)
    print(f'{bots+1} players at {width}×{height}: every card selectable; board and hand visible; artwork and preview passed.', flush=True)


def mobile_hand(page, url):
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(url)
    page.locator('#setup button').click()
    page.locator('.game-nav a[href="#hand-panel"]').click()
    for index in (0, -1):
        card = page.locator('[data-card]').nth(index)
        card.click()
        assert card.get_attribute('aria-pressed') == 'true'
        preview = page.locator('#card-preview').bounding_box()
        assert preview and 0 <= preview['y'] < 30
    page.locator('.game-nav a[href="#turn-panel"]').click()
    page.locator('#confirm-draft').click()
    assert snapshot(page)['draftTurn'] == 2
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    print('Phone: first/last cards, visible text previews, and confirm through bottom navigation passed.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8000')
    parser.add_argument('--screenshots', type=Path)
    args = parser.parse_args()
    if args.screenshots:
        args.screenshots.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for bots, width, height in [(3,1440,1000), (2,1366,768), (2,1024,768), (1,1440,900)]:
            table(page, args.url, bots, width, height, args.screenshots)
        mobile_hand(page, args.url)
        assert not errors, errors
        browser.close()
    print('All illustrated table checks passed.')
