import {readFileSync} from 'node:fs';
import {data} from './fixtures.js';
import {createGame,makeDeck} from '../src/game.js';
export const skyData={...data,cloud:JSON.parse(readFileSync(new URL('../data/maps/great-cloud.json',import.meta.url))),expansion:JSON.parse(readFileSync(new URL('../data/cards/in-the-sky.json',import.meta.url)))};
export const skyGame=(n=3,seed='sky')=>createGame(skyData,n-1,seed,'',{expansion:'in_the_sky'});
export const skyCard=id=>makeDeck(skyData,true).find(c=>c.id===id||c.instanceId===id);
export function giveBuilding(s,id,player=0){const c=skyCard(id);s.players[player].buildings.push(c);s.phase='construction';return c.instanceId;}
