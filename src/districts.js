import {hasExpansion} from './config.js';
import {fiefs} from './fiefs.js';
export const districts = (state,playerId) => fiefs(state,playerId).filter(f=>f.coordinates.length>=2);
export function districtSnapshot(state,playerId) {
  return hasExpansion(state)?new Set([
    ...Object.values(state.cells).filter(c=>c.districtUsed).map(c=>c.coordinate),
    ...districts(state,playerId).flatMap(f=>f.coordinates),
  ]):null;
}
export function rememberDistricts(state,playerId,groups=districts(state,playerId)) {
  if(!hasExpansion(state))return;
  for(const f of groups)for(const id of f.coordinates)state.cells[id].districtUsed=true;
}
export function gainCoins(state,playerId,amount,reason,coordinates=[]) {
  if(!hasExpansion(state)||!amount)return;
  const player=state.players[playerId];player.coins+=amount;
  player.coinEvents.push({round:state.round,pick:state.draftTurn,amount,reason,coordinates:[...coordinates]});
  state.log.push(`${player.name} collected ${amount} Coin${amount===1?'':'s'} (${reason}).`);
}
export function awardNewDistricts(state,playerId,before,changed) {
  if(!before)return;
  const groups=districts(state,playerId);
  for(const f of groups)if(f.coordinates.some(id=>changed.includes(id))&&!f.coordinates.some(id=>before.has(id)))gainCoins(state,playerId,1,'new District',f.coordinates);
  for(const id of before)state.cells[id].districtUsed=true;
  rememberDistricts(state,playerId,groups);
}
