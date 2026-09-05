import test from 'node:test';
import assert from 'node:assert/strict';
import { data } from './fixtures.js';
import { createGame, publicView } from '../src/game.js';
import { chooseBuilding, chooseDraft } from '../src/bots.js';
test('bots cannot observe rival hands, reserves, discards, parchments or deck order',()=>{
 const s=createGame(data,1,123),before=publicView(s,1),pick=chooseDraft(before,1);
 s.deck.reverse();s.players[0].hand.reverse();s.players[0].reserve.reverse();
 assert.deepEqual(publicView(s,1),before);assert.deepEqual(chooseDraft(publicView(s,1),1),pick);
 s.players[0].parchments=[{name:'PRIVATE PARCHMENT'}];s.players[0].discarded=[{name:'PRIVATE DISCARD'}];
 assert.ok(!JSON.stringify(publicView(s,1)).includes('PRIVATE'));
});
test('bot saves a redundant farm but uses it when its parchment rewards production',()=>{
 const s=createGame(data,1,1);s.phase='construction';s.cells.A1.owner=1;
 const card={...structuredClone(data.buildings.cards.find(c=>c.id==='farm_wood')),instanceId:'farm_wood_test'};
 s.players[1].buildings=[card];assert.equal(chooseBuilding(publicView(s,1),1),null);
 s.players[1].parchments=[{...structuredClone(data.parchments.cards.find(c=>c.id==='carpenter')),instanceId:'carpenter_test'}];
 assert.equal(chooseBuilding(publicView(s,1),1).cardId,card.instanceId);
});
