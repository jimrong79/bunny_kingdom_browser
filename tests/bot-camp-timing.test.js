import test from 'node:test';
import assert from 'node:assert/strict';
import {skyGame,skyCard} from './sky-fixture.js';
import {publicView} from '../src/game.js';
import {beginCampOffers,respondCamp} from '../src/camps.js';
import {applyBuilding} from '../src/bot-planning.js';
import {campForecasts,applyTerritoryForecast,evaluateCampTiming} from '../src/bot-camp-timing.js';
import * as hard from '../src/bots-hard.js';
import * as normal from '../src/bots.js';
import {dealSize,cardsPerPick} from '../src/config.js';

function timingPosition() {
  const s=skyGame(3);s.round=3;s.phase='construction';
  // A1 can form a District at B1 now. C4/D4 could form a separate District later.
  // Leave only these possible Camp locations to isolate that decision.
  for(const c of Object.values(s.cells)){c.owner=1;c.building=null;c.baseResource=null;c.districtUsed=true;}
  for(const id of ['A1','J10']){s.cells[id].owner=0;s.cells[id].districtUsed=false;}
  s.cells.J10.building={category:'farm',farmType:'luxury',resource:'gold'};
  for(const id of ['B1','C4','D4']){s.cells[id].owner=null;s.cells[id].districtUsed=false;}
  s.players[0].buildings=[skyCard('camp_1')];
  s.players[0].parchments=['merchants_signet','treasure_hunter'].map(skyCard);
  beginCampOffers(s);return s;
}

test('a naturally arriving District can make retaining the Camp more valuable',()=>{
  const s=timingPosition(),view=publicView(s,0),before=structuredClone(view);
  const forecasts=[[[['B1','C4'],[],[]]]];
  const result=evaluateCampTiming(view,0,'camp_1_1',{forecasts});
  assert.equal(result.normalCoordinate,'B1');assert.equal(result.coordinate,null);
  assert.deepEqual(view,before);
  const future=applyTerritoryForecast(view,0,forecasts[0]);
  assert.equal(future.players[0].coins,1);
  const later=applyBuilding(future,0,{cardId:'camp_1_1',coordinates:['D4']});
  assert.equal(later.players[0].coins,2);
});

test('securing a Coin now can beat waiting when a rival will occupy the location',()=>{
  const view=publicView(timingPosition(),0);
  const result=evaluateCampTiming(view,0,'camp_1_1',{forecasts:[[[[],['B1'],[]]]]});
  assert.equal(result.coordinate,'B1');
});

test('capturing or reclaiming a Camp cannot award the same District again in a forecast',()=>{
  const view=publicView(timingPosition(),0),before=structuredClone(view);
  const placed=applyBuilding(view,0,{cardId:'camp_1_1',coordinates:['B1']});
  assert.equal(placed.players[0].coins,1);
  const reclaimed=applyTerritoryForecast(placed,0,[[['B1'],[],[]]]);
  assert.equal(reclaimed.players[0].coins,1);assert.equal(reclaimed.cells.B1.building,null);
  const captured=applyTerritoryForecast(placed,0,[[[],['B1'],[]]]);
  assert.equal(captured.players[0].coins,1);assert.equal(captured.players[1].coins,0);
  assert.ok(captured.cells.B1.districtUsed);assert.deepEqual(view,before);
});

test('a hypothetical simultaneous pick does not award intermediate District Coins',()=>{
  const s=timingPosition();
  // A1 and D1 are separate singletons; B1 + C1 joins both in one pick.
  s.cells.D1.owner=0;s.cells.D1.districtUsed=false;
  s.cells.C1.owner=null;s.cells.C1.districtUsed=false;
  const future=applyTerritoryForecast(publicView(s,0),0,[[['B1','C1'],[],[]]]);
  assert.equal(future.players[0].coins,1);
});

test('final-round Camp decisions retain Normal including two-Camp bridges',()=>{
  const s=skyGame(3);s.round=4;s.phase='construction';
  for(const c of Object.values(s.cells))c.owner=1;
  for(const id of ['I1','I4'])s.cells[id].owner=0;
  for(const id of ['I2','I3'])s.cells[id].owner=null;
  s.players[0].buildings=['camp_1','camp_2'].map(skyCard);beginCampOffers(s);
  for(const id of ['camp_1_1','camp_2_1']) {
    const view=publicView(s,0),choice=hard.chooseCamp(view,0,id);
    assert.equal(choice,normal.chooseCamp(view,0,id));assert.ok(['I2','I3'].includes(choice));
    respondCamp(s,0,choice);
  }
});

test('multiple own Camp offers preserve Normal joint placement and priority reasoning',()=>{
  const s=timingPosition();s.players[0].buildings.push(skyCard('camp_3'));
  s.players[1].buildings=[skyCard('camp_2')];s.phase='construction';beginCampOffers(s);
  const view=publicView(s,0),result=evaluateCampTiming(view,0,'camp_1_1');
  assert.equal(result.reason,'normal');assert.equal(result.coordinate,normal.chooseCamp(view,0,'camp_1_1'));
});

test('forecasts obey pick capacity, never duplicate cards, and exclude observed discards',()=>{
  const s=skyGame(2);s.round=2;s.phase='construction';
  s.players[0].draftMemory=[{round:1,pick:1,cards:['territory_B1']}];
  s.players[0].discarded=[{category:'territory',coordinate:'C1'}];
  const view=publicView(s,0);
  for(const batches of campForecasts(view,0,12)) {
    const ids=batches.flat(2);assert.equal(new Set(ids).size,ids.length);
    assert.ok(!ids.includes('B1'));assert.ok(!ids.includes('C1'));
    for(const batch of batches)for(const picks of batch)assert.ok(picks.length<=cardsPerPick(view));
    for(const p of view.players)assert.ok(batches.flatMap(batch=>batch[p.id]).length<=dealSize(view));
  }
});

test('Hard never uses the actual seed, hidden cards, or another player’s draft memory',()=>{
  const s=timingPosition(),view=publicView(s,0),before=structuredClone(view);
  const expected=hard.chooseCamp(view,0,'camp_1_1'),worlds=campForecasts(view,0);
  assert.deepEqual(view,before);
  s.seed='a completely different hidden deal';s.deck.reverse();
  for(const p of s.players.filter(p=>p.id!==0)) {
    p.hand.reverse();p.reserve.reverse();p.parchments=[skyCard('royal_carrot')];
    p.draftMemory=[{round:2,pick:1,cards:['territory_B1','territory_D4']}];
  }
  const other=publicView(s,0);
  assert.deepEqual(campForecasts(other,0),worlds);
  assert.equal(hard.chooseCamp(other,0,'camp_1_1'),expected);
});

test('the candidate reuses all other Normal decisions unchanged',()=>{
  for(const method of ['chooseDraft','chooseBuilding','chooseRainbowMoves','chooseMarkets','chooseChimneys','chooseCopies'])assert.equal(hard[method],normal[method]);
});
