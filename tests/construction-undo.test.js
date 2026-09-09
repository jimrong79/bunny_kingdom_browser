import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from './fixtures.js';
import {skyGame} from './sky-fixture.js';
import {createGame,playCard,publicView} from '../src/game.js';
import {placeBuilding,moveRainbow,finishConstruction,eligibleTerritories} from '../src/construction.js';
import {beginCampOffers,requestCamp,respondCamp} from '../src/camps.js';
import {constructionAction,canUndoConstruction,undoConstruction} from '../src/construction-undo.js';
import {saveGame,loadGame,validSave} from '../src/storage.js';

function setup(sky=false) {
  const state=sky?skyGame():createGame(data,2,'undo');
  state.phase='construction';return state;
}
function give(state,id,playerId=0) {
  for(const pile of [state.deck,...state.players.flatMap(p=>[p.hand,p.reserve])]) {
    const index=pile.findIndex(c=>c.id===id);
    if(index<0)continue;
    const [card]=pile.splice(index,1);playCard(state,playerId,card);return card.instanceId;
  }
  throw Error('Missing fixture card '+id);
}
const claim=(state,id,playerId=0)=>give(state,'territory_'+id,playerId);
const place=(state,id,coordinates)=>constructionAction(state,0,'Place '+id,()=>placeBuilding(state,0,id,coordinates));

test('undo returns each ordinary and expansion building to its tray without losing its card or territory',()=>{
  for(const id of ['city_1','city_2','city_3','farm_fish','farm_carrots','farm_wood','trading_post','farm_pearl','carrotadel','chimney','farm_luxury_cloud','farm_luxury_plains']) {
    const state=setup(true),cardId=give(state,id),card=state.players[0].buildings.find(c=>c.instanceId===cardId);
    const trial=structuredClone(state);Object.values(trial.cells).forEach(c=>c.owner=0);
    const coordinate=eligibleTerritories(trial,0,card)[0];assert.ok(coordinate,id);claim(state,coordinate);
    const before=structuredClone(state),entry=place(state,cardId,[coordinate]);
    assert.equal(state.cells[coordinate].building.instanceId,cardId);
    assert.ok(canUndoConstruction(state,0,entry));undoConstruction(state,0,entry);
    assert.deepEqual(state,before,id);assert.ok(validSave(state),id);
  }
});

test('undo works in reverse order, keeps older buildings, and cannot be applied twice',()=>{
  const state=setup();claim(state,'A1');claim(state,'A2');claim(state,'B1');
  const old=give(state,'city_3');placeBuilding(state,0,old,['B1']);state.round=2;
  const city=give(state,'city_1'),farm=give(state,'farm_wood'),before=structuredClone(state);
  const first=place(state,city,['A1']),second=place(state,farm,['A2']);
  const both=structuredClone(state);assert.throws(()=>undoConstruction(state,0,first));assert.deepEqual(state,both);
  undoConstruction(state,0,second);undoConstruction(state,0,first);
  assert.deepEqual(state,before);assert.equal(state.cells.B1.building.instanceId,old);
  assert.throws(()=>undoConstruction(state,0,first));assert.deepEqual(state,before);
});

test('undo removes both Sky Tower endpoints and their Coin, retaining earlier District history',()=>{
  const state=setup(true);for(const id of ['B1','B2','J5','J6'])claim(state,id);
  const card=give(state,'sky_tower'),before=structuredClone(state),coins=state.players[0].coins;
  const entry=place(state,card,['B1','B2']);
  assert.equal(state.players[0].coins,coins+1);assert.equal(state.cells.B1.districtUsed,true);
  undoConstruction(state,0,entry);assert.deepEqual(state,before);
  assert.equal(state.cells.J5.districtUsed,true);assert.equal(state.cells.B1.districtUsed,undefined);
  const again=place(state,card,['B1','B2']);assert.equal(state.players[0].coins,coins+1);
  undoConstruction(state,0,again);assert.deepEqual(state,before);
});

test('Rainbow undo restores links, new District marks and Coins without removing the claimed cloud',()=>{
  const state=setup(true);for(const id of ['C5-2','A1','J10'])claim(state,id);
  const before=structuredClone(state),first=place(state,'territory_C5-2',['A1']);
  assert.equal(state.players[0].coins,before.players[0].coins+1);
  const linked=structuredClone(state),moved=constructionAction(state,0,'Move Rainbow',()=>moveRainbow(state,0,'rainbow_1','J10'));
  assert.equal(state.cells.J10.districtUsed,true);
  undoConstruction(state,0,moved);assert.deepEqual(state,linked);
  undoConstruction(state,0,first);assert.deepEqual(state,before);
  assert.equal(state.cells['C5-2'].owner,0);assert.equal(state.cells['C5-2'].building.endpoint,'cloud');
  place(state,'territory_C5-2',['J10']);assert.equal(state.players[0].coins,before.players[0].coins+1);
});

test('a Rainbow from an earlier round can undo its current move but not its original placement',()=>{
  const state=setup(true);for(const id of ['C5-2','A1','J10'])claim(state,id);
  const previous=place(state,'territory_C5-2',['A1']);state.round=2;
  const before=structuredClone(state),move=constructionAction(state,0,'Move old Rainbow',()=>moveRainbow(state,0,'rainbow_1','J10'));
  undoConstruction(state,0,move);assert.deepEqual(state,before);
  assert.throws(()=>undoConstruction(state,0,previous));assert.deepEqual(state,before);
});

test('Camp undo rewinds later bot Camps, buildings, readiness and District rewards, retaining earlier priority actions',()=>{
  const state=setup(true);claim(state,'A2');claim(state,'J9',2);claim(state,'B1',1);
  give(state,'camp_1',1);give(state,'camp_3');give(state,'camp_6',2);const city=give(state,'city_3',1);
  beginCampOffers(state);respondCamp(state,1,'J1');
  const before=structuredClone(state);
  const action=()=>{respondCamp(state,0,'A1');respondCamp(state,2,'J10');placeBuilding(state,1,city,['B1']);finishConstruction(state,1);finishConstruction(state,2);};
  const entry=constructionAction(state,0,'Place Camp 3',action),after=structuredClone(state);
  assert.equal(entry.botResponses,true);assert.equal(state.phase,'construction');assert.equal(state.players[0].coins,1);
  undoConstruction(state,0,entry);assert.deepEqual(state,before);
  assert.equal(state.cells.J1.owner,1);assert.deepEqual(state.campQueue.map(c=>c.priority),[3,6]);
  constructionAction(state,0,'Place Camp 3 again',action);assert.deepEqual(state,after);
});

test('saved Camp announcements and declined offers are reversible without bypassing priority',()=>{
  const state=setup();give(state,'camp_4');give(state,'camp_2',1);
  const before=structuredClone(state);
  const announced=constructionAction(state,0,'Announce Camp 4',()=>{requestCamp(state,0,state.players[0].buildings[0].instanceId);respondCamp(state,1,'A1');});
  const offered=structuredClone(state),saved=constructionAction(state,0,'Save Camp 4',()=>respondCamp(state,0));
  undoConstruction(state,0,saved);assert.deepEqual(state,offered);
  undoConstruction(state,0,announced);assert.deepEqual(state,before);
});

test('Done building, other phases, another round, another game and another player all reject undo without mutation',()=>{
  const original=setup();claim(original,'A1');const card=give(original,'city_1'),entry=place(original,card,['A1']);
  const changes=[s=>finishConstruction(s,0),...['draft','markets','harvest','parchments','finished'].map(phase=>s=>s.phase=phase),s=>s.round++,s=>s.seed='other-game'];
  for(const change of changes) {
    const state=structuredClone(original);change(state);const before=structuredClone(state);
    assert.equal(canUndoConstruction(state,0,entry),false);assert.throws(()=>undoConstruction(state,0,entry));assert.deepEqual(state,before);
  }
  assert.throws(()=>undoConstruction(original,1,entry));
  assert.throws(()=>undoConstruction(original,0,{...entry,version:99}));
});

test('undo journal survives save/load, contains no hidden cards and does not enter bot views',()=>{
  const state=setup(true);claim(state,'A1');const id=give(state,'city_1'),before=structuredClone(state),entry=place(state,id,['A1']);
  let raw;const storage={setItem:(key,value)=>raw=value,getItem:()=>raw};
  assert.ok(saveGame(state,{constructionUndo:[entry]},storage));
  const saved=loadGame(storage);assert.ok(saved);
  assert.ok(!('constructionUndo' in publicView(saved.game,1)));
  for(const p of entry.players)for(const side of [p.before,p.after])assert.deepEqual(Object.keys(side).sort(),['buildings','coinEvents','coins','ready']);
  assert.ok(!('deck' in entry));
  undoConstruction(saved.game,0,saved.ui.constructionUndo[0]);assert.deepEqual(saved.game,JSON.parse(JSON.stringify(before)));assert.ok(validSave(saved.game));
});

test('failed placements roll back construction changes and changed positions reject stale undo atomically',()=>{
  const state=setup();claim(state,'A1');claim(state,'A2');const id=give(state,'city_1'),before=structuredClone(state);
  assert.throws(()=>constructionAction(state,0,'Bad action',()=>{placeBuilding(state,0,id,['A1']);placeBuilding(state,0,id,['A2']);}));
  assert.deepEqual(state,before);
  assert.throws(()=>constructionAction(state,0,'Invalid phase transition',()=>{state.round++;state.extra=true;state.players[0].hand=[];}));
  assert.deepEqual(state,before);
  const entry=place(state,id,['A1']);state.cells.A1.owner=1;
  const changed=structuredClone(state);assert.throws(()=>undoConstruction(state,0,entry));assert.deepEqual(state,changed);
});
