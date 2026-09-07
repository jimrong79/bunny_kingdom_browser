import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from './fixtures.js';
import {createGame,makeDeck,publicView} from '../src/game.js';
import {chooseDraft,projectedValue,draftPosition} from '../src/bots.js';
import {campExposure,passedCampPenalty} from '../src/bot-camp-defense.js';

const deck=makeDeck(data),card=id=>structuredClone(deck.find(c=>c.instanceId===id));
function position(players=3) {
  const state=createGame(data,players-1,'camp-defense');
  state.round=4;state.draftTurn=players===2?9:players===3?4:2;
  for(const p of state.players)Object.assign(p,{hand:[],reserve:[],buildings:[],parchments:[],played:[],discarded:[]});
  return state;
}
function bridge(players=3) {
  const state=position(players);
  for(const id of ['I1','J1','J2','J3','J4'])state.cells[id].owner=0;
  state.cells.J1.building={category:'city',strength:1};
  state.cells.J2.building={category:'camp',priority:2,instanceId:'camp_2_1'};
  state.cells.J4.building={category:'farm',farmType:'luxury',resource:'pearl'};
  state.players[0].hand=['territory_J2','sky_tower_1','royal_ring_1','royal_coat_1','royal_scepter_1','royal_carrot_1'].map(card);
  return state;
}
test('three and four players protect a J2 bridge on the last chance to claim it',()=>{
  for(const players of [3,4]) {
    const state=bridge(players);
    if(players===4)state.players[0].hand.push(card('left_glove_1'),card('territory_E9'));
    const view=publicView(state,0),before=structuredClone(view);
    assert.deepEqual(new Set(chooseDraft(view,0).play),new Set(['territory_J2','royal_carrot_1']));
    assert.deepEqual(view,before,'search must not mutate the permitted view');
  }
});
test('exposure follows hand circulation and distinguishes two-player discards',()=>{
  assert.equal(campExposure(position(3),12),.4);
  assert.equal(campExposure(position(3),6),1);
  assert.equal(campExposure(position(4),10),.75);
  assert.equal(campExposure(position(4),8),1);
  assert.equal(campExposure(position(2),11),.1);
  assert.equal(campExposure(position(2),3),.5);
  for(const players of [2,3,4])assert.equal(campExposure(position(players),2),0);
});
test('a returning hand can justify postponing camp protection for a better pair',()=>{
  const state=bridge();state.draftTurn=1;
  state.players[0].hand.push(...['E4','E5','E6','E7','E8','E9'].map(id=>card('territory_'+id)));
  assert.deepEqual(new Set(chooseDraft(publicView(state,0),0).play),new Set(['royal_carrot_1','royal_scepter_1']));
});
test('two-player bots can play a valuable card and discard the territory to save their camp',()=>{
  const state=bridge(2);
  state.players[0].hand=['territory_J2','royal_carrot_1','royal_scepter_1'].map(card);
  assert.deepEqual(chooseDraft(publicView(state,0),0),{play:['royal_carrot_1'],discard:['territory_J2']});
});
test('a worthless isolated camp does not displace better cards',()=>{
  const state=position();
  state.cells.J2.owner=0;state.cells.J2.building={category:'camp',priority:2};
  state.players[0].hand=['territory_J2','royal_carrot_1','royal_crown_1','royal_ring_1'].map(card);
  assert.deepEqual(new Set(chooseDraft(publicView(state,0),0).play),new Set(['royal_carrot_1','royal_crown_1']));
});
test('defense still gives way to cards worth more than the threatened points',()=>{
  const state=bridge();
  state.cells.J1.building=null;state.cells.J4.building=null;
  state.players[0].hand=['territory_J2','royal_carrot_1','royal_crown_1','royal_ring_1'].map(card);
  assert.deepEqual(new Set(chooseDraft(publicView(state,0),0).play),new Set(['royal_carrot_1','royal_crown_1']));
});
test('camp defense counts the owner’s parchment threshold and remaining harvests',()=>{
  const state=position();state.draftTurn=6;
  const woods=data.map.cells.filter(c=>c.baseResource==='wood').slice(0,7);
  for(const cell of woods)state.cells[cell.coordinate].owner=0;
  const target=woods[0].coordinate;state.cells[target].building={category:'camp',priority:1};
  const cards=[card('territory_'+target)];
  const penalty=()=>{const view=publicView(state,0);return passedCampPenalty(view,0,cards,1,projectedValue(view,0));};
  const without=penalty();state.players[0].parchments=[card('woodland_king_1')];
  assert.equal(penalty()-without,20);
  const bridgeState=bridge();bridgeState.phase='construction';
  const loss=()=>{const v=publicView(bridgeState,0);return passedCampPenalty(v,0,[card('territory_J2')],1,projectedValue(v,0));};
  const late=loss();bridgeState.round=2;
  assert.ok(loss()>late*2,'protect harvests in the remaining rounds too');
});
test('a newly chosen Sky Tower can repair a lost bridge instead of wasting a pick defending it',()=>{
  const state=bridge();state.cells.J1.building=null;state.cells.J4.building=null;
  const view=publicView(state,0),camp=[card('territory_J2')];
  const loss=passedCampPenalty(view,0,camp,1,projectedValue(view,0));
  const withTower=draftPosition(view,0,[card('sky_tower_1')]);
  assert.ok(passedCampPenalty(withTower,0,camp,1,projectedValue(withTower,0))<loss);
});
test('overlapping camp losses are scored together',()=>{
  const state=position();state.draftTurn=6;
  for(const id of ['A1','A2','A3','A4','A5'])state.cells[id].owner=0;
  state.cells.A1.building={category:'city',strength:3};
  for(const [i,id] of ['A2','A3'].entries())state.cells[id].building={category:'camp',priority:i+1};
  const view=publicView(state,0),base=projectedValue(view,0),camps=['territory_A2','territory_A3'].map(card);
  const together=passedCampPenalty(view,0,camps,1,base);
  const separately=camps.reduce((n,c)=>n+passedCampPenalty(view,0,[c],1,base),0);
  assert.ok(together>0&&together<separately);
});
test('camp defense does not use hidden opponents’ objectives, cards, memory or the seed',()=>{
  const state=bridge();
  for(const p of state.players.slice(1)) {
    p.parchments=[card('royal_ring_1')];p.hand=[card('territory_A2')];p.reserve=[card('city_1_1')];
    p.discarded=[card('territory_B1')];
  }
  const expected=chooseDraft(publicView(state,0),0);
  state.seed='cannot-use-this';state.deck.reverse();
  for(const p of state.players.slice(1)) {
    p.parchments=[card('woodland_king_1')];p.hand=[card('royal_carrot_1')];p.reserve=[card('city_3_1')];
    p.discarded=[card('territory_A1')];p.draftMemory=[{round:4,pick:1,cards:['territory_J2']}];
  }
  assert.deepEqual(chooseDraft(publicView(state,0),0),expected);
});
