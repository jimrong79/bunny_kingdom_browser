import test from 'node:test';
import assert from 'node:assert/strict';
import {skyGame,skyCard,giveBuilding} from './sky-fixture.js';
import {playCard} from '../src/game.js';
import {fiefs} from '../src/fiefs.js';
import {eligibleTerritories,placeBuilding,moveRainbow} from '../src/construction.js';
import {districts} from '../src/districts.js';
test('Carrotadels provide a nonstacking strength floor and can coexist with ordinary cities',()=>{
 const s=skyGame();for(const id of ['A1','A2','A3']){s.cells[id].owner=0;s.cells[id].building=null;}
 const id=giveBuilding(s,'carrotadel');placeBuilding(s,0,id,['A1']);
 s.cells.A2.building={category:'city',cityType:'carrotadel',strength:5};s.cells.A3.building={category:'city',strength:3};
 assert.equal(fiefs(s,0)[0].strength,5);
 s.cells.A4.owner=0;s.cells.A4.building={category:'city',strength:4};assert.equal(fiefs(s,0)[0].strength,7);
});
test('expansion placement respects board, Plain terrain, and occupied printed farms',()=>{
 const s=skyGame();for(const c of Object.values(s.cells))c.owner=0;
 const wool=skyCard('farm_luxury_cloud'),bird=skyCard('farm_luxury_plains');
 assert.ok(eligibleTerritories(s,0,wool).every(id=>id.startsWith('C')));
 assert.ok(eligibleTerritories(s,0,bird).every(id=>s.cells[id].terrain==='plains'));
 assert.ok(!eligibleTerritories(s,0,wool).includes('C1-1'));
 assert.ok(eligibleTerritories(s,0,skyCard('chimney')).every(id=>id.startsWith('C')));
});
test('Tax Collectors and District creation award retained coins, growth and merging do not',()=>{
 const s=skyGame();
 for(const id of ['A1','A2','A4','A5','A3'])playCard(s,0,skyCard('territory_'+id));
 assert.equal(s.players[0].coins,2);assert.equal(districts(s,0).length,1);
 playCard(s,0,skyCard('tax_collector'));assert.equal(s.players[0].coins,4);
 assert.deepEqual(s.players[0].coinEvents.map(e=>e.amount),[1,1,2]);
});
test('Rainbow claims its cloud territory, places a ground link, and moves without minting coins',()=>{
 const s=skyGame();playCard(s,0,skyCard('territory_C5-2'));
 for(const id of ['A1','J10']){s.cells[id].owner=0;s.cells[id].building=null;}
 s.phase='construction';placeBuilding(s,0,'territory_C5-2',['A1']);
 assert.equal(s.players[0].coins,1);assert.ok(fiefs(s,0).some(f=>f.coordinates.includes('A1')&&f.coordinates.includes('C5-2')));
 moveRainbow(s,0,'rainbow_1','J10');assert.equal(s.players[0].coins,1);assert.equal(s.cells.A1.building,null);
 assert.ok(fiefs(s,0).some(f=>f.coordinates.includes('J10')&&f.coordinates.includes('C5-2')));
 assert.throws(()=>moveRainbow(s,0,'rainbow_1','C1-2'));
 s.phase='draft';assert.throws(()=>moveRainbow(s,0,'rainbow_1','A1'));
});
