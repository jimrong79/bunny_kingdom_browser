import {draftRecipient} from './game.js';
import {forkPosition} from './bot-evaluation.js';
import {planBuildings} from './bot-planning.js';
import {selectionsPerPick} from './config.js';

export function campExposure(view,handSize) {
  const count=selectionsPerPick(view);
  if(handSize<=count)return 0;
  if(view.players.length===2) {
    // The recipient adds one reserve card, then plays one and discards one.
    // A discard also saves our camp, so only the played card is a capture risk.
    return 1/(handSize-1);
  }
  // Everyone must play two cards. If the hand cannot return, loss is certain.
  // Otherwise use the fraction played before our next look as a neutral estimate;
  // we cannot know opponents' preferences or secret objectives.
  return Math.min(1,count*(view.players.length-1)/(handSize-count));
}

export function passedCampPenalty(view,playerId,cards,exposure,secureValue) {
  const camps=cards.filter(c=>c.category==='territory'&&view.cells[c.coordinate].owner===playerId
    &&view.cells[c.coordinate].building?.category==='camp');
  if(!camps.length||!exposure)return 0;
  const lost=forkPosition(view,playerId);
  for(const card of camps) {
    const cell=lost.cells[card.coordinate];
    cell.owner=draftRecipient(view,playerId);cell.building=null;
  }
  // Replan after losing the land: connections, resources, private objectives and
  // remaining building placements can all change. Evaluate multiple camps together
  // so overlapping fiefs are not charged repeatedly. The next recipient stands in
  // for an unknown eventual captor; no rival private cards are consulted.
  const lostValue=planBuildings(lost,playerId,{depth:2,width:1,camps:true}).value;
  return exposure*Math.max(0,secureValue-lostValue);
}
