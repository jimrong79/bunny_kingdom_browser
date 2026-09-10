// Compare complete policy modules, rotating the candidate through every seat.
// Workers run separate deals; they never share a game or a bot's private view.
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {runMatch,summarize} from './benchmark-bots.js';

if(!isMainThread) {
  const {baseline,challenger,expansion,ruling}=workerData;
  const opponent=await import(baseline),candidate=await import(challenger);
  parentPort.on('message',({players,seed})=>{
    try {
      const control=runMatch(players,seed,0,{expansion,ruling,challenger:opponent,opponent});
      const matches=[];
      for(let seat=0;seat<players;seat++)matches.push(runMatch(players,seed,seat,{expansion,ruling,challenger:candidate,opponent}));
      parentPort.postMessage({players,seed,control,matches});
    } catch(error) {parentPort.postMessage({error:error.stack,players,seed});}
  });
} else {
  const option=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];};
  const baseline=option('baseline',null),challenger=option('challenger',null),output=option('output',null);
  if(!baseline||!challenger||!output)throw Error('Supply --baseline, --challenger and --output.');
  const expansion=option('expansion','base'),ruling=option('rulings','low'),prefix=option('prefix','policy-development');
  const seeds=Number(option('seeds',20)),start=Number(option('start',0)),workers=Number(option('workers',2));
  const counts=option('players',expansion==='in_the_sky'?'3,4,5':'2,3,4').split(',').map(Number);
  if(!['base','in_the_sky'].includes(expansion)||!['low','high'].includes(ruling)
    ||![seeds,workers].every(n=>Number.isInteger(n)&&n>0)||!Number.isInteger(start)||start<0
    ||counts.some(n=>!Number.isInteger(n)||n<2||n>(expansion==='in_the_sky'?5:4)))throw Error('Invalid comparison options.');
  const tasks=counts.flatMap(players=>Array.from({length:seeds},(_,i)=>({players,seed:`${prefix}-${start+i}`})));
  const report={baseline:option('baseline-label',baseline),challenger:option('challenger-label',challenger),expansion,
    seedPrefix:prefix,start,seedsPerPlayerCount:seeds,rulingConvention:ruling,workers,results:{}};
  const batches=new Map(counts.map(n=>[n,[]]));let next=0,completed=0;
  const pool=[];
  function save() {
    for(const [players,deals] of batches) {
      if(!deals.length)continue;
      deals.sort((a,b)=>a.seed.localeCompare(b.seed));
      const matches=deals.flatMap(d=>d.matches),controls=deals.flatMap(({control})=>{
        const top=Math.max(...control.scores),winners=control.scores.filter(n=>n===top).length;
        return Array.from({length:players},(_,seat)=>({...control,seat,
          winShare:control.scores[seat]===top?1/winners:0,
          margin:control.scores[seat]-Math.max(...control.scores.filter((_,i)=>i!==seat)),
          timings:seat===0?control.timings:[]}));
      });
      const candidate=summarize(matches),control=summarize(controls);
      const paired=matches.map((m,i)=>({seed:m.seed,seat:m.seat,scores:m.scores,controlScores:controls[i].scores,
        marginChange:m.margin-controls[i].margin,winShare:m.winShare,controlWinShare:controls[i].winShare,
        rulingCases:m.rulingCases,controlRulingCases:controls[i].rulingCases,
        camps:m.campChoices.filter(c=>c.playerId===m.seat),controlCamps:controls[i].campChoices.filter(c=>c.playerId===m.seat)}));
      const margins=deals.map(d=>d.matches.reduce((sum,m)=>sum+m.margin-(d.control.scores[m.seat]-Math.max(...d.control.scores.filter((_,i)=>i!==m.seat))),0)/players);
      const mean=margins.reduce((a,b)=>a+b,0)/margins.length;
      const se=margins.length>1?Math.sqrt(margins.reduce((n,x)=>n+(x-mean)**2,0)/(margins.length-1)/margins.length):null;
      report.results[players]={deals:deals.length,candidate,control,meanMarginChange:candidate.averageMargin-control.averageMargin,
        // Seats within a deal are related; uncertainty is computed across deals.
        dealMarginStandardError:se,changedGames:paired.filter(m=>m.scores.some((n,i)=>n!==m.controlScores[i])).length,matches:paired};
    }
    writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  }
  try {
    await Promise.all(Array.from({length:Math.min(workers,tasks.length)},()=>new Promise((done,fail)=>{
      const worker=new Worker(new URL(import.meta.url),{workerData:{baseline:pathToFileURL(resolve(baseline)).href,
        challenger:pathToFileURL(resolve(challenger)).href,expansion,ruling}});pool.push(worker);
      const dispatch=()=>{if(next<tasks.length)worker.postMessage(tasks[next++]);else {worker.terminate();done();}};
      worker.on('error',fail);
      worker.on('message',result=>{
        if(result.error){fail(Error(`${result.players} players / ${result.seed}: ${result.error}`));return;}
        batches.get(result.players).push(result);completed++;save();
        console.error(`${completed}/${tasks.length} deals complete (${result.players} players, ${result.seed}).`);dispatch();
      });
      dispatch();
    })));
  } finally {await Promise.all(pool.map(w=>w.terminate()));}
  for(const [players,{matches,...summary}] of Object.entries(report.results))console.log(JSON.stringify({players,...summary}));
}
