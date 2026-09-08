import { beginRound, requireRule } from './game.js';
import { fiefs } from './fiefs.js';
export const BASIC_RESOURCES = ['wood','fish','carrots'];
export const chimneys = (state,playerId) => Object.values(state.cells).filter(c=>c.owner===playerId&&c.building?.category==='chimney');
export function chimneyOptions(state,playerId,coordinate) {
  const group=fiefs(state,playerId).find(f=>f.coordinates.includes(coordinate));
  return BASIC_RESOURCES.filter(r=>group?.resources.includes(r));
}
export function chooseChimney(state,playerId,coordinate,resource) {
  requireRule(state.phase==='markets'&&!state.players[playerId].ready,'Chimney choices are closed.');
  requireRule(chimneys(state,playerId).some(c=>c.coordinate===coordinate),'Choose your own Chimney.');
  const options=chimneyOptions(state,playerId,coordinate);
  requireRule(options.includes(resource)||!options.length&&resource===null,'Choose a basic resource produced in the Chimney’s fief.');
  state.cells[coordinate].building.choice=resource;
}
export function tradingPosts(state, playerId) {
  return Object.values(state.cells).filter(c=>c.owner===playerId&&c.building?.farmType==='trading_post');
}
export function chooseResource(state, playerId, coordinate, resource) {
  requireRule(state.phase==='markets'&&!state.players[playerId].ready,'Trading Post choices are closed.');
  requireRule(tradingPosts(state,playerId).some(c=>c.coordinate===coordinate)&&BASIC_RESOURCES.includes(resource),'Choose a basic resource for your own Trading Post.');
  state.cells[coordinate].building.choice=resource;
  for(const c of chimneys(state,playerId))if(!chimneyOptions(state,playerId,c.coordinate).includes(c.building.choice))c.building.choice=null;
}
export function finishMarkets(state, playerId) {
  requireRule(state.phase==='markets'&&!state.players[playerId].ready,'Already confirmed Trading Posts.');
  requireRule(tradingPosts(state,playerId).every(c=>BASIC_RESOURCES.includes(c.building.choice)),'Choose a resource for every Trading Post.');
  requireRule(chimneys(state,playerId).every(c=>{const options=chimneyOptions(state,playerId,c.coordinate);return !options.length||options.includes(c.building.choice);}),'Choose an available basic resource for every Chimney.');
  state.players[playerId].ready=true;
  if(state.players.every(p=>p.ready)) {
    state.lastHarvest=state.players.map(p=>{
      const groups=fiefs(state,p.id,{harvest:true}),points=groups.reduce((sum,f)=>sum+f.points,0);
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
