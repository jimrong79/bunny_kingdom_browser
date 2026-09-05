import { beginRound, requireRule } from './game.js';
import { fiefs } from './fiefs.js';
export const BASIC_RESOURCES = ['wood','fish','carrots'];
export function tradingPosts(state, playerId) {
  return Object.values(state.cells).filter(c=>c.owner===playerId&&c.building?.farmType==='trading_post');
}
export function chooseResource(state, playerId, coordinate, resource) {
  requireRule(state.phase==='markets'&&!state.players[playerId].ready,'Trading Post choices are closed.');
  requireRule(tradingPosts(state,playerId).some(c=>c.coordinate===coordinate)&&BASIC_RESOURCES.includes(resource),'Choose a basic resource for your own Trading Post.');
  state.cells[coordinate].building.choice=resource;
}
export function finishMarkets(state, playerId) {
  requireRule(state.phase==='markets'&&!state.players[playerId].ready,'Already confirmed Trading Posts.');
  requireRule(tradingPosts(state,playerId).every(c=>BASIC_RESOURCES.includes(c.building.choice)),'Choose a resource for every Trading Post.');
  state.players[playerId].ready=true;
  if(state.players.every(p=>p.ready)) {
    state.lastHarvest=state.players.map(p=>{
      const groups=fiefs(state,p.id),points=groups.reduce((sum,f)=>sum+f.points,0);
      p.score+=points;p.harvests.push({round:state.round,points});
      state.log.push(`${p.name} harvested ${points} points (total ${p.score}).`);
      return {playerId:p.id,fiefs:groups,points};
    });
    state.phase='harvest';
  }
}
export function advanceRound(state) {
  requireRule(state.phase==='harvest','Finish this harvest first.');
  if(state.round<4) beginRound(state);
  else {state.phase='parchments';state.log.push('Four harvests complete. Reveal all parchments.');}
}
