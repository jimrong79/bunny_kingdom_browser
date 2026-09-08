import test from 'node:test';
import assert from 'node:assert/strict';
import {skyGame,skyCard} from './sky-fixture.js';
import {publicView,resolveDraft,pickCount} from '../src/game.js';
import {placeBuilding,finishConstruction,moveRainbow} from '../src/construction.js';
import {beginCampOffers,respondCamp} from '../src/camps.js';
import {chooseResource,chooseChimney,finishMarkets,advanceRound} from '../src/harvest.js';
import {evaluateFinal,finalizeScoring} from '../src/scoring.js';
import {validSave} from '../src/storage.js';
import * as normal from '../src/bots.js';
import * as easy from '../src/bots-baseline.js';
for(const n of [2,3,4,5])test(`complete ${n}-player expansion game with legal moves, coins, scoring and conserved cards`,()=>{
 const s=skyGame(n,'sky-complete-'+n),bots=n===4?normal:easy;
 for(let round=1;round<=4;round++){
  while(s.phase==='draft')resolveDraft(s,s.players.map(p=>bots.chooseDraft(publicView(s,p.id),p.id)));
  beginCampOffers(s);
  while(s.phase==='camps'){const p=s.campQueue[0];respondCamp(s,p.playerId,bots.chooseCamp(publicView(s,p.playerId),p.playerId,p.cardId));}
  for(const p of s.players){let move,count=0;while(move=bots.chooseBuilding(publicView(s,p.id),p.id)){placeBuilding(s,p.id,move.cardId,move.coordinates);assert.ok(++count<50);}
   for(const m of bots.chooseRainbowMoves(publicView(s,p.id),p.id))moveRainbow(s,p.id,m.pairId,m.coordinate);
   finishConstruction(s,p.id);
  }
  for(const p of s.players){for(const c of bots.chooseMarkets(publicView(s,p.id),p.id))chooseResource(s,p.id,c.coordinate,c.resource);for(const c of bots.chooseChimneys(publicView(s,p.id),p.id))chooseChimney(s,p.id,c.coordinate,c.resource);finishMarkets(s,p.id);}
  assert.equal(s.phase,'harvest');assert.ok(validSave(s));
  for(const p of s.players){assert.equal(p.score,p.harvests.reduce((n,h)=>n+h.points,0));assert.equal(p.coins,p.coinEvents.reduce((n,e)=>n+e.amount,0));}
  advanceRound(s);
 }
 const decisions={copies:{},rulings:{},copyResolutions:{}};
 for(const p of s.players)Object.assign(decisions.copies,bots.chooseCopies(publicView(s,p.id),p.id,decisions));
 let result=evaluateFinal(s,decisions);
 for(let i=0;!result.complete&&i<20;i++){
  for(const issue of result.issues){if(issue.kind==='copy_resolution')decisions.copyResolutions[issue.key]=issue.options[0];else if(issue.options)decisions.rulings[issue.key]=issue.options[0];}
  result=evaluateFinal(s,decisions);
 }
 assert.ok(result.complete);finalizeScoring(s,decisions);assert.ok(validSave(s));
 for(const p of result.players){assert.equal(p.total,p.harvest+p.trade+p.parchmentPoints);assert.equal(p.trade,p.coins*p.uniqueResources.length);}
});
test('normal expansion bots choose three cards without consulting hidden hands or mutating their view',()=>{
 const s=skyGame(3);const view=publicView(s,0),before=JSON.stringify(view);
 const move=normal.chooseDraft(view,0);assert.equal(move.play.length,pickCount(s));assert.equal(JSON.stringify(view),before);
 s.seed='hidden seed';s.deck.reverse();s.players[1].hand=[skyCard('carrotadel')];s.players[1].parchments=[skyCard('merchant_queen')];
 assert.deepEqual(normal.chooseDraft(publicView(s,0),0),move);
});
