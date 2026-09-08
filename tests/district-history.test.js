import test from 'node:test';
import assert from 'node:assert/strict';
import {skyGame,skyCard,giveBuilding} from './sky-fixture.js';
import {playCard,publicView} from '../src/game.js';
import {placeBuilding,moveRainbow} from '../src/construction.js';
import {beginCampOffers,respondCamp} from '../src/camps.js';
import {restoreDistrictHistory} from '../src/district-history.js';
import {forkPosition} from '../src/bot-evaluation.js';
import {saveGame,loadGame} from '../src/storage.js';

test('Rainbow membership persists through growth, relocation, splitting and reconnection',()=>{
 const s=skyGame();s.phase='construction';
 for(const id of ['C5-2','A9','J10'])playCard(s,0,skyCard('territory_'+id));
 placeBuilding(s,0,'territory_C5-2',['A9']);assert.equal(s.players[0].coins,1);
 moveRainbow(s,0,'rainbow_1','J10');assert.equal(s.players[0].coins,1);
 assert.ok(s.cells.A9.districtUsed&&s.cells.J10.districtUsed);
 playCard(s,0,skyCard('territory_A10'));assert.equal(s.players[0].coins,1);
 assert.ok(s.cells.A10.districtUsed); // Expansion, not only the original rewarded pair.
});
test('a captured Camp territory retains its history for its new owner',()=>{
 const s=skyGame();playCard(s,0,skyCard('territory_A1'));
 giveBuilding(s,'camp_1');beginCampOffers(s);respondCamp(s,0,'A2');
 assert.equal(s.players[0].coins,1);assert.ok(s.cells.A2.districtUsed);
 playCard(s,1,skyCard('territory_A2'));playCard(s,1,skyCard('territory_A3'));
 assert.equal(s.players[1].coins,0);assert.ok(s.cells.A3.districtUsed);
 playCard(s,1,skyCard('territory_J9'));playCard(s,1,skyCard('territory_J10'));
 assert.equal(s.players[1].coins,1);
});
test('District history survives save/resume and simulated bot changes stay isolated',()=>{
 const s=skyGame(),ids=['territory_A1','territory_A2'];
 s.deck=s.deck.filter(c=>!ids.includes(c.id));
 for(const p of s.players)for(const key of ['hand','reserve'])p[key]=p[key].filter(c=>!ids.includes(c.id));
 for(const id of ids)playCard(s,0,skyCard(id));
 const view=publicView(s,0),before=structuredClone(view),trial=forkPosition(view,0);
 playCard(trial,0,skyCard('territory_A3'));assert.ok(trial.cells.A3.districtUsed);assert.deepEqual(view,before);
 let saved;const storage={setItem:(_,v)=>saved=v,getItem:()=>saved};saveGame(s,{},storage);
 assert.deepEqual(loadGame(storage).game,s);
});
test('legacy history restores a departed Rainbow endpoint and later District growth',()=>{
 const s=skyGame();s.phase='construction';
 for(const id of ['C5-2','A9','J10'])playCard(s,0,skyCard('territory_'+id));
 placeBuilding(s,0,'territory_C5-2',['A9']);moveRainbow(s,0,'rainbow_1','J10');
 playCard(s,0,skyCard('territory_J9'));
 const coins=s.players[0].coins;
 delete s.districtHistoryVersion;for(const c of Object.values(s.cells))delete c.districtUsed;
 restoreDistrictHistory(s);
 for(const id of ['C5-2','A9','J9','J10'])assert.ok(s.cells[id].districtUsed,id);
 assert.equal(s.players[0].coins,coins);
 const once=structuredClone(s);restoreDistrictHistory(s);assert.deepEqual(s,once);
});
