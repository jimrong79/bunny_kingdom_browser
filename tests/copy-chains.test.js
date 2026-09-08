import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,publicView} from '../src/game.js';
import {data} from './fixtures.js';
import {copyPaths,evaluateFinal,copyChoiceValue} from '../src/scoring.js';
import {copyScoreOptions,copyChoiceDecisions} from '../src/parchment-preview.js';
import {chooseCopies} from '../src/bots.js';
const card=id=>({...structuredClone(data.parchments.cards.find(c=>c.id===id)),instanceId:id+'_1'});
function setup(n=3){const s=createGame(data,n-1,'copies');s.phase='parchments';s.players.forEach(p=>p.parchments=[]);return s;}
const decisions=()=>({copies:{},rulings:{},copyResolutions:{}});

test('copy-left can become copy-right from the copying player’s seat, independently of its owner’s choice',()=>{
 const s=setup();s.players[0].parchments=['socialist','royal_ring'].map(card);
 s.players[1].parchments=[card('liberal')];s.players[2].parchments=[card('royal_crown')];
 const d=decisions();d.copies={socialist_1:'liberal_1>royal_crown_1',liberal_1:'royal_ring_1'};
 const r=evaluateFinal(s,d);assert.ok(r.complete);assert.deepEqual(r.players.map(p=>p.parchmentPoints),[6,1,5]);
 const view=publicView(s,0),before=structuredClone(view);
 assert.equal(chooseCopies(view,0,d).socialist_1,'liberal_1>royal_crown_1');assert.deepEqual(view,before);
 const options=copyScoreOptions(s,0,s.players[0].parchments[0],d);
 assert.equal(options[0].value,'liberal_1>royal_crown_1');assert.equal(options[0].points,5);
});

test('copy paths reject unreachable targets and accept only legal legacy resolutions',()=>{
 const s=setup();s.players[0].parchments=['socialist','royal_ring'].map(card);
 s.players[1].parchments=[card('liberal')];s.players[2].parchments=[card('royal_crown')];
 const d=decisions();d.copies={socialist_1:'liberal_1',liberal_1:'royal_ring_1'};
 d.copyResolutions.socialist_1='royal_crown_1';assert.ok(evaluateFinal(s,d).complete);
 assert.equal(copyChoiceValue(d,'socialist_1'),'liberal_1>royal_crown_1');
 d.copyResolutions.socialist_1='royal_ring_1';assert.ok(!evaluateFinal(s,d).complete);
 d.copies.socialist_1='liberal_1>royal_ring_1';assert.ok(!evaluateFinal(s,d).complete);
});

test('two-player loops terminate, while useful paths through a copy remain selectable',()=>{
 const s=setup(2);s.players[0].parchments=[card('liberal')];s.players[1].parchments=['socialist','royal_crown'].map(card);
 const paths=copyPaths(s,0,s.players[0].parchments[0]);
 assert.deepEqual(paths.map(p=>p.map(c=>c.instanceId).join('>')).sort(),['royal_crown_1','socialist_1>royal_crown_1']);
 assert.ok(paths.every(p=>new Set(p.map(c=>c.instanceId)).size===p.length));
 const d=decisions();d.copies.liberal_1='socialist_1>royal_crown_1';
 assert.ok(evaluateFinal(s,d).complete);assert.equal(evaluateFinal(s,d).players[0].parchmentPoints,5);
 s.players[1].parchments=[card('socialist')];assert.ok(evaluateFinal(s,decisions()).complete);
 assert.deepEqual(evaluateFinal(s,decisions()).players.map(p=>p.parchmentPoints),[0,0]);
});

test('a chained treasure uses the copying player’s gloves and additive Hunter effects',()=>{
 const s=setup();s.players[0].parchments=['socialist','left_glove','treasure_hunter','treasure_guardian'].map(card);
 s.players[1].parchments=[card('liberal')];s.players[2].parchments=[card('right_glove')];
 const d=decisions();d.copies={socialist_1:'liberal_1>right_glove_1',liberal_1:'left_glove_1'};
 const result=evaluateFinal(s,d);assert.ok(result.complete);assert.equal(result.players[0].parchmentPoints,22);
 const option=copyScoreOptions(s,0,s.players[0].parchments[0],d)[0];assert.equal(option.points,8);assert.equal(option.total,22);
 assert.equal(copyChoiceDecisions(d,'socialist_1',option.value).copies.socialist_1,option.value);
});

test('two physical copy cards can copy the single Hunter and give exactly 3T',()=>{
 const s=setup(2);s.players[0].parchments=['liberal','socialist','royal_crown'].map(card);
 s.players[1].parchments=[card('treasure_hunter')];
 const d=decisions();d.copies={liberal_1:'treasure_hunter_1',socialist_1:'treasure_hunter_1'};
 const result=evaluateFinal(s,d);assert.ok(result.complete);assert.equal(result.players[0].parchmentPoints,15);
});

test('Opportunist bonuses use one checkpoint and do not make the former leader trigger later',()=>{
 const s=setup();s.players[0].score=95;s.players[1].score=100;
 s.players[0].parchments=[card('opportunist')];s.players[1].parchments=[card('liberal')];
 const d=decisions();d.copies.liberal_1='opportunist_1';
 const before=structuredClone(s),result=evaluateFinal(s,d);
 assert.ok(result.complete);assert.deepEqual(result.players.map(p=>p.total),[105,100,0]);assert.deepEqual(s,before);
});

test('multiple copies held by the same second-place player each score at that one checkpoint',()=>{
 const s=setup(2);s.players[0].score=95;s.players[1].score=100;
 s.players[0].parchments=['liberal','socialist'].map(card);s.players[1].parchments=[card('opportunist')];
 const d=decisions();d.copies={liberal_1:'opportunist_1',socialist_1:'opportunist_1'};
 const result=evaluateFinal(s,d);assert.ok(result.complete);assert.deepEqual(result.players.map(p=>p.total),[115,100]);
});

test('only an actual second-place tie needs a ruling',()=>{
 const s=setup();s.players[0].score=90;s.players[1].score=100;s.players[2].score=90;
 s.players[0].parchments=[card('socialist')];s.players[1].parchments=[card('opportunist')];
 const d=decisions();d.copies.socialist_1='opportunist_1';
 let result=evaluateFinal(s,d);assert.ok(!result.complete);assert.equal(result.issues.length,1);
 d.rulings[result.issues[0].key]=10;result=evaluateFinal(s,d);assert.ok(result.complete);assert.equal(result.players[0].total,100);
 s.players[0].score=100;s.players[2].score=0;assert.ok(evaluateFinal(s,decisions()).issues.every(i=>i.kind==='copy'));
 assert.equal(evaluateFinal(s,d).players[0].parchmentPoints,0);
});
