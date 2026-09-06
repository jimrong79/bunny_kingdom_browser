const KEY='bunny-kingdom-save-v1';
const phases=['draft','camps','construction','markets','harvest','parchments','finished'];
export function validSave(game) {
  if(!game||game.version!==1||!phases.includes(game.phase)||!Number.isInteger(game.round)||game.round<1||game.round>4)return false;
  if(!Array.isArray(game.players)||game.players.length<2||game.players.length>4||!Array.isArray(game.deck)||Object.keys(game.cells||{}).length!==100)return false;
  if(!game.players.every((p,i)=>p.id===i&&p.name===(i?`Bot ${i}`:'You')&&Number.isFinite(p.score)&&['hand','reserve','played','parchments','discarded','buildings','harvests'].every(k=>Array.isArray(p[k]))))return false;
  const cards=[...game.deck,...game.players.flatMap(p=>[...p.hand,...p.reserve,...p.played,...p.parchments,...p.discarded])];
  if(cards.length!==182||cards.some(c=>!c||typeof c.instanceId!=='string')||new Set(cards.map(c=>c.instanceId)).size!==182)return false;
  return game.phase!=='camps'||(Array.isArray(game.campQueue)&&game.campQueue.length>0);
}
export function saveGame(game,ui={},storage) {
  try {(storage||globalThis.localStorage).setItem(KEY,JSON.stringify({format:1,savedAt:new Date().toISOString(),game,ui}));return true;}catch{return false;}
}
export function loadGame(storage) {
  try {const value=JSON.parse((storage||globalThis.localStorage).getItem(KEY));return value?.format===1&&validSave(value.game)?value:null;}catch{return null;}
}
export function exportGame(game,ui={}) {
  const seed=String(game.seed).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,100)||'saved';
  return {filename:`bunny-kingdom-${seed}.json`,text:JSON.stringify({format:1,savedAt:new Date().toISOString(),game,ui},null,2)+'\n'};
}
