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
  view.players = view.players.map(p => p.id === playerId ? { ...p, reserve: { count: p.reserve.length } } : { ...p, hand: { count: p.hand.length }, reserve: { count: p.reserve.length }, parchments: ['parchments','finished'].includes(state.phase) ? p.parchments : { count: p.parchments.length }, discarded: { count: p.discarded.length } });
  return view;
}

export function pickCount(state) { return state.players.length === 2 ? 1 : 2; }
export function playCard(state, playerId, card) {
  const player = state.players[playerId];
  if (card.category === 'parchment') { player.parchments.push(card); state.log.push(`${player.name} kept a parchment.`); return; }
  player.played.push(card);
  if (card.category === 'territory') {
    const cell = state.cells[card.coordinate];
    if (cell.building?.category === 'camp') cell.building = null;
    cell.owner = playerId;
    state.log.push(`${player.name} claimed ${card.coordinate}.`);
  } else if (card.category === 'provisions') {
    requireRule(state.deck.length >= 2, 'Not enough cards for Provisions.');
    const drawn = state.deck.splice(0, 2);
    state.log.push(`${player.name} played Provisions and drew 2 cards.`);
    for (const extra of drawn) playCard(state, playerId, extra);
  } else {
    player.buildings.push(card);
    state.log.push(`${player.name} reserved ${card.name}.`);
  }
}
export function resolveDraft(state, selections) {
  requireRule(state.phase === 'draft', 'It is not the Exploration phase.');
  requireRule(selections.length === state.players.length, 'Every player must confirm a selection.');
  // Validate the entire simultaneous pick before making any changes.
  for (const p of state.players) {
    const pick = selections[p.id];
    requireRule(pick && Array.isArray(pick.play) && Array.isArray(pick.discard), 'Invalid selection.');
    requireRule(pick.play.length === pickCount(state) && pick.discard.length === (state.players.length === 2 ? 1 : 0), 'Select the required play/discard cards.');
    const ids = [...pick.play, ...pick.discard];
    requireRule(new Set(ids).size === ids.length && ids.every(id => p.hand.some(c => c.instanceId === id)), 'Select distinct cards from your own hand.');
  }
  const plays = state.players.map(p => {
    const pick = selections[p.id], cards = pick.play.map(id => p.hand.find(c => c.instanceId === id));
    p.discarded.push(...p.hand.filter(c => pick.discard.includes(c.instanceId)));
    p.hand = p.hand.filter(c => ![...pick.play, ...pick.discard].includes(c.instanceId));
    return cards;
  });
  for (const p of state.players) for (const card of plays[p.id]) playCard(state, p.id, card);
  if (state.players.every(p => p.hand.length === 0)) {
    state.phase = 'construction'; state.log.push('Exploration finished. Construction begins.');
    return;
  }
  const hands = state.players.map(p => p.hand), direction = state.round % 2 ? 1 : -1;
  for (const p of state.players) p.hand = hands[(p.id - direction + hands.length) % hands.length];
  if (state.players.length === 2) for (const p of state.players) {
    requireRule(p.reserve.length > 0, 'Missing two-player reserve card.');
    p.hand.push(p.reserve.shift());
  }
  state.draftTurn++;
}
