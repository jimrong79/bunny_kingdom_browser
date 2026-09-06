// Reconstruct completed three/four-player exports without changing the saved match.
// Usage: node scripts/audit-game.js data/game_history/game.json --output /tmp/audit.json
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {data} from '../tests/fixtures.js';
import {createGame,makeDeck,publicView,resolveDraft} from '../src/game.js';
import {beginCampOffers,respondCamp} from '../src/camps.js';
import {placeBuilding,finishConstruction} from '../src/construction.js';
import {tradingPosts,chooseResource,finishMarkets,advanceRound} from '../src/harvest.js';
import {finalizeScoring} from '../src/scoring.js';
import {validSave} from '../src/storage.js';
import * as normal from '../src/bots.js';
import * as easy from '../src/bots-baseline.js';

// Independent flood fill and arithmetic; deliberately does not use fiefs.js or scoring.js.
export function independentStats(state,pid) {
  const cells=Object.values(state.cells).filter(c=>c.owner===pid),remaining=new Set(cells.map(c=>c.coordinate));
  const walls=new Set(state.blockedConnections.flatMap(e=>[`${e.from}:${e.to}`,`${e.to}:${e.from}`]));
  const production=c=>[c.baseResource,c.building?.category==='farm'?(c.building.resource||c.building.choice):null].filter(Boolean);
  const groups=[];
  while(remaining.size) {
    const queue=[remaining.values().next().value],members=[];remaining.delete(queue[0]);
    for(let i=0;i<queue.length;i++) {
      const cell=state.cells[queue[i]];members.push(cell);
      for(const other of cells) {
        const adjacent=Math.abs(cell.row.charCodeAt(0)-other.row.charCodeAt(0))+Math.abs(cell.column-other.column)===1;
        const tower=cell.building?.category==='sky_tower'&&other.building?.category==='sky_tower'&&cell.building.pairId===other.building.pairId;
        if(((adjacent&&!walls.has(`${cell.coordinate}:${other.coordinate}`))||tower)&&remaining.delete(other.coordinate))queue.push(other.coordinate);
      }
    }
    const resources=[...new Set(members.flatMap(production))].sort();
    const cities=members.filter(c=>c.building?.category==='city'),strength=cities.reduce((n,c)=>n+c.building.strength,0);
    groups.push({coordinates:members.map(c=>c.coordinate).sort(),strength,resources,points:strength*resources.length,cities:cities.length});
  }
  const produced=cells.flatMap(production),counts=Object.fromEntries([...new Set(produced)].map(r=>[r,produced.filter(v=>v===r).length]));
  return {territories:cells.length,cities:cells.filter(c=>c.building?.category==='city').length,
    borders:cells.filter(c=>['A','J'].includes(c.row)||[1,10].includes(c.column)).length,
    corners:cells.filter(c=>['A','J'].includes(c.row)&&[1,10].includes(c.column)).length,
    mountains:cells.filter(c=>c.terrain==='mountain').length,
    emptyTerritories:cells.filter(c=>c.building?.category!=='city'&&!production(c).length).length,
    camps:state.players[pid].played.filter(c=>c.category==='camp').length,
    counts,groups,harvest:groups.reduce((n,f)=>n+f.points,0)};
}

export function independentScoring(state,decisions) {
  const stats=state.players.map(p=>independentStats(state,p.id));
  const effective=state.players.map(p=>p.parchments.map(card=>{
    if(!['liberal','socialist'].includes(card.id))return card;
    const neighbor=(p.id+(card.id==='socialist'?1:-1)+state.players.length)%state.players.length;
    if(!state.players[neighbor].parchments.length)return null;
    const copied=state.players[neighbor].parchments.find(c=>c.instanceId===decisions.copies[card.instanceId]);
    assert.ok(copied,`${card.id} must copy the correct neighbor`);
    assert.ok(!['liberal','socialist'].includes(copied.id),'Manual copy-of-copy cases need separate review');
    return copied;
  }));
  const results=state.players.map(p=>{
    const s=stats[p.id],cards=effective[p.id].filter(Boolean),treasures=cards.filter(c=>c.parchmentType==='treasure');
    const hunters=cards.filter(c=>c.id==='treasure_hunter').length;
    assert.ok(hunters<=1,'Stacked Hunters need separate review');
    const resource=r=>s.counts[r]||0;
    const values={
      royal_ring:1,royal_coat:2,royal_scepter:3,royal_chalice:4,royal_crown:5,royal_carrot:6,
      left_glove:cards.some(c=>c.id==='right_glove')?4:1,right_glove:cards.some(c=>c.id==='left_glove')?4:1,
      bureaucrat:p.parchments.length,burgomaster:s.cities,diplomat:s.borders,explorer:s.corners*3,
      carpenter:resource('wood'),master_carpenter:resource('wood')*2,woodland_king:resource('wood')>=7?20:0,
      fisher:resource('fish'),master_fisher:resource('fish')*2,fisher_king:resource('fish')>=7?20:0,
      farmer:resource('carrots'),master_farmer:resource('carrots')*2,carrot_king:resource('carrots')>=5?15:0,
      merchant:Object.entries(s.counts).filter(([r])=>!['wood','fish','carrots'].includes(r)).reduce((n,[,v])=>n+v*3,0),
      master_of_the_mountains:s.mountains*2,carrotistador:s.groups.filter(f=>f.coordinates.length>=3).length*4,
      harecingetorix:s.groups.length,hun_ny_king:s.groups.length>=10?12:0,
      bun_shee:s.groups.filter(f=>!f.resources.length).reduce((n,f)=>n+f.cities*2,0),
      panpan_the_barbarian:s.emptyTerritories*2,colonist:s.camps*3,king_of_thieves:s.cities>=9?12:0,
      little_prince:s.harvest-Math.max(0,...s.groups.map(f=>f.points)),treasure_guardian:treasures.length*3,treasure_hunter:0,
      opportunist:0,
    };
    const rows=p.parchments.map((original,i)=>{
      const card=effective[p.id][i];let points=card?values[card.id]:0;
      if(card?.id==='matriarch') {
        const greatest=Math.max(...stats.map(s=>s.territories));
        if(s.territories!==greatest)points=0;
        else if(stats.filter(s=>s.territories===greatest).length===1)points=12;
        else {points=decisions.rulings[`matriarch:${original.instanceId}`];assert.ok([0,12].includes(points));}
      }
      assert.ok(Number.isFinite(points),`Independent formula missing: ${card?.id}`);
      if(card?.parchmentType==='treasure')points*=hunters?2:1;
      return {id:original.instanceId,name:original.name,effectiveName:card?.name||null,points};
    });
    const harvest=p.harvests.reduce((n,h)=>n+h.points,0);
    return {playerId:p.id,name:p.name,harvest,rows,parchments:rows.reduce((n,r)=>n+r.points,0),stats:s};
  });
  const beforeRank=results.map(p=>p.harvest+p.parchments);
  for(const result of results)for(const row of result.rows)if(row.effectiveName==='Opportunist') {
    assert.equal(results.flatMap(p=>p.rows).filter(r=>r.effectiveName==='Opportunist').length,1,'Copied Opportunists need separate review');
    const score=beforeRank[result.playerId];
    if(beforeRank.filter(n=>n===score).length>1){row.points=decisions.rulings[`opportunist:${row.id}`];assert.ok([0,10].includes(row.points));}
    else row.points=beforeRank.filter(n=>n>score).length===1?10:0;
    result.parchments+=row.points;
  }
  for(const result of results)result.total=result.harvest+result.parchments;
  return results;
}

export function auditGame(saved) {
  const target=saved.game;
  assert.ok(validSave(target),'Invalid save/card conservation');
  assert.equal(target.phase,'finished','This auditor requires a finished game');
  assert.ok([3,4].includes(target.players.length),'This auditor reconstructs three/four-player drafts');
  const canonical=new Map(makeDeck(data).map(c=>[c.instanceId,c]));
  for(const card of [...target.deck,...target.players.flatMap(p=>[...p.played,...p.parchments,...p.buildings])])assert.deepEqual(card,canonical.get(card.instanceId),`Changed card data: ${card.instanceId}`);
  let state=createGame(data,target.players.length-1,target.seed);
  // Keep the names recorded when this match was played, including older Bot 1 saves.
  state.players.forEach((player,i)=>{player.name=target.players[i].name;});
  if(Object.hasOwn(target,'botDifficulty'))state.botDifficulty=target.botDifficulty;
  const policy=state.botDifficulty==='easy'?easy:normal;
  const report={seed:state.seed,players:state.players.length,difficulty:state.botDifficulty||'normal',draftPicks:0,
    botDecisions:0,hiddenInformationChecks:0,decisionsByType:{},camps:[],placements:[],rounds:[],reconstructedMarkets:[]};
  const logMatches=trial=>trial.log.every((line,i)=>line===target.log[i]);
  const apply=(fn,label)=>{fn();assert.ok(validSave(state),`Card conservation: ${label}`);assert.ok(logMatches(state),`Activity log mismatch: ${label}; next ${target.log[state.log.length-1]}`);};
  const decide=(pid,method,...args)=>{
    const view=publicView(state,pid),unchanged=structuredClone(view),decision=policy[method](view,pid,...args);
    assert.deepEqual(view,unchanged,`${method} mutated its view`);
    assert.ok(!Array.isArray(view.deck));assert.ok(!Array.isArray(view.players[pid].reserve));
    for(const p of view.players)if(p.id!==pid) {
      assert.ok(!Array.isArray(p.hand)&&!Array.isArray(p.reserve)&&!Array.isArray(p.discarded));
      assert.equal(p.draftMemory,undefined);
      if(!['parchments','finished'].includes(state.phase))assert.ok(!Array.isArray(p.parchments));
    }
    const changed=structuredClone(state);changed.seed='hidden-order-must-not-affect-decisions';
    changed.deck=changed.deck.map(()=>({id:'hidden-deck-card'}));
    for(const p of changed.players) {
      p.reserve=p.reserve.map(()=>({id:'hidden-reserve-card'}));
      if(p.id===pid)continue;
      p.hand=p.hand.map(()=>({id:'hidden-hand-card'}));p.discarded=p.discarded.map(()=>({id:'hidden-discard-card'}));p.draftMemory=[{secret:'unseen hand'}];
      if(!['parchments','finished'].includes(state.phase))p.parchments=p.parchments.map(()=>({id:'hidden-parchment'}));
    }
    assert.deepEqual(policy[method](publicView(changed,pid),pid,...args),decision,`${method} depended on hidden information`);
    report.botDecisions++;report.hiddenInformationChecks++;
    report.decisionsByType[method]=(report.decisionsByType[method]||0)+1;
    return decision;
  };
  const nextPlacement=()=>{
    const line=target.log[state.log.length]||'';
    for(const player of state.players)for(const card of player.buildings) {
      const prefix=`${player.name} placed ${card.name} at `;
      if(!line.startsWith(prefix))continue;
      const match=/^([A-J]\d+(?: \+ [A-J]\d+)?)\.$/.exec(line.slice(prefix.length));
      if(match)return {pid:player.id,card,coordinates:match[1].split(' + ')};
    }
    return null;
  };
  for(let round=1;round<=4;round++) {
    while(state.phase==='draft') {
      const turn=state.draftTurn,n=state.players.length,direction=round%2?1:-1;
      const selections=state.players.map(p=>{
        const observation=target.players[p.id].draftMemory.find(m=>m.round===round&&m.pick===turn);
        assert.deepEqual(p.hand.map(c=>c.instanceId),observation?.cards,`Incorrect dealt/passed hand R${round} P${turn} player ${p.id}`);
        const recipient=(p.id+direction+n)%n;
        const passed=target.players[recipient].draftMemory.find(m=>m.round===round&&m.pick===turn+1)?.cards||[];
        const play=observation.cards.filter(id=>!passed.includes(id));assert.equal(play.length,2);
        if(p.bot)assert.deepEqual([...decide(p.id,'chooseDraft').play].sort(),[...play].sort(),`Bot pick mismatch R${round} P${turn} player ${p.id}`);
        return {play,discard:[]};
      });
      let found=null;
      for(let order=0;order<2**n&&!found;order++) {
        const trial=structuredClone(state);
        resolveDraft(trial,selections.map((s,i)=>({...s,play:order&(1<<i)?[...s.play].reverse():s.play})));
        if(logMatches(trial)&&trial.players.every(p=>['played','parchments'].every(k=>p[k].every((c,i)=>c.instanceId===target.players[p.id][k][i].instanceId))))found=trial;
      }
      assert.ok(found,`Could not replay card order and Provisions at R${round} P${turn}`);
      state=found;assert.ok(validSave(state));report.draftPicks++;
    }
    beginCampOffers(state);
    while(state.phase==='camps') {
      const current=state.campQueue[0],placement=nextPlacement();
      const coordinate=placement?.card.category==='camp'?placement.coordinates[0]:null;
      if(placement?.card.category==='camp')assert.equal(placement.card.instanceId,current.cardId,'Camp priority violation');
      if(state.players[current.playerId].bot)assert.equal(decide(current.playerId,'chooseCamp',current.cardId),coordinate,'Bot Camp decision mismatch');
      apply(()=>respondCamp(state,current.playerId,coordinate),'Camp response');
      report.camps.push({round,playerId:current.playerId,priority:current.priority,coordinate});
    }
    // The browser completes each bot's construction, then waits for the human.
    for(const pid of [...state.players.filter(p=>p.bot).map(p=>p.id),0]) {
      let placement;
      while((placement=nextPlacement())?.pid===pid) {
        if(pid)assert.deepEqual(decide(pid,'chooseBuilding'),{cardId:placement.card.instanceId,coordinates:placement.coordinates},'Bot placement mismatch');
        apply(()=>placeBuilding(state,pid,placement.card.instanceId,placement.coordinates),'building placement');
        report.placements.push({round,playerId:pid,card:placement.card.name,coordinates:placement.coordinates});
      }
      if(pid)assert.equal(decide(pid,'chooseBuilding'),null,'Bot stopped construction prematurely');
      apply(()=>finishConstruction(state,pid),'finish construction');
    }
    for(const player of state.players.filter(p=>p.bot)) {
      const choices=decide(player.id,'chooseMarkets');
      for(const choice of choices) {
        chooseResource(state,player.id,choice.coordinate,choice.resource);
        report.reconstructedMarkets.push({round,playerId:player.id,...choice});
      }
      apply(()=>finishMarkets(state,player.id),'bot markets');
    }
    assert.equal(tradingPosts(state,0).length,0,'Historical human Trading Post choices were not logged; this game needs manual reconstruction');
    const stats=state.players.map(p=>independentStats(state,p.id));
    for(const player of state.players)assert.equal(stats[player.id].harvest,target.players[player.id].harvests[round-1].points,`Independent harvest mismatch R${round} player ${player.id}`);
    report.rounds.push({round,harvests:stats.map(s=>s.harvest),fiefs:stats.map(s=>s.groups)});
    apply(()=>finishMarkets(state,0),'human markets/harvest');
    apply(()=>advanceRound(state),'advance round');
  }
  const decisions=structuredClone(target.scoringDecisions);
  for(const player of state.players.filter(p=>p.bot))for(const [card,choice] of Object.entries(decide(player.id,'chooseCopies',decisions)))assert.equal(decisions.copies[card],choice,'Bot copy mismatch');
  report.scoring=independentScoring(state,decisions);
  for(const result of report.scoring) {
    const savedResult=target.finalScoring.players.find(p=>p.playerId===result.playerId);
    assert.equal(result.harvest,savedResult.harvest);assert.equal(result.parchments,savedResult.parchmentPoints);
    assert.equal(result.total,savedResult.total);
    for(const row of result.rows)assert.equal(row.points,savedResult.rows.find(r=>r.id===row.id).points,`Parchment mismatch: ${row.name}`);
  }
  apply(()=>finalizeScoring(state,decisions),'final scoring');
  for(const key of ['deck','cells','players','round','phase','draftTurn','lastTurn','lastHarvest','finalScoring','scoringDecisions','winners','log'])assert.deepEqual(state[key],target[key],`Final state mismatch: ${key}`);
  assert.deepEqual(state,target,'Full exported game state differs from the reconstruction');
  assert.ok(validSave(state));report.physicalCards=182;report.activityEntries=state.log.length;
  report.winners=state.winners;report.status='passed';
  report.limitations=['Trading Post choices were not logged separately; reconstructed using the unchanged bot policy and checked against each harvest and the final board.',
    'Rules are checked against the recorded base-game catalog. Manual copy chains, stacked Hunters, and multiple Opportunists require separate review.'];
  return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const file=process.argv[2];assert.ok(file,'Provide an exported game JSON');
  const report=auditGame(JSON.parse(readFileSync(file,'utf8'))),index=process.argv.indexOf('--output');
  if(index>=0)writeFileSync(process.argv[index+1],JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,seed:report.seed,draftPicks:report.draftPicks,camps:report.camps.length,
    placements:report.placements.length,botDecisions:report.botDecisions,hiddenInformationChecks:report.hiddenInformationChecks,
    scores:report.scoring.map(({name,harvest,parchments,total})=>({name,harvest,parchments,total})),limitations:report.limitations},null,2));
}
