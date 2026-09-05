import { fiefs, resourcesAt } from './fiefs.js';
import { rabbitArt, resourceArt, pieceArt, cardArt } from './art.js';
import { cardText, resourceNames } from './card-text.js';
import { sortedHand } from './hand-order.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function productionCounts(state,playerId) {
  const cells=Object.values(state.cells).filter(c=>c.owner===playerId);
  const counts=Object.fromEntries(Object.keys(resourceNames).map(r=>[r,0]));
  for(const resource of cells.flatMap(resourcesAt))counts[resource]++;
  return {counts,territories:cells.length,pending:cells.filter(c=>c.building?.farmType==='trading_post'&&!c.building.choice).length};
}

export function cardBackArt() {
  return '<svg class="card-back-art" viewBox="0 0 64 64" aria-hidden="true"><rect x="9" y="5" width="36" height="49" rx="4" fill="#8c7350" transform="rotate(-10 27 30)"/><rect x="19" y="9" width="36" height="49" rx="4" fill="#60796d" stroke="#e9d7a6" stroke-width="3"/><path d="M25 15H49V51H25Z" fill="none" stroke="#d8c396"/><path d="M32 31C22 12 36 14 36 30C37 12 49 16 41 33C48 43 28 48 29 38Z" fill="#efddb3"/></svg>';
}

export function playerPanels(state) {
  return `<div class="players">${state.players.map(p=>{
    const {counts,territories,pending}=productionCounts(state,p.id);
    const resources=Object.keys(resourceNames).filter(r=>['carrots','fish','wood'].includes(r)||counts[r]);
    return `<section class="player" data-player="${p.id}" style="--player:${p.color}"><div class="player-name"><span class="player-rabbit" data-player-origin="${p.id}">${rabbitArt()}</span><b>${p.name}</b><span class="player-score">${p.score}<small> pts</small></span></div><small>${territories} territories · ${fiefs(state,p.id).length} fiefs${['construction','markets'].includes(state.phase)&&p.ready?' · ✓ Ready':''}</small><div class="production-row" aria-label="${p.name}'s resource production">${resources.map(r=>`<span data-production="${r}" title="${resourceNames[r]} production: ${counts[r]}" aria-label="${resourceNames[r]}: ${counts[r]}">${resourceArt(r)}<b>${counts[r]}</b></span>`).join('')}</div>${pending?`<small class="pending-production">${pending} Trading Post${pending===1?'':'s'} unassigned</small>`:''}<div class="player-piles"><button class="pile-button" data-pile="buildings" data-pile-player="${p.id}" title="View ${p.name}'s unplaced buildings">${pieceArt({category:'city',strength:2})}<span><b data-pile-count>${p.buildings.length}</b><small>Buildings</small></span></button><button class="pile-button" data-pile="parchments" data-pile-player="${p.id}" title="${p.id===0?'View your parchments':'View '+p.name+'’s parchment stack'}">${cardBackArt()}<span><b data-pile-count>${p.parchments.length}</b><small>Parchments</small></span></button></div></section>`;
  }).join('')}</div>`;
}

export function openInventory(state,playerId,pile) {
  document.querySelector('#inventory-dialog')?.remove();
  const player=state.players[playerId],hidden=pile==='parchments'&&playerId!==0&&!['parchments','finished'].includes(state.phase);
  const cards=hidden?[]:sortedHand(player[pile]);
  const dialog=document.createElement('dialog');dialog.id='inventory-dialog';dialog.className='inventory-dialog';
  dialog.innerHTML=`<form method="dialog" class="inventory-heading"><h2>${playerId===0?'Your':player.name+'’s'} ${pile==='buildings'?'ready-to-build tray':'parchments'}</h2><button class="quiet" aria-label="Close inventory">Close ×</button></form>${hidden?`<div class="sealed-stack">${cardBackArt()}<p>${player.parchments.length} face-down parchment${player.parchments.length===1?'':'s'}</p><p class="muted">Revealed after the fourth harvest.</p></div>`:`<div class="inventory-cards">${cards.map(c=>`<article class="inventory-card"><div class="inventory-art">${cardArt(c)}</div><h3>${esc(c.name)}</h3><p>${esc(cardText(c,state))}</p></article>`).join('')||`<p class="muted">${pile==='buildings'?'No buildings waiting.':'No parchments yet.'}</p>`}</div>`}`;
  document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.onclick=e=>{if(e.target===dialog)dialog.close();};dialog.showModal();
}

export function bindKingdomInspection(state,inspected) {
  const board=document.querySelector('.board'),readout=document.querySelector('#fief-readout');
  const byCoordinate=new Map();
  for(const player of state.players)for(const group of fiefs(state,player.id))for(const id of group.coordinates)byCoordinate.set(id,{player,group});
  const highlight=id=>{
    board.querySelectorAll('.fief-highlight').forEach(el=>el.classList.remove('fief-highlight'));
    const entry=byCoordinate.get(id);
    board.classList.toggle('has-fief-focus',Boolean(entry));
    if(!entry){readout.innerHTML='<span class="lava-key">━</span> Lava blocks connections · Hover or tap a territory to inspect its fief';return;}
    const {player,group}=entry;
    for(const coordinate of group.coordinates)board.querySelector(`[data-cell="${coordinate}"]`).classList.add('fief-highlight');
    readout.innerHTML=`<b style="color:${player.color}">${player.name}</b> · ${group.coordinates.length} territories · ${group.strength} strength × ${group.wealth} resource types = <b>${group.points} points</b>`;
  };
  for(const cell of board.querySelectorAll('[data-cell]')) {
    cell.onmouseenter=()=>highlight(cell.dataset.cell);cell.onfocus=()=>highlight(cell.dataset.cell);
    cell.onmouseleave=()=>highlight(inspected);cell.onblur=()=>highlight(inspected);
  }
  highlight(inspected);
  document.querySelectorAll('[data-pile]').forEach(b=>b.onclick=()=>openInventory(state,Number(b.dataset.pilePlayer),b.dataset.pile));
}
