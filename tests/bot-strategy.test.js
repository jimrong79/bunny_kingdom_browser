import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from './fixtures.js';
import {createGame,publicView} from '../src/game.js';
import {placeBuilding} from '../src/construction.js';
import {cardValue,chooseDraft,chooseBuilding,chooseMarkets,chooseCopies} from '../src/bots.js';
const card=id=>({...structuredClone([...data.buildings.cards,...data.parchments.cards].find(c=>c.id===id)),instanceId:id+'_test'});
function position(coordinates,round=1) {
  const s=createGame(data,2,'strategy');s.round=round;s.draftTurn=round===4?6:1;
  for(const p of s.players){p.buildings=[];p.parchments=[];p.played=[];p.ready=false;}
  for(const coordinate of coordinates)s.cells[coordinate].owner=0;
  return s;
}
test('strength-3 cities and luxury farms reflect placement and remaining harvests',()=>{
  const s=position(['A1','A2','A3','A4','A5','B1']);
  const value=c=>cardValue(publicView(s,0),0,card(c));
  assert.ok(value('city_3')>value('city_1')*2);
  const early=value('farm_pearl');s.round=4;s.draftTurn=6;
  assert.ok(early>value('farm_pearl')*2);
  s.cells.B1.owner=null;s.cells.A5.owner=null;
  assert.equal(value('city_3'),0);assert.equal(value('farm_pearl'),0);
});
test('construction preserves the mountain slot needed by a strength-3 city',()=>{
  const s=position(['A1','A2','A3','A4','A5','B1'],4);s.phase='construction';
  s.players[0].buildings=[card('city_2'),card('city_3')];
  for(let i=0;i<2;i++) {
    const move=chooseBuilding(publicView(s,0),0);assert.ok(move);
    placeBuilding(s,0,move.cardId,move.coordinates);
  }
  assert.equal(s.cells.B1.building.strength,3);assert.equal(s.players[0].buildings.length,0);
});
test('final Trading Posts count parchment points once and compare actual harvest gains',()=>{
  const s=position(['A1','A2'],4);s.phase='markets';
  s.cells.A1.building={category:'city',strength:3};
  s.cells.A2.building={category:'farm',farmType:'trading_post',choice:null};
  s.players[0].parchments=[card('master_carpenter')];
  assert.equal(chooseMarkets(publicView(s,0),0)[0].resource,'fish');
});
test('copying a glove values the increase to the existing glove too',()=>{
  const s=position([],4);s.phase='parchments';
  s.players[0].parchments=[card('left_glove'),card('liberal')];
  s.players[2].parchments=[card('royal_carrot'),card('right_glove')];
  assert.equal(chooseCopies(publicView(s,0),0,{copies:{}}).liberal_test,'right_glove_test');
});
const territory=coordinate=>({category:'territory',coordinate,id:'territory_'+coordinate,instanceId:'territory_'+coordinate,name:coordinate});
test('drafting evaluates two territories that only become powerful together',()=>{
  const s=position(['A1','B1','A4','A5','A6'],4);s.draftTurn=5;
  s.cells.A1.building={category:'city',strength:2};s.cells.A6.building={category:'city',strength:2};
  s.cells.B1.building={category:'farm',farmType:'basic',resource:'carrots'};
  s.players[0].hand=[territory('A2'),territory('A3'),card('royal_chalice'),card('royal_scepter')];
  assert.deepEqual(new Set(chooseDraft(publicView(s,0),0).play),new Set(['territory_A2','territory_A3']));
});
test('drafting pairs a mountain territory with an otherwise unplaceable strength-3 city',()=>{
  const s=position(['A1','A2','A3','A4','A5'],4);s.draftTurn=5;
  s.cells.A2.building={category:'farm',farmType:'basic',resource:'carrots'};
  s.players[0].hand=[territory('B1'),card('city_3'),card('royal_carrot'),card('royal_ring')];
  assert.deepEqual(new Set(chooseDraft(publicView(s,0),0).play),new Set(['territory_B1','city_3_test']));
});
test('two-player discards deny a rival connection instead of discarding the second-best own card',()=>{
  const s=position(['A1'],4);s.players.pop();s.draftTurn=9;
  for(const coordinate of ['A4','A5','A6','B4','B5'])s.cells[coordinate].owner=1;
  for(const coordinate of ['A6','B4','B5'])s.cells[coordinate].building={category:'city',strength:2};
  s.players[0].hand=[card('royal_carrot'),card('royal_crown'),territory('A3')];
  assert.deepEqual(chooseDraft(publicView(s,0),0),{play:['royal_carrot_test'],discard:['territory_A3']});
});
