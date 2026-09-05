import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, publicView, resolveDraft, playCard } from '../src/game.js';
import { chooseDraft } from '../src/bots.js';
import { data } from './fixtures.js';
test('complete exploration for every player count and keep private information private',()=>{
 for(const bots of [1,2,3]) {
  const s=createGame(data,bots,123);let turns=0;
  while(s.phase==='draft') {resolveDraft(s,s.players.map(p=>chooseDraft(publicView(s,p.id),p.id)));turns++;assert.ok(turns<=10);}
  assert.equal(turns,bots===1?10:bots===2?6:5);
  assert.ok(s.players.every(p=>p.hand.length===0&&p.reserve.length===0));
  assert.ok(Object.values(s.cells).some(c=>c.owner!==null));
  assert.equal(s.players[0].discarded.length,bots===1?10:0);
  for(const p of s.players) assert.ok(p.played.every(c=>c.category!=='parchment'));
 }
});
test('bad simultaneous selection does not partly mutate game',()=>{
 const s=createGame(data,2,9),before=structuredClone(s),choices=s.players.map(p=>chooseDraft(publicView(s,p.id),p.id));
 choices[2].play=[choices[0].play[0],choices[0].play[1]];
 assert.throws(()=>resolveDraft(s,choices));assert.deepEqual(s,before);
});
test('Provisions chains and does not place buildings early; territory overrides camps',()=>{
 const s=createGame(data,1,1),deck=[...s.deck,...s.players.flatMap(p=>[...p.hand,...p.reserve])];
 const provision=deck.find(c=>c.category==='provisions'),city=deck.find(c=>c.id==='city_1'),territory=deck.find(c=>c.coordinate==='A1'),parchment=deck.find(c=>c.category==='parchment');
 s.deck=[provision,city,territory,parchment];
 s.cells.A1.owner=1;s.cells.A1.building={category:'camp',priority:1};
 playCard(s,0,provision);
 assert.equal(s.cells.A1.owner,0);assert.equal(s.cells.A1.building,null);
 assert.ok(s.players[0].buildings.includes(city));assert.ok(s.players[0].parchments.includes(parchment));
 assert.ok(!s.log.join(' ').includes(parchment.name));
});
