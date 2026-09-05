import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,resolveDraft} from '../src/game.js';
import {animationEvents} from '../src/turn-animation.js';
import {data} from './fixtures.js';

test('animation covers all public draft effects without revealing secret cards',()=>{
  const state=createGame(data,3,'1788624816571'),before=structuredClone(state);
  const choices=state.players.map(p=>({play:p.hand.slice(0,2).map(c=>c.instanceId),discard:[]}));
  resolveDraft(state,choices);
  const unchanged=structuredClone(state),events=animationEvents(before,state,data.buildings.cards);
  assert.equal(events.length,state.lastTurn.players.flatMap(p=>p.actions).length);
  assert.deepEqual(new Set(events.map(e=>e.playerId)),new Set([0,1,2,3]));
  for(const player of state.players)for(const card of player.parchments) {
    assert.ok(!JSON.stringify(events).includes(card.name));assert.ok(!JSON.stringify(events).includes(card.instanceId));
  }
  assert.deepEqual(state,unchanged);
});

test('construction animates Camp priority and both Sky endpoints while removing one tray card',()=>{
  const before=createGame(data,2,'placements'),after=structuredClone(before);
  for(const [coordinate,owner,building] of [
    ['J1',1,{category:'camp',priority:1,instanceId:'camp_1_1',cardId:'camp_1'}],
    ['A1',0,{category:'camp',priority:6,instanceId:'camp_6_1',cardId:'camp_6'}],
    ['A2',0,{category:'sky_tower',instanceId:'sky_tower_1',pairId:'sky_tower_1',cardId:'sky_tower'}],
    ['G7',0,{category:'sky_tower',instanceId:'sky_tower_1',pairId:'sky_tower_1',cardId:'sky_tower'}],
  ])Object.assign(after.cells[coordinate],{owner,building});
  const events=animationEvents(before,after,data.buildings.cards);
  assert.deepEqual(events.slice(0,2).map(e=>e.coordinate),['J1','A1']);
  const towers=events.filter(e=>e.building.category==='sky_tower');
  assert.equal(towers.length,2);assert.equal(towers.filter(e=>e.removeFromTray).length,1);
  assert.equal(events.filter(e=>e.type==='claim').length,0);
});

test('saved turns and changes to Trading Post choices never replay draft or placement',()=>{
  const state=createGame(data,1,'no-replay');
  resolveDraft(state,state.players.map(p=>({play:[p.hand[0].instanceId],discard:[p.hand[1].instanceId]})));
  state.cells.A1.building={category:'farm',farmType:'trading_post',instanceId:'trading_post_1',choice:null};
  const before=structuredClone(state);
  state.cells.A1.building.choice='fish';state.phase='markets';
  assert.deepEqual(animationEvents(before,state,data.buildings.cards),[]);
});
