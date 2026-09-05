"""Exercise complete games through the real browser UI (requires Python Playwright).

Start the local server first. Any selected edge-case rulings are explicit test
inputs, not assertions about official rules that remain unresolved.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright


def snapshot(page):
    return page.evaluate("JSON.parse(localStorage.getItem('bunny-kingdom-save-v1')).game")


def camps(page):
    placed = 0
    for _ in range(6):
        if not page.locator('#save-camp').count():
            break
        if page.locator('.cell.eligible').count():
            page.locator('.cell.eligible').first.click()
            page.locator('#place-building').click()
            placed += 1
        else:
            page.locator('#save-camp').click()
    return placed


def build(page):
    placed = 0
    ids = page.locator('[data-building]').evaluate_all('(els)=>els.map(el=>el.dataset.building)')
    for card_id in ids:
        button = page.locator(f'[data-building="{card_id}"]')
        if not button.count():
            continue
        button.click()
        if page.locator('#save-camp').count():
            placed += camps(page)
            continue
        eligible = page.locator('.cell.eligible').evaluate_all('(els)=>els.map(el=>el.dataset.cell)')
        if not eligible:
            page.locator('#cancel-building').click()
            continue
        if card_id.startswith('sky_tower'):
            # Try separate candidate endpoints; the UI must reject a same-fief pair.
            for other in reversed(eligible[1:]):
                page.locator('#cancel-building').click()
                button.click()
                page.locator(f'[data-cell="{eligible[0]}"]').click()
                page.locator(f'[data-cell="{other}"]').click()
                page.locator('#place-building').click()
                if not page.locator('.error').count():
                    placed += 1
                    break
        else:
            page.locator(f'[data-cell="{eligible[0]}"]').click()
            page.locator('#place-building').click()
            assert not page.locator('.error').count()
            placed += 1
        if page.locator('#cancel-building').count():
            page.locator('#cancel-building').click()
    page.locator('#finish-building').click()
    return placed


def game(browser, bots, screenshots):
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(ARGS.url)
    page.locator('[name=bots]').select_option(str(bots))
    page.locator('[name=seed]').fill(f'ui-{bots}')
    page.locator('#setup button').click()
    counts = {'camps': 0, 'buildings': 0, 'market_choices': 0, 'copies': 0, 'rulings': 0}
    turns = 10 if bots == 1 else 6 if bots == 2 else 5
    for round_number in range(1, 5):
        for turn in range(turns):
            cards = page.locator('[data-card]').evaluate_all('(els)=>els.map(el=>el.dataset.card)')
            territories = [c for c in cards if c.startswith('territory_')]
            buildings = [c for c in cards if c.startswith(('trading_post', 'camp_', 'city_', 'farm_', 'sky_tower'))]
            buildings.sort(key=lambda c: (not c.startswith('trading_post'), c))
            if bots == 1 and turn % 3 != 2:
                first = (territories or buildings or cards)[0]
            else:
                first = (buildings or territories or cards)[0]
            copies = [c for c in cards if c.startswith(('liberal_', 'socialist_'))]
            if copies:
                first = copies[0]
            second = next((c for c in territories if c != first), next(c for c in cards if c != first))
            page.locator(f'[data-card="{first}"]').click()
            if round_number == 1 and turn == 0:
                page.reload()
                page.locator('#resume-game').click()
                assert page.locator('.card.selected').get_attribute('data-card') == first
            page.locator(f'[data-card="{second}"]').click()
            page.locator('#confirm-draft').click()
        counts['camps'] += camps(page)
        counts['buildings'] += build(page)
        coordinates = page.locator('[data-market]').evaluate_all('(els)=>els.map(el=>el.dataset.market)')
        for index, coordinate in enumerate(coordinates):
            page.locator(f'[data-market="{coordinate}"]').select_option(['fish', 'carrots', 'wood'][(round_number + index) % 3])
            counts['market_choices'] += 1
        page.locator('#confirm-markets').click()
        state = snapshot(page)
        assert state['phase'] == 'harvest' and state['round'] == round_number
        assert all(len(p['harvests']) == round_number for p in state['players'])
        if screenshots and round_number == 2:
            page.screenshot(path=str(screenshots / f'{bots+1}-players-harvest.png'), full_page=True)
        page.locator('#next-round').click()
    for select in page.locator('[data-copy]:enabled').all():
        options = select.locator('option').evaluate_all('(els)=>els.filter(el=>el.value&&!/Liberal|Socialist/.test(el.text)).map(el=>el.value)')
        if not options:
            options = [select.locator('option').nth(1).get_attribute('value')]
        select.select_option(options[0])
        counts['copies'] += 1
    for _ in range(20):
        pending = page.locator('[data-ruling], [data-copy-resolution]')
        if not pending.count():
            break
        select = pending.first
        select.select_option(select.locator('option').nth(1).get_attribute('value'))
        counts['rulings'] += 1
    assert page.locator('#finish-scoring').is_enabled()
    page.locator('#finish-scoring').click()
    state = snapshot(page)
    assert state['phase'] == 'finished' and state['winners']
    for p in state['players']:
        scored = state['finalScoring']['players'][p['id']]
        assert p['score'] == sum(h['points'] for h in p['harvests']) + sum(r['points'] for r in scored['rows'])
    all_cards = state['deck'] + [c for p in state['players'] for key in ('hand', 'reserve', 'played', 'parchments', 'discarded') for c in p[key]]
    assert len(all_cards) == len({c['instanceId'] for c in all_cards}) == 182
    page.reload()
    page.locator('#resume-game').click()
    assert page.locator('#play-again').count() == 1
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    if screenshots:
        page.screenshot(path=str(screenshots / f'{bots+1}-players-mobile-result.png'), full_page=True)
    assert not errors, errors
    page.close()
    print(f'{bots+1} players: completed four rounds and final scoring; {counts}', flush=True)
    return counts


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8000')
    parser.add_argument('--screenshots', type=Path)
    ARGS = parser.parse_args()
    if ARGS.screenshots:
        ARGS.screenshots.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        results = [game(browser, bots, ARGS.screenshots) for bots in (1, 2, 3)]
        assert sum(r['camps'] for r in results) > 0
        assert sum(r['buildings'] for r in results) > 0
        assert sum(r['market_choices'] for r in results) > 0
        assert sum(r['copies'] for r in results) > 0
        browser.close()
    print('All browser scenarios passed, including human Camp/building placement, markets, copy choices, refresh/resume and mobile results.')
