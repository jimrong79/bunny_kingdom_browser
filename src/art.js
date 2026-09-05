// Original vector pieces and terrain illustrations, shared by the board and cards.
const svg=(body,cls='',viewBox='0 0 64 64')=>`<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;

export function rabbitArt() {
  return svg('<path d="M22 28C13 12 15 3 21 4C26 5 28 17 29 24C32 13 37 3 42 6C48 10 39 24 37 29C46 35 47 46 40 51L44 57H18L21 51C11 46 13 34 22 28Z" fill="currentColor" stroke="#fff9de" stroke-width="3" stroke-linejoin="round"/><circle cx="35" cy="34" r="2" fill="#20352f"/><path d="M23 13L27 24M39 14L34 25" stroke="#fff9de" stroke-width="2" stroke-linecap="round" opacity=".6"/><ellipse cx="25" cy="46" rx="5" ry="4" fill="#fff9de" opacity=".65"/>','rabbit-art');
}

export function resourceArt(resource) {
  const drawings={
    wood:'<path d="M20 43V57H29V43M39 34V54H46V34" stroke="#745337" stroke-width="5"/><path d="M6 43L23 9L40 43Z" fill="#316d46"/><path d="M28 35L43 4L58 35Z" fill="#4b8650"/>',
    fish:'<path d="M8 31C20 10 40 14 49 26L59 17V47L49 38C35 50 19 48 8 31Z" fill="#388fba" stroke="#e0f4ec" stroke-width="2"/><circle cx="20" cy="29" r="3" fill="#183e50"/><path d="M34 20L39 13L45 24" fill="#297797"/>',
    carrots:'<path d="M21 22L46 31L13 59Z" fill="#ea963c" stroke="#ae6029" stroke-width="2"/><path d="M30 24L29 5M35 24L47 10M25 24L16 12" stroke="#487b43" stroke-width="6" stroke-linecap="round"/><path d="M22 33L29 36M18 43L23 46" stroke="#fbd18c" stroke-width="3"/>',
    pearl:'<path d="M9 38C12 18 50 18 56 38L46 54H19Z" fill="#d799b1" stroke="#925d7a" stroke-width="2"/><path d="M32 25V49M19 30L27 49M45 30L38 49" stroke="#f8c4d4" stroke-width="3"/><circle cx="33" cy="37" r="13" fill="#fff6df" stroke="#bdb7dc" stroke-width="2"/><circle cx="29" cy="33" r="4" fill="white"/>',
    mushroom:'<path d="M26 32L23 54Q34 60 43 53L38 31" fill="#ffedc2" stroke="#9d7650" stroke-width="2"/><path d="M6 34C9 2 56 2 59 34Q33 42 6 34Z" fill="#b6544c" stroke="#813b3d" stroke-width="2"/><circle cx="21" cy="24" r="5" fill="#f9dda4"/><circle cx="37" cy="16" r="4" fill="#f9dda4"/><circle cx="47" cy="29" r="4" fill="#f9dda4"/>',
    luxury_field:'<path d="M24 11H42V23L49 31V54Q33 62 17 54V31L24 23Z" fill="#e9b34f" stroke="#966b35" stroke-width="3"/><path d="M24 10H42V18H24Z" fill="#826c44"/><path d="M20 35H46V48H20Z" fill="#fff1be"/><path d="M29 38L39 41L27 47Z" fill="#d8782a"/>',
    diamond:'<path d="M8 23L20 9H46L58 23L33 56Z" fill="#b7e5e7" stroke="#527e9d" stroke-width="3"/><path d="M8 23H58M20 9L24 23L33 56L43 23L46 9M24 23L33 9L43 23" fill="none" stroke="#f5ffff" stroke-width="2"/>',
    copper:'<path d="M9 39L22 16L47 12L58 34L43 53L20 54Z" fill="#c38354" stroke="#774935" stroke-width="3"/><path d="M22 16L31 35L47 12M9 39L31 35L43 53L58 34" fill="none" stroke="#f4c99b" stroke-width="3"/>',
    gold:'<path d="M7 46L18 20H44L58 46L47 55H18Z" fill="#e6b947" stroke="#947032" stroke-width="3"/><path d="M18 20L29 44H58M29 44L18 55" fill="none" stroke="#fff0a2" stroke-width="3"/>',
    steel:'<path d="M8 42L20 18H48L58 43L45 54H17Z" fill="#8eabb4" stroke="#425966" stroke-width="3"/><path d="M20 18L29 42H58M29 42L17 54" fill="none" stroke="#e7f0e7" stroke-width="3"/>',
  };
  return svg(drawings[resource]||'<path d="M13 24L31 10L51 24L31 39ZM13 39L31 53L51 39" fill="none" stroke="#74876c" stroke-width="6"/>','resource-art');
}

export function terrainArt(terrain) {
  const tree=(x,y,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 8V19" stroke="#715b36" stroke-width="3"/><path d="M-10 13L0 -9L10 13Z" fill="#447b4c"/><path d="M-8 5L0 -13L8 5Z" fill="#668e48"/></g>`;
  const terrainDrawings={
    forest:`<path d="M0 44Q28 31 64 45V64H0Z" fill="#94ae68"/>${tree(11,21,.7)}${tree(35,15,.8)}${tree(55,28,.7)}${tree(25,42)}${tree(48,52,.7)}${tree(5,57,.7)}`,
    sea:'<path d="M0 47Q19 38 36 47T68 46V64H0Z" fill="#72b7c6"/><path d="M5 18Q13 13 21 18T37 18M30 32Q38 27 46 32T62 32M4 49Q12 44 20 49T36 49" fill="none" stroke="#d9efdd" stroke-width="2" opacity=".75"/><path d="M48 4L62 4L62 16Q51 14 48 4" fill="#e4dc9d"/>',
    field:'<path d="M-8 59L33 0M5 66L46 0M18 67L59 0M31 67L72 0M44 67L80 13" stroke="#c89d55" stroke-width="6"/><path d="M-4 59L37 0M9 66L50 0M22 67L63 0M35 67L76 0" stroke="#f5d386" stroke-width="3"/><path d="M10 18L15 9M32 37L38 28M43 56L49 47" stroke="#7b9750" stroke-width="4"/>',
    mountain:'<path d="M-5 55L22 5L43 47L52 24L72 62Z" fill="#758c87"/><path d="M22 5L43 47L28 37L19 42Z" fill="#b4beb0"/><path d="M8 31L22 5L33 28L24 23L19 30L15 25Z" fill="#f0edce"/><path d="M39 48L52 24L67 53L53 46L47 51Z" fill="#bdc6b8"/><path d="M0 58L13 48L28 58L46 54L64 61" fill="none" stroke="#65796e" stroke-width="3"/>',
    plains:'<path d="M0 37Q23 27 43 38T70 37V64H0Z" fill="#b9cc83"/><path d="M9 24L11 18L14 25M39 48L42 41L45 48M50 16L53 10L56 17M17 54L19 47" fill="none" stroke="#899f58" stroke-width="2"/><circle cx="31" cy="20" r="2" fill="#f5e2a4"/><circle cx="54" cy="54" r="2" fill="#f5e2a4"/>',
    city:'<path d="M4 58L27 36L20 0H37L39 33L64 45V59L33 46L19 64Z" fill="#d2b989"/><path d="M9 12L15 6L21 12V21H9M44 9L50 3L57 9V19H44M47 45L54 38L61 45V57H47M3 41L9 35L15 41V51H3" fill="#e9d4a0" stroke="#9d936b" stroke-width="1.5"/>',
  };
  return svg(terrainDrawings[terrain]||terrainDrawings.plains,'terrain-art');
}

export function pieceArt(building) {
  if(building.category==='farm')return `<span class="farm-token ${building.farmType==='luxury'?'luxury-token':''}">${resourceArt(building.resource||building.choice)}${building.farmType==='trading_post'?'<span class="post-mark">↔</span>':''}</span>`;
  if(building.category==='city') {
    const towers=building.strength===3?[8,26,44]:building.strength===2?[12,40]:[26];
    return svg(`<ellipse cx="32" cy="56" rx="29" ry="6" fill="#3b423b" opacity=".2"/><path d="M10 35H54V55H10Z" fill="#d3bc8f" stroke="#736452" stroke-width="2"/>${towers.map((x,i)=>`<path d="M${x-5} 45V${15+i%2*5}H${x-8}V${7+i%2*5}H${x-3}V${11+i%2*5}H${x+1}V${7+i%2*5}H${x+6}V${11+i%2*5}H${x+10}V${7+i%2*5}H${x+15}V${15+i%2*5}H${x+12}V45Z" fill="#f3e3b7" stroke="#736452" stroke-width="2" stroke-linejoin="round"/><path d="M${x+1} 24H${x+5}V32H${x+1}Z" fill="#7a7660"/>`).join('')}<path d="M27 56V45Q33 35 39 45V56Z" fill="#796f58"/>`,'city-art');
  }
  if(building.category==='camp')return svg('<path d="M7 54L30 15L56 54Z" fill="#f6ddb0" stroke="#776e4d" stroke-width="3"/><path d="M30 15L30 54H56Z" fill="#bda36c"/><path d="M20 54L30 33L39 54Z" fill="#665f49"/><path d="M30 16V3L48 8L30 12" fill="var(--owner,#ac6544)" stroke="#675d47" stroke-width="2"/>','camp-art');
  return svg('<ellipse cx="33" cy="55" rx="28" ry="7" fill="#d9ede5"/><path d="M20 51V24L32 13L45 24V51H37V37Q32 27 28 37V51Z" fill="#dbe8d6" stroke="#638c92" stroke-width="2"/><path d="M12 25L32 6L52 25Z" fill="#5898aa" stroke="#426878" stroke-width="2"/><path d="M12 53H52" stroke="#7ca6a5" stroke-width="4"/>','sky-art');
}

export function cardArt(card) {
  if(card.category==='territory')return `<span class="card-landscape ${card.terrain}">${terrainArt(card.terrain)}<strong>${card.coordinate}</strong></span>`;
  if(card.category==='parchment')return svg('<path d="M15 10H50L46 20V52H17V20L10 15Z" fill="#f4df9f" stroke="#9a7745" stroke-width="2"/><path d="M23 23H39M23 30H37M23 37H40" stroke="#a58b54" stroke-width="2"/><circle cx="34" cy="48" r="9" fill="#b96848"/><path d="M30 46L33 49L39 43" fill="none" stroke="#fce7aa" stroke-width="2"/>','parchment-art');
  if(card.category==='provisions')return svg('<path d="M12 27H53L49 56H17Z" fill="#b88b51" stroke="#705c3b" stroke-width="3"/><path d="M23 29V17Q32 2 43 17V29" fill="none" stroke="#705c3b" stroke-width="4"/><path d="M18 37H49M19 47H48M26 29V55M38 29V55" stroke="#e1bb77" stroke-width="3"/>','provisions-art');
  return pieceArt({...card,strength:card.effect?.strength,resource:card.effect?.resource});
}
