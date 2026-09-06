import test from 'node:test';
import assert from 'node:assert/strict';
import { data } from './fixtures.js';
import { createGame } from '../src/game.js';
import { evaluateFinal } from '../src/scoring.js';
import { copyChoiceDecisions, copyScoreOptions } from '../src/parchment-preview.js';

const card=id=>({...structuredClone(data.parchments.cards.find(c=>c.id===id)),instanceId:id+'_test'});
function setup(own,other) {
  const state=createGame(data,1,'preview');state.phase='parchments';
  state.players[0].score=20;state.players[1].score=40;
  state.players[0].parchments=own.map(card);state.players[1].parchments=other.map(card);
  state.scoringDecisions={copies:{},rulings:{},copyResolutions:{}};
  return state;
}
test('copy options sort by your final total including effects on an existing glove',()=>{
  const s=setup(['left_glove','liberal','treasure_hunter','treasure_guardian','bureaucrat'],['royal_crown','right_glove']);
  const before=structuredClone(s),copy=s.players[0].parchments[1];
  const options=copyScoreOptions(s,0,copy);
  assert.deepEqual(options.map(o=>[o.card.id,o.points,o.total,o.complete]),[
    ['right_glove',8,47,true],['royal_crown',10,43,true],
  ]);
  for(const option of options) {
    const decisions=copyChoiceDecisions(s.scoringDecisions,copy.instanceId,option.card.instanceId);
    assert.equal(evaluateFinal(s,decisions).players[0].total,option.total);
  }
  assert.deepEqual(s,before);
});
test('copying Treasure Hunter can rank first even with zero points on its own row',()=>{
  const s=setup(['royal_crown','royal_carrot','liberal'],['royal_ring','treasure_hunter']);
  const [best]=copyScoreOptions(s,0,s.players[0].parchments[2]);
  assert.equal(best.card.id,'treasure_hunter');assert.equal(best.points,0);assert.equal(best.total,42);
});
test('unresolved copy chains and treasure rulings are shown as pending rather than exact totals',()=>{
  const s=setup(['royal_crown','treasure_hunter','liberal'],['socialist','treasure_hunter','royal_ring']);
  const options=copyScoreOptions(s,0,s.players[0].parchments[2]);
  assert.equal(options[0].card.id,'royal_ring');assert.equal(options[0].complete,true);
  assert.ok(options.slice(1).every(o=>!o.complete));
  assert.equal(options.find(o=>o.card.id==='socialist').points,null);
});
test('changed copy choices clear dependent rulings exactly as the preview expects',()=>{
  const d={copies:{liberal_test:'treasure_hunter_test'},rulings:{'hunter:0':3},copyResolutions:{socialist_test:'royal_ring_test'}};
  assert.deepEqual(copyChoiceDecisions(d,'liberal_test','treasure_hunter_test'),d);
  const changed=copyChoiceDecisions(d,'liberal_test','royal_ring_test');
  assert.deepEqual(changed,{copies:{liberal_test:'royal_ring_test'},rulings:{},copyResolutions:{}});
  assert.equal(d.rulings['hunter:0'],3);
});
test('copy previews are unavailable before parchments are revealed',()=>{
  const s=setup(['liberal'],['royal_crown']);s.phase='draft';
  assert.deepEqual(copyScoreOptions(s,0,s.players[0].parchments[0]),[]);
});
