"""Targeted human controls for cloud building restrictions, Rainbow moves and Chimneys."""
from playwright.sync_api import sync_playwright
from browser_smoke import snapshot

with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce')
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8000')
    page.evaluate('''async()=>{
      const [{createGame,makeDeck,playCard},{saveGame}]=await Promise.all([import('./src/game.js'),import('./src/storage.js')]);
      const paths=['maps/original-board','cards/base-buildings-and-provisions','cards/base-parchments','maps/great-cloud','cards/in-the-sky'];
      const [map,buildings,parchments,cloud,expansion]=await Promise.all(paths.map(p=>fetch('data/'+p+'.json').then(r=>r.json())));
      const data={map,buildings,parchments,cloud,expansion},s=createGame(data,2,'controls','',{expansion:'in_the_sky'});
      s.deck=makeDeck(data,true);s.players.forEach(p=>{p.hand=[];p.reserve=[];});
      for(const id of ['territory_C5-2','territory_C4-2','territory_C3-3','territory_C1-2','territory_A1','territory_A2','territory_A9','territory_J10','carrotadel','chimney','farm_luxury_cloud','farm_luxury_plains']){
       const i=s.deck.findIndex(c=>c.id===id);playCard(s,0,s.deck.splice(i,1)[0]);
      }
      s.phase='construction';s.players.slice(1).forEach(p=>p.ready=true);saveGame(s,{animationsEnabled:false});
    }''')
    page.reload();page.locator('#resume-game').click()
    def place(card,coordinate):
        page.locator(f'[data-building="{card}"]').click()
        page.locator(f'[data-cell="{coordinate}"]').click()
        assert page.locator('#place-building').is_enabled()
        page.locator('#place-building').click()
        assert not page.locator('.error').count(),page.locator('.error').all_text_contents()
    place('carrotadel_1','A1')
    place('chimney_1','C3-3')
    page.locator('[data-building="farm_luxury_cloud_1"]').click()
    assert page.locator('.cell.eligible').evaluate_all('(els)=>els.every(e=>e.dataset.cell.startsWith("C"))')
    place('farm_luxury_cloud_1','C1-2')
    page.locator('[data-building="farm_luxury_plains_1"]').click()
    assert page.locator('.cell.eligible').evaluate_all('(els)=>els.every(e=>e.classList.contains("plains"))')
    place('farm_luxury_plains_1','A9')
    place('territory_C5-2','J10')
    before=snapshot(page)['players'][0]['coins']
    page.locator('[data-move-rainbow="rainbow_1"]').click()
    page.locator('[data-cell="A2"]').click();page.locator('#place-building').click()
    state=snapshot(page)
    assert state['cells']['J10']['building'] is None
    assert state['cells']['A2']['building']['category']=='rainbow'
    assert state['players'][0]['coins']==before
    page.locator('[data-cell="A2"]').hover()
    assert page.locator('.cloud-board .fief-highlight').count()>0
    assert page.locator('.connection-overlay line').count()>0
    page.locator('#finish-building').click()
    select=page.locator('[data-chimney="C3-3"]')
    assert select.locator('option:not([disabled])').evaluate_all('(els)=>els.map(e=>e.value)')==['wood','fish']
    assert page.locator('#confirm-markets').is_disabled()
    select.select_option('fish')
    assert page.locator('#confirm-markets').is_enabled()
    page.locator('#confirm-markets').click()
    assert snapshot(page)['phase']=='harvest'
    assert snapshot(page)['lastHarvest'][0]['points']>0
    page.screenshot(path='/tmp/sky-controls-harvest.png',full_page=True)
    for width,height in [(1920,1080),(1440,900),(1366,768),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    browser.close()
print('Rainbow placement/movement, connected-fief inspection, farm restrictions, Carrotadel and Chimney controls passed.')
