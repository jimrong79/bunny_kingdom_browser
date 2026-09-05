"""Check interactive controls in Chromium with Python Playwright and a local server."""
import argparse
from playwright.sync_api import sync_playwright
from browser_smoke import snapshot


def draft_controls(page, url):
    page.goto(url)
    page.locator('[name=bots]').select_option('1')
    page.locator('[name=seed]').fill('controls')
    page.locator('#setup button').click()
    cards = page.locator('[data-card]').evaluate_all('(els)=>els.map(el=>el.dataset.card)')
    first, second = [c for c in cards if c.startswith('territory_')][:2]
    assert page.locator('#confirm-draft').is_disabled()
    page.locator(f'[data-card="{first}"]').focus()
    page.keyboard.press('Space')
    assert page.evaluate('document.activeElement.dataset.card') == first
    assert page.locator('#confirm-draft').is_disabled()
    page.locator(f'[data-card="{second}"]').click()
    assert page.locator('.discard-selected').get_attribute('data-card') == second
    page.locator('#swap-draft').click()
    assert page.locator('.discard-selected').get_attribute('data-card') == first
    page.locator('#clear-draft').click()
    assert page.locator('.card.selected').count() == 0
    assert page.locator('#confirm-draft').is_disabled()
    page.locator(f'[data-card="{first}"]').click()
    page.locator(f'[data-card="{second}"]').click()
    page.locator('#swap-draft').click()
    page.locator('#confirm-draft').click()
    state = snapshot(page)
    assert state['draftTurn'] == 2
    assert state['cells'][second.removeprefix('territory_')]['owner'] == 0
    assert first in [c['instanceId'] for c in state['players'][0]['discarded']]
    assert page.locator('.card.selected').count() == 0
    print('Draft: selection, keyboard focus, swap, clear, and play/discard effects passed.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8000')
    args = parser.parse_args()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        draft_controls(page, args.url)
        assert not errors, errors
        browser.close()
    print('All control checks passed.')
