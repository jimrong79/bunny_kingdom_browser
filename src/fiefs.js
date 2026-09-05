export function resourcesAt(cell) {
  const produced = cell.baseResource ? [cell.baseResource] : [];
  if (cell.building?.category === 'farm') {
    const resource = cell.building.resource || cell.building.choice;
    if (resource) produced.push(resource);
  }
  return produced;
}
export function fiefs(state, playerId) {
  const owned = Object.values(state.cells).filter(c => c.owner === playerId);
  const pending = new Set(owned.map(c => c.coordinate));
  const blocked = new Set(state.blockedConnections.flatMap(e => [e.from + ':' + e.to, e.to + ':' + e.from]));
  const pairs = new Map();
  for (const c of owned) if (c.building?.category === 'sky_tower') {
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
      const adjacent = [c.row + (c.column - 1), c.row + (c.column + 1), String.fromCharCode(c.row.charCodeAt(0) - 1) + c.column, String.fromCharCode(c.row.charCodeAt(0) + 1) + c.column].filter(to => !blocked.has(id + ':' + to));
      if (c.building?.category === 'sky_tower') adjacent.push(...pairs.get(c.building.pairId));
      for (const next of adjacent) if (pending.delete(next)) queue.push(next);
    }
    const production = cells.flatMap(resourcesAt), resources = [...new Set(production)].sort();
    const strength = cells.reduce((n,c) => n + (c.building?.category === 'city' ? c.building.strength : 0), 0);
    result.push({ coordinates: cells.map(c => c.coordinate), strength, resources, production, wealth: resources.length, points: strength * resources.length });
  }
  return result;
}
