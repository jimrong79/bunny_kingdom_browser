import test from 'node:test';
import assert from 'node:assert/strict';
import {skyGame,skyCard,skyData} from './sky-fixture.js';
import {playCard} from '../src/game.js';
import {placeBuilding,moveRainbow} from '../src/construction.js';
import {animationEvents} from '../src/turn-animation.js';
test('Rainbow relocation keeps the building tray unchanged during playback',()=>{
 const s=skyGame();playCard(s,0,skyCard('territory_C5-2'));
 s.cells.A1.owner=0;s.cells.J10.owner=0;s.phase='construction';placeBuilding(s,0,'territory_C5-2',['A1']);
 const before=structuredClone(s);moveRainbow(s,0,'rainbow_1','J10');
 const events=animationEvents(before,s,skyData.expansion.cards);
 assert.equal(events.length,1);assert.equal(events[0].movedFrom,'A1');assert.equal(events[0].coordinate,'J10');assert.equal(events[0].removeFromTray,false);
 assert.equal(s.players[0].buildings.length,before.players[0].buildings.length);
});
test('coin playback identifies only public rewards and does not reveal parchments',()=>{
 const before=skyGame(),after=structuredClone(before);
 after.lastTurn={round:1,pick:1,players:[{playerId:0,actions:[{type:'coins',count:2},{type:'parchment'}]}]};
 const events=animationEvents(before,after,skyData.expansion.cards);
 assert.deepEqual(events,[{type:'coins',playerId:0,count:2},{type:'parchment',playerId:0}]);
});
