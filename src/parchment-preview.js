import { publicView } from './game.js';
import { copyOptions, evaluateFinal } from './scoring.js';

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
