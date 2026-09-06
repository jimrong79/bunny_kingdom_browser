"""Check final standings, tied winners, saved results, and board review in Chromium."""
from playwright.sync_api import sync_playwright
from browser_smoke import snapshot
from browser_controls import scenario


def finish_with_scores(page, scores):
    scenario(page, 'parchments', [], {})
    page.evaluate("""scores=>{
      const key='bunny-kingdom-save-v1',saved=JSON.parse(localStorage.getItem(key));
      saved.game.players.forEach((p,i)=>{
        p.score=scores[i];p.harvests=[{points:scores[i]},{points:0},{points:0},{points:0}];
      });
      localStorage.setItem(key,JSON.stringify(saved));
    }""", scores)
    page.reload()
    page.locator('#resume-game').click()
    assert page.locator('.results-screen').count() == 0
    page.locator('#finish-scoring').click()
    assert page.locator('.results-screen').is_visible()
    return snapshot(page)


def results_controls(page):
    page.goto('http://127.0.0.1:8000')
    page.locator('[name=bots]').select_option('3')
    page.locator('#setup button').click()
    state = finish_with_scores(page, [180, 216, 216, 140])
    assert page.locator('#results-title').inner_text() == 'Shared victory!'
    assert page.locator('.result-winner').evaluate_all('(els)=>els.map(e=>Number(e.dataset.resultPlayer))') == state['winners'] == [1, 2]
    assert page.locator('[data-result-player]').evaluate_all('(els)=>els.map(e=>Number(e.dataset.resultPlayer))') == [1, 2, 0, 3]
    assert page.locator('[data-result-player]').evaluate_all('(els)=>els.map(e=>e.value)') == [1, 1, 3, 4]
    assert page.locator('.winner-badge').all_inner_texts() == ['Joint winner', 'Joint winner']
    for player in state['players']:
        card = page.locator(f'[data-result-player="{player["id"]}"]')
        assert card.locator('.result-score').inner_text() == str(player['score'])
        assert card.locator('.rabbit-art').count() == 1
        assert card.evaluate('(el)=>el.style.getPropertyValue("--player")') == player['color']
    page.locator('.results-details > summary').click()
    assert page.locator('.results-details .table').is_visible()
    assert page.locator('#finish-scoring').count() == 0
    page.locator('#review-board').click()
    assert page.locator('[data-cell]').count() == 100
    page.locator('[data-cell=A1]').click()
    page.locator('#show-results').click()
    assert snapshot(page) == state
    page.reload()
    page.locator('#resume-game').click()
    assert page.locator('.results-screen').is_visible()
    assert snapshot(page) == state
    for width in (320, 390):
        page.set_viewport_size({'width': width, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        for badge in page.locator('.winner-badge').all():
            assert badge.evaluate('(el)=>el.scrollWidth <= el.clientWidth')
    page.set_viewport_size({'width': 1440, 'height': 1000})
    finish_with_scores(page, [243, 198, 170, 160])
    assert page.locator('#results-title').inner_text() == 'You win!'
    assert page.locator('.winner-badge').all_inner_texts() == ['Winner']
    page.screenshot(path='/tmp/bunny-results-desktop.png', full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path='/tmp/bunny-results-mobile.png', full_page=True)
    page.locator('#play-again').click()
    assert page.locator('#setup').is_visible()
    page.locator('#setup button').click()
    assert snapshot(page)['phase'] == 'draft'
    assert page.locator('.results-screen').count() == 0
    print('Ranked totals, colored rabbits, tied winners, score breakdown, board review, saved results, mobile fit, and play again passed.', flush=True)


if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        results_controls(page)
        assert not errors, errors
        browser.close()
