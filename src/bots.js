// Receives only the information visible to this player, never the deck or rival hands.
export function cardValue(view, playerId, card) {
  const own = Object.values(view.cells).filter(c => c.owner === playerId);
  if (card.category === 'territory') {
    const cell = view.cells[card.coordinate];
    const neighbors = own.filter(c => Math.abs(c.row.charCodeAt(0) - cell.row.charCodeAt(0)) + Math.abs(c.column - cell.column) === 1).length;
    return 4 + neighbors * 3 + (cell.baseResource ? 3 : 0) + (cell.building?.category === 'city' ? cell.building.strength * 3 : 0) + (cell.owner === playerId ? -6 : 0);
  }
  if (card.category === 'provisions') return 12;
  if (card.category === 'city') return own.length ? card.effect.strength * 3 + 2 : 3;
  if (card.category === 'farm') return own.length ? (card.farmType === 'luxury' ? 8 : 5) : 2;
  if (card.category === 'camp') return 8 - card.effect.priority * 0.15;
  if (card.category === 'sky_tower') return own.length > 3 ? 7 : 2;
  if (card.category === 'parchment') {
    const s = card.scoringSpec;
    if (s.type === 'fixed_points') return s.points;
    if (s.resource) return 2 + own.filter(c => c.baseResource === s.resource).length * (s.pointsPerUnit || 2);
    if (s.type === 'copy_parchment') return 6;
    return 4 + view.round;
  }
  return 0;
}
export function chooseDraft(view, playerId) {
  const cards = [...view.players[playerId].hand].sort((a,b) => cardValue(view,playerId,b) - cardValue(view,playerId,a) || a.instanceId.localeCompare(b.instanceId));
  return { play: cards.slice(0, view.players.length === 2 ? 1 : 2).map(c=>c.instanceId), discard: view.players.length === 2 ? [cards[1].instanceId] : [] };
}

import { fiefs } from './fiefs.js';
import { eligibleTerritories, placeBuilding } from './construction.js';
export function positionValue(view, playerId) {
  return fiefs(view,playerId).reduce((sum,f) => sum + f.points * (5-view.round) + f.wealth * 1.5 + f.strength + f.coordinates.length * 0.15, 0);
}
export function chooseBuilding(view, playerId) {
  let best = null, bestValue = -Infinity;
  for (const card of view.players[playerId].buildings.filter(c=>c.category!=='camp')) {
    const eligible = eligibleTerritories(view,playerId,card);
    const groups = fiefs(view,playerId);
    const choices = card.category === 'sky_tower' ? eligible.flatMap((a,i)=>eligible.slice(i+1).filter(b=>!groups.some(f=>f.coordinates.includes(a)&&f.coordinates.includes(b))).map(b=>[a,b])) : eligible.map(c=>[c]);
    for (const coordinates of choices) {
      const trial = structuredClone(view);
      placeBuilding(trial,playerId,card.instanceId,coordinates);
      const value = positionValue(trial,playerId);
      if (value > bestValue) { bestValue=value; best={ cardId:card.instanceId,coordinates }; }
    }
  }
  return best;
}

export function chooseCamp(view, playerId, cardId) {
  const card=view.players[playerId].buildings.find(c=>c.instanceId===cardId);
  let best=null,value=-Infinity;
  for(const coordinate of eligibleTerritories(view,playerId,card)) {
    const trial=structuredClone(view);
    trial.cells[coordinate].owner=playerId;
    trial.cells[coordinate].building={category:'camp',priority:card.effect.priority};
    const candidate=positionValue(trial,playerId);
    if(candidate>value) {value=candidate;best=coordinate;}
  }
  return best;
}

import { BASIC_RESOURCES, tradingPosts } from './harvest.js';
import { resourcesAt } from './fiefs.js';
export function chooseMarkets(view, playerId) {
  const posts=tradingPosts(view,playerId);
  let best=[],bestValue=-Infinity;
  function visit(index, choices) {
    if(index<posts.length) {for(const resource of BASIC_RESOURCES) visit(index+1,[...choices,{coordinate:posts[index].coordinate,resource}]);return;}
    const trial=structuredClone(view);
    for(const c of choices) trial.cells[c.coordinate].building.choice=c.resource;
    let value=positionValue(trial,playerId);
    if(view.round===4) {
      const production=Object.values(trial.cells).filter(c=>c.owner===playerId).flatMap(resourcesAt);
      for(const card of trial.players[playerId].parchments) {
        const s=card.scoringSpec,n=production.filter(r=>r===s.resource).length;
        if(s.type==='points_per_resource') value+=n*s.pointsPerUnit;
        if(s.type==='resource_threshold'&&n>=s.minimum) value+=s.points;
      }
    }
    if(value>bestValue) {bestValue=value;best=choices;}
  }
  visit(0,[]);return best;
}

import { basePoints, playerStats, copyOptions, isCopy } from './scoring.js';
export function chooseCopies(view, playerId, decisions) {
  const player=view.players[playerId],stats=playerStats(view,playerId),result={};
  for(const copy of player.parchments.filter(isCopy)) {
    const options=copyOptions(view,playerId,copy).cards.filter(c=>!isCopy(c));
    let best=null,bestValue=-Infinity;
    for(const target of options) {
      const effective=player.parchments.map(c=>c.instanceId===copy.instanceId?target:c);
      let value=basePoints(target,stats,effective) ?? 5;
      if(target.scoringSpec.type==='multiply_treasure_values') {
        const already=effective.filter(c=>c.scoringSpec.type==='multiply_treasure_values').length>1;
        value=already?-1:effective.filter(c=>c.parchmentType==='treasure').reduce((sum,c)=>sum+basePoints(c,stats,effective),0);
      }
      if(target.parchmentType==='treasure') value+=effective.filter(c=>c.id==='treasure_guardian').length*3;
      if(value>bestValue){bestValue=value;best=target;}
    }
    if(best)result[copy.instanceId]=best.instanceId;
    else if(copyOptions(view,playerId,copy).cards.length) result[copy.instanceId]=copyOptions(view,playerId,copy).cards[0].instanceId;
  }
  return result;
}
