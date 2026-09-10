import {fiefs} from './fiefs.js';
import {resourceNames} from './card-text.js';

const afterHarvest=state=>['harvest','parchments','finished'].includes(state.phase);

// Inspection should explain the harvest that was awarded, including temporary
// Chimney access. Other phases show current production, without last round's bonus.
export function inspectionFiefs(state,playerId) {
  if(!afterHarvest(state))return fiefs(state,playerId);
  const lastRound=state.players[playerId].harvests?.at(-1)?.round;
  const recorded=lastRound===state.round?state.lastHarvest?.find(h=>h.playerId===playerId):null;
  return recorded?.fiefs??fiefs(state,playerId,{harvest:true});
}

export const inspectionLabel=state=>afterHarvest(state)?`Round ${state.round} harvest`:'Fief';

export function chimneyHarvestNote(group) {
  const shared=group.sharedResources||[];
  return shared.length?`Chimney: ${shared.map(r=>resourceNames[r]).join(', ')} (+${group.strength*shared.length} points this harvest)`:'';
}
