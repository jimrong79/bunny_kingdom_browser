import test from 'node:test';
import assert from 'node:assert/strict';
import { data } from './fixtures.js';
import { createGame, publicView, resolveDraft } from '../src/game.js';
import { beginCampOffers, respondCamp } from '../src/camps.js';
import { placeBuilding, finishConstruction } from '../src/construction.js';
import { chooseResource, finishMarkets, advanceRound } from '../src/harvest.js';
import { chooseDraft, chooseCamp, chooseBuilding, chooseMarkets } from '../src/bots.js';
export function runRounds(bots,seed) {
 const s=createGame(data,bots,seed);
 for(let round=1;round<=4;round++) {
  while(s.phase==='draft')resolveDraft(s,s.players.map(p=>chooseDraft(publicView(s,p.id),p.id)));
  beginCampOffers(s);
  while(s.phase==='camps'){const c=s.campQueue[0];respondCamp(s,c.playerId,chooseCamp(publicView(s,c.playerId),c.playerId,c.cardId));}
  for(const p of s.players){let move;while((move=chooseBuilding(publicView(s,p.id),p.id)))placeBuilding(s,p.id,move.cardId,move.coordinates);finishConstruction(s,p.id);}
  for(const p of s.players){for(const c of chooseMarkets(publicView(s,p.id),p.id))chooseResource(s,p.id,c.coordinate,c.resource);finishMarkets(s,p.id);}
  assert.equal(s.phase,'harvest');assert.equal(s.round,round);assert.throws(()=>finishMarkets(s,0));
  advanceRound(s);
 }
 return s;
}
test('all player counts complete four rounds with conserved deck and harvest totals',()=>{
 for(const bots of [1,2,3]) {
  const s=runRounds(bots,'four-rounds');
  assert.equal(s.phase,'parchments');assert.equal(s.round,4);
  for(const p of s.players){assert.equal(p.harvests.length,4);assert.equal(p.score,p.harvests.reduce((sum,h)=>sum+h.points,0));}
  const cards=[...s.deck,...s.players.flatMap(p=>[...p.hand,...p.reserve,...p.played,...p.parchments,...p.discarded])];
  assert.equal(cards.length,182);assert.equal(new Set(cards.map(c=>c.instanceId)).size,182);
 }
});
test('Trading Post selection is mandatory, owner-only and locked after confirmation',()=>{
 const s=createGame(data,1,1);s.phase='markets';s.cells.A1.owner=0;s.cells.A1.building={category:'farm',farmType:'trading_post',choice:null};
 assert.throws(()=>finishMarkets(s,0));assert.throws(()=>chooseResource(s,1,'A1','wood'));assert.throws(()=>chooseResource(s,0,'A1','gold'));
 chooseResource(s,0,'A1','fish');finishMarkets(s,0);assert.throws(()=>chooseResource(s,0,'A1','wood'));
 finishMarkets(s,1);assert.equal(s.cells.A1.building.choice,'fish');assert.equal(s.phase,'harvest');
});
