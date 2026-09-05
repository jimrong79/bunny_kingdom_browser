"""Verify actual policy selection, saved difficulty, private observations, and old-save compatibility."""
from playwright.sync_api import sync_playwright
from browser_smoke import snapshot


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    selections = {}
    for difficulty in ('easy', 'normal'):
        page.goto('http://127.0.0.1:8000')
        page.locator('[name=bots]').select_option('3')
        page.locator('[name=difficulty]').select_option(difficulty)
        page.locator('[name=seed]').fill('1788624816571')
        page.locator('#setup button').click()
        before = snapshot(page)
        expected = page.evaluate("""async difficulty=>{
            const bot=await import(difficulty==='easy'?'/src/bots-baseline.js':'/src/bots.js');
            const {publicView}=await import('/src/game.js');
            const state=JSON.parse(localStorage.getItem('bunny-kingdom-save-v1')).game;
            return state.players.slice(1).map(p=>bot.chooseDraft(publicView(state,p.id),p.id));
        }""", difficulty)
        selections[difficulty] = expected
        page.locator('[data-card]').nth(0).click()
        page.locator('[data-card]').nth(1).click()
        page.locator('#confirm-draft').click()
        after = snapshot(page)
        assert after['botDifficulty'] == difficulty
        for player in after['players'][1:]:
            old_hand = {c['instanceId'] for c in before['players'][player['id']]['hand']}
            played = {c['instanceId'] for c in player['played'] + player['parchments']} & old_hand
            assert played == set(expected[player['id'] - 1]['play'])
            assert player['draftMemory'][0]['cards'] == [c['instanceId'] for c in before['players'][player['id']]['hand']]
        page.reload()
        page.locator('#resume-game').click()
        assert snapshot(page)['botDifficulty'] == difficulty
        assert difficulty.title() + ' bots' in page.locator('.save-status').inner_text()
    assert selections['easy'] != selections['normal']
    page.evaluate("""()=>{
        const saved=JSON.parse(localStorage.getItem('bunny-kingdom-save-v1'));
        delete saved.game.botDifficulty;
        for(const p of saved.game.players)delete p.draftMemory;
        localStorage.setItem('bunny-kingdom-save-v1',JSON.stringify(saved));
    }""")
    page.reload()
    page.locator('#resume-game').click()
    assert 'Normal bots' in page.locator('.save-status').inner_text()
    page.locator('[data-card]').nth(0).click()
    page.locator('[data-card]').nth(1).click()
    page.locator('#confirm-draft').click()
    assert all(len(p['draftMemory']) == 1 for p in snapshot(page)['players'])
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto('http://127.0.0.1:8000')
    assert page.locator('[name=difficulty]').input_value() == 'normal'
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors, errors
    browser.close()
print('Easy/Normal policy routing, saved settings, seen-hand history, old saves, and mobile setup passed.')
