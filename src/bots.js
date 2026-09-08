// All decisions use the player's permitted view. No seed, hidden deck, or rival hand is consulted.
import {playCard} from './game.js';
import {fiefs} from './fiefs.js';
import {playerStats,copyPaths,isCopy,evaluateFinal} from './scoring.js';
import {forkPosition,positionValue,parchmentValue} from './bot-evaluation.js';
import {planBuildings} from './bot-planning.js';
import {planCamps} from './bot-camps.js';
import {campExposure,passedCampPenalty} from './bot-camp-defense.js';
import {hasExpansion,cardsPerPick} from './config.js';
import {districtSnapshot,awardNewDistricts} from './districts.js';
import {movableRainbows,rainbowDestinations,moveRainbow} from './construction.js';
import {chimneyPlan} from './bot-chimneys.js';
export {chooseChimneys} from './bot-chimneys.js';
export {positionValue} from './bot-evaluation.js';

export function draftPosition(view,playerId,cards) {
  const trial=forkPosition(view,playerId);
  const before=districtSnapshot(trial,playerId);
  for(const card of cards)if(card.category!=='provisions')playCard(trial,playerId,card,null,true);
  awardNewDistricts(trial,playerId,before,cards.filter(c=>c.category==='territory').map(c=>c.coordinate));
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
  if(hasExpansion(view)&&view.players.length>2)return chooseExpansionDraft(view,playerId);
  const base=projectedValue(view,playerId);
  const cards=[...view.players[playerId].hand].sort((a,b)=>a.instanceId.localeCompare(b.instanceId));
  const next=(playerId+(view.round%2?1:-1)+view.players.length)%view.players.length;
  // Judge the recipient's opportunities from public land/buildings, without their secret objectives.
  const rival=forkPosition(view,next),rivalBase=projectedValue(rival,next);
  const threats=new Map(cards.map(c=>[c.instanceId,Math.max(0,cardValue(rival,next,c,rivalBase))]));
  const ownValues=view.players.length===2?new Map(cards.map(c=>[c.instanceId,cardValue(view,playerId,c,base)])):null;
  const camps=cards.filter(c=>c.category==='territory'&&view.cells[c.coordinate].owner===playerId
    &&view.cells[c.coordinate].building?.category==='camp');
  const exposure=campExposure(view,cards.length);
  // Camp penalties are nonnegative; only contenders need the extra placement search.
  let best=null,bestValue=-Infinity;
  for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++) {
    const remaining=cards.filter((_,k)=>k!==i&&k!==j).map(c=>threats.get(c.instanceId)).sort((a,b)=>b-a);
    const passedCamps=camps.filter(c=>c!==cards[i]&&c!==cards[j]);
    if(view.players.length===2) {
      for(const [play,discard] of [[cards[i],cards[j]],[cards[j],cards[i]]]) {
        let value=ownValues.get(play.instanceId)-.65*(remaining[0]||0);
        if(passedCamps.length&&value>bestValue) {
          const trial=draftPosition(view,playerId,[play]);
          value-=passedCampPenalty(trial,playerId,passedCamps,exposure,projectedValue(trial,playerId));
        }
        if(value>bestValue){bestValue=value;best={play:[play.instanceId],discard:[discard.instanceId]};}
      }
    } else {
      const pair=[cards[i],cards[j]],trial=draftPosition(view,playerId,pair);
      const secureValue=projectedValue(trial,playerId);
      let value=secureValue-base+pair.filter(c=>c.category==='provisions').length*provisionsValue(view)
        -.12*((remaining[0]||0)+(remaining[1]||0));
      if(passedCamps.length&&value>bestValue)value-=passedCampPenalty(trial,playerId,passedCamps,exposure,secureValue);
      if(value>bestValue){bestValue=value;best={play:pair.map(c=>c.instanceId),discard:[]};}
    }
  }
  return best;
}

function chooseExpansionDraft(view,playerId) {
  const count=cardsPerPick(view),hand=[...view.players[playerId].hand].sort((a,b)=>a.instanceId.localeCompare(b.instanceId));
  if(hand.length===count)return {play:hand.map(c=>c.instanceId),discard:[]};
  const base=projectedValue(view,playerId),next=(playerId+(view.round%2?1:-1)+view.players.length)%view.players.length;
  const rival=forkPosition(view,next),rivalBase=projectedValue(rival,next);
  const values=new Map(hand.map(c=>[c.instanceId,cardValue(view,playerId,c,base)]));
  const threats=new Map(hand.map(c=>[c.instanceId,Math.max(0,cardValue(rival,next,c,rivalBase))]));
  // Bound triple search for responsive local play; score combinations, not only singles.
  const candidates=count===3?[...hand].sort((a,b)=>values.get(b.instanceId)-values.get(a.instanceId)).slice(0,10):hand;
  let best=null,bestValue=-Infinity;
  function visit(start,picked){
    if(picked.length<count){for(let i=start;i<=candidates.length-(count-picked.length);i++)visit(i+1,[...picked,candidates[i]]);return;}
    const trial=draftPosition(view,playerId,picked),secure=projectedValue(trial,playerId);
    const passed=hand.filter(c=>!picked.includes(c));
    const danger=passed.map(c=>threats.get(c.instanceId)).sort((a,b)=>b-a).slice(0,count).reduce((n,v)=>n+v,0);
    let value=secure-base+picked.filter(c=>c.category==='provisions').length*provisionsValue(view)-.12*danger;
    if(value>bestValue)value-=passedCampPenalty(trial,playerId,passed,campExposure(view,hand.length),secure);
    if(value>bestValue){bestValue=value;best={play:picked.map(c=>c.instanceId),discard:[]};}
  }
  visit(0,[]);return best;
}

export function chooseRainbowMoves(view,playerId) {
  let trial=forkPosition(view,playerId);const choices=[];
  for(const old of movableRainbows(trial,playerId)) {
    const pairId=old.building.pairId;let best=trial,value=positionValue(trial,playerId),destination=null;
    for(const coordinate of rainbowDestinations(trial,playerId,pairId)) {
      if(coordinate===old.coordinate)continue;
      const candidate=forkPosition(trial,playerId);candidate.phase='construction';moveRainbow(candidate,playerId,pairId,coordinate);
      const score=positionValue(candidate,playerId);
      if(score>value+.01){value=score;best=candidate;destination=coordinate;}
    }
    if(destination){choices.push({pairId,coordinate:destination});trial=best;}
  }
  return choices;
}

export function chooseBuilding(view,playerId) {
  const prepared=prepareMarkets(view,playerId);
  const plan=planBuildings(prepared,playerId,{depth:3,width:4});
  const action=plan.actions[0];
  return action?{cardId:action.cardId,coordinates:action.coordinates}:null;
}
export function chooseCamp(view,playerId,cardId) {
  return planCamps(prepareMarkets(view,playerId),playerId,cardId);
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
  return marketPlan(view,playerId,posts,trial=>chimneyPlan(trial,playerId).value
    +(view.round===4?parchmentValue(trial,playerId,trial.players[playerId].parchments,playerStats(trial,playerId),false):0));
}

export function chooseCopies(view,playerId,decisions={copies:{},rulings:{},copyResolutions:{}}) {
  const player=view.players[playerId],copies=player.parchments.filter(isCopy),stats=playerStats(view,playerId);
  let best={},value=-Infinity;
  const visit=(index,effective,choices)=>{
    if(index===copies.length) {
      const result=evaluateFinal(view,{...decisions,copies:{...decisions.copies,...choices},copyResolutions:{}}).players[playerId];
      const score=result.rows.every(r=>r.points!==null)?result.total-view.players[playerId].score-(result.trade||0):parchmentValue(view,playerId,effective,stats,false);
      if(score>value){value=score;best=choices;}
      return;
    }
    const copy=copies[index],paths=copyPaths(view,playerId,copy);
    if(!paths.length){visit(index+1,effective.map(c=>c.instanceId===copy.instanceId?{...c,scoringSpec:{type:'fixed_points',points:0}}:c),choices);return;}
    for(const path of paths)visit(index+1,effective.map(c=>c.instanceId===copy.instanceId?{...path.at(-1),instanceId:copy.instanceId}:c),{...choices,[copy.instanceId]:path.map(c=>c.instanceId).join('>')});
  };
  visit(0,player.parchments,{});return best;
}
