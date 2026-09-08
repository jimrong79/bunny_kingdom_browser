import {skyResourceNames} from './sky-art.js';
export const resourceNames={wood:'Wood',fish:'Fish',carrots:'Carrots',pearl:'Pearl',mushroom:'Mushroom',luxury_field:'Carrot powder',diamond:'Diamond',copper:'Copper',gold:'Gold',steel:'Steel',...skyResourceNames};
export const resourceMarks={wood:'Wo',fish:'Fi',carrots:'Ca',pearl:'Pe',mushroom:'Mu',luxury_field:'Cp',diamond:'Di',copper:'Cu',gold:'Au',steel:'St'};
export function cardText(card, state) {
  if(card.category==='territory') {
    const c=state.cells[card.coordinate];
    return `${c.boardId==='great_cloud'?'Great Cloud · ':''}${c.terrain} · ${c.baseResource?resourceNames[c.baseResource]:c.startingBuilding?.resource?resourceNames[c.startingBuilding.resource]:'no natural resource'}${c.startingCityStrength?' · starting city strength '+c.startingCityStrength:''}. Claim this territory.${card.rainbow?' Reserve a movable Rainbow to connect to the New World.':''}`;
  }
  if(card.category==='parchment') {
    if(card.id==='right_glove')return '1 point alone, or 4 points if you also have the Left Glove.';
    return card.sourceText;
  }
  if(card.category==='provisions')return 'Immediately draw and play 2 cards.';
  if(card.category==='tax_collector')return 'Immediately collect 2 Coins for endgame Trade.';
  if(card.category==='rainbow')return 'Connect this cloud territory to an owned New World territory in a different fief. You may move the ground endpoint during Construction.';
  if(card.category==='chimney')return 'Great Cloud only. Each harvest, share one basic resource from this fief with all your fiefs containing New World territories.';
  if(card.cityType==='carrotadel')return 'Raise this fief’s strength to 5, unless its ordinary cities already provide more. Carrotadels do not stack. Empty owned territory required.';
  if(card.category==='city')return `Add ${card.effect.strength} strength. ${card.placement.allowedTerrains?'Mountains only.':'Any controlled territory with an empty building slot.'}`;
  if(card.category==='camp')return `Priority ${card.effect.priority}. Claim an empty territory. The matching territory card can remove this Camp.`;
  if(card.category==='sky_tower')return 'Place a pair of Sky Towers to connect two of your separate fiefs. Both spaces need empty building slots.';
  if(card.farmType==='trading_post')return 'Choose Wood, Fish, or Carrots each round. Any controlled territory with an empty building slot.';
  return `Produce ${resourceNames[card.effect.resource]}. ${card.placement.allowedBoards?.includes('great_cloud')?'Great Cloud only':card.placement.allowedTerrains?.join(', ')||'Any controlled territory'}; requires an empty building slot.`;
}
export function buildingText(building) {
  if(!building)return 'No building';
  if(building.cityType==='carrotadel')return 'Carrotadel · fief strength at least 5';
  if(building.category==='rainbow')return `Rainbow ${building.pairId.split('_').at(-1)} · ${building.endpoint==='cloud'?'fixed cloud endpoint':'movable New World endpoint'}`;
  if(building.category==='chimney')return `Chimney · ${resourceNames[building.choice]||'choose a basic resource each harvest'}`;
  if(building.category==='city')return `City · strength ${building.strength}`;
  if(building.category==='camp')return `Camp · priority ${building.priority}`;
  if(building.category==='sky_tower')return `Sky Tower · pair ${building.pairId.split('_').at(-1)}`;
  return building.farmType==='trading_post'?`Trading Post · ${resourceNames[building.choice]||'resource not assigned yet'}`:`Farm · ${resourceNames[building.resource]}`;
}
