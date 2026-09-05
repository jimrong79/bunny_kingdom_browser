import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from './fixtures.js';
import {createGame,publicView,resolveDraft} from '../src/game.js';
import {knownTerritories} from '../src/bot-memory.js';
import {chooseDraft} from '../src/bots.js';
import {saveGame,loadGame} from '../src/storage.js';

test('draft observations contain only hands personally seen and persist through a save',()=>{
  const s=createGame(data,1,'memory'),seen=s.players.map(p=>p.hand.map(c=>c.instanceId));
  resolveDraft(s,s.players.map(p=>({play:[p.hand[0].instanceId],discard:[p.hand[1].instanceId]})));
  for(const player of s.players) {
    assert.deepEqual(player.draftMemory,[{round:1,pick:1,cards:seen[player.id]}]);
    const view=publicView(s,player.id);
    assert.deepEqual(view.players[player.id].draftMemory,player.draftMemory);
    assert.equal(view.players[1-player.id].draftMemory,undefined);
  }
  let json;const storage={setItem:(_,v)=>{json=v;},getItem:()=>json};
  saveGame(s,{},storage);assert.deepEqual(loadGame(storage).game.players[0].draftMemory,s.players[0].draftMemory);
});
test('known territory availability distinguishes current hands from completed two-player rounds',()=>{
  const s=createGame(data,1,'memory-status');s.players[0].hand=[];s.players[0].played=[];
  s.players[0].draftMemory=[{round:1,pick:1,cards:['territory_A1','royal_carrot_1']}];
  let knowledge=knownTerritories(publicView(s,0),0);
  assert.ok(knowledge.circulating.has('A1'));assert.ok(!knowledge.unavailable.has('A1'));
  s.round=2;knowledge=knownTerritories(publicView(s,0),0);
  assert.ok(knowledge.unavailable.has('A1'));assert.ok(!knowledge.circulating.has('A1'));
});
test('changing hidden memories, hidden cards, deck order, or seed does not change a bot decision',()=>{
  const s=createGame(data,1,'memory-fairness'),before=chooseDraft(publicView(s,1),1);
  s.seed='different-and-not-consulted';s.deck.reverse();s.players[0].hand.reverse();s.players[0].reserve.reverse();
  s.players[0].draftMemory=[{round:4,pick:1,cards:['SECRET-CARD']}];
  assert.ok(!JSON.stringify(publicView(s,1)).includes('SECRET-CARD'));
  assert.deepEqual(chooseDraft(publicView(s,1),1),before);
});
