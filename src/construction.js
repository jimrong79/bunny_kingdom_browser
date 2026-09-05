import { requireRule } from './game.js';
import { fiefs } from './fiefs.js';
export function eligibleTerritories(state, playerId, card) {
  return Object.values(state.cells).filter(c => !c.building && c.owner === (card.category === 'camp' ? null : playerId) && (!card.placement.allowedTerrains || card.placement.allowedTerrains.includes(c.terrain))).map(c => c.coordinate);
}
export function placeBuilding(state, playerId, cardId, coordinates) {
  requireRule(state.phase === 'construction', 'It is not Construction.');
  const player = state.players[playerId], card = player.buildings.find(c => c.instanceId === cardId);
  requireRule(card && !player.ready, 'This building is not available.');
  requireRule(card.category !== 'camp', 'Camps require the priority procedure.');
  const amount = card.category === 'sky_tower' ? 2 : 1;
  const eligible = eligibleTerritories(state, playerId, card);
  requireRule(coordinates.length === amount && new Set(coordinates).size === amount && coordinates.every(c => eligible.includes(c)), 'Choose eligible territories with empty building slots.');
  if (card.category === 'sky_tower') {
    const groups = fiefs(state,playerId);
    requireRule(!groups.some(f=>coordinates.every(c=>f.coordinates.includes(c))), 'Sky Towers must connect different fiefs.');
  }
  for (const coordinate of coordinates) {
    let building = { category: card.category, cardId: card.id, instanceId: card.instanceId };
    if (card.category === 'city') building.strength = card.effect.strength;
    if (card.category === 'farm') Object.assign(building, { farmType: card.farmType, resource: card.effect.resource || null, choice: null });
    if (card.category === 'sky_tower') building.pairId = card.instanceId;
    state.cells[coordinate].building = building;
  }
  player.buildings = player.buildings.filter(c => c.instanceId !== cardId);
  state.log.push(`${player.name} placed ${card.name} at ${coordinates.join(' + ')}.`);
}
export function finishConstruction(state, playerId) {
  requireRule(state.phase === 'construction', 'It is not Construction.');
  state.players[playerId].ready = true;
  if (state.players.every(p=>p.ready)) {
    state.phase = 'markets';
    for (const p of state.players) p.ready = false;
    state.log.push('Construction complete. Choose Trading Post resources.');
  }
}
