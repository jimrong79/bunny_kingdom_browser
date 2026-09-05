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


def scenario(page, phase, cards, owners):
    """Prepare an isolated interaction while retaining all 182 physical cards."""
    page.evaluate("""({phase,cards,owners})=>{
        const saved=JSON.parse(localStorage.getItem('bunny-kingdom-save-v1'));
        const s=saved.game;
        s.deck.push(...s.players.flatMap(p=>['hand','reserve','played','parchments','discarded'].flatMap(k=>p[k])));
        for(const p of s.players) {
            for(const k of ['hand','reserve','played','parchments','discarded','buildings','harvests'])p[k]=[];
            p.ready=p.bot;p.score=0;
        }
        for(const c of Object.values(s.cells)) {
            c.owner=owners[c.coordinate]??null;
            if(c.building?.instanceId)c.building=null;
        }
        for(const {id,playerId=0} of cards) {
            const index=s.deck.findIndex(c=>c.id===id);
            if(index<0)throw Error('Missing fixture card: '+id);
            const [card]=s.deck.splice(index,1),player=s.players[playerId];
            if(card.category==='parchment')player.parchments.push(card);
            else {player.played.push(card);player.buildings.push(card);}
        }
        s.phase=phase;s.round=phase==='parchments'?4:1;
        s.scoringDecisions={copies:{},rulings:{},copyResolutions:{}};
        saved.ui={};localStorage.setItem('bunny-kingdom-save-v1',JSON.stringify(saved));
    }""", {'phase': phase, 'cards': cards, 'owners': owners})
    page.reload()
    page.locator('#resume-game').click()


def construction_controls(page):
    scenario(page, 'construction', [{'id': 'sky_tower'}, {'id': 'trading_post'}],
             {'A1': 0, 'A2': 0, 'J1': 0})
    tower = page.locator('[data-building^=sky_tower]')
    tower.click()
    assert page.locator('#place-building').is_disabled()
    page.locator('[data-cell=A1]').click()
    assert page.locator('#place-building').is_disabled()
    assert 'eligible' not in page.locator('[data-cell=A2]').get_attribute('class')
    page.locator('[data-cell=A2]').click()
    assert page.locator('.cell.target').count() == 1
    page.locator('[data-cell=J1]').click()
    assert page.locator('#place-building').is_enabled()
    page.locator('#place-building').click()
    state = snapshot(page)
    assert state['cells']['A1']['building']['pairId'] == state['cells']['J1']['building']['pairId']
    page.locator('[data-building^=trading_post]').click()
    page.locator('[data-cell=A2]').click()
    page.locator('#place-building').click()
    page.locator('#finish-building').click()
    assert page.locator('#confirm-markets').is_disabled()
    page.locator('[data-market=A2]').select_option('fish')
    assert page.locator('#confirm-markets').is_enabled()
    page.locator('#confirm-markets').click()
    assert snapshot(page)['phase'] == 'harvest'
    scenario(page, 'construction', [{'id': 'sky_tower'}], {'A1': 0, 'A2': 0})
    page.locator('[data-building^=sky_tower]').click()
    assert page.locator('.cell.eligible').count() == 0
    assert 'No legal pair' in page.locator('.placement-guide').inner_text()
    print('Construction: separate Sky Tower fiefs, incomplete placement, and required market choices passed.', flush=True)


def mobile_board(page):
    original_width = page.locator('.board').bounding_box()['width']
    page.locator('#board-zoom').click()
    assert page.locator('.board').bounding_box()['width'] > original_width * 1.2
    page.locator('#board-zoom').click()
    page.set_viewport_size({'width': 390, 'height': 844})
    scenario(page, 'construction', [{'id': 'trading_post'}], {'A10': 0})
    assert page.locator('.board-large').count() == 1
    page.locator('.game-nav a[href="#turn-panel"]').click()
    page.locator('[data-building^=trading_post]').click()
    page.locator('.game-nav a[href="#map-panel"]').click()
    scroller = page.locator('.board-scroll')
    scroller.evaluate('(el)=>el.scrollLeft=el.scrollWidth')
    page.locator('[data-cell=A10]').click()
    assert scroller.evaluate('(el)=>el.scrollLeft') > 200
    assert page.locator('#board-confirm').is_enabled()
    page.screenshot(path='/tmp/bunny-polished-mobile.png', full_page=True)
    page.locator('#board-confirm').click()
    assert snapshot(page)['cells']['A10']['building']['category'] == 'farm'
    page.locator('#board-zoom').click()
    assert page.locator('.board-large').count() == 0
    assert scroller.evaluate('(el)=>el.scrollWidth <= el.clientWidth')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.reload()
    page.locator('#resume-game').click()
    assert page.locator('.board-large').count() == 0
    print('Mobile: board navigation, scrolling, placement, fit/enlarge, and saved view passed.', flush=True)


def scoring_review(page):
    # These awards are explicit test rulings, not claims about official tie rules.
    scenario(page, 'parchments', [{'id': 'matriarch'}, {'id': 'opportunist'}],
             {'A1': 0, 'A10': 1})
    assert page.locator('#finish-scoring').is_disabled()
    page.locator('[data-ruling^="matriarch:"]').select_option('0')
    page.locator('[data-ruling^="opportunist:"]').select_option('10')
    assert page.locator('.rulings-review li').count() == 2
    assert page.locator('#finish-scoring').is_enabled()
    page.locator('[data-reset-ruling^="matriarch:"]').click()
    assert page.locator('#finish-scoring').is_disabled()
    assert snapshot(page)['scoringDecisions']['rulings'] == {}
    page.locator('[data-ruling^="matriarch:"]').select_option('0')
    page.locator('[data-ruling^="opportunist:"]').select_option('0')
    page.locator('#finish-scoring').click()
    assert page.locator('.rulings-review li').count() == 2
    assert page.locator('[data-reset-ruling]').count() == 0
    page.reload()
    page.locator('#resume-game').click()
    assert page.locator('.rulings-review li').count() == 2
    assert all(p['score'] == 0 for p in snapshot(page)['players'])
    print('Scoring: ruling review, revision, dependent rank recalculation, and saved results passed.', flush=True)


def last_turn_controls(page, url):
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.goto(url)
    page.locator('[name=bots]').select_option('3')
    page.locator('[name=seed]').fill('1788624816571')
    page.locator('#setup button').click()
    panel = page.locator('#last-turn-panel')
    assert 'next confirmed pick' in panel.inner_text()
    page.locator('[data-card=territory_A7]').click()
    page.locator('[data-card=provisions_1]').click()
    page.locator('#confirm-draft').click()
    state = snapshot(page)
    assert state['lastTurn']['pick'] == 1
    assert page.locator('[data-turn-player]').count() == 4
    assert 'Played Provisions' in page.locator('[data-turn-player="0"]').inner_text()
    for p in state['players']:
        for c in p['parchments']:
            assert c['name'] not in panel.inner_text()
    bounds, board = panel.bounding_box(), page.locator('.board').bounding_box()
    assert bounds['x'] + bounds['width'] <= board['x']
    page.locator('[data-recent-cell=A7]').click()
    assert 'A7 · You' in page.locator('.inspector').inner_text()
    assert snapshot(page)['lastTurn'] == state['lastTurn']
    page.screenshot(path='/tmp/bunny-last-turn-desktop.png', full_page=True)
    page.reload()
    page.locator('#resume-game').click()
    assert snapshot(page)['lastTurn'] == state['lastTurn']
    page.locator('[data-card]').nth(0).click()
    page.locator('[data-card]').nth(1).click()
    page.locator('#confirm-draft').click()
    assert snapshot(page)['lastTurn']['pick'] == 2
    assert 'Round 1 · Pick 2' in panel.inner_text()
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path='/tmp/bunny-last-turn-mobile.png', full_page=True)
    page.evaluate("""()=>{
        const saved=JSON.parse(localStorage.getItem('bunny-kingdom-save-v1'));
        delete saved.game.lastTurn;
        localStorage.setItem('bunny-kingdom-save-v1',JSON.stringify(saved));
    }""")
    page.reload()
    page.locator('#resume-game').click()
    assert 'next confirmed pick' in panel.inner_text()
    print('Last turn: all players, Provisions, secrecy, map inspection, replacement, saved and older games passed.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8000')
    args = parser.parse_args()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        draft_controls(page, args.url)
        construction_controls(page)
        mobile_board(page)
        scoring_review(page)
        last_turn_controls(page, args.url)
        assert not errors, errors
        browser.close()
    print('All control checks passed.')
