import {requireRule} from './game.js';

const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const open = (state,playerId) => ['construction','camps'].includes(state.phase) && state.players[playerId] && !state.players[playerId].ready;
const playerFields = player => structuredClone({buildings:player.buildings,ready:player.ready,...('coins' in player?{coins:player.coins,coinEvents:player.coinEvents}:{})});
const stage = state => ({phase:state.phase,...('campQueue' in state?{campQueue:structuredClone(state.campQueue)}:{})});
function restoreStage(state,saved) {
  state.phase=saved.phase;
  if('campQueue' in saved)state.campQueue=structuredClone(saved.campQueue);
  else delete state.campQueue;
}

// Kept in the UI save, outside game state and therefore outside bot views.
// Only changed public construction data is retained, never decks or hands.
export function constructionAction(state,playerId,label,action) {
  requireRule(open(state,playerId),'Construction decisions are closed.');
  requireRule(state.phase!=='camps'||state.campQueue[0]?.playerId===playerId,'Wait for your Camp decision.');
  const round=state.round,seed=state.seed;
  const original=structuredClone(state);
  const before={stage:stage(original),cells:original.cells,players:original.players.map(playerFields),log:original.log};
  try {
    action();
    requireRule(state.round===round&&open(state,playerId),'Confirming Construction cannot be undone.');
  } catch(error) {
    for(const key of Object.keys(state))if(!(key in original))delete state[key];
    Object.assign(state,original);
    throw error;
  }
  const cells=Object.entries(state.cells).filter(([id,cell])=>!equal(before.cells[id],cell)).map(([id,cell])=>({id,before:before.cells[id],after:structuredClone(cell)}));
  const players=state.players.map((player,id)=>({id,before:before.players[id],after:playerFields(player)})).filter(change=>!equal(change.before,change.after));
  const addedLog=state.log.slice(before.log.length),afterStage=stage(state);
  if(!cells.length&&!players.length&&!addedLog.length&&equal(before.stage,afterStage))return null;
  return {version:1,round,seed,playerId,label,beforeStage:before.stage,afterStage,cells,players,logStart:before.log.length,addedLog,botResponses:players.some(change=>change.id!==playerId)};
}

function validateUndo(state,playerId,entry) {
  requireRule(open(state,playerId),'Buildings are locked after Done building.');
  requireRule(entry?.version===1&&entry.playerId===playerId&&entry.round===state.round&&entry.seed===state.seed,'Only your current round’s construction actions can be undone.');
  requireRule(Array.isArray(entry.cells)&&Array.isArray(entry.players)&&Array.isArray(entry.addedLog)&&typeof entry.label==='string','The saved undo action is invalid.');
  requireRule(['construction','camps'].includes(entry.beforeStage?.phase)&&equal(stage(state),entry.afterStage),'Only the latest construction action can be undone.');
  requireRule(Number.isInteger(entry.logStart)&&entry.logStart>=0&&state.log.length===entry.logStart+entry.addedLog.length&&equal(state.log.slice(entry.logStart),entry.addedLog),'Construction has changed since this action.');
  for(const change of entry.cells)requireRule(change.before?.coordinate===change.id&&equal(state.cells[change.id],change.after),'The board has changed since this action.');
  for(const change of entry.players)requireRule(state.players[change.id]&&Array.isArray(change.before?.buildings)&&equal(playerFields(state.players[change.id]),change.after),'The building trays have changed since this action.');
}
export function canUndoConstruction(state,playerId,entry) {
  try {validateUndo(state,playerId,entry);return true;} catch {return false;}
}
export function undoConstruction(state,playerId,entry) {
  validateUndo(state,playerId,entry);
  // Validate every change before touching the live position.
  const restored=structuredClone(entry);
  for(const change of restored.cells)state.cells[change.id]=change.before;
  for(const change of restored.players)Object.assign(state.players[change.id],change.before);
  restoreStage(state,restored.beforeStage);
  state.log.splice(restored.logStart);
}
