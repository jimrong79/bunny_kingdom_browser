"""Check construction undo through the UI, using explicit synthetic positions."""
import argparse
from playwright.sync_api import sync_playwright


def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('bunny-kingdom-save-v1'))")


def position(page, url, scenario):
    page.goto(url)
    page.locator('#setup').wait_for()
    page.evaluate("""async ({url,scenario})=>{
      const load=path=>fetch(new URL(path,url)).then(r=>r.json());
      const [map,buildings,parchments,cloud,expansion]=await Promise.all(['data/maps/original-board.json','data/cards/base-buildings-and-provisions.json','data/cards/base-parchments.json','data/maps/great-cloud.json','data/cards/in-the-sky.json'].map(load));
      const {createGame,playCard}=await import(new URL('src/game.js',url));
      const {placeBuilding}=await import(new URL('src/construction.js',url));
      const {beginCampOffers,respondCamp}=await import(new URL('src/camps.js',url));
      const state=createGame({map,buildings,parchments,cloud,expansion},2,'undo-browser-'+scenario,'',{expansion:scenario==='base'?'base':'in_the_sky'});
      // Keep all physical cards while arranging this focused test position.
      for(const p of state.players){state.deck.push(...p.hand,...p.reserve);p.hand=[];p.reserve=[];}
      state.phase='construction';state.botDifficulty='easy';
      const give=(id,pid=0)=>{const index=state.deck.findIndex(c=>c.id===id);if(index<0)throw Error(id);const [card]=state.deck.splice(index,1);playCard(state,pid,card);return card.instanceId;};
      const claim=(id,pid=0)=>give('territory_'+id,pid);
      if(scenario==='camp'){
        claim('A3');claim('A1',1);claim('B1',1);claim('J9',2);
        give('camp_1',1);give('camp_3');give('camp_6',2);give('city_3',1);
        beginCampOffers(state);respondCamp(state,1,'J1');
      }else{
        for(const id of scenario==='base'?['A1','A2','B1']:['A1','J10','C5-2','B2'])claim(id);
        placeBuilding(state,0,give('city_3'),[scenario==='base'?'B1':'B2']);state.round=2;
        if(scenario==='base'){give('city_1');give('farm_fish');}
        if(scenario==='resources'){
          claim('C1-2');claim('C1-3');claim('A8',1);claim('B8',1);
          placeBuilding(state,0,give('trading_post'),['C1-2']);
          placeBuilding(state,0,give('chimney'),['C1-3']);
          placeBuilding(state,1,give('trading_post',1),['A8']);
          placeBuilding(state,1,give('city_1',1),['B8']);
        }
        for(const p of state.players)if(p.bot)p.ready=true;
      }
      const ui={animationsEnabled:false,selected:[],targets:[],buildingId:scenario==='camp'?state.campQueue[0].cardId:null};
      localStorage.setItem('bunny-kingdom-save-v1',JSON.stringify({format:1,savedAt:new Date().toISOString(),game:state,ui}));
    }""", {'url': url, 'scenario': scenario})
    page.reload();page.locator('#resume-game').click()
    assert page.locator('#undo-building').is_disabled()


def place(page, prefix, coordinate):
    page.locator(f'[data-building^="{prefix}"]').first.click()
    page.locator(f'[data-cell="{coordinate}"]').click()
    page.locator('#place-building').click()
    assert not page.locator('.error').count()


def run(browser, url):
    page=browser.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce')
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    position(page,url,'base');original=saved(page)['game']
    place(page,'city_1','A1');page.locator('#undo-building').click()
    assert saved(page)['game']==original
    place(page,'city_1','A2');city=saved(page)['game']
    place(page,'farm_fish','A1')
    page.reload();page.locator('#resume-game').click()
    assert page.locator('#undo-building').is_enabled()
    page.locator('#undo-building').click();assert saved(page)['game']==city
    page.locator('#undo-building').click();assert saved(page)['game']==original
    assert page.locator('#undo-building').is_disabled()
    place(page,'city_1','A1')
    page.set_viewport_size({'width':390,'height':844})
    page.locator('#undo-building').scroll_into_view_if_needed()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path='/tmp/bunny-undo-mobile.png')
    page.locator('#finish-building').click()
    assert saved(page)['ui']['constructionUndo']==[]
    assert len(saved(page)['ui']['constructionReturn']['undo'])==1
    assert page.locator('#undo-building').count()==0
    page.reload();page.locator('#resume-game').click()
    assert page.locator('#undo-building').count()==0
    page.locator('#back-to-building').click()
    assert page.locator('#undo-building').is_enabled()
    page.locator('#undo-building').click();assert saved(page)['game']==original
    place(page,'city_1','A1')
    page.locator('#finish-building').click()
    page.locator('#confirm-markets').click();page.locator('#next-round').click()
    assert saved(page)['game']['round']==3
    assert saved(page)['game']['cells']['A1']['building']['cardId']=='city_1'
    assert saved(page)['game']['cells']['B1']['building']['cardId']=='city_3'
    assert saved(page)['ui']['constructionUndo']==[]
    assert saved(page)['ui']['constructionReturn'] is None
    assert page.locator('#back-to-building').count()==0
    print('Base: repeated undo, reload, mobile return to building, harvest lock and previous-round buildings passed',flush=True)

    page.set_viewport_size({'width':1440,'height':900})
    position(page,url,'rainbow');original=saved(page)['game']
    place(page,'territory_C5-2','A1');linked=saved(page)['game']
    assert linked['players'][0]['coins']==original['players'][0]['coins']+1
    page.locator('[data-move-rainbow="rainbow_1"]').click()
    page.locator('[data-cell="J10"]').click();page.locator('#place-building').click()
    page.locator('#undo-building').click();assert saved(page)['game']==linked
    page.locator('#undo-building').click();assert saved(page)['game']==original
    assert page.locator('[data-building="territory_C5-2"]').count()==1
    assert page.locator('[data-cell="C5-2"] .piece').count()==1
    print('Rainbow: move undo, placement undo, Coin/history reset and retained cloud endpoint passed',flush=True)

    position(page,url,'camp');original=saved(page)['game']
    page.locator('[data-cell="A2"]').click();page.locator('#place-building').click()
    after=saved(page)['game']
    assert after['phase']=='construction'
    assert after['players'][0]['coins']==original['players'][0]['coins']+1
    assert after['cells']['B1']['building']['cardId']=='city_3'
    assert 'bot responses' in page.locator('.construction-undo').inner_text()
    page.locator('#finish-building').click();page.locator('#back-to-building').click()
    assert saved(page)['game']==after
    page.reload();page.locator('#resume-game').click()
    page.locator('#undo-building').click();assert saved(page)['game']==original
    assert saved(page)['game']['campQueue'][0]['priority']==3
    page.locator('[data-cell="A2"]').click();page.locator('#place-building').click()
    assert saved(page)['game']==after
    page.locator('#undo-building').click()
    page.locator('#save-camp').click();page.locator('#undo-building').click()
    assert saved(page)['game']==original
    assert not errors,errors
    print('Camps: bot construction rollback, priority, reload, deterministic redo, saved offers and no repeated Coins passed',flush=True)

    position(page,url,'resources');original=saved(page)['game']
    place(page,'territory_C5-2','A1');before_done=saved(page)['game']
    for _ in range(2):
        page.locator('#finish-building').click()
        assert saved(page)['game']['cells']['A8']['building']['choice'] is not None
        page.locator('[data-market="C1-2"]').select_option('fish')
        page.locator('[data-chimney="C1-3"]').select_option('fish')
        page.reload();page.locator('#resume-game').click()
        assert page.locator('#confirm-markets').is_enabled()
        page.locator('#back-to-building').click()
        assert saved(page)['game']==before_done
    page.locator('#undo-building').click();assert saved(page)['game']==original
    assert saved(page)['game']['cells']['C1-2']['building']['choice'] is None
    assert saved(page)['game']['cells']['C1-3']['building']['choice'] is None
    print('Resources: human and bot choices restored, repeat returns, resume, Rainbow undo and Coins passed',flush=True)

    position(page,url,'base');place(page,'city_1','A1')
    page.locator('#finish-building').click()
    page.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('bunny-kingdom-save-v1'));delete s.ui.constructionReturn;localStorage.setItem('bunny-kingdom-save-v1',JSON.stringify(s));}""")
    page.reload();page.locator('#resume-game').click();page.locator('#back-to-building').click()
    assert page.locator('#undo-building').is_disabled()
    place(page,'farm_fish','A2');page.locator('#undo-building').click()
    assert saved(page)['game']['cells']['A1']['building']['cardId']=='city_1'
    assert saved(page)['game']['cells']['A2']['building'] is None
    print('Older resource-stage save: return, retained placements and undo for new actions passed',flush=True)

    page.emulate_media(reduced_motion='no-preference')
    position(page,url,'base');original=saved(page)['game']
    page.locator('#toggle-animation').click()
    place(page,'city_1','A1')
    page.locator('#turn-animation').wait_for(state='visible')
    page.reload();page.locator('#resume-game').click()
    page.locator('#undo-building').click()
    assert saved(page)['game']==original
    assert page.locator('#turn-animation').count()==0
    assert not errors,errors
    print('Animation: undo survives refresh during placement playback and restores immediately passed',flush=True)
    page.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',default='http://127.0.0.1:8000/')
    args=parser.parse_args()
    with sync_playwright() as p:
        browser=p.chromium.launch()
        run(browser,args.url)
        browser.close()
