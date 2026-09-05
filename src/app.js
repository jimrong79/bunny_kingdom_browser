import { createGame, publicView, resolveDraft } from './game.js';
import { chooseDraft, chooseBuilding, chooseCamp, chooseMarkets } from './bots.js';
import { eligibleTerritories, placeBuilding, finishConstruction } from './construction.js';
import { fiefs } from './fiefs.js';
import { beginCampOffers, requestCamp, respondCamp } from './camps.js';
import { tradingPosts, chooseResource, finishMarkets, advanceRound } from './harvest.js';
const app = document.querySelector('#app');
let data, state, selected = [], buildingId = null, targets = [], error = "";
export const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = { forest: '♣', field: '🥕', sea: '≈', mountain: '▲', plains: '·', city: '♜' };
try {
  const responses = await Promise.all(['data/maps/original-board.json', 'data/cards/base-buildings-and-provisions.json', 'data/cards/base-parchments.json'].map(async path => { const r = await fetch(path); if (!r.ok) throw Error(`Could not load ${path}`); return r.json(); }));
  data = { map: responses[0], buildings: responses[1], parchments: responses[2] };
  setup();
} catch (e) { app.innerHTML = `<section class="panel"><h1>Unable to load the game</h1><p>${escape(e.message)}</p><p>Start the local server from the project folder: <code>python3 -m http.server 8000 --bind 127.0.0.1</code>, then open <a href="http://localhost:8000">localhost:8000</a>.</p></section>`; }
function setup() {
  app.innerHTML = `<section class="setup panel"><p class="eyebrow">A KINGDOM BEGINS WITH A BUNNY</p><h1>Make this world<br>your own.</h1><p class="lede">Claim land, build cities, and gather a royal fortune over four seasons.</p><form id="setup"><label>Bot opponents<select name="bots"><option value="1">1 bot · 2-player game</option><option value="2" selected>2 bots · 3-player game</option><option value="3">3 bots · 4-player game</option></select></label><label>Game seed <span class="muted">optional</span><input name="seed" placeholder="A new world every game" maxlength="100"></label><button class="primary">Start game <span>→</span></button></form><p class="muted">Original 100-territory board · Full 182-card deck</p></section>`;
  document.querySelector('#setup').onsubmit = event => { event.preventDefault(); const f = new FormData(event.target); state = createGame(data, Number(f.get('bots')), f.get('seed') || Date.now()); selected = []; render(); };
}
function board() {
  const blocked = new Set(state.blockedConnections.flatMap(e => [e.from + ':' + e.to, e.to + ':' + e.from]));
  return `<div class="board" aria-label="New World board">${Object.values(state.cells).map(c => {
    const card = state.players[0].buildings.find(b=>b.instanceId===buildingId);
    const valid = card ? eligibleTerritories(state,0,card) : [];
    const right = c.row + (c.column + 1), down = String.fromCharCode(c.row.charCodeAt(0) + 1) + c.column;
    return `<button class="cell ${c.terrain} ${valid.includes(c.coordinate) ? 'eligible' : ''} ${targets.includes(c.coordinate) ? 'target' : ''} ${blocked.has(c.coordinate + ':' + right) ? 'lava-right' : ''} ${blocked.has(c.coordinate + ':' + down) ? 'lava-bottom' : ''}" style="--owner:${c.owner === null ? 'transparent' : state.players[c.owner].color}" data-cell="${c.coordinate}" title="${c.coordinate}: ${c.terrain}${c.building ? ', ' + c.building.category + (c.building.strength ? ' strength ' + c.building.strength : '') : ''}"><small>${c.coordinate}</small>${c.owner === null ? '' : `<i class="bunny" aria-label="${state.players[c.owner].name}">●</i>`}<span>${icons[c.terrain]}</span>${c.building ? `<b class="piece">${c.building.category === 'city' ? '♜' + c.building.strength : c.building.category === 'farm' ? '◆' : c.building.category === 'camp' ? '⚑' + c.building.priority : '↗'}</b>` : ''}</button>`;
  }).join('')}</div>`;
}
function cardHTML(c) {
  const i = selected.indexOf(c.instanceId), label = i >= 0 ? (state.players.length === 2 && i === 1 ? 'Discard' : 'Play') : '';
  return `<button class="card ${c.category} ${i >= 0 ? 'selected' : ''}" data-card="${c.instanceId}" aria-pressed="${i >= 0}"><span class="tag">${escape(c.category)} ${label ? ' · ' + label : ''}</span><h3>${escape(c.name)}</h3><p>${escape(c.sourceText || (c.category === 'territory' ? c.terrain : c.category === 'provisions' ? 'Draw and play 2 cards immediately.' : 'Place during Construction.'))}</p></button>`;
}
function render() {
  app.innerHTML = `<div class="game-heading"><div><p class="eyebrow">ROUND ${state.round} OF 4</p><h1>${state.phase === 'draft' ? 'Explore the New World' : 'Build your kingdom'}</h1></div><button id="new-game" class="quiet">New game</button></div><div class="players">${state.players.map(p => `<div class="player" style="--player:${p.color}"><b>${p.name}</b><span>${p.score} <small>points</small></span><small>${p.hand.length} cards · ${p.parchments.length} parchments</small></div>`).join('')}</div><div class="game-layout"><section class="map-panel panel">${board()}<p class="legend">♣ Forest / wood &nbsp; 🥕 Field / carrots &nbsp; ≈ Sea / fish &nbsp; ▲ Mountain &nbsp; · Plains &nbsp; ♜ City<br><span class="lava-key">━</span> Lava blocks a shared edge</p></section><aside class="panel"><p class="eyebrow">YOUR HAND</p><h2>${state.phase === 'draft' ? `Choose your cards · pick ${state.draftTurn}` : 'Construction'}</h2><p>${state.players.length === 2 ? 'Play 1 card and discard 1. A reserve card is added before each pick.' : 'Choose 2 cards each pick.'} Pass ${state.round % 2 ? 'left' : 'right'}.</p><div id="error" role="alert">${error ? `<p class="error">${escape(error)}</p>` : ''}</div><div id="actions">${state.phase === 'draft' ? `<p class="muted">${state.players.length === 2 ? 'First selection: play. Second selection: discard.' : 'Select two cards, then confirm.'}</p><button id="confirm-draft" class="primary" ${selected.length !== 2 ? 'disabled' : ''}>Confirm cards & pass →</button><div class="hand">${state.players[0].hand.map(cardHTML).join('')}</div>` : constructionPanel()}</div><details class="log"><summary>Table activity</summary>${state.log.slice(-30).reverse().map(x=>`<p>${escape(x)}</p>`).join('')}</details></aside></div>`;
  document.querySelector('#new-game').onclick = setup;
  bindConstruction();
  document.querySelectorAll('[data-card]').forEach(button => button.onclick = () => {
    const id = button.dataset.card;
    if (selected.includes(id)) selected = selected.filter(x => x !== id);
    else if (selected.length < 2) selected.push(id);
    render();
  });
  const confirm = document.querySelector('#confirm-draft');
  if (confirm) confirm.onclick = () => {
    const choices = state.players.map(p => p.bot ? chooseDraft(publicView(state, p.id), p.id) : { play: state.players.length === 2 ? [selected[0]] : [...selected], discard: state.players.length === 2 ? [selected[1]] : [] });
    resolveDraft(state, choices); selected = []; if(state.phase==='construction') beginCampOffers(state); driveBots(); render();
  };
}

function constructionPanel() {
  if(state.phase==='camps') {
    const current=state.campQueue[0];
    return `<p class="eyebrow">CAMP PRIORITY ${current.priority}</p><h2>Place your camp?</h2><p class="help">Choose an empty territory and confirm, or keep this Camp for later. Lower-numbered Camps have first choice.</p><div class="actions"><button class="primary" id="place-building" ${targets.length?'':'disabled'}>Confirm camp</button><button class="quiet" id="save-camp">Save camp</button></div>`;
  }
  if(state.phase==='markets') return `<h2>Choose your Trading Posts</h2><p class="help">Each Trading Post produces one basic resource this round. Round 4 choices also apply to parchment scoring.</p>${tradingPosts(state,0).map(c=>`<label>${c.coordinate}<select data-market="${c.coordinate}"><option value="">Choose a resource</option>${['wood','fish','carrots'].map(r=>`<option value="${r}" ${c.building.choice===r?'selected':''}>${r}</option>`).join('')}</select></label>`).join('') || '<p>You have no Trading Posts to assign.</p>'}<div class="actions"><button id="confirm-markets" class="primary">Confirm & harvest</button></div>`;
  if(state.phase==='harvest') return `<h2>Round ${state.round} harvest</h2><table class="table"><thead><tr><th>Player</th><th>Harvest</th><th>Total</th></tr></thead><tbody>${state.lastHarvest.map(h=>`<tr><td>${state.players[h.playerId].name}</td><td>+${h.points}</td><td>${state.players[h.playerId].score}</td></tr>`).join('')}</tbody></table>${state.lastHarvest.map(h=>`<details class="fief-list"><summary>${state.players[h.playerId].name}: fief breakdown</summary>${h.fiefs.map(f=>`<p>${f.coordinates.join(', ')}: ${f.strength} strength × ${f.wealth} resources = ${f.points}</p>`).join('')}</details>`).join('')}<div class="actions"><button id="next-round" class="primary">${state.round===4?'Reveal parchments':'Begin round '+(state.round+1)} →</button></div>`;
  if(state.phase==='parchments') return `<h2>Four rounds complete</h2><p>All parchments are revealed. Final scoring and copy choices follow next.</p>${state.players.map(p=>`<h3>${p.name}</h3><p>${p.parchments.map(c=>escape(c.name)).join(', ')||'No parchments'}</p>`).join('')}`;
  const available = state.players[0].buildings;
  return `<p class="help">Select a building, then an eligible territory. Sky Towers need two territories in separate fiefs. Unplaced buildings can be saved for later rounds.</p><div class="building-list">${available.map(c=>`<button class="card ${c.instanceId===buildingId?'selected':''}" data-building="${c.instanceId}"><span class="tag">${c.category}</span><h3>${escape(c.name)}</h3><p>${c.placement.allowedTerrains?.join(', ') || 'Any terrain'}${c.category==='camp'?' · Announce priority '+c.effect.priority:''}</p></button>`).join('')}</div><div class="actions"><button class="primary" id="place-building" ${targets.length ? '' : 'disabled'}>Place building</button><button class="quiet" id="cancel-building">Cancel selection</button><button class="quiet" id="finish-building">Done building · save the rest</button></div><details class="fief-list"><summary>Your current fiefs</summary>${fiefs(state,0).map(f=>`<p>${f.coordinates.join(', ')}: strength ${f.strength} × ${f.wealth} resources = ${f.points}</p>`).join('')}</details>`;
}
function attempt(action) { try { error=''; action(); } catch(e) {error=e.message;} render(); }
function driveBots() {
  while(state.phase==='camps') {
    const next=state.campQueue[0];
    if(next.playerId===0) {buildingId=next.cardId;targets=[];return;}
    respondCamp(state,next.playerId,chooseCamp(publicView(state,next.playerId),next.playerId,next.cardId));
  }
  buildingId=null;targets=[];
  if (state.phase === 'construction') for (const p of state.players.filter(p=>p.bot&&!p.ready)) {
    let action;
    while ((action=chooseBuilding(publicView(state,p.id),p.id))) placeBuilding(state,p.id,action.cardId,action.coordinates);
    finishConstruction(state,p.id);
  }
  if(state.phase==='markets') for(const p of state.players.filter(p=>p.bot&&!p.ready)) {
    for(const c of chooseMarkets(publicView(state,p.id),p.id)) chooseResource(state,p.id,c.coordinate,c.resource);
    finishMarkets(state,p.id);
  }
}
function bindConstruction() {
  document.querySelectorAll('[data-building]').forEach(b=>b.onclick=()=>attempt(()=>{buildingId=b.dataset.building;targets=[];const c=state.players[0].buildings.find(c=>c.instanceId===buildingId);if(c.category==='camp'){requestCamp(state,0,buildingId);driveBots();}}));
  document.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>{
    const card=state.players[0].buildings.find(c=>c.instanceId===buildingId);
    if(!card || !eligibleTerritories(state,0,card).includes(b.dataset.cell)) return;
    const id=b.dataset.cell, count=card.category==='sky_tower'?2:1;
    if(targets.includes(id)) targets=targets.filter(c=>c!==id);
    else targets=[...targets.slice(-(count-1)||targets.length),id].slice(-count);
    render();
  });
  const bind=(id,fn)=>{const b=document.getElementById(id);if(b)b.onclick=()=>attempt(fn);};
  bind('place-building',()=>{if(state.phase==='camps'){respondCamp(state,0,targets[0]);driveBots();}else{placeBuilding(state,0,buildingId,targets);buildingId=null;targets=[];}});
  document.querySelectorAll('[data-market]').forEach(select=>select.onchange=()=>attempt(()=>chooseResource(state,0,select.dataset.market,select.value)));
  bind('confirm-markets',()=>{finishMarkets(state,0);driveBots();});
  bind('next-round',()=>{advanceRound(state);selected=[];buildingId=null;targets=[];});
  bind('save-camp',()=>{respondCamp(state,0);driveBots();});
  bind('cancel-building',()=>{buildingId=null;targets=[];});
  bind('finish-building',()=>{finishConstruction(state,0);buildingId=null;targets=[];driveBots();});
}
