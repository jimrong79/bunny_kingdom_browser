import test from 'node:test';
import assert from 'node:assert/strict';
import {skyGame} from './sky-fixture.js';
import {fiefs} from '../src/fiefs.js';
import {chooseChimney,finishMarkets,advanceRound} from '../src/harvest.js';
import {inspectionFiefs,inspectionLabel,chimneyHarvestNote} from '../src/fief-inspection.js';
import {productionCounts} from '../src/kingdom-ui.js';

function harvest(round=3) {
  const state=skyGame();state.phase='markets';state.round=round;
  const own=(id,building,baseResource=null)=>Object.assign(state.cells[id],{owner:0,building,baseResource});
  own('C1-1',{category:'chimney'},'wood');
  own('C1-5',{category:'chimney'},'carrots');
  own('A1',{category:'city',strength:2},'fish');
  own('A2',{category:'city',strength:1});
  own('J10',{category:'city',strength:1},'wood');
  own('C5-7',{category:'city',strength:2},'fish');
  own('C5-2',{category:'rainbow',pairId:'rainbow_1'});
  own('E5',{category:'rainbow',pairId:'rainbow_1'});
  own('C4-2',{category:'city',strength:1},'fish');
  chooseChimney(state,0,'C1-1','wood');chooseChimney(state,0,'C1-5','carrots');
  for(const p of state.players)finishMarkets(state,p.id);
  return state;
}

test('harvest inspection includes both Chimneys, deduplicates existing resources and excludes Cloud-only fiefs',()=>{
  const state=harvest(),before=structuredClone(state),counts=productionCounts(state,0);
  const groups=inspectionFiefs(state,0),at=id=>groups.find(f=>f.coordinates.includes(id));
  assert.equal(at('A1').points,9);
  assert.equal(at('J10').points,2);
  assert.equal(at('C5-7').points,2);
  assert.equal(at('C4-2').points,3);
  assert.ok(at('C4-2').coordinates.includes('E5'));
  assert.match(chimneyHarvestNote(at('A1')),/\+6 points/);
  assert.equal(chimneyHarvestNote(at('C5-7')),'');
  assert.equal(groups.reduce((sum,f)=>sum+f.points,0),state.lastHarvest[0].points);
  assert.deepEqual(productionCounts(state,0),counts);
  assert.deepEqual(state,before,'Inspection must not change production or scoring');
});

test('next round inspects the changed fief without carrying over last harvest Chimney bonuses',()=>{
  const state=harvest();advanceRound(state);
  state.cells.A3.owner=0;
  const groups=inspectionFiefs(state,0),group=groups.find(f=>f.coordinates.includes('A1'));
  assert.ok(group.coordinates.includes('A3'));
  assert.deepEqual(groups,fiefs(state,0));
  assert.equal(chimneyHarvestNote(group),'');
  assert.equal(inspectionLabel(state),'Fief');
});

test('final scoring and completed-board review retain the recorded fourth harvest',()=>{
  const state=harvest(4),recorded=structuredClone(state.lastHarvest[0].fiefs);
  advanceRound(state);
  assert.equal(state.phase,'parchments');
  for(const phase of ['parchments','finished']) {
    state.phase=phase;
    assert.deepEqual(inspectionFiefs(state,0),recorded);
    assert.equal(inspectionLabel(state),'Round 4 harvest');
  }
});

test('post-harvest inspection can reconstruct scores in saves without a harvest breakdown',()=>{
  const state=harvest(),recorded=structuredClone(state.lastHarvest[0].fiefs);
  delete state.lastHarvest;
  assert.deepEqual(inspectionFiefs(state,0),recorded);
  assert.equal(inspectionLabel(state),'Round 3 harvest');
});
