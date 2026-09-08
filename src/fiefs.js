import {neighborsOf,boardOf} from './topology.js';
export function resourcesAt(cell) {
  const produced = cell.baseResource ? [cell.baseResource] : [];
  if (cell.building?.category === 'farm') {
    const resource = cell.building.resource || cell.building.choice;
    if (resource) produced.push(resource);
  }
  return produced;
}
export function fiefs(state, playerId, {ignoreLinks=false,boardId=null,harvest=false}={}) {
  const owned = Object.values(state.cells).filter(c => c.owner === playerId && (!boardId || boardOf(c)===boardId));
  const pending = new Set(owned.map(c => c.coordinate));
  const pairs = new Map();
  for (const c of owned) if (!ignoreLinks && ['sky_tower','rainbow'].includes(c.building?.category)) {
    const key = c.building.pairId;
    if (!pairs.has(key)) pairs.set(key, []);
    pairs.get(key).push(c.coordinate);
  }
  const result = [];
  while (pending.size) {
    const queue = [pending.values().next().value], cells = [];
    pending.delete(queue[0]);
    while (queue.length) {
      const id = queue.shift(), c = state.cells[id]; cells.push(c);
      const adjacent = neighborsOf(state,c);
      if (!ignoreLinks && ['sky_tower','rainbow'].includes(c.building?.category)) adjacent.push(...(pairs.get(c.building.pairId)||[]));
      for (const next of adjacent) if (pending.delete(next)) queue.push(next);
    }
    const production = cells.flatMap(resourcesAt), resources = [...new Set(production)].sort();
    const ordinaryStrength = cells.reduce((n,c) => n + (c.building?.category === 'city' && c.building.cityType!=='carrotadel' ? c.building.strength : 0), 0);
    const strength = Math.max(ordinaryStrength,cells.some(c=>c.building?.cityType==='carrotadel')?5:0);
    result.push({ coordinates: cells.map(c => c.coordinate), strength, resources, production, wealth: resources.length, points: strength * resources.length });
  }
  if(harvest) {
    const shared=[...new Set(owned.filter(c=>c.building?.category==='chimney').flatMap(c=>{
      const group=result.find(f=>f.coordinates.includes(c.coordinate)),choice=c.building.choice;
      return ['wood','fish','carrots'].includes(choice)&&group.resources.includes(choice)?[choice]:[];
    }))];
    for(const group of result)if(group.coordinates.some(id=>boardOf(state.cells[id])==='new_world')) {
      group.sharedResources=shared.filter(r=>!group.resources.includes(r));
      group.resources=[...new Set([...group.resources,...shared])].sort();
      group.wealth=group.resources.length;group.points=group.strength*group.wealth;
    }
  }
  return result;
}
