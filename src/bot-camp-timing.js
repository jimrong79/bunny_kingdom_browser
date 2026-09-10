import {chooseCamp as normalCamp,chooseMarkets} from './bots.js';
import {eligibleTerritories} from './construction.js';
import {applyBuilding,planBuildings} from './bot-planning.js';
import {forkPosition,positionValue,inventoryValue} from './bot-evaluation.js';
import {knownTerritories} from './bot-memory.js';
import {fiefs} from './fiefs.js';
import {playerStats} from './scoring.js';
import {neighborsOf} from './topology.js';
import {dealSize,cardsPerPick} from './config.js';
import {playCard,randomSource} from './game.js';
import {districtSnapshot,awardNewDistricts} from './districts.js';
import {chimneyPlan} from './bot-chimneys.js';

const SAMPLE_COUNT=6,FORECAST_WEIGHT=.65,SWITCH_MARGIN=.5;

function prepare(view,playerId) {
  const trial=forkPosition(view,playerId);
  const unassigned=Object.values(trial.cells).filter(c=>c.owner===playerId&&c.building?.farmType==='trading_post'&&!c.building.choice);
  if(unassigned.length)for(const choice of chooseMarkets(trial,playerId)) {
    if(unassigned.some(c=>c.coordinate===choice.coordinate))trial.cells[choice.coordinate].building.choice=choice.resource;
  }
  return trial;
}

function terminalValue(view,playerId) {
  const stats=playerStats(view,playerId),knowledge=knownTerritories(view,playerId);
  return positionValue(view,playerId,{stats,knowledge})+inventoryValue(view,playerId,stats,knowledge);
}

// Hypotheses share the same territory arrivals across every current Camp choice.
// They approximate next-round territory allocation, not the full hidden draft.
export function campForecasts(view,playerId,count=SAMPLE_COUNT) {
  const knowledge=knownTerritories(view,playerId);
  const played=new Set(view.players.flatMap(p=>p.played.filter(c=>c.category==='territory').map(c=>c.coordinate)));
  const pool=Object.values(view.cells).filter(c=>!played.has(c.coordinate)&&!knowledge.unavailable.has(c.coordinate)
    &&(c.owner===null||c.building?.category==='camp')).sort((a,b)=>a.coordinate.localeCompare(b.coordinate));
  const hiddenDiscards=view.players.filter(p=>p.id!==playerId).reduce((n,p)=>n+(p.discarded?.count||0),0);
  const unseen=Math.max(pool.length,(view.deck?.count||0)+hiddenDiscards);
  const perPlayer=dealSize(view);
  const arrival=Math.min(1,perPlayer*view.players.length/Math.max(1,unseen));
  const groups=view.players.map(p=>fiefs(view,p.id));
  const indexes=groups.map(fs=>new Map(fs.flatMap(f=>f.coordinates.map(id=>[id,f]))));
  const blocked=new Set(view.blockedConnections.flatMap(e=>[e.from+':'+e.to,e.to+':'+e.from]));
  const weights=new Map(pool.map(c=>[c.coordinate,view.players.map(p=>{
    const touching=[...new Set(neighborsOf(view,c).filter(id=>!blocked.has(c.coordinate+':'+id)).map(id=>indexes[p.id].get(id)).filter(Boolean))];
    const resources=new Set(touching.flatMap(f=>f.resources));if(c.baseResource)resources.add(c.baseResource);
    const strength=touching.reduce((n,f)=>n+f.strength,0)+(c.building?.category==='city'?c.building.strength:0);
    const gain=Math.max(0,strength*resources.size-touching.reduce((n,f)=>n+f.points,0));
    return 1+touching.length+Math.min(8,gain)*.7+(c.owner===p.id?2:0);
  })]));
  // Do not seed this from view.seed, deck contents, other players' memory or secrets.
  const signature=Object.values(view.cells).sort((a,b)=>a.coordinate.localeCompare(b.coordinate))
    .map(c=>`${c.coordinate}:${c.owner}:${c.districtUsed?1:0}:${c.building?.instanceId||c.building?.category||''}`).join('|');
  const rng=randomSource(`camp-timing-v1:${view.round}:${playerId}:${signature}:${pool.map(c=>c.coordinate).join(',')}`);
  return Array.from({length:count},()=>{
    const cards=[...pool],allocations=view.players.map(()=>[]);
    for(let i=cards.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
    for(const cell of cards) {
      if(rng()>arrival)continue;
      const options=weights.get(cell.coordinate).map((weight,pid)=>allocations[pid].length<perPlayer?weight:0);
      const total=options.reduce((a,b)=>a+b,0);if(!total)break;
      let draw=rng()*total,pid=0;
      while(pid<options.length-1&&draw>=options[pid])draw-=options[pid++];
      allocations[pid].push(cell.coordinate);
    }
    const size=cardsPerPick(view),batches=[];
    for(let i=0;i<perPlayer;i+=size)batches.push(allocations.map(ids=>ids.slice(i,i+size)));
    return batches;
  });
}

export function applyTerritoryForecast(view,playerId,batches) {
  const trial=forkPosition(view,playerId);
  // Territory captures and Coin events can change every player in a hypothesis.
  trial.players=trial.players.map(p=>({...p,played:[...p.played],buildings:[...p.buildings],
    ...(p.coinEvents?{coinEvents:[...p.coinEvents]}:{})}));
  trial.round++;trial.phase='construction';
  for(const [pick,batch] of batches.entries()) {
    trial.draftTurn=pick+1;
    const before=trial.players.map(p=>districtSnapshot(trial,p.id));
    for(const p of trial.players)for(const coordinate of batch[p.id]) {
      const cell=trial.cells[coordinate];
      const card={id:`territory_${coordinate}`,instanceId:`territory_${coordinate}`,category:'territory',coordinate,
        ...(cell.startingBuilding?.category==='rainbow'?{rainbow:cell.startingBuilding.pairId}:{})};
      playCard(trial,p.id,card,null,true);
    }
    for(const p of trial.players)awardNewDistricts(trial,p.id,before[p.id],batch[p.id]);
  }
  return trial;
}

function nextCampValue(view,playerId,cardId) {
  const camp=view.players[playerId].buildings.find(c=>c.instanceId===cardId);
  const positions=[{view,value:terminalValue(view,playerId)}];
  if(camp)for(const coordinate of eligibleTerritories(view,playerId,camp)) {
    const trial=applyBuilding(view,playerId,{cardId,coordinates:[coordinate]});
    positions.push({view:trial,value:terminalValue(trial,playerId)});
  }
  // Cheaply rank destinations, then include reserved buildings in the best two.
  positions.sort((a,b)=>b.value-a.value);
  return Math.max(...positions.slice(0,2).map(p=>planBuildings(p.view,playerId,{depth:2,width:1}).value));
}

export function evaluateCampTiming(view,playerId,cardId,{forecasts}={}) {
  const card=view.players[playerId].buildings.find(c=>c.instanceId===cardId);
  if(card?.category!=='camp')return {coordinate:null,reason:'unavailable',plans:[]};
  // Preserve joint Camp bridges and priority reasoning; this first experiment
  // specializes isolated offers. There is no value in waiting beyond round four.
  if(view.round>=4||(view.campQueue||[]).filter(o=>o.playerId===playerId).length>1) {
    return {coordinate:normalCamp(view,playerId,cardId),reason:'normal',plans:[]};
  }
  const prepared=prepare(view,playerId),positions=[];
  for(const coordinate of [null,...eligibleTerritories(prepared,playerId,card)]) {
    const trial=coordinate===null?prepared:applyBuilding(prepared,playerId,{cardId,coordinates:[coordinate]});
    const plan=planBuildings(trial,playerId);
    positions.push({coordinate,plan});
  }
  positions.sort((a,b)=>b.plan.value-a.plan.value);
  const normal=positions[0];
  if(positions.length===1)return {coordinate:null,reason:'no-legal-location',plans:[]};
  // Specialize timing, not today's location ranking. Noisy future allocations
  // should not replace Normal's good current location with a speculative one.
  const alternative=normal.coordinate===null?positions.find(p=>p.coordinate!==null):positions.find(p=>p.coordinate===null);
  const shortlisted=[normal,alternative];
  const worlds=forecasts||campForecasts(view,playerId);
  if(!worlds.length)throw Error('Camp timing requires at least one territory forecast.');
  for(const p of shortlisted) {
    const harvest=chimneyPlan(p.plan.view,playerId).value;
    const future=worlds.reduce((sum,batches)=>sum+nextCampValue(applyTerritoryForecast(p.plan.view,playerId,batches),playerId,cardId),0)/worlds.length;
    p.forecast=harvest+future;
    p.value=(1-FORECAST_WEIGHT)*p.plan.value+FORECAST_WEIGHT*p.forecast;
  }
  let best=normal;
  for(const p of shortlisted)if(p.value>best.value)best=p;
  if(best.value<normal.value+SWITCH_MARGIN)best=normal;
  return {coordinate:best.coordinate,normalCoordinate:normal.coordinate,reason:'forecast',
    plans:shortlisted.map(p=>({coordinate:p.coordinate,immediate:p.plan.value,forecast:p.forecast,value:p.value}))};
}

export const chooseCamp=(view,playerId,cardId)=>evaluateCampTiming(view,playerId,cardId).coordinate;
