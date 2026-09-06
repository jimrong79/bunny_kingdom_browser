import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { data } from './fixtures.js';
import { saveGame, loadGame, validSave, exportGame } from '../src/storage.js';
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
test('custom and legacy names survive saves and exports without changing the deal',()=>{
 const name='Jim <Bunny> & "Co"',s=createGame(data,3,'names',`  ${name}  `),store=memory();
 assert.equal(s.players[0].name,name);
 assert.deepEqual(s.players.slice(1).map(p=>p.name),['Sir Rabbiton','Lady Cottontail','Duke Hopsworth']);
 assert.deepEqual(s.players.map(p=>p.hand),createGame(data,3,'names').players.map(p=>p.hand));
 assert.ok(saveGame(s,{},store));assert.deepEqual(loadGame(store).game,s);
 assert.deepEqual(JSON.parse(exportGame(s).text).game,s);
 s.players.forEach((p,i)=>{p.name=i?`Bot ${i}`:'You';});
 saveGame(s,{},store);assert.deepEqual(loadGame(store).game,s);
 for(const invalid of ['', '   ', null, 5, 'x'.repeat(25)]) {
  s.players[0].name=invalid;assert.equal(validSave(s),false);
 }
});
test('blank names default to You and royal names stay distinct from the human',()=>{
 assert.equal(createGame(data,1,'names','   ').players[0].name,'You');
 assert.equal(createGame(data,1,'names','A'.repeat(30)).players[0].name.length,24);
 const names=createGame(data,3,'names','sir rabbiton').players.map(p=>p.name.toLowerCase());
 assert.equal(new Set(names).size,4);
});
