"""Verify that board inspection agrees with Chimney-adjusted harvests."""
import argparse
from playwright.sync_api import sync_playwright


def scenario(page, url, round_number):
    page.goto(url)
    page.evaluate('''async round => {
      const [{createGame,makeDeck,playCard},{placeBuilding},{chooseChimney,finishMarkets},{saveGame}]=await Promise.all([
        import('./src/game.js'),import('./src/construction.js'),import('./src/harvest.js'),import('./src/storage.js')]);
      const paths=['maps/original-board','cards/base-buildings-and-provisions','cards/base-parchments','maps/great-cloud','cards/in-the-sky'];
      const [map,buildings,parchments,cloud,expansion]=await Promise.all(paths.map(p=>fetch('data/'+p+'.json').then(r=>r.json())));
      const data={map,buildings,parchments,cloud,expansion},s=createGame(data,2,'chimney-inspection','',{expansion:'in_the_sky'});
      s.round=round;s.deck=makeDeck(data,true);s.players.forEach(p=>{p.hand=[];p.reserve=[]});
      for(const id of ['territory_C4-3','chimney','territory_A8','territory_B8','city_1','city_1',
                       'territory_G9','territory_H9','territory_I9','territory_I1','territory_C5-1','city_2']){
        const i=s.deck.findIndex(c=>c.id===id);playCard(s,1,s.deck.splice(i,1)[0]);
      }
      s.phase='construction';
      for(const [id,coordinate] of [['chimney_1','C4-3'],['city_1_1','A8'],['city_1_2','B8'],['city_2_1','C5-1']]){
        placeBuilding(s,1,id,[coordinate]);
      }
      s.phase='markets';chooseChimney(s,1,'C4-3','fish');
      for(const p of s.players)finishMarkets(s,p.id);
      saveGame(s,{animationsEnabled:false,boardZoom:false});
    }''', round_number)
    page.reload()
    page.locator('#resume-game').click()


def check_fief(page, coordinate, points, bonus, label):
    cell = page.locator(f'[data-cell="{coordinate}"]')
    cell.hover()
    readout = page.locator('#fief-readout').inner_text()
    assert label in readout and f'= {points} points' in readout, readout
    if bonus is None:
        assert 'Chimney:' not in readout, readout
    else:
        assert f'Chimney: Fish (+{bonus} points this harvest)' in readout, readout
    cell.click()
    inspector = page.locator('.inspector').inner_text()
    assert label in inspector and f'= {points} points' in inspector, inspector
    assert ('Chimney:' in inspector) == (bonus is not None), inspector
    cell.focus()
    assert f'= {points} points' in page.locator('#fief-readout').inner_text()


def run(page, url):
    scenario(page, url, 3)
    saved = page.evaluate("JSON.parse(localStorage.getItem('bunny-kingdom-save-v1')).game")
    assert saved['lastHarvest'][1]['points'] == 9
    for coordinate, points, bonus in [('A8',4,2),('G9',2,2),('I1',1,1),('C5-1',2,None)]:
        check_fief(page, coordinate, points, bonus, 'Round 3 harvest')
    # Shared Fish is not counted as extra physical production in the player panel.
    assert page.locator('[data-player="1"] [data-production="fish"] b').inner_text() == '1'
    page.reload()
    page.locator('#resume-game').click()
    check_fief(page, 'A8', 4, 2, 'Round 3 harvest')
    page.locator('#next-round').click()
    check_fief(page, 'A8', 2, None, 'Fief')
    check_fief(page, 'G9', 0, None, 'Fief')
    scenario(page, url, 4)
    page.locator('#next-round').click()
    check_fief(page, 'A8', 4, 2, 'Round 4 harvest')
    page.locator('#finish-scoring').click()
    page.locator('#review-board').click()
    check_fief(page, 'A8', 4, 2, 'Round 4 harvest')
    # Tap inspection remains useful on a phone after the final harvest.
    page.set_viewport_size({'width':390,'height':844})
    check_fief(page, 'A8', 4, 2, 'Round 4 harvest')
    print('Chimney hover, focus, click, production counts, resume, next round, final-board review and phone inspection passed.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8000/')
    args = parser.parse_args()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        run(page, args.url)
        assert not errors, errors
        browser.close()
