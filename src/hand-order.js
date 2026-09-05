const categoryOrder=['territory','city','farm','camp','sky_tower','provisions','parchment'];
const naturalOrder=new Intl.Collator('en',{numeric:true,sensitivity:'base'});

// Sort the display copy, keeping the dealt hand and selected card identities intact.
export function sortedHand(cards) {
  return [...cards].sort((a,b)=>
    categoryOrder.indexOf(a.category)-categoryOrder.indexOf(b.category)
    || naturalOrder.compare(a.coordinate||a.name,b.coordinate||b.name)
    || naturalOrder.compare(a.instanceId,b.instanceId)
  );
}
