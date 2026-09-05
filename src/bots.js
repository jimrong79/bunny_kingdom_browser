// All decisions use the player's permitted view. No seed, hidden deck, or rival hand is consulted.
import {playCard} from './game.js';
import {fiefs} from './fiefs.js';
import {playerStats,copyOptions,isCopy} from './scoring.js';
import {forkPosition,positionValue,parchmentValue} from './bot-evaluation.js';
import {planBuildings} from './bot-planning.js';
export {positionValue} from './bot-evaluation.js';

export function draftPosition(view,playerId,cards) {
  const trial=forkPosition(view,playerId);
  for(const card of cards)if(card.category!=='provisions')playCard(trial,playerId,card);
  return trial;
}
export function projectedValue(view,playerId) {
  return planBuildings(view,playerId,{depth:2,width:1,camps:true}).value;
}
export function provisionsValue(view) {
  // Two unknown cards, with no access to the actual draw order. Declines as future harvests disappear.
  return 5+(5-view.round)*2;
}
export function cardValue(view,playerId,card,base=projectedValue(view,playerId)) {
  if(card.category==='provisions')return provisionsValue(view);
  return projectedValue(draftPosition(view,playerId,[card]),playerId)-base;
}
export function chooseDraft(view,playerId) {
  const base=projectedValue(view,playerId);
  const cards=view.players[playerId].hand.map(card=>({card,value:cardValue(view,playerId,card,base)})).sort((a,b)=>b.value-a.value||a.card.instanceId.localeCompare(b.card.instanceId));
  return {play:cards.slice(0,view.players.length===2?1:2).map(c=>c.card.instanceId),discard:view.players.length===2?[cards[1].card.instanceId]:[]};
}

export function chooseBuilding(view,playerId) {
  const prepared=prepareMarkets(view,playerId);
  const plan=planBuildings(prepared,playerId,{depth:3,width:4});
  const action=plan.actions[0];
  return action?{cardId:action.cardId,coordinates:action.coordinates}:null;
}
export function chooseCamp(view,playerId,cardId) {
  const trial=prepareMarkets(view,playerId);
  trial.players[playerId].buildings=trial.players[playerId].buildings.filter(c=>c.instanceId===cardId);
  const plan=planBuildings(trial,playerId,{depth:1,width:1,camps:true});
  return plan.actions[0]?.coordinates[0]??null;
}

function marketPlan(view,playerId,posts,score) {
  let best=[],value=-Infinity;
  const visit=(index,trial,choices)=>{
    if(index===posts.length) {
      const candidate=score(trial);
      if(candidate>value){value=candidate;best=choices;}
      return;
    }
    for(const resource of ['wood','fish','carrots']) {
      const next=forkPosition(trial,playerId),coordinate=posts[index].coordinate;
      next.cells[coordinate].building.choice=resource;
      visit(index+1,next,[...choices,{coordinate,resource}]);
    }
  };
  visit(0,view,[]);return best;
}
function prepareMarkets(view,playerId) {
  const trial=forkPosition(view,playerId);
  const posts=Object.values(view.cells).filter(c=>c.owner===playerId&&c.building?.farmType==='trading_post'&&!c.building.choice);
  if(posts.length)for(const c of marketPlan(view,playerId,posts,s=>positionValue(s,playerId)))trial.cells[c.coordinate].building.choice=c.resource;
  return trial;
}
export function chooseMarkets(view,playerId) {
  const posts=Object.values(view.cells).filter(c=>c.owner===playerId&&c.building?.farmType==='trading_post');
  return marketPlan(view,playerId,posts,trial=>fiefs(trial,playerId).reduce((n,f)=>n+f.points,0)
    +(view.round===4?parchmentValue(trial,playerId,trial.players[playerId].parchments,playerStats(trial,playerId),false):0));
}

export function chooseCopies(view,playerId,decisions) {
  const player=view.players[playerId],copies=player.parchments.filter(isCopy),stats=playerStats(view,playerId);
  let best={},value=-Infinity;
  const visit=(index,effective,choices)=>{
    if(index===copies.length) {
      const score=parchmentValue(view,playerId,effective,stats,false);
      if(score>value){value=score;best=choices;}
      return;
    }
    const copy=copies[index],available=copyOptions(view,playerId,copy).cards;
    const targets=available.filter(c=>!isCopy(c));
    if(!targets.length){visit(index+1,effective.filter(c=>c.instanceId!==copy.instanceId),available.length?{...choices,[copy.instanceId]:available[0].instanceId}:choices);return;}
    for(const target of targets)visit(index+1,effective.map(c=>c.instanceId===copy.instanceId?{...target,instanceId:copy.instanceId}:c),{...choices,[copy.instanceId]:target.instanceId});
  };
  visit(0,player.parchments,{});return best;
}
