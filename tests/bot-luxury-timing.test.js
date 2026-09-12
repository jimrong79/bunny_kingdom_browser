import test from 'node:test';
import assert from 'node:assert/strict';
import {skyGame,skyCard} from './sky-fixture.js';
import {publicView} from '../src/game.js';
import {chooseBuilding,cardValue} from '../src/bots.js';
import {chooseBuilding as hardBuilding} from '../src/bots-hard.js';
import {idleBuildingValue} from '../src/bot-evaluation.js';
import {placeBuilding,eligibleTerritories} from '../src/construction.js';
import {playerStats} from '../src/scoring.js';

// Public board and the acting player's own cards at the reviewed R1 decision.
// No recorded hidden deck, opponent hand, or opponent parchment is required.
function reviewedPosition() {
  const s=skyGame(4,'luxury-regression');s.phase='construction';s.draftTurn=6;
  const land=[['H10','I1','I10','J6','C1-2','C1-4','C3-4','C4-3'],
    ['A3','B3','B6','G9','J2','C1-5'],['D10','E5','F3','G1','C2-4','C3-5','C4-5','C5-5'],
    ['C4','E1','E2','F7','G5','G7','I6']];
  for(const p of s.players) {
    p.hand=[];p.buildings=[];p.parchments=[];p.played=[];p.coins=[2,1,1,2][p.id];
    for(const id of land[p.id])s.cells[id].owner=p.id;
  }
  s.cells.A3.building={category:'camp',priority:5,instanceId:'camp_5_1'};
  s.cells.J2.building={category:'city',strength:2,instanceId:'city_2_1'};
  s.players[1].played=[skyCard('camp_5')];
  s.players[1].parchments=['royal_coat','colonist','nibblonacci','lewis_carrot'].map(skyCard);
  s.players[1].buildings=[skyCard('farm_diamond')];
  return s;
}

test('Normal and Hard save the reviewed isolated round-one Diamond without changing production',()=>{
  const s=reviewedPosition(),view=publicView(s,1),before=structuredClone(view);
  assert.deepEqual(eligibleTerritories(view,1,view.players[1].buildings[0]),['B6']);
  assert.equal(chooseBuilding(view,1),null);assert.equal(hardBuilding(view,1),null);
  assert.deepEqual(view,before);
  assert.deepEqual(playerStats(view,1).uniqueResources,['wondrous_star']);
  assert.equal(playerStats(view,1).metrics.trade_score,1);
});

test('more Coins do not manufacture a reason to lock an unproductive luxury early',()=>{
  for(const coins of [0,1,10,30]) {
    const s=reviewedPosition();s.players[1].coins=coins;
    assert.equal(chooseBuilding(publicView(s,1),1),null,`${coins} Coins`);
  }
});

test('a saved Diamond can take a better mountain next round and still places for harvests',()=>{
  const s=reviewedPosition();s.round=2;
  s.cells.A1.owner=1;s.cells.B1.owner=1;s.cells.A1.building={category:'city',strength:3};
  const move=chooseBuilding(publicView(s,1),1);
  assert.deepEqual(move,{cardId:'farm_diamond_1',coordinates:['B1']});
  placeBuilding(s,1,move.cardId,move.coordinates);
  assert.equal(s.cells.B6.building,null);
  assert.ok(playerStats(s,1).groups.find(f=>f.coordinates.includes('B1')).resources.includes('diamond'));
});

test('last construction uses an isolated luxury for Trade instead of saving it past game end',()=>{
  const s=reviewedPosition();s.round=4;
  assert.equal(idleBuildingValue(publicView(s,1),1,s.players[1].buildings[0]),0);
  const move=chooseBuilding(publicView(s,1),1);
  assert.deepEqual(move,{cardId:'farm_diamond_1',coordinates:['B6']});
  placeBuilding(s,1,move.cardId,move.coordinates);
  assert.equal(playerStats(s,1).metrics.trade_score,2);
});

test('construction can pair a city and Diamond to make the same-round placement productive',()=>{
  const s=reviewedPosition();s.cells.A6.owner=1;
  s.players[1].buildings.push(skyCard('city_2'));
  for(let count=0;count<2;count++) {
    const move=chooseBuilding(publicView(s,1),1);assert.ok(move);
    placeBuilding(s,1,move.cardId,move.coordinates);
  }
  const group=playerStats(s,1).groups.find(f=>f.resources.includes('diamond'));
  assert.ok(group?.strength>0);assert.ok(group.points>0);
});

test('Cloud and plains luxuries use the same waiting comparison and obey placement restrictions',()=>{
  for(const [cardId,coordinate] of [['farm_luxury_cloud','C1-3'],['farm_luxury_plains','B8']]) {
    const s=reviewedPosition();
    for(const c of Object.values(s.cells))if(c.owner===1)c.owner=null;
    s.cells[coordinate].owner=1;s.players[1].parchments=[];s.players[1].coins=5;
    const card=skyCard(cardId);s.players[1].buildings=[card];
    assert.equal(chooseBuilding(publicView(s,1),1),null,cardId);
    s.round=4;
    assert.deepEqual(chooseBuilding(publicView(s,1),1),{cardId:card.instanceId,coordinates:[coordinate]});
  }
});

test('unplaceable luxuries have no reserve Trade value, including known discarded terrain',()=>{
  for(const cardId of ['farm_diamond','farm_luxury_cloud','farm_luxury_plains']) {
    const s=reviewedPosition(),card=skyCard(cardId);s.players[1].buildings=[card];
    for(const c of Object.values(s.cells))c.owner=0;
    const view=publicView(s,1);
    assert.equal(idleBuildingValue(view,1,card),0);assert.equal(chooseBuilding(view,1),null);
  }
  const s=reviewedPosition();s.players=s.players.slice(0,2);
  s.cells.B6.owner=null;
  s.players[1].discarded=Object.values(s.cells).filter(c=>c.terrain==='mountain').map(c=>({category:'territory',coordinate:c.coordinate}));
  assert.equal(idleBuildingValue(publicView(s,1),1,s.players[1].buildings[0]),0);
});

test('waiting does not receive duplicate Trade credit and leaves base-game evaluation unchanged',()=>{
  const s=reviewedPosition(),card=s.players[1].buildings[0],view=publicView(s,1);
  const baseline=structuredClone(view);delete baseline.expansion;
  const original=idleBuildingValue(baseline,1,card);
  assert.ok(Math.abs(original-2.97)<1e-9);
  assert.ok(Math.abs(idleBuildingValue(view,1,card)-original-2.8)<1e-9);
  view.cells.J2.building={category:'farm',farmType:'luxury',resource:'diamond'};
  const duplicate=structuredClone(view);delete duplicate.expansion;
  assert.equal(idleBuildingValue(view,1,card),idleBuildingValue(duplicate,1,card));
});

test('luxury decisions and draft valuation cannot consult hidden information or mutate the view',()=>{
  const s=reviewedPosition(),view=publicView(s,1),card=s.players[1].buildings[0];
  const expected=chooseBuilding(view,1),value=cardValue(view,1,skyCard('farm_gold'));
  s.seed='unrelated';s.deck.reverse();
  for(const p of s.players.filter(p=>p.id!==1)) {
    p.hand=[skyCard('city_3')];p.parchments=[skyCard('merchant_queen')];p.draftMemory=[{cards:['territory_A6']}];
  }
  const changed=publicView(s,1),before=structuredClone(changed);
  for(const key of ['seed','deck'])Object.defineProperty(changed,key,{enumerable:false,get(){throw Error(`Read ${key}`);}});
  assert.deepEqual(chooseBuilding(changed,1),expected);
  assert.equal(cardValue(changed,1,skyCard('farm_gold')),value);
  // Check the unproxied view separately; public view remains unchanged by planning.
  const clean=publicView(s,1);idleBuildingValue(clean,1,card);
  assert.deepEqual(clean,before);
});
