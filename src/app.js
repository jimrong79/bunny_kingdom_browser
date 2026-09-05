import { createGame } from './game.js';
const app = document.querySelector('#app');
let data, state;
export const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = { forest: '♣', field: '🥕', sea: '≈', mountain: '▲', plains: '·', city: '♜' };
try {
  const responses = await Promise.all(['data/maps/original-board.json', 'data/cards/base-buildings-and-provisions.json', 'data/cards/base-parchments.json'].map(async path => { const r = await fetch(path); if (!r.ok) throw Error(`Could not load ${path}`); return r.json(); }));
  data = { map: responses[0], buildings: responses[1], parchments: responses[2] };
  setup();
} catch (e) { app.innerHTML = `<section class="panel"><h1>Unable to load the game</h1><p>${escape(e.message)}</p><p>Start the local server from the project folder: <code>python3 -m http.server 8000 --bind 127.0.0.1</code>, then open <a href="http://localhost:8000">localhost:8000</a>.</p></section>`; }
function setup() {
  app.innerHTML = `<section class="setup panel"><p class="eyebrow">A KINGDOM BEGINS WITH A BUNNY</p><h1>Make this world<br>your own.</h1><p class="lede">Claim land, build cities, and gather a royal fortune over four seasons.</p><form id="setup"><label>Bot opponents<select name="bots"><option value="1">1 bot · 2-player game</option><option value="2" selected>2 bots · 3-player game</option><option value="3">3 bots · 4-player game</option></select></label><label>Game seed <span class="muted">optional</span><input name="seed" placeholder="A new world every game" maxlength="100"></label><button class="primary">Start game <span>→</span></button></form><p class="muted">Original 100-territory board · Full 182-card deck</p></section>`;
  document.querySelector('#setup').onsubmit = event => { event.preventDefault(); const f = new FormData(event.target); state = createGame(data, Number(f.get('bots')), f.get('seed') || Date.now()); render(); };
}
function board() {
  const blocked = new Set(state.blockedConnections.flatMap(e => [e.from + ':' + e.to, e.to + ':' + e.from]));
  return `<div class="board" aria-label="New World board">${Object.values(state.cells).map(c => {
    const right = c.row + (c.column + 1), down = String.fromCharCode(c.row.charCodeAt(0) + 1) + c.column;
    return `<button class="cell ${c.terrain} ${blocked.has(c.coordinate + ':' + right) ? 'lava-right' : ''} ${blocked.has(c.coordinate + ':' + down) ? 'lava-bottom' : ''}" data-cell="${c.coordinate}" title="${c.coordinate}: ${c.terrain}${c.building ? ', city strength ' + c.building.strength : ''}"><small>${c.coordinate}</small><span>${icons[c.terrain]}</span>${c.building ? `<b class="piece">♜${c.building.strength}</b>` : ''}</button>`;
  }).join('')}</div>`;
}
function cardHTML(c) { return `<article class="card ${c.category}"><span class="tag">${escape(c.category)}</span><h3>${escape(c.name)}</h3><p>${escape(c.sourceText || (c.category === 'territory' ? c.terrain : c.category === 'provisions' ? 'Draw and play 2 cards immediately.' : 'Place during Construction.'))}</p></article>`; }
function render() {
  app.innerHTML = `<div class="game-heading"><div><p class="eyebrow">ROUND ${state.round} OF 4</p><h1>Explore the New World</h1></div><button id="new-game" class="quiet">New game</button></div><div class="players">${state.players.map(p => `<div class="player" style="--player:${p.color}"><b>${p.name}</b><span>${p.score} <small>points</small></span><small>${p.hand.length} cards · ${p.parchments.length} parchments</small></div>`).join('')}</div><div class="game-layout"><section class="map-panel panel">${board()}<p class="legend">♣ Forest / wood &nbsp; 🥕 Field / carrots &nbsp; ≈ Sea / fish &nbsp; ▲ Mountain &nbsp; · Plains &nbsp; ♜ City<br><span class="lava-key">━</span> Lava blocks a shared edge</p></section><aside class="panel"><p class="eyebrow">YOUR HAND</p><h2>Round ${state.round} is dealt</h2><p>${state.players.length === 2 ? 'Play 1 card and discard 1. A reserve card is added before each pick.' : 'Choose 2 cards each pick.'} Pass ${state.round % 2 ? 'left' : 'right'}.</p><p class="muted">Drafting controls are being added in the next feature.</p><div class="hand">${state.players[0].hand.map(cardHTML).join('')}</div></aside></div>`;
  document.querySelector('#new-game').onclick = setup;
}
