import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from './fixtures.js';
import {skyGame,skyCard} from './sky-fixture.js';
import {createGame,publicView} from '../src/game.js';
import {chooseCamp,chooseBuilding} from '../src/bots.js';
import {beginCampOffers,respondCamp} from '../src/camps.js';
import {placeBuilding} from '../src/construction.js';
import {fiefs} from '../src/fiefs.js';
import {playerStats} from '../src/scoring.js';

const harvest=(s,pid)=>fiefs(s,pid).reduce((sum,f)=>sum+f.points,0);
function dukePosition() {
  // Reduced public position from round 2 of seed 1788902885852.
  const s=skyGame(5);s.round=2;s.phase='construction';
  for(const id of ['C6','C10','E1','E2','F3','C2-4','C5-3'])s.cells[id].owner=3;
  s.cells.E1.building={category:'city',strength:1};
  for(const id of ['E3','F4','G3','C7','D6','C3-4','C4-2'])s.cells[id].owner=0;
  s.players[3].buildings=['farm_gold','city_3','camp_4','camp_5'].map(skyCard);
  beginCampOffers(s);return s;
}
function finishBuildings(s,pid) {
  let move,count=0;
  while(move=chooseBuilding(publicView(s,pid),pid)) {
    assert.ok(++count<10);
    placeBuilding(s,pid,move.cardId,move.coordinates);
  }
}
function bridgePosition() {
  const s=createGame(data,2,'camp-bridge');s.round=4;s.phase='construction';
  // Two empty plains separate a printed City from fish. Either Camp alone
  // adds no points, but I2 + I3 connects them for the final Harvest.
  for(const c of Object.values(s.cells))c.owner=1;
  for(const id of ['I1','I4'])s.cells[id].owner=0;
  for(const id of ['I2','I3'])s.cells[id].owner=null;
  return s;
}

test('Duke combines Camps with his reserved City 3 and Gold Farm',()=>{
  const s=dukePosition(),before=structuredClone(s),view=publicView(s,3);
  const first=chooseCamp(view,3,'camp_4_1');
  assert.deepEqual(s,before);assert.deepEqual(view,publicView(s,3));
  assert.ok(['C5','C4-3'].includes(first));respondCamp(s,3,first);
  const second=chooseCamp(publicView(s,3),3,'camp_5_1');respondCamp(s,3,second);
  assert.deepEqual(new Set([first,second]),new Set(['C5','C4-3']));
  finishBuildings(s,3);
  assert.equal(s.cells.C6.building.strength,3);assert.equal(s.cells.F3.building.resource,'gold');
  assert.equal(harvest(s,3),4);assert.equal(s.players[3].coins,2);
  assert.equal(playerStats(s,3).metrics.trade_score,2);
});

test('a saved game after the original C4-3 Camp now uses C5 instead of D10',()=>{
  const s=dukePosition();respondCamp(s,3,'C4-3');
  const coordinate=chooseCamp(publicView(s,3),3,'camp_5_1');
  assert.equal(coordinate,'C5');respondCamp(s,3,coordinate);finishBuildings(s,3);
  assert.equal(harvest(s,3),4);
});

test('successive Camps can bridge a two-territory gap even when neither alone scores',()=>{
  const s=bridgePosition();s.players[0].buildings=['camp_1','camp_2'].map(skyCard);beginCampOffers(s);
  const first=chooseCamp(publicView(s,0),0,'camp_1_1');assert.ok(['I2','I3'].includes(first));
  respondCamp(s,0,first);assert.equal(harvest(s,0),0);
  const second=chooseCamp(publicView(s,0),0,'camp_2_1');assert.notEqual(second,first);
  respondCamp(s,0,second);assert.equal(harvest(s,0),1);
});

test('a rival offer interrupts Camp lookahead and later choices use the changed board',()=>{
  const s=bridgePosition();s.players[0].buildings=['camp_1','camp_3'].map(skyCard);
  s.players[1].buildings=[skyCard('camp_2')];beginCampOffers(s);
  assert.equal(chooseCamp(publicView(s,0),0,'camp_1_1'),null);respondCamp(s,0);
  respondCamp(s,1,'I2');
  assert.equal(chooseCamp(publicView(s,0),0,'camp_3_1'),null);
});

test('saving a Camp does not let a later offer reuse it during the same search',()=>{
  const s=bridgePosition();s.players[0].buildings=['camp_1','camp_2'].map(skyCard);beginCampOffers(s);
  respondCamp(s,0); // The earlier Camp stays in inventory but is no longer offered.
  assert.equal(chooseCamp(publicView(s,0),0,'camp_2_1'),null);
});

test('Camp planning does not promise a city on a slot occupied by the Camp itself',()=>{
  const s=createGame(data,2,'camp-slot');s.round=4;s.phase='construction';
  for(const c of Object.values(s.cells))c.owner=1;
  s.cells.A1.owner=0;s.cells.B1.owner=null;
  s.players[0].buildings=['camp_1','city_3'].map(skyCard);beginCampOffers(s);
  assert.equal(chooseCamp(publicView(s,0),0,'camp_1_1'),null);
});

test('Camp construction forecasts do not consult hidden cards, memory or deck order',()=>{
  const s=dukePosition();
  for(const p of s.players.filter(p=>p.id!==3))p.parchments=[skyCard('royal_carrot')];
  const expected=chooseCamp(publicView(s,3),3,'camp_4_1');
  s.seed='different hidden seed';s.deck.reverse();
  for(const p of s.players.filter(p=>p.id!==3)) {
    p.hand.reverse();p.reserve.reverse();p.parchments=[skyCard('carpenter')];
    p.draftMemory=[{round:2,pick:1,cards:['territory_C5']}];
  }
  assert.equal(chooseCamp(publicView(s,3),3,'camp_4_1'),expected);
});
