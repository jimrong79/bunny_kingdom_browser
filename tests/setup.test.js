import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame, makeDeck, publicView } from '../src/game.js';
export const data = Object.fromEntries([['map','maps/original-board'],['buildings','cards/base-buildings-and-provisions'],['parchments','cards/base-parchments']].map(([key,path])=>[key,JSON.parse(readFileSync(new URL(`../data/${path}.json`,import.meta.url)))]));
test('complete deck and reproducible player-count-specific deals', () => {
  assert.equal(makeDeck(data).length,182);
  for(const bots of [1,2,3]) {
    const s=createGame(data,bots,'test');
    assert.equal(s.players.length,bots+1);
    assert.equal(s.players[0].hand.length,bots===1?11:bots===2?12:10);
    assert.equal(s.players[0].reserve.length,bots===1?9:0);
    assert.equal(Object.values(s.cells).filter(c=>c.building).length,18);
    const all=[...s.deck,...s.players.flatMap(p=>[...p.hand,...p.reserve])];
    assert.equal(new Set(all.map(c=>c.instanceId)).size,182);
    assert.deepEqual(s,createGame(data,bots,'test'));
    const view=publicView(s,1);
    assert.equal(view.deck.count,s.deck.length);
    assert.equal(view.players[0].hand.count,s.players[0].hand.length);
    assert.equal(view.players[1].reserve.count,s.players[1].reserve.length);
  }
});
