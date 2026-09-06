import test from 'node:test';
import assert from 'node:assert/strict';
import { data } from './fixtures.js';
import { createGame } from '../src/game.js';
import { evaluateFinal } from '../src/scoring.js';
import { copyChoiceDecisions, copyScoreOptions, draftParchmentPreview } from '../src/parchment-preview.js';

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
test('known draft values match the scorer across parchment scoring types',()=>{
  const s=setup(['royal_ring','treasure_guardian','bureaucrat','left_glove'],[]);s.phase='draft';
  for(const id of ['A1','A2','A3','A4','A5','B1','J3'])s.cells[id].owner=0;
  s.cells.A2.building={category:'farm',resource:'wood'};s.cells.B1.building={category:'farm',resource:'gold'};
  const kept=s.players[0].parchments,baseline=evaluateFinal(s).players[0].parchmentPoints;
  for(const source of data.parchments.cards) {
    if(['rank_bonus','copy_parchment'].includes(source.scoringSpec.type)||kept.some(c=>c.id===source.id))continue;
    const c=card(source.id),preview=draftParchmentPreview(s,0,c);
    const trial=structuredClone(s);trial.players[0].parchments.push(c);
    const scored=evaluateFinal(trial).players[0];
    assert.equal(preview.points,scored.rows.find(r=>r.id===c.instanceId).points,c.id);
    assert.equal(preview.gain,scored.parchmentPoints-baseline,c.id);
  }
});
test('draft previews include glove and Hunter gains on your other parchments',()=>{
  const s=setup(['left_glove','treasure_hunter'],[]);s.phase='draft';
  let preview=draftParchmentPreview(s,0,card('right_glove'));
  assert.equal(preview.points,8);assert.equal(preview.gain,14);assert.equal(preview.otherPoints,6);
  s.players[0].parchments=['royal_crown','royal_carrot'].map(card);
  preview=draftParchmentPreview(s,0,card('treasure_hunter'));
  assert.equal(preview.points,0);assert.equal(preview.gain,11);
});
test('draft previews never depend on rival hidden cards and do not mutate the save',()=>{
  const s=setup(['bureaucrat','liberal','opportunist'],['royal_crown']);s.phase='draft';
  const before=structuredClone(s),c=card('royal_ring'),preview=draftParchmentPreview(s,0,c);
  assert.equal(preview.points,1);assert.equal(preview.gain,2);
  assert.ok(preview.notes.some(n=>n.includes('copy')));assert.ok(preview.notes.some(n=>n.includes('rank')));
  assert.deepEqual(s,before);
  s.players[1].parchments=['right_glove','treasure_hunter','bureaucrat'].map(card);
  s.players[1].hand=[{secret:'different hand'}];s.players[1].reserve=[{secret:'different reserve'}];
  s.players[1].draftMemory=[{secret:'different memory'}];s.deck=[{secret:'different deck'}];s.seed='different seed';
  assert.deepEqual(draftParchmentPreview(s,0,c),preview);
  assert.equal(draftParchmentPreview(s,0,card('liberal')).points,null);
  assert.equal(draftParchmentPreview(s,0,card('opportunist')).points,null);
});
test('draft Matriarch previews use public territory counts and leave tied awards pending',()=>{
  const s=setup([],[]);s.phase='draft';const c=card('matriarch');
  assert.equal(draftParchmentPreview(s,0,c).points,null);
  s.cells.A1.owner=0;assert.equal(draftParchmentPreview(s,0,c).points,12);
  s.cells.A2.owner=1;s.cells.A3.owner=1;assert.equal(draftParchmentPreview(s,0,c).points,0);
});
