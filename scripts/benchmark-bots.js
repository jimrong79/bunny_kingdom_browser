// Run with Node.js: node scripts/benchmark-bots.js --seeds 20 --players 2,3,4 --output /tmp/bot-results.json
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {data} from '../tests/fixtures.js';
import * as baseline from '../src/bots-baseline.js';
import * as candidate from '../src/bots.js';
import {createGame,publicView,resolveDraft} from '../src/game.js';
import {beginCampOffers,respondCamp} from '../src/camps.js';
import {placeBuilding,finishConstruction} from '../src/construction.js';
import {chooseResource,finishMarkets,advanceRound} from '../src/harvest.js';
import {evaluateFinal,finalizeScoring} from '../src/scoring.js';
import {validSave} from '../src/storage.js';

export function runMatch(players,seed,seat,{ruling='low',challenger=candidate}={}) {
  const state=createGame(data,players-1,seed),timings=[];
  const decide=(pid,method,...args)=>{
    const bot=pid===seat?challenger:baseline,view=publicView(state,pid),start=performance.now();
    const result=bot[method](view,pid,...args);
    if(pid===seat)timings.push({method,ms:performance.now()-start});
    return result;
  };
  for(let round=1;round<=4;round++) {
    while(state.phase==='draft')resolveDraft(state,state.players.map(p=>decide(p.id,'chooseDraft')));
    beginCampOffers(state);
    while(state.phase==='camps') {
      const camp=state.campQueue[0];respondCamp(state,camp.playerId,decide(camp.playerId,'chooseCamp',camp.cardId));
    }
    for(const p of state.players) {
      let move,count=0;
      while((move=decide(p.id,'chooseBuilding'))) {
        if(++count>50)throw Error('Construction did not terminate.');
        placeBuilding(state,p.id,move.cardId,move.coordinates);
      }
      finishConstruction(state,p.id);
    }
    for(const p of state.players) {
      for(const c of decide(p.id,'chooseMarkets'))chooseResource(state,p.id,c.coordinate,c.resource);
      finishMarkets(state,p.id);
    }
    advanceRound(state);
  }
  const decisions={copies:{},rulings:{},copyResolutions:{}};
  for(const p of state.players)Object.assign(decisions.copies,decide(p.id,'chooseCopies',decisions));
  let issues=0;
  for(let i=0;i<20;i++) {
    const result=evaluateFinal(state,decisions);
    if(result.complete)break;
    for(const issue of result.issues) {
      issues++;
      // Benchmark conventions only; these never become defaults in the browser's rules.
      if(issue.kind==='copy')throw Error('Bot left a copy choice unresolved.');
      if(issue.kind==='copy_resolution')decisions.copyResolutions[issue.key]=[...issue.options].sort()[0];
      else decisions.rulings[issue.key]=ruling==='high'?Math.max(...issue.options):Math.min(...issue.options);
    }
  }
  finalizeScoring(state,decisions);
  if(!validSave(state))throw Error('Card conservation or save integrity failed.');
  const scores=state.players.map(p=>p.score),bestOther=Math.max(...scores.filter((_,i)=>i!==seat));
  return {seed,seat,scores,winShare:state.winners.includes(seat)?1/state.winners.length:0,
    margin:scores[seat]-bestOther,rulingCases:issues,timings};
}

export function summarize(matches) {
  const times=matches.flatMap(m=>m.timings.filter(t=>t.method==='chooseDraft').map(t=>t.ms)).sort((a,b)=>a-b);
  return {games:matches.length,winRate:matches.reduce((n,m)=>n+m.winShare,0)/matches.length,
    averageMargin:matches.reduce((n,m)=>n+m.margin,0)/matches.length,
    averageScore:matches.reduce((n,m)=>n+m.scores[m.seat],0)/matches.length,
    gamesWithRulings:matches.filter(m=>m.rulingCases).length,
    draftMs:{mean:times.reduce((a,b)=>a+b,0)/times.length,p95:times[Math.floor(times.length*.95)],max:times.at(-1)}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const option=(name,fallback)=>{const index=process.argv.indexOf('--'+name);return index<0?fallback:process.argv[index+1];};
  const seeds=Number(option('seeds',20)),counts=option('players','2,3,4').split(',').map(Number),ruling=option('rulings','low'),prefix=option('prefix','evaluation-v2');
  const report={baselineCommit:'a747c2e',seedPrefix:prefix,seedsPerPlayerCount:seeds,rulingConvention:ruling,results:{}};
  for(const players of counts) {
    const matches=[];
    for(let i=0;i<seeds;i++)for(let seat=0;seat<players;seat++) {
      matches.push(runMatch(players,`${prefix}-${i}`,seat,{ruling}));
      if(matches.length%10===0)console.error(`${players} players: ${matches.length}/${seeds*players} games`);
    }
    report.results[players]={...summarize(matches),matches:matches.map(({timings,...match})=>match)};
    console.log(JSON.stringify({players,...summarize(matches)}));
  }
  const output=option('output',null);if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
}
