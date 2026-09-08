import test from 'node:test';
import assert from 'node:assert/strict';
import {skyGame,skyCard} from './sky-fixture.js';
import {playCard,publicView} from '../src/game.js';
import {chooseBuilding,chooseRainbowMoves,cardValue,projectedValue} from '../src/bots.js';
import {placeBuilding,moveRainbow} from '../src/construction.js';
import {fiefs} from '../src/fiefs.js';
import {playerStats} from '../src/scoring.js';

const harvest=s=>fiefs(s,0).reduce((sum,f)=>sum+f.points,0);
function rainbowPosition(round=2) {
  const s=skyGame();s.phase='construction';s.round=round;
  s.cells['C4-5'].owner=0; // Printed strength-one City next to Rainbow 2.
  s.cells.B4.owner=0; // Fish with an empty building slot.
  playCard(s,0,skyCard('territory_C5-6'));
  return s;
}

test('place a movable Rainbow for an early harvest gain instead of hoarding it',()=>{
  // Reduced from Count Cloudtail's round-two missed B4 connection in seed 1788897911528.
  const s=rainbowPosition(),before=structuredClone(s),view=publicView(s,0);
  const action=chooseBuilding(view,0);
  assert.deepEqual(action,{cardId:'territory_C5-6',coordinates:['B4']});
  assert.deepEqual(s,before);assert.deepEqual(view,publicView(s,0));
  placeBuilding(s,0,action.cardId,action.coordinates);
  assert.equal(harvest(s)-harvest(before),1);
});

test('place a second Rainbow when creating a District earns useful Trade value',()=>{
  const s=skyGame();s.phase='construction';s.round=3;
  s.cells.A9.owner=0;s.cells['C1-1'].owner=0; // One Unique resource, elsewhere on the cloud.
  playCard(s,0,skyCard('territory_C5-2'));
  const before=harvest(s),action=chooseBuilding(publicView(s,0),0);
  assert.deepEqual(action,{cardId:'territory_C5-2',coordinates:['A9']});
  placeBuilding(s,0,action.cardId,action.coordinates);
  assert.equal(harvest(s),before);assert.equal(s.players[0].coins,1);
  assert.equal(playerStats(s,0).metrics.trade_score,1);
});

test('Rainbow use stays optional when connecting fiefs would lose parchment points',()=>{
  const s=skyGame();s.phase='construction';s.round=4;
  s.cells.A9.owner=0;playCard(s,0,skyCard('territory_C5-2'));
  s.players[0].parchments=[skyCard('colonist')];
  assert.equal(chooseBuilding(publicView(s,0),0),null);
});

test('a Rainbow remains connected next round and can move without earning another Coin',()=>{
  const s=rainbowPosition();placeBuilding(s,0,'territory_C5-6',['B4']);
  const firstHarvest=harvest(s);s.round=3;assert.equal(harvest(s),firstHarvest);
  s.cells.J9.owner=0;s.cells.J9.building={category:'city',strength:3};s.cells.J9.baseResource=null;
  s.cells.J10.owner=0;s.cells.J10.building=null;s.cells.J10.baseResource='wood';
  s.cells.J8.owner=0;s.cells.J8.building=null;s.cells.J8.baseResource='carrots';
  const before=structuredClone(s),view=publicView(s,0),moves=chooseRainbowMoves(view,0);
  assert.equal(moves.length,1);assert.ok(['J8','J10'].includes(moves[0].coordinate));
  assert.deepEqual(s,before);assert.deepEqual(view,publicView(s,0));
  for(const m of moves)moveRainbow(s,0,m.pairId,m.coordinate);
  assert.ok(harvest(s)>harvest(before));assert.equal(s.players[0].coins,before.players[0].coins);
});

test('drafting values the actual Rainbow connection without accessing hidden cards',()=>{
  const s=skyGame();s.round=2;s.cells['C4-5'].owner=0;s.cells.B4.owner=0;
  const card=skyCard('territory_C5-6'),view=publicView(s,0),before=structuredClone(view);
  const value=cardValue(view,0,card,projectedValue(view,0));
  assert.ok(value>=3);assert.deepEqual(view,before);
  s.deck.reverse();s.seed='different hidden seed';s.players[1].hand=[];s.players[1].parchments=[];
  assert.equal(cardValue(publicView(s,0),0,card),value);
});
