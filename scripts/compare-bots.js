// Compare against an immutable checkout, e.g. --baseline /tmp/bunny-bots-v2/src/bots.js
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {runMatch,summarize} from './benchmark-bots.js';

const option=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];};
const baselinePath=option('baseline',null);
if(!baselinePath)throw Error('Supply --baseline with the bot module in a frozen checkout.');
const opponent=await import(pathToFileURL(resolve(baselinePath)).href);
const seeds=Number(option('seeds',20)),counts=option('players','2,3,4').split(',').map(Number);
if(!Number.isInteger(seeds)||seeds<1||counts.some(n=>![2,3,4].includes(n)))throw Error('Invalid seeds or player counts.');
const prefix=option('prefix','camp-defense-development'),ruling=option('rulings','low');
if(!['low','high'].includes(ruling))throw Error('Use --rulings low or high.');
const report={baseline:option('baseline-label',baselinePath),seedPrefix:prefix,seedsPerPlayerCount:seeds,rulingConvention:ruling,results:{}};
for(const players of counts) {
  const matches=[],controls=[];
  for(let i=0;i<seeds;i++) {
    const seed=`${prefix}-${i}`;
    // Every seat uses the old policy in this deterministic control game, so its
    // scores can be reused for each candidate seat on the same deal.
    const control=runMatch(players,seed,0,{ruling,challenger:opponent,opponent});
    const highest=Math.max(...control.scores),winners=control.scores.filter(n=>n===highest).length;
    for(let seat=0;seat<players;seat++) {
      controls.push({...control,seat,margin:control.scores[seat]-Math.max(...control.scores.filter((_,p)=>p!==seat)),
        winShare:control.scores[seat]===highest?1/winners:0,timings:seat===0?control.timings:[]});
      matches.push(runMatch(players,seed,seat,{ruling,opponent}));
    }
    if((i+1)%5===0)console.error(`${players} players: ${i+1}/${seeds} deals`);
  }
  const candidate=summarize(matches),control=summarize(controls);
  const paired=matches.map((m,i)=>({seed:m.seed,seat:m.seat,scores:m.scores,controlScores:controls[i].scores,
    marginChange:m.margin-controls[i].margin,winShare:m.winShare,controlWinShare:controls[i].winShare,
    rulingCases:m.rulingCases,controlRulingCases:controls[i].rulingCases}));
  const comparable=paired.filter(m=>!m.rulingCases&&!m.controlRulingCases);
  const summary={candidate,control,meanMarginChange:candidate.averageMargin-control.averageMargin,
    changedResults:paired.filter(m=>m.scores.some((n,i)=>n!==m.controlScores[i])).length,
    withoutRulings:{games:comparable.length,meanMarginChange:comparable.length?comparable.reduce((n,m)=>n+m.marginChange,0)/comparable.length:null}};
  report.results[players]={...summary,matches:paired};
  console.log(JSON.stringify({players,...summary}));
}
const output=option('output',null);
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
