import test from 'node:test';
import assert from 'node:assert/strict';
import { data } from './setup.test.js';
import { createGame, playCard } from '../src/game.js';
import { beginCampOffers, requestCamp, respondCamp } from '../src/camps.js';
function give(s,pid,n){const c=structuredClone(data.buildings.cards.find(c=>c.id===`camp_${n}`));c.instanceId=c.id;s.players[pid].buildings.push(c);return c.instanceId;}
test('Camp offers preserve priorities, allow saving, and reject occupied cities',()=>{
 const s=createGame(data,1,0);s.phase='construction';give(s,1,1);give(s,0,6);beginCampOffers(s);
 assert.equal(s.campQueue[0].playerId,1);assert.throws(()=>respondCamp(s,0,'A1'));
 assert.throws(()=>respondCamp(s,1,'A4'));respondCamp(s,1);assert.equal(s.players[1].buildings.length,1);
 respondCamp(s,0,'A1');assert.equal(s.phase,'construction');assert.equal(s.cells.A1.owner,0);
 playCard(s,1,{category:'territory',coordinate:'A1',name:'A1'});assert.equal(s.cells.A1.owner,1);assert.equal(s.cells.A1.building,null);
});
test('announcing a saved higher Camp offers unplaced lower Camps first, without revealing a target',()=>{
 const s=createGame(data,1,0);s.phase='construction';give(s,0,4);give(s,1,2);
 requestCamp(s,0,'camp_4');assert.deepEqual(s.campQueue.map(c=>c.priority),[2,4]);
 respondCamp(s,1,'A1');assert.throws(()=>respondCamp(s,0,'A1'));respondCamp(s,0);assert.equal(s.phase,'construction');
 assert.equal(s.players[0].buildings.length,1);
});
