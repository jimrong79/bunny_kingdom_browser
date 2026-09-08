// Receives only the information visible to this player, never the deck or rival hands.
import {cardsPerPick} from './config.js';
export {chooseChimneys} from './bot-chimneys.js';
export {chooseRainbowMoves} from './bots.js';
export function cardValue(view, playerId, card) {
  const own = Object.values(view.cells).filter(c => c.owner === playerId);
  if (card.category === 'territory') {
    const cell=view.cells[card.coordinate],trial=structuredClone(view);
    trial.cells[card.coordinate].owner=playerId;
    if(trial.cells[card.coordinate].building?.category==='camp')trial.cells[card.coordinate].building=null;
    const gain=positionValue(trial,playerId)-positionValue(view,playerId);
    return 2+gain+(cell.owner===playerId?0.5:0)+(cell.owner!==null&&cell.owner!==playerId?2:0);
  }
  if (card.category === 'provisions') return 12;
  if (card.category === 'tax_collector') return 2*playerStats(view,playerId).uniqueResources.length+3;
  if (card.category === 'chimney') return 6;
  if (card.category === 'city') return own.length ? card.effect.strength * 3 + 2 : 3;
  if (card.category === 'farm') return own.length ? (card.farmType === 'luxury' ? 8 : 5) : 2;
  if (card.category === 'camp') return 8 - card.effect.priority * 0.15;
  if (card.category === 'sky_tower') return own.length > 3 ? 7 : 2;
  if (card.category === 'parchment') {
    const s = card.scoringSpec;
    const estimated=basePoints(card,playerStats(view,playerId),[...view.players[playerId].parchments,card]);
    if (s.type === 'fixed_points') return s.points;
    if(estimated!==null&&estimated>0)return estimated+(5-view.round)*0.7;
    if (s.resource) return 2 + own.filter(c => c.baseResource === s.resource).length * (s.pointsPerUnit || 2);
    if (s.type === 'copy_parchment') return 6;
    return 4 + view.round;
  }
  return 0;
}
export function chooseDraft(view, playerId) {
  const cards = [...view.players[playerId].hand].sort((a,b) => cardValue(view,playerId,b) - cardValue(view,playerId,a) || a.instanceId.localeCompare(b.instanceId));
  return { play: cards.slice(0, cardsPerPick(view)).map(c=>c.instanceId), discard: view.players.length === 2 ? [cards[1].instanceId] : [] };
}

import { fiefs } from './fiefs.js';
import { eligibleTerritories, placeBuilding } from './construction.js';
export function positionValue(view, playerId) {
  const groups=fiefs(view,playerId), player=view.players[playerId];
  let value=groups.reduce((sum,f)=>sum+f.points*(5-view.round)+f.wealth*1.5+f.strength+f.coordinates.length*0.15,0);
  if(Array.isArray(player.parchments)&&player.parchments.length) {
    const stats=playerStats(view,playerId);
    for(const card of player.parchments)value+=basePoints(card,stats,player.parchments)||0;
  }
  return value;
}
export function chooseBuilding(view, playerId) {
  let best = null, bestValue = positionValue(view,playerId) + 0.01;
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

import { basePoints, playerStats } from './scoring.js';
export {chooseCopies} from './bots.js';
