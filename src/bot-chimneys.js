import {fiefs} from './fiefs.js';
import {boardOf} from './topology.js';
// Only actual production in the owner's public fiefs supplies a Chimney.
export function chimneyPlan(view,playerId,groups=fiefs(view,playerId)) {
  const chimneys=Object.values(view.cells).filter(c=>c.owner===playerId&&c.building?.category==='chimney');
  const options=chimneys.map(c=>groups.find(f=>f.coordinates.includes(c.coordinate)).resources.filter(r=>['wood','fish','carrots'].includes(r)));
  let best={choices:[],value:-Infinity};
  function visit(index,choices){
    if(index<chimneys.length){for(const resource of options[index].length?options[index]:[null])visit(index+1,[...choices,{coordinate:chimneys[index].coordinate,resource}]);return;}
    const shared=choices.map(c=>c.resource).filter(Boolean);
    const value=groups.reduce((n,f)=>n+f.strength*new Set([...f.resources,...(f.coordinates.some(id=>boardOf(view.cells[id])==='new_world')?shared:[])]).size,0);
    if(value>best.value)best={choices,value};
  }
  visit(0,[]);return best;
}
export const chooseChimneys=(view,playerId)=>chimneyPlan(view,playerId).choices;
