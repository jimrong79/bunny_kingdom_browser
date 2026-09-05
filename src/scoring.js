import { requireRule } from './game.js';
import { fiefs, resourcesAt } from './fiefs.js';
export const isCopy = c => c.scoringSpec?.type === 'copy_parchment';
export function copyOptions(state, playerId, card) {
  const direction=card.scoringSpec.targetNeighbor==='left'?1:-1;
  const neighbor=(playerId+direction+state.players.length)%state.players.length;
  return {playerId:neighbor,cards:state.players[neighbor].parchments};
}
export function playerStats(state, playerId) {
  const cells=Object.values(state.cells).filter(c=>c.owner===playerId), groups=fiefs(state,playerId);
  const production=cells.flatMap(resourcesAt), cityCount=cells.filter(c=>c.building?.category==='city').length;
  const rows=Object.values(state.cells).map(c=>c.row.charCodeAt(0)), columns=Object.values(state.cells).map(c=>c.column);
  const minRow=Math.min(...rows), maxRow=Math.max(...rows), minCol=Math.min(...columns), maxCol=Math.max(...columns);
  const rowEdge=c=>[minRow,maxRow].includes(c.row.charCodeAt(0)), colEdge=c=>[minCol,maxCol].includes(c.column);
  return {cells,groups,production,metrics:{
    controlled_cities:cityCount,
    controlled_border_territories:cells.filter(c=>rowEdge(c)||colEdge(c)).length,
    controlled_corner_territories:cells.filter(c=>rowEdge(c)&&colEdge(c)).length,
    controlled_mountain_territories:cells.filter(c=>c.terrain==='mountain').length,
    controlled_fiefs:groups.length,
    cities_in_fiefs_with_no_resource_production:groups.filter(f=>!f.production.length).reduce((sum,f)=>sum+f.coordinates.filter(id=>state.cells[id].building?.category==='city').length,0),
    controlled_territories_with_no_city_and_no_resource_production:cells.filter(c=>c.building?.category!=='city'&&!resourcesAt(c).length).length,
    camp_cards_played:state.players[playerId].played.filter(c=>c.category==='camp').length,
  }};
}
export function basePoints(card, stats, effective) {
  const s=card.scoringSpec, metric={...stats.metrics,owned_parchments:effective.length,owned_treasures:effective.filter(c=>c.parchmentType==='treasure').length};
  const units=stats.production.filter(r=>r===s.resource).length;
  switch(s.type) {
    case 'fixed_points': return s.points;
    case 'paired_treasure': return effective.some(c=>c.id===s.partnerCardId)?s.pointsWithPartner:s.pointsAlone;
    case 'points_per_count': return metric[s.metric]*s.pointsPerItem;
    case 'points_per_resource': return units*s.pointsPerUnit;
    case 'resource_threshold': return units>=s.minimum?s.points:0;
    case 'points_per_resource_class': return stats.production.filter(r=>!['wood','fish','carrots'].includes(r)).length*s.pointsPerUnit;
    case 'points_per_qualifying_fief': return stats.groups.filter(f=>f.coordinates.length>=s.minimumTerritories).length*s.pointsPerFief;
    case 'count_threshold': return metric[s.metric]>=s.minimum?s.points:0;
    case 'extra_harvest_except_best': return stats.groups.reduce((sum,f)=>sum+f.points,0)-Math.max(0,...stats.groups.map(f=>f.points));
    case 'multiply_treasure_values': return 0; // Applied to the treasure rows, not counted twice.
    case 'territory_lead_bonus': case 'rank_bonus': case 'copy_parchment': return null;
    default: throw Error(`Unsupported parchment scoring type: ${s.type}`);
  }
}
export function evaluateFinal(state, decisions={copies:{},rulings:{},copyResolutions:{}}) {
  const issues=[],allCards=state.players.flatMap(p=>p.parchments),stats=state.players.map(p=>playerStats(state,p.id));
  const ask=(key,kind,label,options)=>{
    const value=decisions.rulings?.[key];
    if(!options.includes(value)){issues.push({key,kind,label,options});return null;}
    return value;
  };
  const effective=state.players.map(p=>p.parchments.map(original=>{
    if(!isCopy(original))return {original,card:original};
    const options=copyOptions(state,p.id,original);
    if(!options.cards.length)return {original,card:null,empty:true};
    const selected=options.cards.find(c=>c.instanceId===decisions.copies?.[original.instanceId]);
    if(!selected){issues.push({key:original.instanceId,kind:'copy',playerId:p.id,label:`${p.name}: choose ${original.name}'s target.`});return {original,card:null};}
    if(isCopy(selected)) {
      const resolution=allCards.find(c=>c.instanceId===decisions.copyResolutions?.[original.instanceId]&&!isCopy(c));
      if(!resolution){issues.push({key:original.instanceId,kind:'copy_resolution',label:`${p.name}: ${original.name} copies ${selected.name}. This interaction needs a ruling: select the final card it becomes.`,options:allCards.filter(c=>!isCopy(c)).map(c=>c.instanceId)});return {original,card:null};}
      return {original,card:resolution,copiedFrom:selected.name,manual:true};
    }
    return {original,card:selected,copiedFrom:selected.name};
  }));
  const territoryMax=Math.max(...stats.map(s=>s.cells.length)), leaders=stats.filter(s=>s.cells.length===territoryMax).length;
  const results=state.players.map(p=>{
    const entries=effective[p.id], cards=entries.map(e=>e.card).filter(Boolean);
    const hunters=cards.filter(c=>c.scoringSpec.type==='multiply_treasure_values').length;
    const treasureValue=cards.filter(c=>c.parchmentType==='treasure').reduce((sum,c)=>sum+basePoints(c,stats[p.id],cards),0);
    let multiplier=hunters?2:1;
    if(hunters>1&&treasureValue>0) multiplier=ask(`hunter:${p.id}`,'multiplier',`${p.name} has ${hunters} Treasure Hunter effects. Choose the total treasure multiplier under your ruling.`,[hunters+1,2**hunters]);
    const rows=entries.map(entry=>{
      const {original,card}=entry;
      if(!card)return {id:original.instanceId,name:original.name,points:entry.empty?0:null,note:entry.empty?'No parchment available to copy.':'Awaiting copy choice.'};
      const s=card.scoringSpec;
      let points=basePoints(card,stats[p.id],cards);
      if(s.type==='territory_lead_bonus')points=stats[p.id].cells.length<territoryMax?0:leaders===1?s.points:ask(`matriarch:${original.instanceId}`,'points',`${p.name} ties for most territories. Award for ${original.name} under your ruling?`,[0,s.points]);
      if(card.parchmentType==='treasure')points=multiplier===null?null:points*multiplier;
      return {id:original.instanceId,name:original.name,effectiveName:card.name,type:s.type,points,note:s.type==='multiply_treasure_values'?`Treasure multiplier applied to treasure cards (${multiplier ?? '?'}× total).`:entry.copiedFrom?`Copies ${card.name}${entry.manual?' (manual ruling)':''}.`:''};
    });
    return {playerId:p.id,harvest:p.score,rows,parchmentPoints:rows.reduce((sum,r)=>sum+(r.points||0),0)};
  });
  const rankRows=results.flatMap(p=>p.rows.filter(r=>r.type==='rank_bonus').map(row=>({player:p,row})));
  const beforeRank=results.map(p=>p.harvest+p.parchmentPoints);
  // All other parchment values must be settled before checking Opportunist's rank.
  if(!issues.length) for(const {player,row} of rankRows) {
    const value=beforeRank[player.playerId],higher=beforeRank.filter(n=>n>value).length,tied=beforeRank.filter(n=>n===value).length>1;
    if(rankRows.length>1||tied)row.points=ask(`opportunist:${row.id}`,'points',`${state.players[player.playerId].name}: ${row.name} has ${rankRows.length>1?'copied Opportunist interactions':'a tied rank'}. Scores before these bonuses: ${beforeRank.join(', ')}. Award under your ruling?`,[0,10]);
    else row.points=higher===1?10:0;
  }
  for(const p of results){p.parchmentPoints=p.rows.reduce((sum,r)=>sum+(r.points||0),0);p.total=p.harvest+p.parchmentPoints;}
  return {complete:!issues.length&&results.every(p=>p.rows.every(r=>r.points!==null)),issues,players:results};
}
export function finalizeScoring(state, decisions) {
  requireRule(state.phase==='parchments','Parchment scoring is already closed.');
  const result=evaluateFinal(state,decisions);
  requireRule(result.complete,'Resolve all copy choices and scoring questions first.');
  state.finalScoring=result;state.scoringDecisions=structuredClone(decisions);
  for(const p of state.players)p.score=result.players[p.id].total;
  const top=Math.max(...state.players.map(p=>p.score));state.winners=state.players.filter(p=>p.score===top).map(p=>p.id);
  state.phase='finished';state.log.push(`Final score confirmed. Winner${state.winners.length>1?'s':''}: ${state.winners.map(id=>state.players[id].name).join(', ')}.`);
}
