import {hasExpansion} from './config.js';
import {rememberDistricts} from './districts.js';

// Older expansion saves recorded board actions but no permanent District marks.
// Replay connectivity changes to recover membership; never change awarded Coins.
export function restoreDistrictHistory(state) {
  if(!hasExpansion(state)||state.districtHistoryVersion===1||state.phase==='finished')return state;
  const replay={...state,cells:Object.fromEntries(Object.values(state.cells).map(c=>[c.coordinate,
    {...c,owner:null,building:structuredClone(c.startingBuilding||null)}]))};
  let tower=0;
  for(const line of state.log||[])for(const player of state.players) {
    const prefix=player.name+' ';if(!line.startsWith(prefix))continue;
    const action=line.slice(prefix.length);let match,changed=false;
    if((match=/^claimed (.+)\.$/.exec(action))&&replay.cells[match[1]]) {
      replay.cells[match[1]].owner=player.id;changed=true;
    } else if((match=/^placed Camp \d+ at (.+)\.$/.exec(action))&&replay.cells[match[1]]) {
      replay.cells[match[1]].owner=player.id;changed=true;
    } else if((match=/^placed Sky Tower at (.+) \+ (.+)\.$/.exec(action))) {
      const pairId='history_tower_'+tower++;
      for(const id of match.slice(1))if(replay.cells[id])replay.cells[id].building={category:'sky_tower',pairId};
      changed=true;
    } else if((match=/^placed Rainbow (\d+) at (.+)\.$/.exec(action))&&replay.cells[match[2]]) {
      replay.cells[match[2]].building={category:'rainbow',pairId:'rainbow_'+match[1],endpoint:'ground'};changed=true;
    } else if((match=/^moved Rainbow (\d+) from (.+) to (.+)\.$/.exec(action))&&replay.cells[match[2]]&&replay.cells[match[3]]) {
      replay.cells[match[3]].building=replay.cells[match[2]].building;replay.cells[match[2]].building=null;changed=true;
    }
    if(changed)for(const p of state.players)rememberDistricts(replay,p.id);
  }
  for(const c of Object.values(replay.cells))if(c.districtUsed)state.cells[c.coordinate].districtUsed=true;
  // Current groups and event records also support older/minimal save formats.
  for(const p of state.players) {
    for(const event of p.coinEvents||[])for(const id of event.coordinates||[])if(state.cells[id])state.cells[id].districtUsed=true;
    rememberDistricts(state,p.id);
  }
  state.districtHistoryVersion=1;
  return state;
}
