import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, makeDeck, publicView, resolveDraft } from '../src/game.js';
import { saveGame, loadGame } from '../src/storage.js';
import { data } from './fixtures.js';

test('turn recap includes every player and chained Provisions without revealing parchments',()=>{
  const s=createGame(data,2,'recap');
  s.deck=makeDeck(data);
  const take=id=>s.deck.splice(s.deck.findIndex(c=>c.instanceId===id),1)[0];
  const privateCards=s.deck.filter(c=>c.category==='parchment').slice(0,2);
  s.players[0].hand=[take('territory_A1'),take('provisions_1')];
  s.players[1].hand=[take(privateCards[0].instanceId),take('city_1_1')];
  s.players[2].hand=[take('territory_D10'),take('sky_tower_1')];
  const extras=[take('provisions_2'),take(privateCards[1].instanceId),take('city_2_1'),take('territory_B1')];
  s.deck.unshift(...extras);
  s.cells.A1.owner=1;s.cells.A1.building={category:'camp',priority:1};
  resolveDraft(s,s.players.map(p=>({play:p.hand.map(c=>c.instanceId),discard:[]})));
  assert.equal(s.phase,'construction');
  assert.equal(s.lastTurn.round,1);assert.equal(s.lastTurn.pick,1);
  assert.deepEqual(s.lastTurn.players.map(p=>p.playerId),[0,1,2]);
  assert.deepEqual(s.lastTurn.players[0].actions,[
    {type:'territory',coordinate:'A1',campOwner:1},
    {type:'provisions'},{type:'provisions'},
    {type:'building',name:'City 2'},
    {type:'territory',coordinate:'B1',campOwner:null},
    {type:'parchment'},
  ]);
  assert.deepEqual(s.lastTurn.players[1].actions,[{type:'parchment'},{type:'building',name:'City 1'}]);
  for(const player of s.players)for(const card of privateCards) {
    const recap=JSON.stringify(publicView(s,player.id).lastTurn);
    assert.ok(!recap.includes(card.name));assert.ok(!recap.includes(card.instanceId));
  }
});

test('next pick replaces the recap; rejected picks retain it; discards stay anonymous',()=>{
  const s=createGame(data,1,'recap-discards');
  const choices=()=>s.players.map(p=>({play:[p.hand[0].instanceId],discard:[p.hand[1].instanceId]}));
  const firstChoices=choices();
  resolveDraft(s,firstChoices);
  const first=structuredClone(s.lastTurn);
  assert.equal(first.pick,1);
  for(const p of first.players)assert.deepEqual(p.actions.at(-1),{type:'discard',count:1});
  for(const choice of firstChoices)assert.ok(!JSON.stringify(first).includes(choice.discard[0]));
  const invalid=choices();invalid[1].play=['not-in-hand'];
  assert.throws(()=>resolveDraft(s,invalid));assert.deepEqual(s.lastTurn,first);
  resolveDraft(s,choices());
  assert.equal(s.lastTurn.pick,2);assert.notDeepEqual(s.lastTurn,first);
});

test('recap survives saving and older games without one remain loadable',()=>{
  const s=createGame(data,3,'recap-save');
  resolveDraft(s,s.players.map(p=>({play:p.hand.slice(0,2).map(c=>c.instanceId),discard:[]})));
  let stored;
  const storage={setItem:(_,value)=>{stored=value;},getItem:()=>stored};
  saveGame(s,{},storage);assert.deepEqual(loadGame(storage).game.lastTurn,s.lastTurn);
  delete s.lastTurn;
  saveGame(s,{},storage);assert.ok(loadGame(storage));
});
