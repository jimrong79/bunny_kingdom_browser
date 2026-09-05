"""Exercise public production, inventory privacy, and fief inspection in Chromium."""
from playwright.sync_api import sync_playwright
from browser_controls import scenario


def kingdom_controls(page):
    page.goto('http://127.0.0.1:8000')
    page.locator('#setup button').click()
    scenario(page, 'construction', [{'id': 'sky_tower'}, {'id': 'royal_carrot'},
                                    {'id': 'royal_ring', 'playerId': 1}],
             {'B1': 0, 'B2': 0, 'J1': 0, 'J2': 1})
    page.locator('[data-cell=B1]').hover()
    assert page.locator('.fief-highlight').count() == 1  # Lava blocks B1—B2.
    page.locator('[data-cell=B2]').focus()
    assert page.locator('.fief-highlight').get_attribute('data-cell') == 'B2'
    page.locator('[data-building^=sky_tower]').click()
    page.locator('[data-cell=B1]').click()
    page.locator('[data-cell=J1]').click()
    page.locator('#place-building').click()
    page.locator('[data-cell=B1]').hover()
    assert set(page.locator('.fief-highlight').evaluate_all('(els)=>els.map(e=>e.dataset.cell)')) == {'B1', 'J1'}
    assert '2 territories' in page.locator('#fief-readout').inner_text()
    page.locator('.pile-button[data-pile=parchments][data-pile-player="1"]').click()
    assert '1 face-down parchment' in page.locator('#inventory-dialog').inner_text()
    assert 'Royal Ring' not in page.locator('#inventory-dialog').inner_html()
    page.keyboard.press('Escape')
    page.locator('.pile-button[data-pile=parchments][data-pile-player="0"]').click()
    assert 'Royal Carrot' in page.locator('#inventory-dialog').inner_text()
    page.keyboard.press('Escape')
    scenario(page, 'construction', [{'id': 'farm_wood'}, {'id': 'trading_post'}, {'id': 'farm_diamond'}],
             {'A1': 0, 'A2': 0, 'B1': 0})
    for card, coordinate in [('farm_wood', 'A1'), ('trading_post', 'A2'), ('farm_diamond', 'B1')]:
        page.locator(f'[data-building^={card}]').click()
        page.locator(f'[data-cell={coordinate}]').click()
        page.locator('#place-building').click()
    player = page.locator('[data-player="0"]')
    assert player.locator('[data-production=wood] b').inner_text() == '3'
    assert player.locator('[data-production=diamond] b').inner_text() == '1'
    assert '1 Trading Post unassigned' in player.inner_text()
    page.locator('#finish-building').click()
    page.locator('[data-market=A2]').select_option('fish')
    assert player.locator('[data-production=fish] b').inner_text() == '1'
    assert player.locator('[data-production=wood] b').inner_text() == '3'
    assert player.locator('.pending-production').count() == 0
    page.locator('[data-cell=A1]').hover()
    assert '3 resource types' in page.locator('#fief-readout').inner_text()
    page.screenshot(path='/tmp/bunny-kingdom-inspection.png', full_page=True)
    print('Production counts, Trading Posts, luxury farms, lava/Sky fiefs, and inventory privacy passed.', flush=True)


if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        kingdom_controls(page)
        assert not errors, errors
        browser.close()
