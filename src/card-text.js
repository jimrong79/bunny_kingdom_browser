export const resourceNames={wood:'Wood',fish:'Fish',carrots:'Carrots',pearl:'Pearl',mushroom:'Mushroom',luxury_field:'Carrot powder',diamond:'Diamond',copper:'Copper',gold:'Gold',steel:'Steel'};
export const resourceMarks={wood:'Wo',fish:'Fi',carrots:'Ca',pearl:'Pe',mushroom:'Mu',luxury_field:'Cp',diamond:'Di',copper:'Cu',gold:'Au',steel:'St'};
export function cardText(card, state) {
  if(card.category==='territory') {
    const c=state.cells[card.coordinate];
    return `${c.terrain} · ${c.baseResource?resourceNames[c.baseResource]:'no natural resource'}${c.startingCityStrength?' · starting city strength 1':''}. Claim this territory.`;
  }
  if(card.category==='parchment') {
    if(card.id==='right_glove')return '1 point alone, or 4 points if you also have the Left Glove.';
    return card.sourceText;
  }
  if(card.category==='provisions')return 'Immediately draw and play 2 cards.';
  if(card.category==='city')return `Add ${card.effect.strength} strength. ${card.placement.allowedTerrains?'Mountains only.':'Any controlled territory with an empty building slot.'}`;
  if(card.category==='camp')return `Priority ${card.effect.priority}. Claim an empty territory. The matching territory card can remove this Camp.`;
  if(card.category==='sky_tower')return 'Place a pair of Sky Towers to connect two of your separate fiefs. Both spaces need empty building slots.';
  if(card.farmType==='trading_post')return 'Choose Wood, Fish, or Carrots each round. Any controlled territory with an empty building slot.';
  return `Produce ${resourceNames[card.effect.resource]}. ${card.placement.allowedTerrains?.join(', ')||'Any controlled territory'}; requires an empty building slot.`;
}
export function buildingText(building) {
  if(!building)return 'No building';
  if(building.category==='city')return `City · strength ${building.strength}`;
  if(building.category==='camp')return `Camp · priority ${building.priority}`;
  if(building.category==='sky_tower')return `Sky Tower · pair ${building.pairId.split('_').at(-1)}`;
  return building.farmType==='trading_post'?`Trading Post · ${resourceNames[building.choice]||'resource not assigned yet'}`:`Farm · ${resourceNames[building.resource]}`;
}
