import { rabbitArt } from './art.js';
import { scoringPanel } from './scoring-ui.js';
import { soundToggleHTML } from './sound.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const crown='<svg viewBox="0 0 64 48" aria-hidden="true" focusable="false"><path d="M12 33L6 12L22 21L32 5L42 21L58 12L52 33Z" fill="#e8bd59" stroke="#99702d" stroke-width="2" stroke-linejoin="round"/><path d="M12 39H52" stroke="#e8bd59" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="25" r="3" fill="#fff5cb"/></svg>';

export function resultsScreen(state,saved) {
  const shared=state.winners.length>1;
  const title=shared?'Shared victory!':state.winners[0]===0?'You win!':`${state.players[state.winners[0]].name} wins!`;
  const ranked=[...state.players].sort((a,b)=>b.score-a.score||a.id-b.id);
  return `<section class="results-screen" aria-labelledby="results-title">
    <div class="results-toolbar"><span class="eyebrow">THE ROYAL RESULTS</span>${soundToggleHTML()}</div>
    <div class="results-intro"><div class="results-crown">${crown}</div><h1 id="results-title" tabindex="-1">${esc(title)}</h1><p>Four harvests and all parchments scored.</p></div>
    <ol class="final-standings" style="--players:${ranked.length}" aria-label="Final standings">
      ${ranked.map(player=>{
        const winner=state.winners.includes(player.id);
        const rank=1+ranked.filter(p=>p.score>player.score).length;
        const score=state.finalScoring.players.find(p=>p.playerId===player.id);
        return `<li class="result-player ${winner?'result-winner':''}" data-result-player="${player.id}" style="--player:${esc(player.color)}" value="${rank}">
          <div class="result-rank"><span aria-label="Rank ${rank}">${['','1st','2nd','3rd','4th'][rank]}</span>${winner?`<strong class="winner-badge">${crown}${shared?'Joint winner':'Winner'}</strong>`:''}</div>
          <div class="result-rabbit">${rabbitArt()}</div><h2>${esc(player.name)}</h2>
          <div class="result-score">${player.score}</div><span class="result-points-label">points</span>
          <dl class="result-breakdown"><div><dt>Harvests</dt><dd>${score.harvest}</dd></div><div><dt>Parchments</dt><dd>${score.parchmentPoints}</dd></div></dl>
        </li>`;
      }).join('')}
    </ol>
    <div class="results-actions"><button id="play-again" class="primary">Play again</button><button id="review-board" class="quiet">Review board</button><button id="download-game" class="quiet">Download game</button></div>
    <p class="results-save">${saved?'Result saved in this browser':'Keep this tab open to retain your result'} · Seed ${esc(state.seed)}</p>
    <details class="results-details"><summary>Full scoring breakdown</summary><div>${scoringPanel(state,{showPlayAgain:false})}</div></details>
  </section>`;
}
