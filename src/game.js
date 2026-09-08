import {observeDraftHands} from './bot-memory.js';
import {playerNames} from './player-names.js';
import {hasExpansion, dealSize, cardsPerPick} from './config.js';
import {districtSnapshot,awardNewDistricts,gainCoins} from './districts.js';
export const COLORS = ['#c84164', '#3978a8', '#a37514', '#23834b', '#8254b1'];
export function requireRule(ok, message) { if (!ok) throw new Error(message); }
export function randomSource(seed) {
  let value = 2166136261;
  for (const char of String(seed)) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function makeDeck(data, expansion = false) {
  requireRule(!expansion || data.cloud && data.expansion, 'Expansion data is missing.');
  const territories = [...data.map.cells,...(expansion?data.cloud.cells:[])].map(cell => ({ id: `territory_${cell.coordinate}`, instanceId: `territory_${cell.coordinate}`, category: 'territory', name: cell.coordinate, coordinate: cell.coordinate, terrain: cell.terrain, ...(cell.boardId?{boardId:cell.boardId,printedResource:cell.startingBuilding?.resource||cell.baseResource,startingCityStrength:cell.startingCityStrength}:{}), ...(cell.startingBuilding?.category==='rainbow'?{rainbow:cell.startingBuilding.pairId}:{}) }));
  const others = [...data.buildings.cards, ...data.parchments.cards,...(expansion?[...data.expansion.cards,...data.expansion.parchments]:[])].flatMap(card => Array.from({ length: card.copies }, (_, i) => ({ ...structuredClone(card), instanceId: `${card.id}_${i + 1}` })));
  const deck = [...territories, ...others];
  const expected=expansion?232:182;
  requireRule(deck.length === expected && new Set(deck.map(c => c.instanceId)).size === expected, `The deck must contain ${expected} unique cards.`);
  return deck;
}
export function createGame(data, botCount, seed = Date.now(), playerName = '', options = {}) {
  const expansion=options.expansion==='in_the_sky';
  requireRule(Number.isInteger(botCount) && botCount >= 1 && botCount <= (expansion?4:3), 'Choose a supported number of opponents.');
  const deck = makeDeck(data,expansion), rng = randomSource(seed), names = playerNames(playerName);
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const state = {
    version: 1, seed: String(seed), round: 0, phase: 'setup', draftTurn: 0, deck,
    ...(expansion?{expansion:'in_the_sky',districtHistoryVersion:1,resourceKinds:Object.fromEntries([...data.buildings.resources,...data.expansion.resources].map(r=>[r.id,r.kind]))}:{}),
    cells: Object.fromEntries([...data.map.cells,...(expansion?data.cloud.cells:[])].map(c => [c.coordinate, { ...structuredClone(c), owner: null, building: c.startingCityStrength ? { category: 'city', strength: c.startingCityStrength, initial: true } : structuredClone(c.startingBuilding||null) }])),
    blockedConnections: structuredClone(data.map.blockedConnections),
    players: Array.from({ length: botCount + 1 }, (_, id) => ({ id, name: names[id], bot: id !== 0, color: COLORS[id], score: 0, ...(expansion?{coins:0,coinEvents:[]}:{}), hand: [], reserve: [], buildings: [], parchments: [], played: [], discarded: [], harvests: [], ready: false })),
    log: [], history: [], lastTurn: null,
  };
  beginRound(state);
  return state;
}
export function beginRound(state) {
  requireRule(state.round < 4, 'All four rounds have been dealt.');
  state.round++; state.draftTurn = 1; state.phase = 'draft';
  const size = dealSize(state);
  for (const p of state.players) {
    p.hand = state.deck.splice(0, size);
    p.reserve = state.players.length === 2 ? state.deck.splice(0, size) : [];
    p.ready = false;
  }
  if (state.players.length === 2) for (const p of state.players) p.hand.push(p.reserve.shift());
  state.log.push(`Round ${state.round}: ${size} cards per hand${state.players.length === 2 ? `, plus ${size} reserve cards. First reserve card added` : ''}.`);
}
export function publicView(state, playerId) {
  const view = structuredClone(state);
  view.deck = { count: state.deck.length };
  view.players = view.players.map(p => {
    if(p.id===playerId)return {...p,reserve:{count:p.reserve.length}};
    const {draftMemory,...visible}=p;
    return {...visible,hand:{count:p.hand.length},reserve:{count:p.reserve.length},parchments:['parchments','finished'].includes(state.phase)?p.parchments:{count:p.parchments.length},discarded:{count:p.discarded.length}};
  });
  return view;
}

export function pickCount(state) { return cardsPerPick(state); }
export function draftRecipient(state, playerId) {
  return (playerId + (state.round % 2 ? 1 : -1) + state.players.length) % state.players.length;
}
export function playCard(state, playerId, card, actions=null, deferCoins=false) {
  const player = state.players[playerId];
  if (card.category === 'parchment') { player.parchments.push(card); actions?.push({type:'parchment'}); state.log.push(`${player.name} kept a parchment.`); return; }
  player.played.push(card);
  if (card.category === 'territory') {
    const before=deferCoins?null:districtSnapshot(state,playerId);
    const cell = state.cells[card.coordinate];
    actions?.push({type:'territory',coordinate:card.coordinate,campOwner:cell.building?.category==='camp'?cell.owner:null});
    if (cell.building?.category === 'camp') cell.building = null;
    cell.owner = playerId;
    if(card.rainbow) {
      player.buildings.push({...card,category:'rainbow',name:`Rainbow ${card.rainbow.split('_').at(-1)}`,placement:{allowedTerrains:null,allowedBoards:['new_world']},effect:{pairId:card.rainbow,cloud:card.coordinate}});
      actions?.push({type:'building',name:'Rainbow'});
    }
    state.log.push(`${player.name} claimed ${card.coordinate}.`);
    awardNewDistricts(state,playerId,before,[card.coordinate]);
  } else if(card.category==='tax_collector') {
    gainCoins(state,playerId,2,'Tax Collector');actions?.push({type:'coins',count:2});
  } else if (card.category === 'provisions') {
    requireRule(state.deck.length >= 2, 'Not enough cards for Provisions.');
    const drawn = state.deck.splice(0, 2);
    actions?.push({type:'provisions'});
    state.log.push(`${player.name} played Provisions and drew 2 cards.`);
    for (const extra of drawn) playCard(state, playerId, extra, actions,deferCoins);
  } else {
    player.buildings.push(card);
    actions?.push({type:'building',name:card.name});
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
  observeDraftHands(state);
  const plays = state.players.map(p => {
    const pick = selections[p.id], cards = pick.play.map(id => p.hand.find(c => c.instanceId === id));
    p.discarded.push(...p.hand.filter(c => pick.discard.includes(c.instanceId)));
    p.hand = p.hand.filter(c => ![...pick.play, ...pick.discard].includes(c.instanceId));
    return cards;
  });
  const lastTurn={round:state.round,pick:state.draftTurn,players:state.players.map(p=>({playerId:p.id,actions:[]}))};
  const beforeDistricts=state.players.map(p=>districtSnapshot(state,p.id));
  const beforeCoins=state.players.map(p=>p.coins||0);
  for (const p of state.players) {
    const actions=lastTurn.players[p.id].actions;
    for (const card of plays[p.id]) playCard(state, p.id, card, actions,true);
    if(selections[p.id].discard.length)actions.push({type:'discard',count:selections[p.id].discard.length});
  }
  // Selected cards are played simultaneously; compare the completed pick with
  // its initial position, so array order cannot manufacture District coins.
  for(const p of state.players)awardNewDistricts(state,p.id,beforeDistricts[p.id],lastTurn.players[p.id].actions.filter(a=>a.type==='territory').map(a=>a.coordinate));
  if(hasExpansion(state))for(const p of state.players){const actions=lastTurn.players[p.id].actions,count=p.coins-beforeCoins[p.id]-actions.filter(a=>a.type==='coins').reduce((n,a)=>n+a.count,0);if(count)actions.push({type:'coins',count,reason:'District'});}
  state.lastTurn=lastTurn;
  if (state.players.every(p => p.hand.length === 0)) {
    state.phase = 'construction'; state.log.push('Exploration finished. Construction begins.');
    return;
  }
  const hands = state.players.map(p => p.hand);
  for (const p of state.players) state.players[draftRecipient(state,p.id)].hand = hands[p.id];
  if (state.players.length === 2) for (const p of state.players) {
    requireRule(p.reserve.length > 0, 'Missing two-player reserve card.');
    p.hand.push(p.reserve.shift());
  }
  state.draftTurn++;
}
