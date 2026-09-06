import { COLORS, createGame, publicView, resolveDraft } from './game.js';
import * as normalBots from './bots.js';
import * as easyBots from './bots-baseline.js';
import { eligibleTerritories, placeBuilding, finishConstruction } from './construction.js';
import { fiefs } from './fiefs.js';
import { beginCampOffers, requestCamp, respondCamp } from './camps.js';
import { tradingPosts, chooseResource, finishMarkets, advanceRound } from './harvest.js';
import { finalizeScoring } from './scoring.js';
import { scoringPanel } from './scoring-ui.js';
import { resultsScreen } from './results-ui.js';
import { cardText, buildingText, resourceNames } from './card-text.js';
import { terrainArt, rabbitArt, resourceArt, pieceArt, cardArt } from './art.js';
import { sortedHand } from './hand-order.js';
import { lastTurnPanel } from './last-turn.js';
import { playerPanels as renderPlayerPanels, bindKingdomInspection } from './kingdom-ui.js';
import { capturePresentation, animationEvents, playAnimation } from './turn-animation.js';
import { saveGame, loadGame, exportGame } from './storage.js';
import { soundEffects, soundToggleHTML, bindSoundToggles } from './sound.js';
const app = document.querySelector('#app');
app.addEventListener('pointerdown',()=>soundEffects.unlock());
app.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key))soundEffects.unlock();});
let data, state, selected = [], buildingId = null, targets = [], error = "", inspected = null;
let animationsEnabled=true,playing=false;
let reviewingFinalBoard=false;
const botPolicy=()=>state.botDifficulty==='easy'?easyBots:normalBots;
const forcedFinalPick=()=>state.phase==='draft'&&state.players.length>2&&state.players[0].hand.length===2;
let boardZoom=matchMedia('(max-width:600px)').matches;
export const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

try {
  const responses = await Promise.all(['data/maps/original-board.json', 'data/cards/base-buildings-and-provisions.json', 'data/cards/base-parchments.json'].map(async path => { const r = await fetch(path); if (!r.ok) throw Error(`Could not load ${path}`); return r.json(); }));
  data = { map: responses[0], buildings: responses[1], parchments: responses[2] };
  setup();
} catch (e) { app.innerHTML = `<section class="panel"><h1>Unable to load the game</h1><p>${escape(e.message)}</p><p>Start the local server from the project folder: <code>python3 -m http.server 8000 --bind 127.0.0.1</code>, then open <a href="http://localhost:8000">localhost:8000</a>.</p></section>`; }
function setup() {
  soundEffects.stop();
  reviewingFinalBoard=false;
  app.classList.remove('at-table','at-results');
  const saved=loadGame();
  app.innerHTML = `<section class="setup panel"><p class="eyebrow">A KINGDOM BEGINS WITH A BUNNY</p><h1>Make this world<br>your own.</h1><p class="lede">Claim land, build cities, and gather a royal fortune over four seasons.</p>${saved?`<div class="resume"><button class="primary" id="resume-game">${saved.game.phase==='finished'?'View last result':'Resume round '+saved.game.round} →</button><p class="muted">${saved.game.players.length} players · saved ${escape(new Date(saved.savedAt).toLocaleString())}</p></div>`:''}<form id="setup"><label>Bot opponents<select name="bots"><option value="1">1 bot · 2-player game</option><option value="2" selected>2 bots · 3-player game</option><option value="3">3 bots · 4-player game</option></select></label><label>Bot difficulty<select name="difficulty"><option value="normal" selected>Normal · strategic</option><option value="easy">Easy · relaxed</option></select></label><label>Game seed <span class="muted">optional</span><input name="seed" placeholder="A new world every game" maxlength="100"></label><button class="primary">Start game <span>→</span></button></form><p class="muted">Original 100-territory board · Full 182-card deck</p></section>`;
  document.querySelector('#setup').insertAdjacentHTML('beforebegin',soundToggleHTML());bindSoundToggles();
  document.querySelector('#setup').onsubmit = event => { event.preventDefault(); const f = new FormData(event.target); state = createGame(data, Number(f.get('bots')), f.get('seed') || Date.now()); state.botDifficulty=f.get('difficulty')==='easy'?'easy':'normal'; selected = []; buildingId=null; targets=[]; inspected=null; error=''; render(); soundEffects.play('round'); };
  const button=document.querySelector('#resume-game');if(button)button.onclick=()=>resume(saved);
}
function resume(saved) {
  reviewingFinalBoard=false;
  state=saved.game;const ui=saved.ui||{};
  for(const player of state.players)player.color=COLORS[player.id];
  animationsEnabled=ui.animationsEnabled??true;
  boardZoom=ui.boardZoom??matchMedia('(max-width:600px)').matches;
  selected=(ui.selected||[]).filter(id=>state.players[0].hand.some(c=>c.instanceId===id)).slice(0,2);
  buildingId=state.players[0].buildings.some(c=>c.instanceId===ui.buildingId)?ui.buildingId:null;
  targets=(ui.targets||[]).filter(id=>state.cells[id]);inspected=state.cells[ui.inspected]?ui.inspected:null;error='';render();
}
function board() {
  const blocked = new Set(state.blockedConnections.flatMap(e => [e.from + ':' + e.to, e.to + ':' + e.from]));
  const valid=placementOptions();
  return `<div class="board ${boardZoom?'board-large':''}" aria-label="New World board">${Object.values(state.cells).map(c => {
    const right = c.row + (c.column + 1), down = String.fromCharCode(c.row.charCodeAt(0) + 1) + c.column;
    return `<button class="cell ${c.terrain} ${c.owner===null?'':'owned'} ${valid.includes(c.coordinate) ? 'eligible' : ''} ${targets.includes(c.coordinate) ? 'target' : ''} ${selected.some((id,i)=>!(state.players.length===2&&i===1)&&state.players[0].hand.find(card=>card.instanceId===id)?.coordinate===c.coordinate)?'draft-target':''} ${blocked.has(c.coordinate + ':' + right) ? 'lava-right' : ''} ${blocked.has(c.coordinate + ':' + down) ? 'lava-bottom' : ''}" style="--owner:${c.owner === null ? 'transparent' : state.players[c.owner].color}" data-cell="${c.coordinate}" data-owner="${c.owner??''}" aria-label="${c.coordinate}, ${c.terrain}, ${c.owner===null?'unclaimed':state.players[c.owner].name}, ${escape(buildingText(c.building))}" title="${c.coordinate}: ${c.terrain}${c.building ? ', ' + c.building.category + (c.building.strength ? ' strength ' + c.building.strength : '') : ''}">${terrainArt(c.terrain)}${c.owner===null?'':'<span class="owner-overlay"></span>'}<small class="coordinate">${c.coordinate}</small>${c.baseResource?`<span class="natural-resource" title="Natural ${resourceNames[c.baseResource]}">${resourceArt(c.baseResource)}</span>`:''}${c.owner===null?'':`<span class="bunny" aria-label="${state.players[c.owner].name}">${rabbitArt()}</span>`}${c.building?`<span class="piece" data-kind="${c.building.category}" title="${escape(buildingText(c.building))}">${pieceArt(c.building)}${c.building.category==='farm'?'':`<span class="piece-level">${c.building.category==='city'?c.building.strength:c.building.category==='camp'?c.building.priority:'↗'+c.building.pairId.split('_').at(-1)}</span>`}</span>`:''}</button>`;
  }).join('')}</div>`;
}

function placementOptions() {
  const card=state.players[0].buildings.find(c=>c.instanceId===buildingId);
  if(!card)return [];
  const eligible=eligibleTerritories(state,0,card);
  if(card.category!=='sky_tower')return eligible;
  const groups=fiefs(state,0).filter(f=>f.coordinates.some(id=>eligible.includes(id)));
  if(groups.length<2)return [];
  const first=groups.find(f=>f.coordinates.includes(targets[0]));
  return eligible.filter(id=>targets.includes(id)||!first?.coordinates.includes(id));
}

function placementGuide() {
  const card=state.players[0].buildings.find(c=>c.instanceId===buildingId);
  if(!card)return '<p class="muted">Choose a building below to see its available territories.</p>';
  const count=card.category==='sky_tower'?2:1;
  let guidance=targets.length===count?'Ready to place. Confirm below.':count===2&&targets.length?'Choose the second endpoint in another highlighted fief.':'Choose a highlighted territory on the board.';
  if(!placementOptions().length)guidance=card.category==='sky_tower'?'No legal pair is available. You need empty building slots in two separate fiefs.':'No eligible territory is available for this building.';
  return `<div class="placement-guide" role="status"><b>${escape(card.name)}</b><p>${escape(guidance)}</p><span>${targets.length} / ${count} territories selected${targets.length?': '+targets.join(' + '):''}</span></div>`;
}

function boardToolbar() {
  const card=state.players[0].buildings.find(c=>c.instanceId===buildingId);
  const count=card?.category==='sky_tower'?2:1;
  return `<div class="board-toolbar"><h2>The New World</h2><button class="quiet" id="board-zoom" aria-pressed="${boardZoom}">${boardZoom?'Fit board':'Enlarge board'}</button></div>${card?`<div class="board-placement"><span>${escape(card.name)} · ${targets.length}/${count} selected</span><button id="board-confirm" class="primary" ${targets.length===count?'':'disabled'}>Confirm placement</button></div>`:''}<p class="board-scroll-hint muted">${boardZoom?'Scroll sideways to explore the enlarged board.':'Select any territory for details. Enlarge the board for a closer look.'}</p>`;
}
function pieceKey() {
  return `<details class="piece-key"><summary>Pieces & resources</summary><div class="piece-key-row"><span>${rabbitArt()} Owner</span><span>${pieceArt({category:'city',strength:2})} City · strength shown</span><span>${pieceArt({category:'camp'})} Camp · priority shown</span><span>${pieceArt({category:'sky_tower'})} Sky Tower · pair shown</span></div><div class="resource-key">${Object.entries(resourceNames).map(([id,name])=>`<span>${resourceArt(id)} ${name}</span>`).join('')}</div><p>A gold rim marks a luxury farm. The small shield shows the territory's natural resource.</p><p><a href="review/parchments/" target="_blank" rel="noopener">Parchment picture guide ↗</a></p></details>`;
}
function cardHTML(c,index=0) {
  const i=selected.indexOf(c.instanceId),label=i>=0?(state.players.length===2&&i===1?'Discard':'Play'):'';
  const type=c.category==='parchment'?c.parchmentType:c.farmType==='luxury'?'Luxury farm':c.category.replace('_',' ');
  const offset=index-(state.players[0].hand.length-1)/2;
  return `<button class="card ${c.category} ${c.parchmentType||''} ${c.farmType==='luxury'?'luxury-card':''} ${i>=0?'selected':''} ${label==='Discard'?'discard-selected':''}" style="--fan-angle:${offset*.65}deg;--fan-drop:${Math.abs(offset)*1.5}px;--card-order:${index}" data-card="${c.instanceId}" aria-pressed="${i>=0}" aria-label="${escape(c.name+': '+cardText(c,state)+(label?' — '+label:''))}"><span class="tag">${escape(type)}</span><span class="card-illustration">${cardArt(c)}</span><h3>${escape(c.name)}</h3><p>${escape(cardText(c,state))}</p>${label?`<span class="choice-ribbon">${label==='Discard'?'×':'✓'} ${label}</span>`:''}</button>`;
}
function handPanel() {
  const instruction=forcedFinalPick()?'Both remaining cards will be played':`${state.players.length===2?'Choose 1 to play and 1 to discard':'Choose 2 cards to play'} · Pass ${state.round%2?'left ←':'right →'}`;
  return `<section class="hand-dock" id="hand-panel" aria-label="Your hand"><div class="card-preview hand-preview" id="card-preview">${cardPreview(null)}</div><div class="hand-heading"><div><span class="eyebrow">YOUR HAND</span><b>${state.players[0].hand.length} cards</b></div><p>${instruction}</p><a href="#turn-panel">Review & confirm ↑</a></div><div class="hand" style="--hand-count:${state.players[0].hand.length}">${sortedHand(state.players[0].hand).map(cardHTML).join('')}</div></section>`;
}
function playerPanels() { return renderPlayerPanels(state); }

function cardPreview(card) {
  return card?`<span class="eyebrow">CARD DETAILS</span><h3>${escape(card.name)}</h3><p>${escape(cardText(card,state))}</p>`:'<span class="eyebrow">CARD DETAILS</span><p>Hover over a card or focus it to read its effect. Territory cards also highlight their location.</p>';
}
function draftPanel() {
  const twoPlayers=state.players.length===2,forced=forcedFinalPick();
  const slots=[0,1].map(i=>{
    const card=state.players[0].hand.find(c=>c.instanceId===selected[i]);
    const label=twoPlayers?(i===0?'Play':'Discard'):'Play '+(i+1);
    return `<div class="draft-slot ${twoPlayers&&i===1?'discard-slot':''}"><b>${label}</b><span>${card?escape(card.name):'Choose a card'}</span></div>`;
  }).join('');
  return `<div class="draft-controls" id="draft-controls" tabindex="-1"><div class="draft-slots" aria-live="polite" aria-atomic="true">${slots}</div>${forced?'':`<div class="selection-tools">${twoPlayers?`<button id="swap-draft" class="quiet" ${selected.length===2?'':'disabled'}>Swap play / discard</button>`:''}<button id="clear-draft" class="quiet" ${selected.length?'':'disabled'}>Clear selection</button></div>`}<button id="confirm-draft" class="primary" ${selected.length===2?'':'disabled'}>${forced?'Continue →':selected.length===2?'Confirm cards & pass →':`Select ${2-selected.length} more card${selected.length?'':'s'}`}</button></div><p class="muted">${forced?'Your last two cards are ready. Continue to finish exploration.':'Click a selected card to remove it.'}</p>`;
}
function focusedControl() {
  const element=document.activeElement;
  if(!app.contains(element))return null;
  if(element.id)return '#'+CSS.escape(element.id);
  for(const name of ['data-card','data-cell','data-building','data-market','data-copy','data-ruling','data-copy-resolution','data-recent-cell']) {
    if(element.hasAttribute(name))return `[${name}="${CSS.escape(element.getAttribute(name))}"]`;
  }
  return null;
}
function render() {
  if(forcedFinalPick())selected=state.players[0].hand.map(c=>c.instanceId);
  const focus=focusedControl();
  const boardScroll=document.querySelector('.board-scroll')?.scrollLeft||0;
  const openPanels=[...document.querySelectorAll('details[open]')].map(el=>el.querySelector('summary')?.textContent);
  const saved=saveGame(state,{selected,buildingId,targets,inspected,boardZoom,animationsEnabled});
  if(state.phase==='finished'&&!reviewingFinalBoard){renderResults(saved);return;}
  const handScroll=document.querySelector('.hand')?.scrollLeft||0;
  const sideScroll=document.querySelector('.table-sidebar')?.scrollTop||0;
  const recap=document.querySelector('.last-turn-panel');
  const recapScroll=recap?.dataset.turn===(state.lastTurn?state.lastTurn.round+'-'+state.lastTurn.pick:'none')?recap.scrollTop:0;
  app.classList.remove('at-results');app.classList.add('at-table');
  app.innerHTML = `
    <div class="game-heading"><div class="round-token">${state.round}<small>/ 4</small></div><div class="turn-heading"><p class="eyebrow">${({draft:'EXPLORATION',camps:'CAMP PRIORITY',construction:'CONSTRUCTION',markets:'TRADING POSTS',harvest:'HARVEST',parchments:'FINAL SCORING',finished:'GAME COMPLETE'})[state.phase]}</p><h1>${({draft:'Choose your next move',camps:'Claim a foothold',construction:'Build your kingdom',markets:'Gather your resources',harvest:'A season of plenty',parchments:'The royal reckoning',finished:'A kingdom to remember'})[state.phase]}</h1></div><div class="heading-actions"><button id="toggle-animation" class="quiet" aria-pressed="${animationsEnabled&&!matchMedia('(prefers-reduced-motion: reduce)').matches}" ${matchMedia('(prefers-reduced-motion: reduce)').matches?'disabled title="Your device requests reduced motion"':''}>Animations: ${animationsEnabled&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'on':'off'}</button><button id="new-game" class="quiet">New game</button></div></div>
    <div class="game-layout table-layout" data-phase="${state.phase}">
      <section class="map-panel panel" id="map-panel" tabindex="-1"><div class="board-workspace">${lastTurnPanel(state)}<div class="board-area">${boardToolbar()}<div class="board-scroll" tabindex="0" role="region" aria-label="Board; scroll to explore in the enlarged view">${board()}</div><p class="legend" id="fief-readout"></p></div></div></section>
      <aside class="table-sidebar panel">${playerPanels()}<section id="turn-panel" tabindex="-1">${state.phase==='draft'?`<p class="eyebrow">PICK ${state.draftTurn} · PASS ${state.round%2?'LEFT':'RIGHT'}</p><h2>${state.players.length===2?'Play one, discard one':'Play two cards'}</h2>`:''}<div id="error" role="alert">${error?`<p class="error">${escape(error)}</p>`:''}</div><div id="actions">${state.phase==='draft'?draftPanel():constructionPanel()}</div></section>${inspectionPanel()}${privateCardsPanel()}${pieceKey()}<details class="log"><summary>Table activity</summary>${state.log.slice(-30).reverse().map(x=>`<p>${escape(x)}</p>`).join('')}</details></aside>${state.phase==='draft'?handPanel():''}
    </div>
    <nav class="game-nav" aria-label="Game sections"><a href="#map-panel">▦ Board</a>${state.phase==='draft'?'<a href="#hand-panel">Your hand</a>':''}<a href="#turn-panel">${({draft:'Confirm',camps:'Place Camp',construction:'Buildings',markets:'Resources',harvest:'Harvest',parchments:'Parchments',finished:'Results'})[state.phase]} →</a></nav>
    <p class="save-status muted">${saved?'Autosaved in this browser':'Browser storage is unavailable; keep this tab open to retain your game'} · ${state.botDifficulty==='easy'?'Easy':'Normal'} bots · Seed ${escape(state.seed)}</p>`;
  document.querySelector('.heading-actions').insertAdjacentHTML('afterbegin',soundToggleHTML());bindSoundToggles();
  if(state.phase==='finished') {
    document.querySelector('.heading-actions').insertAdjacentHTML('afterbegin','<button id="show-results" class="quiet">Results</button>');
    document.querySelector('#show-results').onclick=()=>{reviewingFinalBoard=false;render();};
  }
  const hand=document.querySelector('.hand');if(hand)hand.scrollLeft=handScroll;
  document.querySelector('.table-sidebar').scrollTop=sideScroll;
  document.querySelector('.last-turn-panel').scrollTop=recapScroll;
  document.querySelectorAll('details').forEach(el=>{if(openPanels.includes(el.querySelector('summary')?.textContent))el.open=true;});
  document.querySelector('#new-game').onclick = setup;
  document.querySelector('#toggle-animation').onclick=()=>{animationsEnabled=!animationsEnabled;render();};
  document.querySelector('.board-scroll').scrollLeft=boardScroll;
  document.querySelector('#board-zoom').onclick=()=>{boardZoom=!boardZoom;render();};
  const boardConfirm=document.querySelector('#board-confirm');
  if(boardConfirm)boardConfirm.onclick=()=>document.querySelector('#place-building').click();
  bindConstruction();
  bindKingdomInspection(state,inspected);
  document.querySelectorAll('[data-recent-cell]').forEach(button=>button.onclick=()=>{inspected=button.dataset.recentCell;render();});
  document.querySelectorAll('[data-card]').forEach(button => button.onclick = () => {
    if(forcedFinalPick())return;
    const id = button.dataset.card;
    if (selected.includes(id)) {selected = selected.filter(x => x !== id);soundEffects.play('deselect');}
    else if (selected.length < 2) {selected.push(id);soundEffects.play('select');}
    render();
  });
  document.querySelectorAll('[data-card]').forEach(button=>{
    const preview=()=>{
      const card=state.players[0].hand.find(c=>c.instanceId===button.dataset.card);
      document.querySelector('#card-preview').innerHTML=cardPreview(card);
      document.querySelector('#card-preview').classList.add('visible');
      document.querySelectorAll('.preview-target').forEach(el=>el.classList.remove('preview-target'));
      if(card.coordinate)document.querySelector(`[data-cell="${card.coordinate}"]`)?.classList.add('preview-target');
    };
    button.onmouseenter=preview;button.onfocus=preview;
    const hidePreview=()=>{
      document.querySelector('#card-preview')?.classList.remove('visible');
      document.querySelectorAll('.preview-target').forEach(el=>el.classList.remove('preview-target'));
    };
    button.onmouseleave=hidePreview;button.onblur=hidePreview;
  });
  const confirm = document.querySelector('#confirm-draft');
  if (confirm) confirm.onclick = () => attempt(() => {
    const choices = state.players.map(p => p.bot ? botPolicy().chooseDraft(publicView(state, p.id), p.id) : { play: state.players.length === 2 ? [selected[0]] : [...selected], discard: state.players.length === 2 ? [selected[1]] : [] });
    resolveDraft(state, choices); selected = []; if(state.phase==='construction') beginCampOffers(state); driveBots();
  });
  const swap=document.querySelector('#swap-draft');
  if(swap)swap.onclick=()=>{selected.reverse();render();soundEffects.play('select');};
  const clear=document.querySelector('#clear-draft');
  if(clear)clear.onclick=()=>{selected=[];render();soundEffects.play('deselect');};
  if(focus)document.querySelector(focus)?.focus({preventScroll:true});
}

function renderResults(saved) {
  app.classList.remove('at-table');app.classList.add('at-results');
  app.innerHTML=resultsScreen(state,saved);
  bindSoundToggles();
  document.querySelector('#play-again').onclick=setup;
  document.querySelector('#download-game').onclick=()=>{
    const file=exportGame(state,{selected,buildingId,targets,inspected,boardZoom,animationsEnabled});
    const url=URL.createObjectURL(new Blob([file.text],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=file.filename;
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  document.querySelector('#review-board').onclick=()=>{
    reviewingFinalBoard=true;render();
    document.querySelector('#map-panel').focus({preventScroll:true});window.scrollTo(0,0);
  };
  document.querySelector('#results-title').focus({preventScroll:true});window.scrollTo(0,0);
}

function constructionPanel() {
  if(state.phase==='camps') {
    const current=state.campQueue[0];
    return `<p class="eyebrow">CAMP PRIORITY ${current.priority}</p><h2>Place your camp?</h2>${placementGuide()}<p class="help">Choose an empty territory and confirm, or keep this Camp for later. Lower-numbered Camps have first choice.</p><div class="actions"><button class="primary" id="place-building" ${targets.length?'':'disabled'}>Confirm camp</button><button class="quiet" id="save-camp">Save camp</button></div>`;
  }
  if(state.phase==='markets') return `<h2>Choose your Trading Posts</h2><p class="help">Each Trading Post produces one basic resource this round. Round 4 choices also apply to parchment scoring.</p>${tradingPosts(state,0).map(c=>`<label>${c.coordinate}<select data-market="${c.coordinate}"><option value="" disabled>Choose a resource</option>${['wood','fish','carrots'].map(r=>`<option value="${r}" ${c.building.choice===r?'selected':''}>${r}</option>`).join('')}</select></label>`).join('') || '<p>You have no Trading Posts to assign.</p>'}<div class="actions"><button id="confirm-markets" class="primary" ${tradingPosts(state,0).some(c=>!c.building.choice)?'disabled':''}>Confirm & harvest</button></div>`;
  if(state.phase==='harvest') return `<h2>Round ${state.round} harvest</h2><table class="table"><thead><tr><th>Player</th><th>Harvest</th><th>Total</th></tr></thead><tbody>${state.lastHarvest.map(h=>`<tr><td>${state.players[h.playerId].name}</td><td>+${h.points}</td><td>${state.players[h.playerId].score}</td></tr>`).join('')}</tbody></table>${state.lastHarvest.map(h=>`<details class="fief-list"><summary>${state.players[h.playerId].name}: fief breakdown</summary>${h.fiefs.map(f=>`<p>${f.coordinates.join(', ')}: ${f.strength} strength × ${f.wealth} resources = ${f.points}</p>`).join('')}</details>`).join('')}<div class="actions"><button id="next-round" class="primary">${state.round===4?'Reveal parchments':'Begin round '+(state.round+1)} →</button></div>`;
  if(['parchments','finished'].includes(state.phase)) return scoringPanel(state);
  const available = state.players[0].buildings;
  const card=available.find(c=>c.instanceId===buildingId);
  const complete=card&&targets.length===(card.category==='sky_tower'?2:1);
  return `<p class="help">Select a building, then an eligible territory. Sky Towers need two territories in separate fiefs. Unplaced buildings can be saved for later rounds.</p>${available.length?placementGuide():'<p class="help">You have no buildings waiting. Continue to the harvest.</p>'}<div class="building-list">${available.map(c=>`<button class="card ${c.instanceId===buildingId?'selected':''}" data-building="${c.instanceId}"><span class="tag">${c.farmType==='luxury'?'Luxury farm':c.category.replace('_',' ')}</span><span class="building-illustration">${cardArt(c)}</span><h3>${escape(c.name)}</h3><p>${escape(cardText(c,state))}</p></button>`).join('')}</div><div class="actions"><button class="primary" id="place-building" ${complete ? '' : 'disabled'}>Place building</button><button class="quiet" id="cancel-building" ${buildingId?'':'disabled'}>Cancel selection</button><button class="quiet" id="finish-building">Done building · save the rest</button></div><details class="fief-list"><summary>Your current fiefs</summary>${fiefs(state,0).map(f=>`<p>${f.coordinates.join(', ')}: strength ${f.strength} × ${f.wealth} resources = ${f.points}</p>`).join('')}</details>`;
}
async function attempt(action) {
  if(playing)return;
  soundEffects.unlock();
  const before=capturePresentation(state),phase=state.phase;
  try {error='';action();} catch(e) {error=e.message;render();soundEffects.play('error');return;}
  const events=animationEvents(before,state,data.buildings.cards);
  const transition=phase!==state.phase?({harvest:'harvest',parchments:'reveal',finished:'finish',draft:'round'})[state.phase]:null;
  playing=animationsEnabled&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&events.length>0;
  render();
  if(!playing) {
    // Fast play gets one compact cue instead of stacking every player's sounds.
    if(transition||events.length)soundEffects.play(transition||(events.length===1?events[0].type:'confirm'));
    return;
  }
  soundEffects.play('confirm');
  try {await playAnimation(before,state,events);} catch(e) {console.warn('Turn saved; animation interrupted.',e);}
  finally {playing=false;app.inert=false;render();document.querySelector('#turn-panel')?.focus({preventScroll:true});}
}
function driveBots() {
  while(state.phase==='camps') {
    const next=state.campQueue[0];
    if(next.playerId===0) {buildingId=next.cardId;targets=[];return;}
    respondCamp(state,next.playerId,botPolicy().chooseCamp(publicView(state,next.playerId),next.playerId,next.cardId));
  }
  buildingId=null;targets=[];
  if (state.phase === 'construction') for (const p of state.players.filter(p=>p.bot&&!p.ready)) {
    let action;
    while ((action=botPolicy().chooseBuilding(publicView(state,p.id),p.id))) placeBuilding(state,p.id,action.cardId,action.coordinates);
    finishConstruction(state,p.id);
  }
  if(state.phase==='parchments') {
    state.scoringDecisions ||= {copies:{},rulings:{},copyResolutions:{}};
    for(const p of state.players.filter(p=>p.bot)) Object.assign(state.scoringDecisions.copies,botPolicy().chooseCopies(publicView(state,p.id),p.id,state.scoringDecisions));
  }
  if(state.phase==='markets') for(const p of state.players.filter(p=>p.bot&&!p.ready)) {
    for(const c of botPolicy().chooseMarkets(publicView(state,p.id),p.id)) chooseResource(state,p.id,c.coordinate,c.resource);
    finishMarkets(state,p.id);
  }
}
function bindConstruction() {
  document.querySelectorAll('[data-building]').forEach(b=>b.onclick=()=>attempt(()=>{buildingId=b.dataset.building;targets=[];soundEffects.play('select');const c=state.players[0].buildings.find(c=>c.instanceId===buildingId);if(c.category==='camp'){requestCamp(state,0,buildingId);driveBots();}}));
  document.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>{
    const card=state.players[0].buildings.find(c=>c.instanceId===buildingId);
    inspected=b.dataset.cell;
    if(!card || !placementOptions().includes(b.dataset.cell)) {render();return;}
    const id=b.dataset.cell, count=card.category==='sky_tower'?2:1;
    if(targets.includes(id)) targets=targets.filter(c=>c!==id);
    else targets=count===1?[id]:targets.length?[targets[0],id]:[id];
    soundEffects.play('select');
    render();
  });
  const bind=(id,fn)=>{const b=document.getElementById(id);if(b)b.onclick=()=>attempt(fn);};
  bind('place-building',()=>{if(state.phase==='camps'){respondCamp(state,0,targets[0]);driveBots();}else{placeBuilding(state,0,buildingId,targets);buildingId=null;targets=[];}});
  document.querySelectorAll('[data-market]').forEach(select=>select.onchange=()=>attempt(()=>chooseResource(state,0,select.dataset.market,select.value)));
  bind('confirm-markets',()=>{finishMarkets(state,0);driveBots();});
  bind('next-round',()=>{advanceRound(state);selected=[];buildingId=null;targets=[];driveBots();});
  document.querySelectorAll('[data-copy]').forEach(s=>s.onchange=()=>attempt(()=>{state.scoringDecisions.copies[s.dataset.copy]=s.value;state.scoringDecisions.copyResolutions={};state.scoringDecisions.rulings={};}));
  document.querySelectorAll('[data-ruling]').forEach(s=>s.onchange=()=>attempt(()=>{if(s.value!=='')state.scoringDecisions.rulings[s.dataset.ruling]=Number(s.value);}));
  document.querySelectorAll('[data-copy-resolution]').forEach(s=>s.onchange=()=>attempt(()=>{state.scoringDecisions.copyResolutions[s.dataset.copyResolution]=s.value;state.scoringDecisions.rulings={};}));
  document.querySelectorAll('[data-reset-ruling]').forEach(b=>b.onclick=()=>attempt(()=>{
    delete state.scoringDecisions.rulings[b.dataset.resetRuling];
    // A changed earlier award can change the later rank ruling.
    for(const key of Object.keys(state.scoringDecisions.rulings))if(key.startsWith('opportunist:'))delete state.scoringDecisions.rulings[key];
  }));
  document.querySelectorAll('[data-reset-copy-resolution]').forEach(b=>b.onclick=()=>attempt(()=>{delete state.scoringDecisions.copyResolutions[b.dataset.resetCopyResolution];state.scoringDecisions.rulings={};}));
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
  return `<div class="inspector"><h3>${c.coordinate} · ${owner}</h3><p>${c.terrain} · natural resource: ${resourceNames[c.baseResource]||'none'}</p><p>${escape(buildingText(c.building))}</p>${lava.length?`<p class="lava-note">Lava blocks the direct connection to ${lava.join(', ')}.</p>`:''}${group?`<p>Fief: ${group.coordinates.length} territories · ${group.strength} strength × ${group.wealth} resources = ${group.points} points</p><p>Resources: ${group.resources.map(r=>resourceNames[r]).join(', ')||'none'}</p>`:''}</div>`;
}
function privateCardsPanel() {
  if(['parchments','finished'].includes(state.phase))return '';
  return `<details class="private-parchments"><summary>Your secret parchments · ${state.players[0].parchments.length}</summary>${state.players[0].parchments.map(c=>`<button class="parchment-mini" data-pile="parchments" data-pile-player="0" title="${escape(cardText(c,state))}">${cardArt(c)}<b>${escape(c.name)}</b></button>`).join('')||'<p>No parchments yet.</p>'}</details><details class="fief-list"><summary>Buildings waiting at the table</summary>${state.players.map(p=>`<p><b>${p.name}:</b> ${p.buildings.map(c=>escape(c.name)).join(', ')||'none'}</p>`).join('')}</details>`;
}
