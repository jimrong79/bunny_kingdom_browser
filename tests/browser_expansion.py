"""Complete expansion sessions through the actual UI; explicit test rulings are not official clarifications."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_smoke import snapshot, camps, build

def game(browser, players):
    page=browser.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce')
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://127.0.0.1:8000')
    page.locator('[name=expansion]').select_option('in_the_sky')
    page.locator('[name=bots]').select_option(str(players-1))
    page.locator('[name=difficulty]').select_option('normal' if players==3 else 'easy')
    page.locator('[name=seed]').fill('sky-browser-'+str(players))
    page.locator('#setup button').click()
    assert page.locator('[data-cell]').count()==131
    assert page.locator('[data-player]').count()==players
    for round_number in range(1,5):
        while snapshot(page)['phase']=='draft':
            saved=snapshot(page)
            count=3 if players==3 else 2
            if len(saved['players'][0]['hand'])==count and players>2:
                assert page.locator('#confirm-draft').inner_text()=='Continue →'
                assert page.locator('.card.selected').count()==count
            else:
                cards=page.locator('[data-card]').evaluate_all('(els)=>els.map(e=>e.dataset.card)')
                # Alternate territory and building selections to exercise both worlds.
                cards.sort(key=lambda c:(not (c.startswith('territory_C') if saved['draftTurn']%2 else not c.startswith('territory_')),c))
                for card in cards[:count]:page.locator(f'[data-card="{card}"]').click()
                if round_number==1 and saved['draftTurn']==1:
                    page.reload();page.locator('#resume-game').click()
                    assert page.locator('.card.selected').count()==count
            page.locator('#confirm-draft').click()
            assert not page.locator('.error').count(),page.locator('.error').all_text_contents()
        camps(page);build(page)
        for coordinate in page.locator('[data-market]').evaluate_all('(els)=>els.map(e=>e.dataset.market)'):
            page.locator(f'[data-market="{coordinate}"]').select_option('wood')
        for coordinate in page.locator('[data-chimney]:enabled').evaluate_all('(els)=>els.map(e=>e.dataset.chimney)'):
            select=page.locator(f'[data-chimney="{coordinate}"]')
            value=select.locator('option:not([disabled])').first.get_attribute('value')
            select.select_option(value)
        assert page.locator('#confirm-markets').is_enabled()
        page.locator('#confirm-markets').click()
        assert snapshot(page)['phase']=='harvest'
        if round_number==3:
            page.screenshot(path=f'/tmp/sky-browser-{players}-harvest.png',full_page=True)
        page.locator('#next-round').click()
    for card in page.locator('[data-copy]:enabled').evaluate_all('(els)=>els.map(e=>e.dataset.copy)'):
        select=page.locator(f'[data-copy="{card}"]')
        options=select.locator('option').evaluate_all('(els)=>els.filter(e=>e.value&&!/Liberal|Socialist/.test(e.text)).map(e=>e.value)')
        if options:select.select_option(options[0])
    for _ in range(20):
        pending=page.locator('[data-ruling], [data-copy-resolution]')
        if not pending.count():break
        pending.first.select_option(pending.first.locator('option').nth(1).get_attribute('value'))
    assert page.locator('#finish-scoring').is_enabled(),page.locator('#actions').inner_text()
    page.locator('#finish-scoring').click()
    final=snapshot(page)
    assert final['phase']=='finished'
    assert page.locator('[data-result-player]').count()==players
    for result in final['finalScoring']['players']:
        assert result['total']==result['harvest']+result['trade']+result['parchmentPoints']
        assert result['trade']==result['coins']*len(result['uniqueResources'])
    page.reload();page.locator('#resume-game').click()
    assert page.locator('.results-screen').is_visible()
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors,errors
    page.close();print(f'{players} players: four rounds, expansion construction, harvests, Trade, scoring, resume passed',flush=True)

if __name__=='__main__':
    with sync_playwright() as p:
        browser=p.chromium.launch()
        for players in [2,3,4,5]:game(browser,players)
        browser.close()
