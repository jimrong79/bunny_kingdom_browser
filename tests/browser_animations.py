"""Check real motion separately from the reduced-motion controls and full-game suites."""
from playwright.sync_api import sync_playwright
from browser_smoke import snapshot
from browser_controls import scenario


def choose_two(page):
    page.locator('[data-card]').nth(0).click()
    page.locator('[data-card]').nth(1).click()
    page.locator('#confirm-draft').click()


def watch(page):
    page.evaluate("""()=>{
      window.flights=[];
      new MutationObserver(records=>{
        for(const record of records)for(const node of record.addedNodes)if(node.matches?.('.turn-sprite')) {
          const bar=document.querySelector('#turn-animation');
          flights.push({kind:node.dataset.animationKind,player:Number(bar.dataset.player),html:node.innerHTML,
            caption:bar.innerText,inert:document.querySelector('#app').inert});
        }
      }).observe(document.body,{childList:true});
    }""")


def animation_controls(page):
    page.goto('http://127.0.0.1:8000')
    page.locator('[name=bots]').select_option('3')
    page.locator('[name=seed]').fill('1788624816571')
    page.locator('#setup button').click()
    watch(page)
    page.locator('[data-card=territory_A7]').click()
    page.locator('[data-card=provisions_1]').click()
    page.locator('#confirm-draft').click()
    assert page.locator('#app').evaluate('(el)=>el.inert')
    # State is already safely committed, while the cell still shows its previous ownership.
    settled = snapshot(page)
    assert settled['cells']['A7']['owner'] == 0
    assert page.locator('[data-cell=A7]').get_attribute('data-owner') == ''
    page.locator('#turn-animation').wait_for(state='detached', timeout=20000)
    flights = page.evaluate('flights')
    assert set(f['player'] for f in flights) == {0, 1, 2, 3}
    assert {'claim', 'reserve', 'parchment', 'provisions'} <= set(f['kind'] for f in flights)
    assert all(f['inert'] for f in flights)
    for flight in flights:
        if flight['kind'] == 'parchment':
            assert 'card-back-art' in flight['html']
            for player in settled['players'][1:]:
                for card in player['parchments']:
                    assert card['name'] not in flight['html'] + flight['caption']
    assert snapshot(page) == settled
    for player in settled['players']:
        for pile in ('buildings', 'parchments'):
            assert page.locator(f'[data-player="{player["id"]}"] [data-pile={pile}] [data-pile-count]').inner_text() == str(len(player[pile]))
    assert not page.locator('#app').evaluate('(el)=>el.inert')
    choose_two(page)
    saved = snapshot(page)
    page.locator('#skip-animation').click()
    page.locator('#turn-animation').wait_for(state='detached')
    assert snapshot(page) == saved
    assert page.locator('.turn-sprite').count() == 0
    # A refresh halfway through playback must neither redeal nor replay effects.
    choose_two(page)
    saved = snapshot(page)
    page.reload()
    page.locator('#resume-game').click()
    assert snapshot(page) == saved
    assert page.locator('#turn-animation').count() == 0
    page.locator('#toggle-animation').click()
    assert page.locator('#toggle-animation').get_attribute('aria-pressed') == 'false'
    page.reload()
    page.locator('#resume-game').click()
    assert page.locator('#toggle-animation').get_attribute('aria-pressed') == 'false'
    choose_two(page)
    assert page.locator('#turn-animation').count() == 0
    assert not page.locator('#app').evaluate('(el)=>el.inert')
    print('All players, Provisions, secret backs, counters, input lock, skip, refresh, and saved motion preference passed.', flush=True)


def construction_motion(page):
    scenario(page, 'construction', [{'id': 'city_2'}, {'id': 'sky_tower'}], {'A1': 0, 'B1': 0, 'J1': 0})
    # scenario resets preferences, so animation is enabled again.
    page.locator('[data-building^=city_2]').click()
    page.locator('[data-cell=A1]').click()
    page.locator('#place-building').click()
    page.locator('#turn-animation[data-event=place]').wait_for()
    assert page.locator('[data-cell=A1] .piece').count() == 0
    page.locator('#turn-animation').wait_for(state='detached')
    assert page.locator('[data-cell=A1] .city-art').count() == 1
    page.locator('[data-building^=sky_tower]').click()
    page.locator('[data-cell=B1]').click()
    page.locator('[data-cell=J1]').click()
    page.locator('#place-building').click()
    page.keyboard.press('Escape')
    page.locator('#turn-animation').wait_for(state='detached')
    assert page.locator('.cell .sky-art').count() == 2
    assert page.locator('[data-player="0"] [data-pile=buildings] [data-pile-count]').inner_text() == '0'
    print('Building placement, both Sky Tower endpoints, and Escape cancellation passed.', flush=True)


def mobile_motion(page):
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto('http://127.0.0.1:8000')
    page.locator('[name=bots]').select_option('3')
    page.locator('[name=seed]').fill('1788624816571')
    page.locator('#setup button').click()
    page.locator('.game-nav a[href="#hand-panel"]').click()
    page.locator('[data-card=territory_A7]').click()
    page.locator('[data-card=provisions_1]').click()
    page.locator('.game-nav a[href="#turn-panel"]').click()
    page.locator('#confirm-draft').click()
    page.locator('[data-animation-kind=claim]').wait_for()
    cell = page.locator('[data-cell=A7]').bounding_box()
    assert 0 <= cell['x'] <= 390 - cell['width'] and 80 < cell['y'] < 844 - cell['height']
    bar = page.locator('#turn-animation').bounding_box()
    assert bar['x'] >= 0 and bar['x'] + bar['width'] <= 390
    page.screenshot(path='/tmp/bunny-motion-mobile.png')
    page.locator('#skip-animation').click()
    page.locator('#turn-animation').wait_for(state='detached')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.emulate_media(reduced_motion='reduce')
    page.reload()
    page.locator('#resume-game').click()
    choose_two(page)
    assert page.locator('#turn-animation').count() == 0
    assert page.locator('#toggle-animation').is_disabled()
    print('Phone viewport, enlarged-board panning, visible playback controls, and reduced motion passed.', flush=True)


if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'warning' else None)
        animation_controls(page)
        construction_motion(page)
        mobile_motion(page)
        assert not errors, errors
        browser.close()
