import test from 'node:test';
import assert from 'node:assert/strict';
import {skyGame,skyCard} from './sky-fixture.js';
import {fiefs} from '../src/fiefs.js';
import {playerStats,basePoints,evaluateFinal} from '../src/scoring.js';
import {chooseChimney,finishMarkets,chooseResource} from '../src/harvest.js';
import {draftParchmentPreview} from '../src/parchment-preview.js';
const own=(s,id,building=null,resource=null)=>Object.assign(s.cells[id],{owner:0,building,baseResource:resource});
test('Explorer counts exactly four corners per board, including legacy saves and copies',()=>{
 const s=skyGame(),card=skyCard('explorer');
 for(const id of ['A1','A10','J1','J10','C1-1','C1-5','C5-1','C5-7','C3-1','C3-7'])s.cells[id].owner=0;
 for(const c of Object.values(s.cells).filter(c=>c.boardId==='great_cloud'))c.isCorner=null;
 assert.equal(draftParchmentPreview(s,0,card).points,24);
 s.phase='parchments';s.players[0].parchments=[skyCard('socialist')];s.players[1].parchments=[card];
 const result=evaluateFinal(s,{copies:{socialist_1:card.instanceId},rulings:{},copyResolutions:{}});
 assert.ok(result.complete);assert.equal(result.players[0].parchmentPoints,24);
 for(const id of ['A1','A10','J1','J10','C1-1','C1-5','C5-1','C5-7'])s.cells[id].owner=null;
 assert.equal(playerStats(s,0).metrics.controlled_corner_territories,0);
});
test('Chimneys broadcast only to New World fiefs without creating production or duplicate wealth',()=>{
 const s=skyGame();s.phase='markets';
 own(s,'C3-3',{category:'chimney'},'wood');own(s,'A1',{category:'city',strength:2},'fish');own(s,'J10',{category:'city',strength:1},'wood');own(s,'C1-5',{category:'city',strength:1});
 assert.throws(()=>chooseChimney(s,0,'C3-3','carrots'));
 chooseChimney(s,0,'C3-3','wood');
 const actual=fiefs(s,0),harvest=fiefs(s,0,{harvest:true});
 assert.equal(actual.find(f=>f.coordinates.includes('A1')).points,2);
 assert.equal(harvest.find(f=>f.coordinates.includes('A1')).points,4);
 assert.equal(harvest.find(f=>f.coordinates.includes('J10')).points,1);
 assert.equal(harvest.find(f=>f.coordinates.includes('C1-5')).points,0);
 assert.equal(playerStats(s,0).production.filter(r=>r==='wood').length,2);
 for(const p of s.players)finishMarkets(s,p.id);
 assert.equal(s.players[0].score,5);
});
test('changing a Trading Post invalidates a Chimney choice no longer present in its fief',()=>{
 const s=skyGame();s.phase='markets';own(s,'C1-2',{category:'farm',farmType:'trading_post',choice:'wood'});own(s,'C1-3',{category:'chimney',choice:'wood'});
 chooseResource(s,0,'C1-2','fish');assert.equal(s.cells['C1-3'].building.choice,null);
 assert.throws(()=>finishMarkets(s,0));chooseChimney(s,0,'C1-3','fish');finishMarkets(s,0);
});
test('Luxury and Wondrous scoring stay separate; Trade and variable Treasures compose correctly',()=>{
 const s=skyGame();s.phase='parchments';s.players[0].coins=10;
 for(const id of ['C1-1','C1-4','C1-5'])s.cells[id].owner=0;
 own(s,'A1',{category:'farm',farmType:'luxury',resource:'gold'});
 own(s,'J10',{category:'farm',farmType:'luxury',resource:'luxury_plains'});
 const cards=['merchant','lewis_carrot','merchants_signet','cape_of_dawn','nibblonacci','merchant_queen'].map(skyCard);
 s.players.forEach(p=>p.parchments=[]);s.players[0].parchments=cards;
 const stats=playerStats(s,0);assert.equal(stats.metrics.trade_score,50);
 const values=Object.fromEntries(cards.map(c=>[c.id,basePoints(c,stats,cards)]));
 assert.deepEqual(values,{merchant:6,lewis_carrot:6,merchants_signet:10,cape_of_dawn:2,nibblonacci:3,merchant_queen:20});
 let result=evaluateFinal(s);assert.equal(result.players[0].total,97);
 s.players[0].parchments.push(skyCard('treasure_hunter'));
 result=evaluateFinal(s);assert.equal(result.players[0].total,109);
 assert.equal(basePoints(skyCard('nibblonacci'),stats,[]),0);
});
test('cloud row majority is strict and Governor counts current Districts rather than coin history',()=>{
 const s=skyGame();s.players[0].coins=8;
 for(const id of ['C1-1','C2-1','C2-2','J10'])s.cells[id].owner=0;
 s.cells['C1-5'].owner=1;
 const stats=playerStats(s,0);assert.equal(stats.metrics.cloud_rows_led,1);assert.equal(stats.metrics.controlled_districts,1);
 assert.equal(basePoints(skyCard('governor'),stats,[]),3);assert.equal(basePoints(skyCard('general_mafayette'),stats,[]),5);
});
test('Cloud Independence recomputes cloud fiefs after removing both types of links',()=>{
 const s=skyGame();
 own(s,'C1-1',{category:'sky_tower',pairId:'sky_1'},'wood');own(s,'C1-2',{category:'city',strength:1});
 own(s,'C5-7',{category:'sky_tower',pairId:'sky_1'},'fish');own(s,'C5-6',{category:'city',cityType:'carrotadel',strength:5});
 assert.equal(fiefs(s,0)[0].points,10);
 assert.equal(basePoints(skyCard('cloud_independence'),playerStats(s,0),[]),6);
});
