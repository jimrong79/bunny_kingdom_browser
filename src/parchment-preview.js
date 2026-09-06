import { publicView } from './game.js';
import { basePoints, copyOptions, evaluateFinal, isCopy, playerStats } from './scoring.js';

// Preview exactly the choices that will be used when the dropdown changes.
export function copyChoiceDecisions(decisions, cardId, targetId) {
  const next=structuredClone(decisions||{copies:{},rulings:{},copyResolutions:{}});
  next.copies||={};
  if(next.copies[cardId]!==targetId) {
    next.copies[cardId]=targetId;
    next.copyResolutions={};next.rulings={};
  }
  return next;
}

export function copyScoreOptions(state, playerId, card, decisions=state.scoringDecisions) {
  if(state.phase!=='parchments')return [];
  const view=publicView(state,playerId);
  return copyOptions(view,playerId,card).cards.map(target=>{
    const result=evaluateFinal(view,copyChoiceDecisions(decisions,card.instanceId,target.instanceId));
    const own=result.players[playerId],row=own.rows.find(r=>r.id===card.instanceId);
    return {card:target,points:row?.points??null,total:own.total,
      complete:own.rows.every(r=>r.points!==null)};
  }).sort((a,b)=>Number(b.complete)-Number(a.complete)||
    (a.complete?b.total-a.total:0)||a.card.name.localeCompare(b.card.name)||a.card.instanceId.localeCompare(b.card.instanceId));
}

// Only effects already known to this player count toward a draft estimate.
// Keep unresolved copies in the list so Bureaucrat still counts every parchment.
function knownDraftPoints(view, playerId, cards, stats) {
  const hunters=cards.filter(c=>c.scoringSpec.type==='multiply_treasure_values').length;
  const treasureValue=cards.filter(c=>c.parchmentType==='treasure').reduce((sum,c)=>sum+basePoints(c,stats,cards),0);
  const multiplierPending=hunters>1&&treasureValue>0;
  const territories=view.players.map(p=>Object.values(view.cells).filter(c=>c.owner===p.id).length);
  const most=Math.max(...territories);
  const points=new Map(cards.map(card=>{
    let value=basePoints(card,stats,cards);
    if(card.scoringSpec.type==='territory_lead_bonus')value=stats.cells.length<most?0:
      territories.filter(n=>n===most).length===1?card.scoringSpec.points:null;
    if(card.parchmentType==='treasure')value=multiplierPending?null:value*(hunters?2:1);
    return [card.instanceId,value];
  }));
  return {points,multiplierPending,total:[...points.values()].reduce((sum,n)=>sum+(n??0),0)};
}

export function draftParchmentPreview(state, playerId, card) {
  if(state.phase!=='draft'||card.category!=='parchment')return null;
  if(isCopy(card))return {points:null,reason:'Choose a neighbor’s revealed parchment after the fourth harvest.'};
  if(card.scoringSpec.type==='rank_bonus')return {points:null,reason:'Depends on final ranking, including other players’ secret parchments.'};
  const view=publicView(state,playerId),kept=view.players[playerId].parchments;
  const stats=playerStats(view,playerId);
  const before=knownDraftPoints(view,playerId,kept,stats);
  const after=knownDraftPoints(view,playerId,[...kept,card],stats);
  const points=after.points.get(card.instanceId);
  if(after.multiplierPending)return {points:null,reason:'A ruling is needed for multiple Treasure Hunter effects.'};
  if(points===null)return {points:null,reason:'You are tied for most territories; this award needs a tie ruling.'};
  const notes=[];
  if(kept.some(isCopy))notes.push('Unchosen copy effects are excluded.');
  if(kept.some(c=>c.scoringSpec.type==='rank_bonus'))notes.push('Final-rank bonuses are excluded.');
  if(stats.cells.some(c=>c.building?.farmType==='trading_post'&&!c.building.choice))notes.push('Unassigned Trading Posts are not counted.');
  const gain=after.total-before.total;
  return {points,gain,otherPoints:gain-points,notes};
}
