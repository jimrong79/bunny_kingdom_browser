import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { data } from './fixtures.js';
import { saveGame, loadGame } from '../src/storage.js';
function memory(){const values=new Map();return {setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};}
test('autosave preserves game and unconfirmed choices without redealing',()=>{
 const s=createGame(data,2,123),store=memory(),ui={selected:[s.players[0].hand[0].instanceId],targets:[]};
 assert.ok(saveGame(s,ui,store));const loaded=loadGame(store);assert.deepEqual(loaded.game,s);assert.deepEqual(loaded.ui,ui);
});
test('corrupt/incompatible saves and unavailable storage do not crash',()=>{
 assert.equal(loadGame({getItem:()=>'{'}),null);
 const s=createGame(data,1,1);s.deck.pop();const store=memory();saveGame(s,{},store);assert.equal(loadGame(store),null);
 assert.equal(saveGame(s,{}, {setItem:()=>{throw Error('quota')}}),false);
 assert.equal(loadGame({getItem:()=>{throw Error('unavailable')}}),null);
});
