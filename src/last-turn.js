import { rabbitArt } from './art.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function actionText(action,state) {
  switch(action.type) {
    case 'territory': return `Claimed <button class="turn-coordinate" data-recent-cell="${esc(action.coordinate)}">${esc(action.coordinate)}</button>${action.campOwner===null?'':` · replaced ${action.campOwner===0?'your':esc(state.players[action.campOwner].name)+"'s"} Camp`}`;
    case 'building': return `Reserved ${esc(action.name)}`;
    case 'parchment': return 'Kept a secret parchment';
    case 'provisions': return 'Played Provisions · 2 extra cards';
    case 'discard': return `Discarded ${action.count} card${action.count===1?'':'s'} face down`;
    default: return '';
  }
}

export function lastTurnPanel(state) {
  const turn=state.lastTurn;
  return `<aside class="last-turn-panel panel" id="last-turn-panel" data-turn="${turn?turn.round+'-'+turn.pick:'none'}" aria-label="Last turn"><p class="eyebrow">TABLE RECAP</p><h2>Last turn</h2>${turn?`<p class="turn-stamp">Round ${turn.round} · Pick ${turn.pick}</p><div class="turn-players">${turn.players.map(entry=>{
    const player=state.players[entry.playerId];
    return `<section class="turn-player" data-turn-player="${player.id}" style="--player:${player.color}"><h3><span class="turn-rabbit">${rabbitArt()}</span>${esc(player.name)}</h3><ul>${entry.actions.map(action=>`<li>${actionText(action,state)}</li>`).join('')}</ul></section>`;
  }).join('')}</div>`:'<p class="muted">The next confirmed pick will show what each player did here.</p>'}</aside>`;
}
