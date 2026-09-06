"""Check live parchment estimates and copy selection through the browser UI."""
from playwright.sync_api import sync_playwright
from browser_controls import scenario
from browser_smoke import snapshot


def draft_preview(page):
    page.goto('http://127.0.0.1:8000')
    page.locator('[name=bots]').select_option('1')
    page.locator('#setup button').click()
    scenario(page, 'construction', [{'id': c} for c in
             ['left_glove', 'treasure_hunter', 'treasure_guardian', 'bureaucrat']], {'A4': 0})
    page.evaluate("""()=>{
      const key='bunny-kingdom-save-v1',s=JSON.parse(localStorage.getItem(key));
      for(const id of ['right_glove','royal_crown','liberal','opportunist']) {
        const index=s.game.deck.findIndex(c=>c.id===id);
        s.game.players[0].hand.push(...s.game.deck.splice(index,1));
      }
      s.game.phase='draft';localStorage.setItem(key,JSON.stringify(s));
    }""")
    page.reload()
    page.locator('#resume-game').click()
    before = snapshot(page)
    page.locator('[data-card=right_glove_1]').hover()
    hint = page.locator('.parchment-estimate')
    assert 'If scored now: +18 parchment points' in hint.inner_text()
    assert '8 on this card · +10 from your other parchments' in hint.inner_text()
    page.locator('[data-card=royal_crown_1]').focus()
    assert 'If scored now: +14 parchment points' in hint.inner_text()
    page.locator('[data-card=liberal_1]').hover()
    assert 'Value pending' in hint.inner_text() and 'revealed parchment' in hint.inner_text()
    page.locator('[data-card=opportunist_1]').hover()
    assert 'Value pending' in hint.inner_text() and 'final ranking' in hint.inner_text()
    assert snapshot(page) == before
    page.locator('[data-card=right_glove_1]').hover()
    page.screenshot(path='/tmp/bunny-draft-points-desktop.png', full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('.game-nav a[href="#hand-panel"]').click()
    page.locator('[data-card=right_glove_1]').click()
    assert 'If scored now: +18 parchment points' in hint.inner_text()
    assert page.locator('#card-preview').is_visible()
    assert page.locator('#card-preview').evaluate('(el)=>el.scrollHeight <= el.clientHeight')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path='/tmp/bunny-draft-points-mobile.png', full_page=True)
    # Longer caveats must remain readable on a short, narrow phone too.
    page.evaluate("""()=>{
      const key='bunny-kingdom-save-v1',s=JSON.parse(localStorage.getItem(key)),p=s.game.players[0];
      p.parchments.push(...p.hand.filter(c=>['liberal','opportunist'].includes(c.id)));
      p.hand=p.hand.filter(c=>!['liberal','opportunist'].includes(c.id));
      localStorage.setItem(key,JSON.stringify(s));
    }""")
    page.set_viewport_size({'width': 320, 'height': 568})
    page.reload()
    page.locator('#resume-game').click()
    page.locator('[data-card=right_glove_1]').hover()
    assert 'Unchosen copy effects are excluded' in hint.inner_text()
    assert 'Final-rank bonuses are excluded' in hint.inner_text()
    assert page.locator('#card-preview').evaluate('(el)=>el.scrollHeight <= el.clientHeight')


def copy_preview(page):
    page.set_viewport_size({'width': 1440, 'height': 1000})
    scenario(page, 'parchments', [{'id': c} for c in
             ['liberal', 'left_glove', 'treasure_hunter', 'treasure_guardian', 'bureaucrat']]
             + [{'id': c, 'playerId': 1} for c in ['royal_crown', 'right_glove']], {})
    select = page.locator('[data-copy=liberal_1]')
    assert select.locator('option').all_text_contents()[1:] == [
        'Right Glove — 8 pts · 27 total', 'Royal Crown — 10 pts · 23 total']
    assert snapshot(page)['scoringDecisions']['copies'] == {}
    select.select_option('right_glove_1')
    assert page.locator('.copy-card-detail').is_visible()
    page.reload()
    page.locator('#resume-game').click()
    assert select.input_value() == 'right_glove_1'
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.locator('#finish-scoring').click()
    assert snapshot(page)['players'][0]['score'] == 27


if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        draft_preview(page)
        copy_preview(page)
        assert not errors, errors
        browser.close()
    print('Draft estimates, combo effects, pending values, mobile display, copy ranking, save/resume, and final scores passed.')
