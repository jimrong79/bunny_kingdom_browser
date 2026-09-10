"""Check readable expansion boards through monitor resizes, zoom and construction."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright


def resize(page, width, height):
    page.set_viewport_size({'width': width, 'height': height})
    # Allow layout and the connection ResizeObserver to finish, without a reload.
    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')


def check_boards(page, min_cell=0, enlarged=False):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    sizes = page.evaluate('''() => {
      const box=s=>document.querySelector(s).getBoundingClientRect();
      const ground=box('.new-world-region .cell'),cloud=box('.cloud-board .cell');
      const scroll=document.querySelector('.board-scroll'),view=scroll.getBoundingClientRect();
      const boards=[box('.new-world-region .board'),box('.cloud-board')];
      return {ground:ground.width,cloud:cloud.width,square:Math.abs(cloud.width-cloud.height),
        contained:boards.every(b=>b.left>=view.left-1&&b.right<=view.right+1&&b.top>=view.top-1&&b.bottom<=view.bottom+1)};
    }''')
    assert abs(sizes['ground'] - sizes['cloud']) < 0.2, sizes
    assert sizes['square'] < 0.2, sizes
    assert sizes['ground'] >= min_cell, sizes
    if not enlarged:
        assert sizes['contained'], sizes
    return sizes['ground']


def draft(page, url, players, screenshots):
    resize(page, 1920, 945)
    page.goto(url)
    page.locator('[name=expansion]').select_option('in_the_sky')
    page.locator('[name=bots]').select_option(str(players - 1))
    page.locator('[name=seed]').fill('1789005077968')
    page.locator('#setup button').click()
    saved = page.evaluate("localStorage.getItem('bunny-kingdom-save-v1')")
    # Both screenshot window sizes, common laptops, and a very short window.
    for width, height, min_cell in [(2048,1145,55),(1920,945,42),(1440,813,32),
                                    (1366,681,32),(1024,768,26),(1920,945,42)]:
        resize(page, width, height)
        check_boards(page, min_cell)
        # Normal desktop windows keep both worlds and the hand in one view.
        if height >= 813:
            hand = page.locator('.hand-dock').bounding_box()
            assert hand['y'] + hand['height'] <= height + 1, hand
        assert page.locator('.expansion-player-strip').bounding_box()['height'] < 115
        assert page.evaluate("localStorage.getItem('bunny-kingdom-save-v1')") == saved
        if screenshots:
            page.screenshot(path=str(screenshots / f'boards-{players}p-{width}x{height}.png'), full_page=True)
    # Every card remains reachable and has its full preview despite the shorter hand.
    for card_id in page.locator('[data-card]').evaluate_all('(es)=>es.map(e=>e.dataset.card)'):
        card = page.locator(f'[data-card="{card_id}"]')
        card.hover()
        assert page.locator('#card-preview h3').inner_text() == card.locator('h3').inner_text()
        card.click()
        assert card.get_attribute('aria-pressed') == 'true'
        card.click()
    # At large sizes Enlarge must still enlarge; returning to Fit restores the scale.
    for width, height in [(2560,1440),(1920,945),(1024,768)]:
        resize(page, width, height)
        before = check_boards(page)
        page.locator('#board-zoom').click()
        assert check_boards(page, enlarged=True) > before
        page.locator('#board-zoom').click()
        assert abs(check_boards(page) - before) < 0.2
    # Narrow screens retain scroll access to both boards and the hand.
    resize(page, 390, 844)
    page.locator('#board-zoom').click()
    for coordinate in ['A1','J10','C1-1','C5-7']:
        cell = page.locator(f'[data-cell="{coordinate}"]')
        cell.click()
        assert page.locator('#inspection').count() or page.locator('.inspector').is_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.locator('.game-nav a[href="#hand-panel"]').click()
    page.locator('[data-card]').last.click()
    assert page.locator('[data-card]').last.get_attribute('aria-pressed') == 'true'
    print(f'{players} players: monitor resizing, matching territory sizes, previews, enlargement and mobile access passed.', flush=True)


def construction(page, url):
    resize(page, 1920, 945)
    page.goto(url)
    page.evaluate('''async()=>{
      const [{createGame,makeDeck,playCard},{placeBuilding},{saveGame}]=await Promise.all([
        import('./src/game.js'),import('./src/construction.js'),import('./src/storage.js')]);
      const paths=['maps/original-board','cards/base-buildings-and-provisions','cards/base-parchments','maps/great-cloud','cards/in-the-sky'];
      const [map,buildings,parchments,cloud,expansion]=await Promise.all(paths.map(p=>fetch('data/'+p+'.json').then(r=>r.json())));
      const data={map,buildings,parchments,cloud,expansion},s=createGame(data,4,'board-layout','',{expansion:'in_the_sky'});
      s.deck=makeDeck(data,true);s.players.forEach(p=>{p.hand=[];p.reserve=[]});
      for(const id of ['territory_C5-2','territory_C3-1','territory_C1-1','territory_A1','territory_A2','territory_A9','territory_B1','trading_post','city_3']){
        const i=s.deck.findIndex(c=>c.id===id);playCard(s,0,s.deck.splice(i,1)[0]);
      }
      for(const card of s.deck.filter(c=>c.category==='territory'&&c.printedResource?.startsWith('wondrous_'))){
        const i=s.deck.indexOf(card);playCard(s,0,s.deck.splice(i,1)[0]);
      }
      s.phase='construction';s.players.slice(1).forEach(p=>p.ready=true);
      placeBuilding(s,0,'territory_C5-2',['A2']);
      placeBuilding(s,0,'trading_post_1',['A9']);
      saveGame(s,{animationsEnabled:false,boardZoom:false,inspected:'A2'});
    }''')
    page.reload()
    page.locator('#resume-game').click()
    assert page.locator('.pending-production').is_visible()
    for width, height in [(1920,945),(1366,768),(2048,1145),(1920,945)]:
        page.mouse.move(0,0)
        resize(page, width, height)
        check_boards(page, 30)
        assert page.locator('[data-player="0"] [data-production]').count() > 10
        assert page.locator('[data-player="0"] .production-row').evaluate('(row)=>row.clientHeight>=row.firstElementChild.getBoundingClientRect().height')
        page.wait_for_function('''() => {
          const svg=document.querySelector('.connection-overlay'),line=svg.querySelector('line');
          if(!line)return false;
          const origin=svg.getBoundingClientRect();
          const endpoints=['A2','C5-2'].map(id=>{
            const r=document.querySelector(`[data-cell="${id}"]`).getBoundingClientRect();
            return [r.x+r.width/2-origin.x,r.y+r.height/2-origin.y];
          });
          return endpoints.every(([x,y])=>[1,2].some(i=>Math.abs(x-Number(line.getAttribute('x'+i)))<1&&Math.abs(y-Number(line.getAttribute('y'+i)))<1));
        }''')
    # Selecting a building adds placement controls above the board; it still fits.
    page.locator('[data-building="city_3_1"]').click()
    check_boards(page, 30)
    page.locator('[data-cell="B1"]').click()
    page.locator('#board-confirm').click()
    assert not page.locator('.error').count()
    page.locator('[data-pile="buildings"][data-pile-player="0"]').click()
    assert page.locator('#inventory-dialog').is_visible()
    page.locator('#inventory-dialog button').click()
    print('Construction controls, resource information, inventory and Rainbow lines after resizing passed.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8000')
    parser.add_argument('--screenshots', type=Path)
    args = parser.parse_args()
    if args.screenshots:
        args.screenshots.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for players in [3,5]:
            draft(page, args.url, players, args.screenshots)
        construction(page, args.url)
        assert not errors, errors
        browser.close()
