import {eligibleTerritories} from './construction.js';
import {applyBuilding,planBuildings} from './bot-planning.js';

export function planCamps(view,playerId,cardId) {
  const card=view.players[playerId].buildings.find(c=>c.instanceId===cardId);
  if(card?.category!=='camp')return null;
  // Only combine uninterrupted offers to this player. Replan after a rival's
  // turn instead of assuming that a future Camp destination will stay empty.
  const cards=[cardId],queue=view.campQueue||[];
  if(queue[0]?.playerId===playerId&&queue[0].cardId===cardId) {
    for(const offer of queue.slice(1)) {
      if(offer.playerId!==playerId)break;
      cards.push(offer.cardId);
    }
  }
  let beam=[{view,coordinates:[]}];
  for(const id of cards) {
    const next=[];
    for(const node of beam) {
      const camp=node.view.players[playerId].buildings.find(c=>c.instanceId===id);
      for(const coordinate of [null,...eligibleTerritories(node.view,playerId,camp)]) {
        const trial=coordinate===null?node.view:applyBuilding(node.view,playerId,{cardId:id,coordinates:[coordinate]});
        // Keep the Camp-only board in the search: buildings are placed after
        // all Camp offers. Score its best construction, including saved cards,
        // so farms, cities, building slots and District Coins count together.
        const value=planBuildings(trial,playerId).value;
        next.push({view:trial,coordinates:[...node.coordinates,coordinate],value});
      }
    }
    // Evaluate every location, then retain four plans for the next Camp.
    // Stable ties keep the save option ahead of an equally useful placement.
    next.sort((a,b)=>b.value-a.value);
    beam=next.slice(0,4);
  }
  return beam[0].coordinates[0];
}
