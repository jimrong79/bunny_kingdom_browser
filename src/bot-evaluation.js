import {playerStats,basePoints} from './scoring.js';
import {eligibleTerritories} from './construction.js';
import {knownTerritories} from './bot-memory.js';

// Search estimates are deliberately separate from the scoring engine and its unresolved rulings.
export const harvestsLeft=view=>['parchments','finished'].includes(view.phase)?0:view.phase==='harvest'?4-view.round:5-view.round;
export function picksLeft(view) {
  const perRound=view.players.length===2?10:view.players.length===3?6:5;
  return (4-view.round)*perRound+(view.phase==='draft'?Math.max(0,perRound-view.draftTurn):0);
}
export function forkPosition(view,playerId) {
  return {...view,cells:Object.fromEntries(Object.entries(view.cells).map(([id,c])=>[id,{...c,building:c.building?{...c.building}:null}])),
    players:view.players.map(p=>p.id===playerId?{...p,buildings:[...p.buildings],parchments:Array.isArray(p.parchments)?[...p.parchments]:[],played:[...p.played],ready:false}:p),log:[]};
}

export function parchmentValue(view,playerId,cards,stats=playerStats(view,playerId),forecast=true) {
  const growth=forecast?picksLeft(view)*.14:0;
  let value=0;
  const hunters=cards.filter(c=>c.scoringSpec.type==='multiply_treasure_values').length;
  for(const card of cards) {
    const s=card.scoringSpec;let points=basePoints(card,stats,cards);
    if(s.type==='resource_threshold'||s.type==='count_threshold') {
      const count=s.resource?stats.production.filter(r=>r===s.resource).length:stats.metrics[s.metric];
      if(!points&&growth>0)points=s.points*Math.pow(growth/(s.minimum-count+growth),s.minimum-count);
    }
    if(s.type==='points_per_resource'&&growth>0) {
      const count=stats.production.filter(r=>r===s.resource).length;
      points+=s.pointsPerUnit*growth*(.35+Math.min(count,6)*.12);
    }
    if(s.type==='territory_lead_bonus') {
      const rival=Math.max(...view.players.filter(p=>p.id!==playerId).map(p=>Object.values(view.cells).filter(c=>c.owner===p.id).length));
      points=s.points/(1+Math.exp((rival-stats.cells.length)/Math.max(1,growth*1.8)));
      if(!growth)points=stats.cells.length>rival?s.points:stats.cells.length===rival?s.points/2:0;
    }
    if(s.type==='rank_bonus') {
      const projected=view.players.map(p=>p.score+playerStats(view,p.id).groups.reduce((n,f)=>n+f.points*harvestsLeft(view),0));
      const rank=1+projected.filter(n=>n>projected[playerId]).length;
      points=rank===2?s.points*.8:growth?2:0;
    }
    if(s.type==='copy_parchment') {
      const neighbor=(playerId+(s.targetNeighbor==='left'?1:-1)+view.players.length)%view.players.length;
      const other=view.players[neighbor].parchments,count=Array.isArray(other)?other.length:other.count;
      points=count?Math.min(12,4+count*.7):growth?4:0;
    }
    // More than one Hunter still needs an explicit ruling in the real final scoring.
    if(card.parchmentType==='treasure')points*=hunters?hunters+1:1;
    value+=points||0;
  }
  return value;
}

export function positionValue(view,playerId,{forecast=true,stats=playerStats(view,playerId),knowledge=knownTerritories(view,playerId)}={}) {
  const remaining=harvestsLeft(view);
  const future=forecast?Math.max(0,remaining-1):0;
  let value=stats.groups.reduce((n,f)=>n+f.points*remaining,0);
  for(const f of stats.groups) {
    // Early strength and resource variety can find their missing counterpart through expansion.
    value+=future*(f.strength*Math.max(0,3-f.wealth)*.35+f.wealth*Math.min(3,Math.sqrt(f.coordinates.length))*.35);
  }
  if(forecast&&picksLeft(view)>0)value+=frontierValue(view,stats,knowledge);
  value+=parchmentValue(view,playerId,Array.isArray(view.players[playerId].parchments)?view.players[playerId].parchments:[],stats,forecast);
  return value;
}

function frontierValue(view,stats,{unavailable,circulating}) {
  const groups=stats.groups;
  const indexes=new Map(groups.flatMap((f,i)=>f.coordinates.map(c=>[c,i])));
  const blocked=new Set(view.blockedConnections.flatMap(e=>[e.from+':'+e.to,e.to+':'+e.from]));
  const gains=[];
  for(const c of Object.values(view.cells)) {
    if(c.owner!==null||unavailable.has(c.coordinate))continue;
    const adjacent=[c.row+(c.column-1),c.row+(c.column+1),String.fromCharCode(c.row.charCodeAt(0)-1)+c.column,String.fromCharCode(c.row.charCodeAt(0)+1)+c.column];
    const neighbors=[...new Set(adjacent.filter(id=>indexes.has(id)&&!blocked.has(c.coordinate+':'+id)).map(id=>indexes.get(id)))].map(i=>groups[i]);
    if(!neighbors.length)continue;
    const resources=new Set(neighbors.flatMap(f=>f.resources));if(c.baseResource)resources.add(c.baseResource);
    const strength=neighbors.reduce((n,f)=>n+f.strength,0)+(c.building?.strength||0);
    const gain=strength*resources.size-neighbors.reduce((n,f)=>n+f.points,0);
    gains.push(Math.max(0,gain)*(circulating.has(c.coordinate)?.18:.025));
  }
  return gains.sort((a,b)=>b-a).slice(0,6).reduce((n,v)=>n+v,0)*Math.min(2,picksLeft(view)*.12);
}

export function idleBuildingValue(view,playerId,card,stats=playerStats(view,playerId),knowledge=knownTerritories(view,playerId)) {
  const picks=picksLeft(view),remaining=harvestsLeft(view);
  if(!picks||!remaining)return 0;
  const {unavailable}=knowledge;
  const open=Object.values(view.cells).filter(c=>!c.building&&c.owner===null&&!unavailable.has(c.coordinate));
  const suitable=open.filter(c=>!card.placement?.allowedTerrains||card.placement.allowedTerrains.includes(c.terrain));
  const legal=eligibleTerritories(view,playerId,card).length;
  const fraction=suitable.length/Math.max(1,open.length);
  const chance=legal?1:1-Math.exp(-picks*fraction*.65);
  const groups=stats.groups;
  const wealth=Math.max(2,...groups.map(f=>f.wealth)),strength=Math.max(2,...groups.map(f=>f.strength));
  let potential=0;
  if(card.category==='city')potential=card.effect.strength*wealth;
  if(card.category==='farm')potential=(card.farmType==='luxury'?strength:Math.min(strength,3))*(card.farmType==='luxury'?1:.6);
  if(card.farmType==='basic'&&groups.length&&groups.every(f=>f.resources.includes(card.effect.resource)))potential*=.25;
  if(card.category==='sky_tower')potential=groups.length>1?3:1.5;
  if(card.category==='camp')potential=2;
  const waiting=view.players[playerId].buildings.filter(c=>c.category===card.category).length;
  return potential*Math.max(.3,remaining-.7)*chance*.45/Math.sqrt(Math.max(1,waiting));
}

export function inventoryValue(view,playerId,stats=playerStats(view,playerId),knowledge=knownTerritories(view,playerId)) {
  return view.players[playerId].buildings.reduce((n,c)=>n+idleBuildingValue(view,playerId,c,stats,knowledge),0);
}
