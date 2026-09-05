import test from 'node:test';
import assert from 'node:assert/strict';
import { data } from './setup.test.js';
import { createGame } from '../src/game.js';
import { fiefs, resourcesAt } from '../src/fiefs.js';
import { placeBuilding } from '../src/construction.js';
function setup() {const s=createGame(data,1,1);s.phase='construction';return s;}
function give(s,id) {const card=structuredClone(data.buildings.cards.find(c=>c.id===id));card.instanceId=id+'_test';s.players[0].buildings.push(card);return card.instanceId;}
test('lava separates adjacent mountains; Sky Tower pair connects fiefs',()=>{
 const s=setup();s.cells.B1.owner=0;s.cells.B2.owner=0;
 assert.equal(fiefs(s,0).length,2);
 placeBuilding(s,0,give(s,'sky_tower'),['B1','B2']);
 assert.equal(fiefs(s,0).length,1);
});
test('city constraints, single building slot, resource preservation, distinct wealth',()=>{
 const s=setup();s.cells.A1.owner=0;s.cells.A2.owner=0;
 const id=give(s,'city_3');assert.throws(()=>placeBuilding(s,0,id,['A1']));
 placeBuilding(s,0,give(s,'farm_wood'),['A1']);
 assert.deepEqual(resourcesAt(s.cells.A1),['wood','wood']);
 assert.equal(fiefs(s,0)[0].wealth,1);
 assert.throws(()=>placeBuilding(s,0,give(s,'city_1'),['A1']));
 assert.throws(()=>placeBuilding(s,0,give(s,'farm_pearl'),['A2']));
 s.cells.B1.owner=0;placeBuilding(s,0,id,['B1']);assert.equal(s.cells.B1.building.strength,3);
 assert.throws(()=>placeBuilding(s,0,give(s,'city_1'),['A4']));
});
test('Sky Towers require distinct fiefs and distinct empty locations',()=>{
 const s=setup();s.cells.A1.owner=0;s.cells.A2.owner=0;
 const id=give(s,'sky_tower');assert.throws(()=>placeBuilding(s,0,id,['A1','A2']));assert.throws(()=>placeBuilding(s,0,id,['A1','A1']));
});
