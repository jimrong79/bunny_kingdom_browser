import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {data} from './fixtures.js';
import {createGame,makeDeck,pickCount,resolveDraft,publicView} from '../src/game.js';
import {picksPerRound} from '../src/config.js';
import {validSave} from '../src/storage.js';
import {fiefs} from '../src/fiefs.js';
const skyData={...data,cloud:JSON.parse(readFileSync(new URL('../data/maps/great-cloud.json',import.meta.url))),expansion:JSON.parse(readFileSync(new URL('../data/cards/in-the-sky.json',import.meta.url)))};
test('expansion supports correct 2–5 player deals, picks, unique identities, and saves',()=>{
 assert.equal(makeDeck(skyData,true).length,232);
 assert.throws(()=>createGame(data,4));
 for(const n of [2,3,4,5]){
  const s=createGame(skyData,n-1,'sky','Jim',{expansion:'in_the_sky'});
  assert.equal(s.players[0].hand.length,({2:13,3:15,4:12,5:10})[n]);
  assert.equal(pickCount(s),n===2?1:n===3?3:2);
  assert.equal(Object.keys(s.cells).length,131);assert.ok(validSave(s));
  assert.equal(s.players[n-1].color.startsWith('#'),true);
  const view=publicView(s,0);assert.ok(!Array.isArray(view.players[1].hand));assert.equal(view.deck.count,s.deck.length);
  let turns=0;
  while(s.phase==='draft'){
   resolveDraft(s,s.players.map(p=>({play:p.hand.slice(0,pickCount(s)).map(c=>c.instanceId),discard:n===2?[p.hand[1].instanceId]:[]})));
   turns++;assert.ok(validSave(s));
  }
  assert.equal(turns,picksPerRound(s));assert.equal(s.phase,'construction');
 }
});
test('cloud partial sides connect without leaking into the New World or crossing lava',()=>{
 const s=createGame(skyData,2,'sky','',{expansion:'in_the_sky'});
 for(const id of ['C1-1','C2-1','C2-2','A1','B1','B2'])s.cells[id].owner=0;
 const groups=fiefs(s,0);
 assert.ok(groups.some(f=>f.coordinates.length===3&&f.coordinates.includes('C1-1')));
 assert.ok(groups.some(f=>f.coordinates.length===2&&f.coordinates.includes('A1')));
 assert.ok(groups.some(f=>f.coordinates.length===1&&f.coordinates.includes('B2')));
});
