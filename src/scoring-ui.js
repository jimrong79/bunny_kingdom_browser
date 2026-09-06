import { cardArt } from './art.js';
import { copyOptions, evaluateFinal, isCopy } from './scoring.js';
import { copyScoreOptions } from './parchment-preview.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function recordedRulings(state) {
  const d=state.scoringDecisions,finished=state.phase==='finished';
  const cards=state.players.flatMap(p=>p.parchments.map(c=>({...c,holder:p.name})));
  const rows=Object.entries(d.rulings||{}).map(([key,value])=>{
    const [kind,id]=key.split(':');
    const card=cards.find(c=>c.instanceId===id);
    const label=kind==='hunter'?`${state.players[Number(id)].name}: total treasure multiplier`:`${card?.holder||'Player'}: ${card?.name||kind}`;
    return `<li><span><b>${esc(label)}</b>: ${value}${kind==='hunter'?'× treasure value':' points'}</span>${finished?'':`<button class="quiet" data-reset-ruling="${esc(key)}">Revise</button>`}</li>`;
  });
  for(const [id,target] of Object.entries(d.copyResolutions||{})) {
    const card=cards.find(c=>c.instanceId===id),copied=cards.find(c=>c.instanceId===target);
    if(!copied)continue;
    rows.push(`<li><span><b>${esc(card?.holder)}: ${esc(card?.name)}</b> resolves to ${esc(copied.name)} (${esc(copied.holder)})</span>${finished?'':`<button class="quiet" data-reset-copy-resolution="${esc(id)}">Revise</button>`}</li>`);
  }
  return rows.length?`<details class="rulings-review" open><summary>Recorded rulings · ${rows.length}</summary><p>These are the choices made for unresolved rule cases in this game.</p><ul>${rows.join('')}</ul></details>`:'';
}
export function scoringPanel(state,{showPlayAgain=true}={}) {
  const finished=state.phase==='finished',d=state.scoringDecisions;
  const result=finished?state.finalScoring:evaluateFinal(state,d);
  const cards=state.players.flatMap(p=>p.parchments.map(c=>({...c,holder:p.name})));
  const copies=finished?'':state.players[0].parchments.filter(isCopy).map(c=>{
    const options=copyOptions(state,0,c),ranked=copyScoreOptions(state,0,c,d);
    const selected=ranked.find(o=>o.card.instanceId===d.copies[c.instanceId]);
    return `<label class="copy-choice">${esc(c.name)} · copy from ${esc(state.players[options.playerId].name)}<select data-copy="${c.instanceId}" ${options.cards.length?'':'disabled'}><option value="">${options.cards.length?'Choose a parchment':'No parchment available'}</option>${ranked.map(o=>`<option value="${o.card.instanceId}" ${d.copies[c.instanceId]===o.card.instanceId?'selected':''}>${esc(o.card.name)} — ${o.points===null?'points pending':o.points+' pts'} · ${o.complete?o.total+' total':'total pending'}</option>`).join('')}</select>${selected?`<small class="copy-card-detail">${esc(selected.card.sourceText)}</small>`:''}</label>`;
  }).join('');
  const questions=finished?'':result.issues.filter(i=>i.kind!=='copy').map(issue=>`<div class="ruling"><p>${esc(issue.label)}</p><p class="muted">This case is still awaiting an official clarification. Your explicit ruling is recorded with this game.</p>${issue.kind==='copy_resolution'?`<select data-copy-resolution="${issue.key}"><option value="">Select the final copied card</option>${cards.filter(c=>!isCopy(c)).map(c=>`<option value="${c.instanceId}">${esc(c.holder)}: ${esc(c.name)}</option>`).join('')}</select>`:`<select data-ruling="${issue.key}"><option value="">Choose a ruling</option>${issue.options.map(n=>`<option value="${n}">${n}${issue.kind==='multiplier'?'× treasure value':' points'}</option>`).join('')}</select>`}</div>`).join('');
  const title=finished?(state.winners.length===1&&state.winners[0]===0?'You win!':`${state.winners.map(id=>state.players[id].name).join(' & ')} ${state.winners.length>1?'share the victory':'wins'}!`):'Reveal the royal parchments';
  return `<h2>${esc(title)}</h2><p class="help">${finished?'Four harvests and parchment scoring are complete.':'All parchment cards are now public. Make your copy choices, then confirm the final score.'}</p>${copies?'<p class="copy-score-help">Points use your kingdom. Highest final total first, including combinations with your other parchments. Unresolved options follow.</p>':''}${copies}${questions}${recordedRulings(state)}<table class="table"><thead><tr><th>Player</th><th>Harvests</th><th>Parchments</th><th>Total${!result.complete?'*':''}</th></tr></thead><tbody>${result.players.map(p=>`<tr><td>${esc(state.players[p.playerId].name)}</td><td>${p.harvest}</td><td>${p.rows.some(r=>r.points===null)?'pending':p.parchmentPoints}</td><td>${p.total}</td></tr>`).join('')}</tbody></table>${!result.complete?'<p class="muted">* Totals are provisional until all choices and rulings are complete.</p>':''}${result.players.map(p=>`<details class="fief-list" ${p.playerId===0?'open':''}><summary>${esc(state.players[p.playerId].name)} · ${p.rows.length} parchments</summary>${p.rows.map(r=>`<div class="scoring-row illustrated-score"><span class="score-art">${cardArt(state.players[p.playerId].parchments.find(c=>c.instanceId===r.id))}</span><b>${esc(r.name)} <span>${r.points===null?'…':r.points}</span></b><p>${esc(state.players[p.playerId].parchments.find(c=>c.instanceId===r.id).sourceText)}</p>${r.note?`<p>${esc(r.note)}</p>`:''}</div>`).join('')||'<p>No parchments.</p>'}</details>`).join('')}${finished?(showPlayAgain?'<div class="actions"><button id="play-again" class="primary">Play again</button></div>':''):`<div class="actions"><button id="finish-scoring" class="primary" ${result.complete?'':'disabled'}>Confirm final score</button></div>`}`;
}
