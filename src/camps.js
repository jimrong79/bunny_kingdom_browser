import { requireRule } from './game.js';
import { eligibleTerritories } from './construction.js';
function availableCamps(state) {
  return state.players.flatMap(p=>p.buildings.filter(c=>c.category==='camp').map(card=>({playerId:p.id,cardId:card.instanceId,priority:card.effect.priority}))).sort((a,b)=>a.priority-b.priority);
}
export function beginCampOffers(state) {
  requireRule(state.phase==='construction','Camp offers happen during Construction.');
  state.campQueue=availableCamps(state);
  if(state.campQueue.length) state.phase='camps';
}
export function requestCamp(state, playerId, cardId) {
  requireRule(state.phase==='construction'&&!state.players[playerId].ready,'You cannot announce a Camp now.');
  const available=availableCamps(state), requested=available.find(c=>c.playerId===playerId&&c.cardId===cardId);
  requireRule(requested,'You do not hold that Camp.');
  // Only announce priority. No target is selected until lower priorities have responded.
  state.campQueue=available.filter(c=>c.priority<requested.priority||c.cardId===cardId);
  state.phase='camps';
  state.log.push(`${state.players[playerId].name} announced Camp ${requested.priority}. Lower priorities may act first.`);
}
export function respondCamp(state, playerId, coordinate=null) {
  requireRule(state.phase==='camps','No Camp decision is pending.');
  const next=state.campQueue[0];
  requireRule(next?.playerId===playerId,'Wait for the lower-priority Camp decision.');
  const player=state.players[playerId], card=player.buildings.find(c=>c.instanceId===next.cardId);
  requireRule(card,'Camp card is no longer available.');
  if(coordinate!==null) {
    requireRule(eligibleTerritories(state,playerId,card).includes(coordinate),'Camps need a territory with no rabbit or building.');
    state.cells[coordinate].owner=playerId;
    state.cells[coordinate].building={category:'camp',instanceId:card.instanceId,cardId:card.id,priority:card.effect.priority};
    player.buildings=player.buildings.filter(c=>c.instanceId!==card.instanceId);
    state.log.push(`${player.name} placed Camp ${card.effect.priority} at ${coordinate}.`);
  } else state.log.push(`${player.name} saved Camp ${card.effect.priority} for later.`);
  state.campQueue.shift();
  if(!state.campQueue.length) state.phase='construction';
}
