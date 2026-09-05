import { createGame, publicView, resolveDraft } from './game.js';
import { chooseDraft, chooseBuilding, chooseCamp, chooseMarkets, chooseCopies } from './bots.js';
import { eligibleTerritories, placeBuilding, finishConstruction } from './construction.js';
import { fiefs } from './fiefs.js';
import { beginCampOffers, requestCamp, respondCamp } from './camps.js';
import { tradingPosts, chooseResource, finishMarkets, advanceRound } from './harvest.js';
import { finalizeScoring } from './scoring.js';
import { scoringPanel } from './scoring-ui.js';
import { cardText, buildingText, resourceMarks } from './card-text.js';
import { saveGame, loadGame } from './storage.js';
const app = document.querySelector('#app');
let data, state, selected = [], buildingId = null, targets = [], error = "", inspected = null;
export const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = { forest: '♣', field: '<svg class=carrot viewBox="0 0 30 30" aria-hidden="true"><path d="M9 9 L24 13 L8 27 Z" fill="#b46d27"/><path d="M15 10 L15 3 M18 11 L25 5" stroke="#517843" stroke-width="3"/></svg>', sea: '≈', mountain: '▲', plains: '·', city: '♜' };
try {
  const responses = await Promise.all(['data/maps/original-board.json', 'data/cards/base-buildings-and-provisions.json', 'data/cards/base-parchments.json'].map(async path => { const r = await fetch(path); if (!r.ok) throw Error(`Could not load ${path}`); return r.json(); }));
  data = { map: responses[0], buildings: responses[1], parchments: responses[2] };
  setup();
} catch (e) { app.innerHTML = `<section class="panel"><h1>Unable to load the game</h1><p>${escape(e.message)}</p><p>Start the local server from the project folder: <code>python3 -m http.server 8000 --bind 127.0.0.1</code>, then open <a href="http://localhost:8000">localhost:8000</a>.</p></section>`; }
function setup() {
  const saved=loadGame();
  app.innerHTML = `<section class="setup panel"><p class="eyebrow">A KINGDOM BEGINS WITH A BUNNY</p><h1>Make this world<br>your own.</h1><p class="lede">Claim land, build cities, and gather a royal fortune over four seasons.</p>${saved?`<div class="resume"><button class="primary" id="resume-game">${saved.game.phase==='finished'?'View last result':'Resume round '+saved.game.round} →</button><p class="muted">${saved.game.players.length} players · saved ${escape(new Date(saved.savedAt).toLocaleString())}</p></div>`:''}<form id="setup"><label>Bot opponents<select name="bots"><option value="1">1 bot · 2-player game</option><option value="2" selected>2 bots · 3-player game</option><option value="3">3 bots · 4-player game</option></select></label><label>Game seed <span class="muted">optional</span><input name="seed" placeholder="A new world every game" maxlength="100"></label><button class="primary">Start game <span>→</span></button></form><p class="muted">Original 100-territory board · Full 182-card deck</p></section>`;
  document.querySelector('#setup').onsubmit = event => { event.preventDefault(); const f = new FormData(event.target); state = createGame(data, Number(f.get('bots')), f.get('seed') || Date.now()); selected = []; buildingId=null; targets=[]; inspected=null; error=''; render(); };
  const button=document.querySelector('#resume-game');if(button)button.onclick=()=>resume(saved);
}
function resume(saved) {
  state=saved.game;const ui=saved.ui||{};
  selected=(ui.selected||[]).filter(id=>state.players[0].hand.some(c=>c.instanceId===id)).slice(0,2);
  buildingId=state.players[0].buildings.some(c=>c.instanceId===ui.buildingId)?ui.buildingId:null;
  targets=(ui.targets||[]).filter(id=>state.cells[id]);inspected=state.cells[ui.inspected]?ui.inspected:null;error='';render();
}
function board() {
  const blocked = new Set(state.blockedConnections.flatMap(e => [e.from + ':' + e.to, e.to + ':' + e.from]));
  return `<div class="board" aria-label="New World board">${Object.values(state.cells).map(c => {
    const card = state.players[0].buildings.find(b=>b.instanceId===buildingId);
    const valid = card ? eligibleTerritories(state,0,card) : [];
    const right = c.row + (c.column + 1), down = String.fromCharCode(c.row.charCodeAt(0) + 1) + c.column;
    return `<button class="cell ${c.terrain} ${valid.includes(c.coordinate) ? 'eligible' : ''} ${targets.includes(c.coordinate) ? 'target' : ''} ${selected.some(id=>state.players[0].hand.find(card=>card.instanceId===id)?.coordinate===c.coordinate)?'draft-target':''} ${blocked.has(c.coordinate + ':' + right) ? 'lava-right' : ''} ${blocked.has(c.coordinate + ':' + down) ? 'lava-bottom' : ''}" style="--owner:${c.owner === null ? 'transparent' : state.players[c.owner].color}" data-cell="${c.coordinate}" aria-label="${c.coordinate}, ${c.terrain}, ${c.owner===null?'unclaimed':state.players[c.owner].name}, ${escape(buildingText(c.building))}" title="${c.coordinate}: ${c.terrain}${c.building ? ', ' + c.building.category + (c.building.strength ? ' strength ' + c.building.strength : '') : ''}"><small>${c.coordinate}</small>${c.owner === null ? '' : `<i class="bunny" aria-label="${state.players[c.owner].name}">●</i>`}<span>${icons[c.terrain]}</span>${c.building ? `<b class="piece">${c.building.category === 'city' ? '♜' + c.building.strength : c.building.category === 'farm' ? (resourceMarks[c.building.resource||c.building.choice]||'?') : c.building.category === 'camp' ? '⚑' + c.building.priority : '↗'+c.building.pairId.split('_').at(-1)}</b>` : ''}</button>`;
  }).join('')}</div>`;
}
function cardHTML(c) {
  const i = selected.indexOf(c.instanceId), label = i >= 0 ? (state.players.length === 2 && i === 1 ? 'Discard' : 'Play') : '';
  return `<button class="card ${c.category} ${i >= 0 ? 'selected' : ''} ${label==='Discard'?'discard-selected':''}" data-card="${c.instanceId}" aria-pressed="${i >= 0}"><span class="tag">${escape(c.category)} ${label ? ' · ' + label : ''}</span><h3>${escape(c.name)}</h3><p>${escape(cardText(c,state))}</p></button>`;
}
function draftPanel() {
  const twoPlayers=state.players.length===2;
  const slots=[0,1].map(i=>{
    const card=state.players[0].hand.find(c=>c.instanceId===selected[i]);
    const label=twoPlayers?(i===0?'Play':'Discard'):'Play '+(i+1);
    return `<div class="draft-slot ${twoPlayers&&i===1?'discard-slot':''}"><b>${label}</b><span>${card?escape(card.name):'Choose a card'}</span></div>`;
  }).join('');
  return `<div class="draft-controls" id="draft-controls" tabindex="-1"><div class="draft-slots" aria-live="polite" aria-atomic="true">${slots}</div><div class="selection-tools">${twoPlayers?`<button id="swap-draft" class="quiet" ${selected.length===2?'':'disabled'}>Swap play / discard</button>`:''}<button id="clear-draft" class="quiet" ${selected.length?'':'disabled'}>Clear selection</button></div><button id="confirm-draft" class="primary" ${selected.length===2?'':'disabled'}>${selected.length===2?'Confirm cards & pass →':`Select ${2-selected.length} more card${selected.length?'':'s'}`}</button></div><p class="muted">${twoPlayers?'First choose a card to play, then one to discard.':'Both selected cards will be played.'} Click a selected card to remove it.</p><div class="hand">${state.players[0].hand.map(cardHTML).join('')}</div>`;
}
function focusedControl() {
  const element=document.activeElement;
  if(!app.contains(element))return null;
  if(element.id)return '#'+CSS.escape(element.id);
  for(const name of ['data-card','data-cell','data-building','data-market','data-copy','data-ruling','data-copy-resolution']) {
    if(element.hasAttribute(name))return `[${name}="${CSS.escape(element.getAttribute(name))}"]`;
  }
  return null;
}
function render() {
  const focus=focusedControl();
  const openPanels=[...document.querySelectorAll('details[open]')].map(el=>el.querySelector('summary')?.textContent);
  const saved=saveGame(state,{selected,buildingId,targets,inspected});
  app.innerHTML = `<div class="game-heading"><div><p class="eyebrow">ROUND ${state.round} OF 4</p><h1>${({draft:'Explore the New World',camps:'Claim a foothold',construction:'Build your kingdom',markets:'Gather your resources',harvest:'A season of plenty',parchments:'The royal reckoning',finished:'A kingdom to remember'})[state.phase]}</h1></div><button id="new-game" class="quiet">New game</button></div><div class="players">${state.players.map(p => `<div class="player" style="--player:${p.color}"><b>${p.name}</b><span>${p.score} <small>points</small></span><small>${p.hand.length} cards · ${p.parchments.length} parchments</small></div>`).join('')}</div><div class="game-layout"><section class="map-panel panel">${board()}<p class="legend">♣ Forest / wood &nbsp; ▾ Field / carrots &nbsp; ≈ Sea / fish &nbsp; ▲ Mountain &nbsp; · Plains &nbsp; ♜ City<br><span class="lava-key">━</span> Lava blocks a shared edge</p>${inspectionPanel()}${privateCardsPanel()}</section><aside class="panel">${state.phase==='draft'?`<p class="eyebrow">YOUR HAND · PICK ${state.draftTurn}</p><h2>Choose your cards</h2><p>${state.players.length===2?'Play 1 card and discard 1. A reserve card is added before each pick.':'Choose 2 cards each pick.'} Pass ${state.round%2?'left':'right'}.</p>`:''}<div id="error" role="alert">${error ? `<p class="error">${escape(error)}</p>` : ''}</div><div id="actions">${state.phase === 'draft' ? draftPanel() : constructionPanel()}</div><details class="log"><summary>Table activity</summary>${state.log.slice(-30).reverse().map(x=>`<p>${escape(x)}</p>`).join('')}</details></aside></div>`;
  app.insertAdjacentHTML('beforeend',`<p class="save-status muted">${saved?'Autosaved in this browser':'Browser storage is unavailable; keep this tab open to retain your game'} · Seed ${escape(state.seed)}</p>`);
  document.querySelectorAll('details').forEach(el=>{if(openPanels.includes(el.querySelector('summary')?.textContent))el.open=true;});
  document.querySelector('#new-game').onclick = setup;
  bindConstruction();
  document.querySelectorAll('[data-card]').forEach(button => button.onclick = () => {
    const id = button.dataset.card;
    if (selected.includes(id)) selected = selected.filter(x => x !== id);
    else if (selected.length < 2) selected.push(id);
    render();
  });
  const confirm = document.querySelector('#confirm-draft');
  if (confirm) confirm.onclick = () => attempt(() => {
    const choices = state.players.map(p => p.bot ? chooseDraft(publicView(state, p.id), p.id) : { play: state.players.length === 2 ? [selected[0]] : [...selected], discard: state.players.length === 2 ? [selected[1]] : [] });
    resolveDraft(state, choices); selected = []; if(state.phase==='construction') beginCampOffers(state); driveBots();
  });
  const swap=document.querySelector('#swap-draft');
  if(swap)swap.onclick=()=>{selected.reverse();render();};
  const clear=document.querySelector('#clear-draft');
  if(clear)clear.onclick=()=>{selected=[];render();};
  if(focus)document.querySelector(focus)?.focus({preventScroll:true});
}

function constructionPanel() {
  if(state.phase==='camps') {
    const current=state.campQueue[0];
    return `<p class="eyebrow">CAMP PRIORITY ${current.priority}</p><h2>Place your camp?</h2><p class="help">Choose an empty territory and confirm, or keep this Camp for later. Lower-numbered Camps have first choice.</p><div class="actions"><button class="primary" id="place-building" ${targets.length?'':'disabled'}>Confirm camp</button><button class="quiet" id="save-camp">Save camp</button></div>`;
  }
  if(state.phase==='markets') return `<h2>Choose your Trading Posts</h2><p class="help">Each Trading Post produces one basic resource this round. Round 4 choices also apply to parchment scoring.</p>${tradingPosts(state,0).map(c=>`<label>${c.coordinate}<select data-market="${c.coordinate}"><option value="">Choose a resource</option>${['wood','fish','carrots'].map(r=>`<option value="${r}" ${c.building.choice===r?'selected':''}>${r}</option>`).join('')}</select></label>`).join('') || '<p>You have no Trading Posts to assign.</p>'}<div class="actions"><button id="confirm-markets" class="primary">Confirm & harvest</button></div>`;
  if(state.phase==='harvest') return `<h2>Round ${state.round} harvest</h2><table class="table"><thead><tr><th>Player</th><th>Harvest</th><th>Total</th></tr></thead><tbody>${state.lastHarvest.map(h=>`<tr><td>${state.players[h.playerId].name}</td><td>+${h.points}</td><td>${state.players[h.playerId].score}</td></tr>`).join('')}</tbody></table>${state.lastHarvest.map(h=>`<details class="fief-list"><summary>${state.players[h.playerId].name}: fief breakdown</summary>${h.fiefs.map(f=>`<p>${f.coordinates.join(', ')}: ${f.strength} strength × ${f.wealth} resources = ${f.points}</p>`).join('')}</details>`).join('')}<div class="actions"><button id="next-round" class="primary">${state.round===4?'Reveal parchments':'Begin round '+(state.round+1)} →</button></div>`;
  if(['parchments','finished'].includes(state.phase)) return scoringPanel(state);
  const available = state.players[0].buildings;
  return `<p class="help">Select a building, then an eligible territory. Sky Towers need two territories in separate fiefs. Unplaced buildings can be saved for later rounds.</p><div class="building-list">${available.map(c=>`<button class="card ${c.instanceId===buildingId?'selected':''}" data-building="${c.instanceId}"><span class="tag">${c.category}</span><h3>${escape(c.name)}</h3><p>${escape(cardText(c,state))}</p></button>`).join('')}</div><div class="actions"><button class="primary" id="place-building" ${targets.length ? '' : 'disabled'}>Place building</button><button class="quiet" id="cancel-building">Cancel selection</button><button class="quiet" id="finish-building">Done building · save the rest</button></div><details class="fief-list"><summary>Your current fiefs</summary>${fiefs(state,0).map(f=>`<p>${f.coordinates.join(', ')}: strength ${f.strength} × ${f.wealth} resources = ${f.points}</p>`).join('')}</details>`;
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
  if(state.phase==='parchments') {
    state.scoringDecisions ||= {copies:{},rulings:{},copyResolutions:{}};
    for(const p of state.players.filter(p=>p.bot)) Object.assign(state.scoringDecisions.copies,chooseCopies(publicView(state,p.id),p.id,state.scoringDecisions));
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
    inspected=b.dataset.cell;
    if(!card || !eligibleTerritories(state,0,card).includes(b.dataset.cell)) {render();return;}
    const id=b.dataset.cell, count=card.category==='sky_tower'?2:1;
    if(targets.includes(id)) targets=targets.filter(c=>c!==id);
    else targets=count===1?[id]:[...targets,id].slice(-count);
    render();
  });
  const bind=(id,fn)=>{const b=document.getElementById(id);if(b)b.onclick=()=>attempt(fn);};
  bind('place-building',()=>{if(state.phase==='camps'){respondCamp(state,0,targets[0]);driveBots();}else{placeBuilding(state,0,buildingId,targets);buildingId=null;targets=[];}});
  document.querySelectorAll('[data-market]').forEach(select=>select.onchange=()=>attempt(()=>chooseResource(state,0,select.dataset.market,select.value)));
  bind('confirm-markets',()=>{finishMarkets(state,0);driveBots();});
  bind('next-round',()=>{advanceRound(state);selected=[];buildingId=null;targets=[];driveBots();});
  document.querySelectorAll('[data-copy]').forEach(s=>s.onchange=()=>attempt(()=>{state.scoringDecisions.copies[s.dataset.copy]=s.value;state.scoringDecisions.copyResolutions={};state.scoringDecisions.rulings={};}));
  document.querySelectorAll('[data-ruling]').forEach(s=>s.onchange=()=>attempt(()=>{state.scoringDecisions.rulings[s.dataset.ruling]=Number(s.value);}));
  document.querySelectorAll('[data-copy-resolution]').forEach(s=>s.onchange=()=>attempt(()=>{state.scoringDecisions.copyResolutions[s.dataset.copyResolution]=s.value;}));
  bind('finish-scoring',()=>finalizeScoring(state,state.scoringDecisions));
  const again=document.querySelector('#play-again');if(again)again.onclick=setup;
  bind('save-camp',()=>{respondCamp(state,0);driveBots();});
  bind('cancel-building',()=>{buildingId=null;targets=[];});
  bind('finish-building',()=>{finishConstruction(state,0);buildingId=null;targets=[];driveBots();});
}

function inspectionPanel() {
  if(!inspected)return '<p class="muted">Select a territory to inspect its owner, production, building, and fief.</p>';
  const c=state.cells[inspected],owner=c.owner===null?'Unclaimed':state.players[c.owner].name;
  const lava=state.blockedConnections.filter(e=>e.from===inspected||e.to===inspected).map(e=>e.from===inspected?e.to:e.from);
  const group=c.owner===null?null:fiefs(state,c.owner).find(f=>f.coordinates.includes(inspected));
  return `<div class="inspector"><h3>${c.coordinate} · ${owner}</h3><p>${c.terrain} · natural resource: ${c.baseResource||'none'}</p><p>${escape(buildingText(c.building))}</p>${lava.length?`<p class="lava-note">Lava blocks the direct connection to ${lava.join(', ')}.</p>`:''}${group?`<p>Fief: ${group.coordinates.length} territories · ${group.strength} strength × ${group.wealth} resources = ${group.points} points</p><p>Resources: ${group.resources.join(', ')||'none'}</p>`:''}</div>`;
}
function privateCardsPanel() {
  if(['parchments','finished'].includes(state.phase))return '';
  return `<details class="private-parchments"><summary>Your secret parchments · ${state.players[0].parchments.length}</summary>${state.players[0].parchments.map(c=>`<div class="scoring-row"><b>${escape(c.name)}</b><p>${escape(cardText(c,state))}</p></div>`).join('')||'<p>No parchments yet.</p>'}</details><details class="fief-list"><summary>Buildings waiting at the table</summary>${state.players.map(p=>`<p><b>${p.name}:</b> ${p.buildings.map(c=>escape(c.name)).join(', ')||'none'}</p>`).join('')}</details>`;
}
