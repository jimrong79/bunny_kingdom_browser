import { createGame, publicView, resolveDraft } from './game.js';
import { chooseDraft } from './bots.js';
const app = document.querySelector('#app');
let data, state, selected = [];
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
    const right = c.row + (c.column + 1), down = String.fromCharCode(c.row.charCodeAt(0) + 1) + c.column;
    return `<button class="cell ${c.terrain} ${blocked.has(c.coordinate + ':' + right) ? 'lava-right' : ''} ${blocked.has(c.coordinate + ':' + down) ? 'lava-bottom' : ''}" style="--owner:${c.owner === null ? 'transparent' : state.players[c.owner].color}" data-cell="${c.coordinate}" title="${c.coordinate}: ${c.terrain}${c.building ? ', city strength ' + c.building.strength : ''}"><small>${c.coordinate}</small>${c.owner === null ? '' : `<i class="bunny" aria-label="${state.players[c.owner].name}">●</i>`}<span>${icons[c.terrain]}</span>${c.building ? `<b class="piece">♜${c.building.strength}</b>` : ''}</button>`;
  }).join('')}</div>`;
}
function cardHTML(c) {
  const i = selected.indexOf(c.instanceId), label = i >= 0 ? (state.players.length === 2 && i === 1 ? 'Discard' : 'Play') : '';
  return `<button class="card ${c.category} ${i >= 0 ? 'selected' : ''}" data-card="${c.instanceId}" aria-pressed="${i >= 0}"><span class="tag">${escape(c.category)} ${label ? ' · ' + label : ''}</span><h3>${escape(c.name)}</h3><p>${escape(c.sourceText || (c.category === 'territory' ? c.terrain : c.category === 'provisions' ? 'Draw and play 2 cards immediately.' : 'Place during Construction.'))}</p></button>`;
}
function render() {
  app.innerHTML = `<div class="game-heading"><div><p class="eyebrow">ROUND ${state.round} OF 4</p><h1>${state.phase === 'draft' ? 'Explore the New World' : 'Build your kingdom'}</h1></div><button id="new-game" class="quiet">New game</button></div><div class="players">${state.players.map(p => `<div class="player" style="--player:${p.color}"><b>${p.name}</b><span>${p.score} <small>points</small></span><small>${p.hand.length} cards · ${p.parchments.length} parchments</small></div>`).join('')}</div><div class="game-layout"><section class="map-panel panel">${board()}<p class="legend">♣ Forest / wood &nbsp; 🥕 Field / carrots &nbsp; ≈ Sea / fish &nbsp; ▲ Mountain &nbsp; · Plains &nbsp; ♜ City<br><span class="lava-key">━</span> Lava blocks a shared edge</p></section><aside class="panel"><p class="eyebrow">YOUR HAND</p><h2>${state.phase === 'draft' ? `Choose your cards · pick ${state.draftTurn}` : 'Construction'}</h2><p>${state.players.length === 2 ? 'Play 1 card and discard 1. A reserve card is added before each pick.' : 'Choose 2 cards each pick.'} Pass ${state.round % 2 ? 'left' : 'right'}.</p><div id="actions">${state.phase === 'draft' ? `<p class="muted">${state.players.length === 2 ? 'First selection: play. Second selection: discard.' : 'Select two cards, then confirm.'}</p><button id="confirm-draft" class="primary" ${selected.length !== 2 ? 'disabled' : ''}>Confirm cards & pass →</button><div class="hand">${state.players[0].hand.map(cardHTML).join('')}</div>` : `<p>${state.players[0].buildings.length} buildings available. Construction controls arrive in the next feature.</p>`}</div><details class="log"><summary>Table activity</summary>${state.log.slice(-30).reverse().map(x=>`<p>${escape(x)}</p>`).join('')}</details></aside></div>`;
  document.querySelector('#new-game').onclick = setup;
  document.querySelectorAll('[data-card]').forEach(button => button.onclick = () => {
    const id = button.dataset.card;
    if (selected.includes(id)) selected = selected.filter(x => x !== id);
    else if (selected.length < 2) selected.push(id);
    render();
  });
  const confirm = document.querySelector('#confirm-draft');
  if (confirm) confirm.onclick = () => {
    const choices = state.players.map(p => p.bot ? chooseDraft(publicView(state, p.id), p.id) : { play: state.players.length === 2 ? [selected[0]] : [...selected], discard: state.players.length === 2 ? [selected[1]] : [] });
    resolveDraft(state, choices); selected = []; render();
  };
}
