export const COLORS = ['#c84164', '#3978a8', '#a37514', '#655bb5'];
export function requireRule(ok, message) { if (!ok) throw new Error(message); }
export function randomSource(seed) {
  let value = 2166136261;
  for (const char of String(seed)) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function makeDeck(data) {
  const territories = data.map.cells.map(cell => ({ id: `territory_${cell.coordinate}`, instanceId: `territory_${cell.coordinate}`, category: 'territory', name: cell.coordinate, coordinate: cell.coordinate, terrain: cell.terrain }));
  const others = [...data.buildings.cards, ...data.parchments.cards].flatMap(card => Array.from({ length: card.copies }, (_, i) => ({ ...structuredClone(card), instanceId: `${card.id}_${i + 1}` })));
  const deck = [...territories, ...others];
  requireRule(deck.length === 182 && new Set(deck.map(c => c.instanceId)).size === 182, 'The base deck must contain 182 unique cards.');
  return deck;
}
export function createGame(data, botCount, seed = Date.now()) {
  requireRule(Number.isInteger(botCount) && botCount >= 1 && botCount <= 3, 'Choose 1, 2, or 3 opponents.');
  const deck = makeDeck(data), rng = randomSource(seed);
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const state = {
    version: 1, seed: String(seed), round: 0, phase: 'setup', draftTurn: 0, deck,
    cells: Object.fromEntries(data.map.cells.map(c => [c.coordinate, { ...c, owner: null, building: c.startingCityStrength ? { category: 'city', strength: c.startingCityStrength, initial: true } : null }])),
    blockedConnections: structuredClone(data.map.blockedConnections),
    players: Array.from({ length: botCount + 1 }, (_, id) => ({ id, name: id ? `Bot ${id}` : 'You', bot: id !== 0, color: COLORS[id], score: 0, hand: [], reserve: [], buildings: [], parchments: [], played: [], discarded: [], harvests: [], ready: false })),
    log: [], history: [],
  };
  beginRound(state);
  return state;
}
export function beginRound(state) {
  requireRule(state.round < 4, 'All four rounds have been dealt.');
  state.round++; state.draftTurn = 1; state.phase = 'draft';
  const size = state.players.length === 3 ? 12 : 10;
  for (const p of state.players) {
    p.hand = state.deck.splice(0, size);
    p.reserve = state.players.length === 2 ? state.deck.splice(0, 10) : [];
    p.ready = false;
  }
  if (state.players.length === 2) for (const p of state.players) p.hand.push(p.reserve.shift());
  state.log.push(`Round ${state.round}: ${size} cards per hand${state.players.length === 2 ? ', plus 10 reserve cards. First reserve card added' : ''}.`);
}
export function publicView(state, playerId) {
  const view = structuredClone(state);
  view.deck = { count: state.deck.length };
  view.players = view.players.map(p => p.id === playerId ? { ...p, reserve: { count: p.reserve.length } } : { ...p, hand: { count: p.hand.length }, reserve: { count: p.reserve.length }, parchments: { count: p.parchments.length }, discarded: { count: p.discarded.length } });
  return view;
}
