import {fiefs} from './fiefs.js';
import {eligibleTerritories,placeBuilding} from './construction.js';
import {forkPosition,positionValue,inventoryValue,picksLeft} from './bot-evaluation.js';
import {playerStats} from './scoring.js';
import {knownTerritories} from './bot-memory.js';
const basics=['wood','fish','carrots'];

function slotPressure(view,playerId,coordinate,cardId) {
  const terrain=view.cells[coordinate].terrain;
  return view.players[playerId].buildings.filter(c=>c.instanceId!==cardId&&c.placement?.allowedTerrains?.includes(terrain)).length*2
    +(terrain==='mountain'&&picksLeft(view)>0?.25:0);
}

export function buildingActions(view,playerId,{camps=false}={}) {
  const groups=fiefs(view,playerId),groupIndex=new Map(groups.flatMap((f,i)=>f.coordinates.map(c=>[c,i]))),actions=[];
  const seenCards=new Set();
  for(const card of view.players[playerId].buildings) {
    if(card.category==='camp'&&!camps)continue;
    if(seenCards.has(card.id))continue;seenCards.add(card.id);
    const eligible=eligibleTerritories(view,playerId,card);
    if(card.category==='sky_tower') {
      const endpoints=groups.map(f=>f.coordinates.filter(c=>eligible.includes(c)).sort((a,b)=>slotPressure(view,playerId,a,card.instanceId)-slotPressure(view,playerId,b,card.instanceId)||a.localeCompare(b))[0]).filter(Boolean);
      for(let i=0;i<endpoints.length;i++)for(let j=i+1;j<endpoints.length;j++)actions.push({cardId:card.instanceId,coordinates:[endpoints[i],endpoints[j]]});
    } else {
      const seenSlots=new Set();
      for(const coordinate of eligible) {
        const c=view.cells[coordinate],key=card.category==='camp'?coordinate:`${groupIndex.get(coordinate)}:${c.terrain}:${c.baseResource}`;
        if(seenSlots.has(key))continue;seenSlots.add(key);
        const choices=card.farmType==='trading_post'?basics:[null];
        for(const choice of choices)actions.push({cardId:card.instanceId,coordinates:[coordinate],choice});
      }
    }
  }
  return actions;
}

export function applyBuilding(view,playerId,action) {
  const trial=forkPosition(view,playerId),card=trial.players[playerId].buildings.find(c=>c.instanceId===action.cardId);
  trial.phase='construction';
  if(card.category==='camp') {
    const c=trial.cells[action.coordinates[0]];c.owner=playerId;c.building={category:'camp',priority:card.effect.priority,instanceId:card.instanceId};
    trial.players[playerId].buildings=trial.players[playerId].buildings.filter(c=>c.instanceId!==card.instanceId);
  } else placeBuilding(trial,playerId,card.instanceId,action.coordinates);
  if(action.choice)trial.cells[action.coordinates[0]].building.choice=action.choice;
  // Preserve the real decision point when estimating how much time remains to acquire land.
  trial.phase=view.phase;
  return trial;
}

export function planBuildings(view,playerId,{depth=3,width=4,camps=false,inventory=true}={}) {
  const evaluate=s=>{
    const stats=playerStats(s,playerId),knowledge=knownTerritories(s,playerId);
    return positionValue(s,playerId,{stats,knowledge})+(inventory?inventoryValue(s,playerId,stats,knowledge):0);
  };
  const initial={view,actions:[],value:evaluate(view)};
  let beam=[initial],best=initial;
  for(let step=0;step<Math.min(depth,view.players[playerId].buildings.length);step++) {
    const next=[],seen=new Set();
    for(const node of beam)for(const action of buildingActions(node.view,playerId,{camps})) {
      const trial=applyBuilding(node.view,playerId,action);
      const key=Object.values(trial.cells).filter(c=>c.building?.instanceId).map(c=>c.coordinate+':'+c.building.instanceId+':'+c.building.choice).join('|');
      if(seen.has(key))continue;seen.add(key);
      const item={view:trial,actions:[...node.actions,action],value:evaluate(trial)};
      next.push(item);
      if(item.value>best.value+.001)best=item;
    }
    next.sort((a,b)=>b.value-a.value||JSON.stringify(a.actions).localeCompare(JSON.stringify(b.actions)));
    beam=next.slice(0,width);if(!beam.length)break;
  }
  return best;
}
