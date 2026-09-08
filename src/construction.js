import { requireRule } from './game.js';
import { fiefs } from './fiefs.js';
import {boardOf} from './topology.js';
import {districtSnapshot,awardNewDistricts} from './districts.js';
export function eligibleTerritories(state, playerId, card) {
  const source=card.category==='rainbow'?fiefs(state,playerId).find(f=>f.coordinates.includes(card.effect.cloud)):null;
  return Object.values(state.cells).filter(c => !c.building && c.owner === (card.category === 'camp' ? null : playerId) && (!card.placement?.allowedTerrains || card.placement.allowedTerrains.includes(c.terrain)) && (!card.placement?.allowedBoards || card.placement.allowedBoards.includes(boardOf(c))) && (card.category!=='rainbow'||source&&!source.coordinates.includes(c.coordinate))).map(c => c.coordinate);
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
  if(card.category==='rainbow') {
    requireRule(state.cells[card.effect.cloud]?.owner===playerId,'You must control the cloud endpoint.');
    requireRule(!fiefs(state,playerId).some(f=>f.coordinates.includes(card.effect.cloud)&&f.coordinates.includes(coordinates[0])),'Rainbows must connect different fiefs.');
  }
  const before=districtSnapshot(state,playerId);
  for (const coordinate of coordinates) {
    let building = { category: card.category, cardId: card.id, instanceId: card.instanceId };
    if (card.category === 'city') {building.strength = card.effect.strength;if(card.cityType)building.cityType=card.cityType;}
    if (card.category === 'farm') Object.assign(building, { farmType: card.farmType, resource: card.effect.resource || null, choice: null });
    if (card.category === 'sky_tower') building.pairId = card.instanceId;
    if(card.category==='rainbow')Object.assign(building,{pairId:card.effect.pairId,endpoint:'ground'});
    if(card.category==='chimney')building.choice=null;
    state.cells[coordinate].building = building;
  }
  player.buildings = player.buildings.filter(c => c.instanceId !== cardId);
  state.log.push(`${player.name} placed ${card.name} at ${coordinates.join(' + ')}.`);
  awardNewDistricts(state,playerId,before,coordinates);
}
export function movableRainbows(state,playerId) {
  return Object.values(state.cells).filter(c=>c.owner===playerId&&c.building?.category==='rainbow'&&c.building.endpoint==='ground');
}
export function rainbowDestinations(state,playerId,pairId) {
  const old=movableRainbows(state,playerId).find(c=>c.building.pairId===pairId);
  if(!old)return [];
  const trial={...state,cells:{...state.cells,[old.coordinate]:{...old,building:null}}};
  const source=Object.values(trial.cells).find(c=>c.owner===playerId&&c.building?.category==='rainbow'&&c.building.pairId===pairId);
  if(!source)return [];
  const group=fiefs(trial,playerId).find(f=>f.coordinates.includes(source.coordinate));
  return eligibleTerritories(trial,playerId,{placement:{allowedBoards:['new_world']}}).filter(id=>!group.coordinates.includes(id));
}
export function moveRainbow(state,playerId,pairId,coordinate) {
  requireRule(state.phase==='construction'&&!state.players[playerId].ready,'Rainbows move during your Construction phase.');
  const old=movableRainbows(state,playerId).find(c=>c.building.pairId===pairId);
  requireRule(old&&rainbowDestinations(state,playerId,pairId).includes(coordinate),'Choose an owned New World territory with an empty slot in a different fief.');
  if(old.coordinate===coordinate)return;
  state.cells[coordinate].building=old.building;old.building=null;
  state.log.push(`${state.players[playerId].name} moved Rainbow ${pairId.split('_').at(-1)} from ${old.coordinate} to ${coordinate}.`);
  // Moving or splitting a District never creates a coin reward.
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
