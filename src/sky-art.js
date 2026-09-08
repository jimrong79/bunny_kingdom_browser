// Original vector symbols for expansion resources and pieces; labels describe the artwork.
export const skyResourceNames={luxury_cloud:'Cloud wool',luxury_plains:'Bird',wondrous_books:'Flying books',wondrous_carpet:'Magic carpet',wondrous_star:'Falling star',wondrous_lightning:'Lightning',wondrous_mushrooms:'Giant mushrooms',wondrous_dragon:'Dragon',wondrous_snow:'Snow rabbit',wondrous_phoenix:'Phoenix',wondrous_fruit:'Golden fruit',wondrous_cheese:'Cheese moon',wondrous_beanstalk:'Beanstalk',wondrous_feathers:'Golden feathers'};
const cloud='<path d="M10 48C-1 40 6 26 18 29C17 12 42 9 47 28C62 25 69 45 55 49Z" fill="#f4f9ff" stroke="#9eb9d4" stroke-width="2"/>';
const wing='<path d="M31 33L7 12L11 34L22 43L6 37L16 50L33 49" fill="#efd3a8" stroke="#9b739f" stroke-width="2"/>';
export function skyResourceDrawing(id){return ({
 luxury_cloud:cloud+'<path d="M15 32Q23 20 27 33T39 31T52 37M13 42Q21 34 27 44T43 41" fill="none" stroke="#b7a2ca" stroke-width="3"/>',
 luxury_plains:'<path d="M22 42Q7 16 27 25Q29 6 40 16L56 24L44 28Q51 47 31 49L24 59M39 47L43 58" fill="#f0c555" stroke="#967343" stroke-width="3"/><circle cx="39" cy="21" r="2" fill="#34474c"/><path d="M31 16L24 7L40 11" fill="#d87844"/>',
 wondrous_books:wing+'<g transform="translate(64 0) scale(-1 1)">'+wing+'</g><path d="M20 21H46V47H20Z" fill="#9564b2" stroke="#5e4782" stroke-width="3"/><path d="M25 25H42M25 31H40M25 37H42" stroke="#e8d5ef" stroke-width="2"/>',
 wondrous_carpet:'<path d="M8 38L26 12L58 25L40 54Z" fill="#686ab6" stroke="#e0b653" stroke-width="4"/><path d="M20 37L29 24L46 30L37 44Z" fill="#cca1d7"/><path d="M8 38L3 42M14 43L9 48M41 53L39 59M49 43L51 50" stroke="#d8ae52" stroke-width="3"/>',
 wondrous_star:'<path d="M34 8L40 23L57 24L44 36L48 53L33 45L18 53L21 36L8 24L26 23Z" fill="#f7d85b" stroke="#bb8c3e" stroke-width="3"/><path d="M9 8L18 16M48 9L44 15" stroke="#c292c8" stroke-width="3"/>',
 wondrous_lightning:cloud+'<path d="M33 7L18 34H32L25 59L48 25H33L41 7Z" fill="#83def1" stroke="#6b5baa" stroke-width="3"/>',
 wondrous_mushrooms:'<path d="M26 31V56H37V31" fill="#fff2d9" stroke="#9273a5" stroke-width="3"/><path d="M8 33Q10 1 32 9Q53 6 57 33Z" fill="#be618c" stroke="#80548b" stroke-width="3"/><circle cx="23" cy="22" r="5" fill="#ffe9b8"/><circle cx="43" cy="25" r="4" fill="#ffe9b8"/>',
 wondrous_dragon:'<path d="M11 48Q43 60 47 36L38 22L48 13L55 22L47 24Q56 52 37 53L18 50L8 55Z" fill="#b094cf" stroke="#725793" stroke-width="3"/><path d="M37 39L8 14L11 35L27 44M33 31L29 5L44 20" fill="#d2bfe6" stroke="#725793" stroke-width="2"/><circle cx="49" cy="20" r="2" fill="#ec727d"/>',
 wondrous_snow:'<circle cx="32" cy="43" r="17" fill="#f5f8ff" stroke="#9aabd3" stroke-width="3"/><ellipse cx="26" cy="18" rx="5" ry="14" fill="#f5f8ff" stroke="#9aabd3" stroke-width="2"/><ellipse cx="39" cy="18" rx="5" ry="14" fill="#f5f8ff" stroke="#9aabd3" stroke-width="2"/><circle cx="26" cy="38" r="2"/><circle cx="39" cy="38" r="2"/><path d="M30 44L45 46L30 49Z" fill="#e39b48"/>',
 wondrous_phoenix:'<path d="M31 45L4 17L10 42L26 52L16 61L34 55L48 61L40 48L57 20L39 32L42 13L33 7L27 20Z" fill="#e9ae48" stroke="#985e83" stroke-width="3"/><path d="M16 29L27 40M46 29L37 40M33 23V42" stroke="#d16b55" stroke-width="5"/>',
 wondrous_fruit:'<path d="M31 21L14 3L29 10L39 2L41 14L54 10L42 26" fill="#7da476" stroke="#678165" stroke-width="2"/><ellipse cx="32" cy="39" rx="20" ry="22" fill="#e9bc45" stroke="#a78343" stroke-width="3"/><path d="M18 26L44 52M13 38L34 60M29 20L51 43M44 26L19 52M50 38L32 57" stroke="#f8dfa0" stroke-width="2"/>',
 wondrous_cheese:'<path d="M11 48L48 10L57 50Z" fill="#f5d77b" stroke="#ad8252" stroke-width="3"/><circle cx="39" cy="30" r="5" fill="#b596b4"/><circle cx="27" cy="43" r="4" fill="#b596b4"/><circle cx="47" cy="44" r="3" fill="#b596b4"/><path d="M9 18L15 8L20 17L14 25Z" fill="#ecd579"/>',
 wondrous_beanstalk:'<path d="M30 59Q16 44 34 29T30 4" fill="none" stroke="#5c8c69" stroke-width="6"/><path d="M30 46Q9 24 8 41Q11 56 30 46M32 28Q60 17 52 36Q45 44 32 28M33 16Q9 3 16 21Q21 30 33 16" fill="#9cbd72" stroke="#5c8c69" stroke-width="2"/>',
 wondrous_feathers:'<path d="M16 55Q8 15 46 7Q60 40 16 55Z" fill="#edcc68" stroke="#ad874d" stroke-width="3"/><path d="M11 61L45 11M20 47L34 44M25 39L42 34M31 28L45 24" stroke="#fff1b5" stroke-width="3"/>',
})[id];}
export function skyPieceDrawing(building){
 if(building.category==='rainbow')return [25,21,17,13].map((r,i)=>`<path d="M${32-r} 51V36a${r} ${r} 0 0 1 ${r*2} 0V51" fill="none" stroke="${['#da7786','#ebc566','#8bbf93','#82a5d3'][i]}" stroke-width="5"/>`).join('');
 if(building.category==='chimney')return '<path d="M17 58V28H44V58ZM13 23H48V32H13Z" fill="#bb8b94" stroke="#775d7a" stroke-width="3"/><path d="M18 40H43M18 50H43M30 32V40M25 40V50M34 50V58" stroke="#ead1c5" stroke-width="2"/><path d="M29 20Q12 10 28 4M40 21Q55 8 41 2" fill="none" stroke="#aec7d8" stroke-width="6" stroke-linecap="round"/>';
 if(building.category==='tax_collector')return '<circle cx="25" cy="31" r="21" fill="#e2b64d" stroke="#9a7136" stroke-width="3"/><circle cx="42" cy="42" r="18" fill="#f1d279" stroke="#9a7136" stroke-width="3"/><text x="42" y="49" text-anchor="middle" font-size="24" font-weight="bold" fill="#806333">2</text>';
 return null;
}
export const cloudDrawing=cloud;
