// A player's own observed hands are private information, even after the cards are passed.
export function observeDraftHands(state) {
  for(const player of state.players) {
    player.draftMemory??=[];
    player.draftMemory.push({round:state.round,pick:state.draftTurn,cards:player.hand.map(c=>c.instanceId)});
  }
}
export function knownTerritories(view,playerId) {
  const player=view.players[playerId],played=new Set(view.players.flatMap(p=>p.played.map(c=>c.instanceId)));
  const unavailable=new Set(Array.isArray(player.discarded)?player.discarded.filter(c=>c.category==='territory').map(c=>c.coordinate):[]);
  const circulating=new Set();
  for(const observation of player.draftMemory||[])for(const id of observation.cards) {
    if(!id.startsWith('territory_')||played.has(id))continue;
    const coordinate=id.slice('territory_'.length);
    if(observation.round===view.round&&view.phase==='draft')circulating.add(coordinate);
    // A previously seen territory that never got played was discarded when that round ended.
    else if(view.players.length===2)unavailable.add(coordinate);
  }
  for(const card of Array.isArray(player.hand)?player.hand:[])if(card.category==='territory')circulating.add(card.coordinate);
  for(const coordinate of unavailable)circulating.delete(coordinate);
  return {unavailable,circulating};
}
