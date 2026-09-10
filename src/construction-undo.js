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
    requireRule(state.round===round&&open(state,playerId),'This action must remain in Construction.');
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
  requireRule(open(state,playerId),'Building undo is only available during Construction.');
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

const constructionComplete='Construction complete. Choose Trading Post resources.';
const confirmationPosition=state=>({stage:stage(state),cells:structuredClone(state.cells),
  players:state.players.map(p=>({...playerFields(p),score:p.score,harvests:structuredClone(p.harvests)})),log:[...state.log]});
function withoutResourceChoices(position) {
  const result=structuredClone(position);
  for(const cell of Object.values(result.cells))if(cell.building?.category==='chimney'||cell.building?.farmType==='trading_post')delete cell.building.choice;
  return result;
}

// Save public construction data before Done building, including choices that
// bot resource selection may change. The UI keeps this outside bot views.
export function constructionConfirmation(state,playerId,action) {
  requireRule(state.phase==='construction'&&open(state,playerId),'Construction decisions are closed.');
  const original=structuredClone(state),before=confirmationPosition(state);
  try {
    action();
    requireRule(state.phase==='markets'&&!state.players[playerId].ready&&state.round===original.round&&state.seed===original.seed,'Construction must end at harvest resource selection.');
    return {version:1,round:state.round,seed:state.seed,playerId,before,after:withoutResourceChoices(confirmationPosition(state))};
  } catch(error) {
    for(const key of Object.keys(state))if(!(key in original))delete state[key];
    Object.assign(state,original);throw error;
  }
}

function validateReopen(state,playerId,entry) {
  requireRule(state.phase==='markets'&&state.players[playerId]&&!state.players[playerId].ready,'Construction is locked after confirming the harvest.');
  requireRule(state.players.every(p=>p.harvests.every(h=>h.round!==state.round)),'This round has already been harvested.');
  if(!entry) {
    // Older resource-stage saves can resume building, but cannot recover their
    // already-discarded placement journal or previous resource assignments.
    requireRule(state.log.at(-1)===constructionComplete&&state.players.every(p=>p.id===playerId||p.ready),'The construction confirmation is unavailable.');
    return;
  }
  requireRule(entry.version===1&&entry.playerId===playerId&&entry.round===state.round&&entry.seed===state.seed,'Only this round’s construction confirmation can be reopened.');
  requireRule(entry.before?.stage?.phase==='construction'&&entry.before.players?.length===state.players.length&&entry.before.players[playerId]?.ready===false,'The saved construction confirmation is invalid.');
  requireRule(entry.before.cells&&equal(Object.keys(entry.before.cells).sort(),Object.keys(state.cells).sort())&&Object.entries(entry.before.cells).every(([id,c])=>c?.coordinate===id),'The saved construction board is invalid.');
  requireRule(Array.isArray(entry.before.log)&&entry.before.players.every(p=>Array.isArray(p.buildings)&&Array.isArray(p.harvests)&&Number.isFinite(p.score)&&typeof p.ready==='boolean'),'The saved construction players are invalid.');
  requireRule(equal(withoutResourceChoices(confirmationPosition(state)),entry.after),'The game has changed since Done building.');
}
export function canReopenConstruction(state,playerId,entry) {
  try {validateReopen(state,playerId,entry);return true;} catch {return false;}
}
export function reopenConstruction(state,playerId,entry) {
  validateReopen(state,playerId,entry);
  if(!entry) {state.phase='construction';state.log.pop();return;}
  const restored=structuredClone(entry.before);
  state.cells=restored.cells;
  restored.players.forEach((p,id)=>Object.assign(state.players[id],p));
  restoreStage(state,restored.stage);state.log=restored.log;
}
