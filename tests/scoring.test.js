import test from 'node:test';
import assert from 'node:assert/strict';
import { data } from './fixtures.js';
import { createGame } from '../src/game.js';
import { evaluateFinal, finalizeScoring, copyOptions } from '../src/scoring.js';
function card(id){return {...structuredClone(data.parchments.cards.find(c=>c.id===id)),instanceId:id+'_test'};}
function setup(){const s=createGame(data,1,1);s.phase='parchments';s.players[0].score=20;s.players[1].score=40;return s;}
const choices=()=>({copies:{},rulings:{},copyResolutions:{}});
test('paired gloves, treasure doubling, Guardian and Bureaucrat score without double counting',()=>{
 const s=setup();s.players[0].parchments=['left_glove','right_glove','treasure_hunter','treasure_guardian','bureaucrat'].map(card);
 const r=evaluateFinal(s,choices());assert.ok(r.complete);assert.equal(r.players[0].parchmentPoints,27);
});
test('copied treasure gains own glove pairing and treasure bonuses; copy direction follows seating',()=>{
 const s=setup();s.players[0].parchments=['left_glove','liberal','treasure_hunter','treasure_guardian','bureaucrat'].map(card);s.players[1].parchments=[card('right_glove')];
 const d=choices();d.copies.liberal_test='right_glove_test';const r=evaluateFinal(s,d);assert.ok(r.complete);assert.equal(r.players[0].parchmentPoints,27);
 const three=createGame(data,2,0);assert.equal(copyOptions(three,0,card('liberal')).playerId,2);assert.equal(copyOptions(three,0,card('socialist')).playerId,1);
});
test('Opportunist resolves after other scoring and can move its holder into first; cannot score twice',()=>{
 const s=setup();s.players[0].score=35;s.players[0].parchments=[card('opportunist')];
 finalizeScoring(s,choices());assert.equal(s.players[0].score,45);assert.deepEqual(s.winners,[0]);assert.throws(()=>finalizeScoring(s,choices()));
});
test('Matriarch requires a sole territory leader, including copies and legacy card data',()=>{
 const s=setup(),d=choices();s.players[0].parchments=[card('matriarch')];
 s.players[0].parchments[0].scoringSpec.tiePolicy=null;
 s.players[1].parchments=[card('socialist')];d.copies.socialist_test='matriarch_test';
 const points=()=>{const r=evaluateFinal(s,d);assert.ok(r.complete);return r.players.map(p=>p.parchmentPoints);};
 assert.deepEqual(points(),[0,0]);
 s.cells.A1.owner=0;assert.deepEqual(points(),[12,0]);
 s.cells.A2.owner=1;d.rulings['matriarch:matriarch_test']=12;assert.deepEqual(points(),[0,0]);
 s.cells.A3.owner=1;assert.deepEqual(points(),[0,12]);
});
test('each copied Hunter adds one treasure total, with no compounding or ruling',()=>{
 const s=setup(),d=choices();
 s.players[0].parchments=['royal_crown','treasure_hunter','liberal'].map(card);s.players[1].parchments=[{...card('treasure_hunter'),instanceId:'other_hunter'}];d.copies.liberal_test='other_hunter';
 d.rulings['hunter:0']=4; // An obsolete ruling must not override the confirmed rule.
 const r=evaluateFinal(s,d);assert.ok(r.complete);assert.equal(r.players[0].parchmentPoints,15);
});
test('an incomplete copy chain requires a complete legal path rather than an arbitrary ruling',()=>{
 const s=setup();s.players[0].parchments=[card('liberal')];s.players[1].parchments=[card('socialist'),card('royal_ring')];
 const d=choices();d.copies.liberal_test='socialist_test';d.copies.socialist_test='liberal_test';
 const result=evaluateFinal(s,d);
 assert.ok(!result.complete);assert.ok(result.issues.some(x=>x.kind==='copy'&&x.key==='liberal_test'));
 assert.equal(result.issues.filter(x=>x.kind==='copy_resolution').length,0);
});
test('all basic scoring definitions calculate known spatial/resource counts',()=>{
 const s=setup();for(const id of ['A1','A2','A3','A4','B1','J3'])s.cells[id].owner=0;
 s.cells.A2.building={category:'farm',resource:'wood'};s.cells.B1.building={category:'farm',resource:'gold'};
 const expected={burgomaster:2,diplomat:6,explorer:1*3,carpenter:4,master_carpenter:8,woodland_king:0,fisher:0,master_fisher:0,fisher_king:0,farmer:0,master_farmer:0,carrot_king:0,merchant:3,master_of_the_mountains:2,carrotistador:4,harecingetorix:2,hun_ny_king:0,bun_shee:2,panpan_the_barbarian:0,colonist:0,king_of_thieves:0,matriarch:12,little_prince:0};
 for(const [id,value] of Object.entries(expected)){s.players[0].parchments=[card(id)];const r=evaluateFinal(s,choices());assert.ok(r.complete,id);assert.equal(r.players[0].parchmentPoints,value,id);}
});
