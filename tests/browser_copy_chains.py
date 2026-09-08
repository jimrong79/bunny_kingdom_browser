"""Select a cross-neighbor copy chain, preview it, resume it, and finish scoring."""
from playwright.sync_api import sync_playwright
from browser_controls import scenario
from browser_smoke import snapshot

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8000')
    page.locator('[name=bots]').select_option('2')
    page.locator('#setup button').click()
    scenario(page, 'parchments', [
        {'id': 'socialist'}, {'id': 'royal_ring'},
        {'id': 'liberal', 'playerId': 1}, {'id': 'royal_crown', 'playerId': 2},
    ], {})
    page.evaluate("""async()=>{
        const {chooseCopies}=await import('./src/bots.js');
        const {publicView}=await import('./src/game.js');
        const key='bunny-kingdom-save-v1',saved=JSON.parse(localStorage.getItem(key)),s=saved.game;
        for(const p of s.players.filter(p=>p.bot))Object.assign(s.scoringDecisions.copies,chooseCopies(publicView(s,p.id),p.id,s.scoringDecisions));
        localStorage.setItem(key,JSON.stringify(saved));
    }""")
    page.reload();page.locator('#resume-game').click()
    select = page.locator('[data-copy="socialist_1"]')
    assert select.locator('option').all_text_contents()[1:] == ['Liberal → Royal Crown — 5 pts · 6 total']
    select.select_option('liberal_1>royal_crown_1')
    assert not page.locator('[data-ruling], [data-copy-resolution]').count()
    assert page.locator('#finish-scoring').is_enabled()
    page.reload();page.locator('#resume-game').click()
    assert select.input_value() == 'liberal_1>royal_crown_1'
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.locator('#finish-scoring').click()
    assert snapshot(page)['players'][0]['score'] == 6
    assert not errors, errors
    browser.close()
print('Cross-neighbor copy choice, exact points, save/resume, mobile layout, and final scoring passed.')
