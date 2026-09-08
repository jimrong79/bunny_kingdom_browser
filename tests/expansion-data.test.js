import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const cloud=JSON.parse(readFileSync(new URL('../data/maps/great-cloud.json',import.meta.url)));
export const expansion=JSON.parse(readFileSync(new URL('../data/cards/in-the-sky.json',import.meta.url)));
test('expansion inventory preserves all 50 cards and source parchment text',()=>{
 assert.equal(cloud.cells.length,31);
 assert.ok(cloud.cells.every(c=>typeof c.isCorner==='boolean'));
 assert.deepEqual(cloud.cells.filter(c=>c.isCorner).map(c=>c.coordinate),['C1-1','C1-5','C5-1','C5-7']);
 assert.deepEqual([1,2,3,4,5].map(r=>cloud.cells.filter(c=>c.row===String(r)).length),[5,6,7,6,7]);
 assert.equal(expansion.cards.reduce((n,c)=>n+c.copies,0)+expansion.parchments.length+cloud.cells.length,50);
 assert.equal(expansion.parchments.filter(c=>c.parchmentType==='treasure').length,2);
 const source=readFileSync(new URL('../data/cards/parchments-in-the-sky.txt',import.meta.url));
 assert.equal(createHash('sha256').update(source).digest('hex'),expansion.verification.parchmentSourceSha256);
 for(const c of expansion.parchments)assert.equal(source.toString().split(/\r?\n/)[c.sourceLine-1],c.sourceText);
 assert.deepEqual(cloud.cells.filter(c=>c.startingCityStrength).map(c=>[c.coordinate,c.startingCityStrength]),[['C2-3',3],['C2-4',1],['C2-6',2],['C4-5',1]]);
 assert.equal(new Set(cloud.cells.filter(c=>c.startingBuilding?.farmType==='wondrous').map(c=>c.startingBuilding.resource)).size,12);
});
test('cloud side adjacency is symmetric, staggered, and separate from New World coordinates',()=>{
 const byId=Object.fromEntries(cloud.cells.map(c=>[c.coordinate,c]));
 assert.deepEqual(byId['C1-1'].neighbors,['C1-2','C2-1','C2-2']);
 assert.deepEqual(byId['C3-3'].neighbors,['C2-2','C2-3','C3-2','C3-4','C4-2','C4-3']);
 for(const c of cloud.cells)for(const n of c.neighbors){assert.ok(byId[n]);assert.ok(byId[n].neighbors.includes(c.coordinate));}
});
