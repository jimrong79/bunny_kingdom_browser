// Original pictograms: a card's silhouette and scoring cue remain recognizable at hand size.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(value,x,y,size=13,color='#355749')=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="${size}" fill="${color}">${esc(value)}</text>`;
const crown='<path d="M22 29L16 9L30 18L40 4L50 18L64 9L58 29Z" fill="#e6b847" stroke="#967032" stroke-width="2"/><path d="M22 34H58" stroke="#967032" stroke-width="4"/><circle cx="40" cy="20" r="3" fill="#ad6350"/>';
const scroll='<rect x="18" y="7" width="40" height="54" rx="4" fill="#f7e5b3" stroke="#a48a55" stroke-width="2"/><path d="M13 16H60M26 27H50M26 35H47M26 43H49" stroke="#ae955d" stroke-width="3"/><circle cx="47" cy="54" r="7" fill="#ad644e"/>';
const shield=(value,x=80,y=49)=>`<g transform="translate(${x} ${y})"><path d="M0 0Q18 -5 36 0V21Q32 33 18 39Q4 33 0 21Z" fill="#e9bb48" stroke="#96702d" stroke-width="2"/><path d="M4 4H32V21Q28 30 18 34Q8 30 4 21Z" fill="none" stroke="#fff0a9" stroke-width="2"/>${text(value,18,25,23,'#694d20')}</g>`;
const at=(art,x,y,size)=>art.replace('<svg ',`<svg x="${x}" y="${y}" width="${size}" height="${size}" `);
const flag=(x,y,color='#ae6555')=>`<g transform="translate(${x} ${y})"><path d="M0 24H26L32 31H-6Z" fill="#a5bd86" stroke="#647d58"/><path d="M10 26V1" stroke="#596b50" stroke-width="2"/><path d="M11 2H28L22 9L28 15H11Z" fill="${color}"/></g>`;
const grid=(mode)=>`<rect x="19" y="10" width="70" height="62" rx="4" fill="#bdd09c" stroke="#66815a" stroke-width="2"/><path d="M19 31H89M19 51H89M42 10V72M65 10V72" stroke="#f8efcb" stroke-width="2"/>${mode==='edge'?'<rect x="22" y="13" width="64" height="56" rx="2" fill="none" stroke="#b76c51" stroke-width="9"/>':[[19,10],[73,10],[19,56],[73,56]].map(([x,y])=>`<rect x="${x}" y="${y}" width="16" height="16" rx="3" fill="#b66d52"/><path d="M${x+4} ${y+8}H${x+12}M${x+8} ${y+4}V${y+12}" stroke="#fff1b5" stroke-width="2"/>`).join('')}`;

export function parchmentArt(card,{resourceArt,pieceArt,rabbitArt}) {
  const s=card.scoringSpec||{},id=card.id;
  const resource=(r,x=27,y=18,size=58)=>at(resourceArt(r),x,y,size);
  const city=(x=25,y=15,size=58)=>at(pieceArt({category:'city',strength:2}),x,y,size);
  const bunny=(x=29,y=9,size=61,color='#758e72')=>`<g color="${color}">${at(rabbitArt(),x,y,size)}</g>`;
  let picture='',cue='',tone='#e7eddb';
  if(card.parchmentType==='treasure') {
    tone='#f6e6af';
    const treasures={
      royal_ring:'<ellipse cx="40" cy="46" rx="19" ry="22" fill="none" stroke="#b68a30" stroke-width="9"/><ellipse cx="40" cy="46" rx="19" ry="22" fill="none" stroke="#f5d77d" stroke-width="4"/><path d="M24 25L31 13H49L57 25L40 40Z" fill="#75b7bb" stroke="#4a808a" stroke-width="2"/><path d="M24 25H57M31 13L40 40L49 13" fill="none" stroke="#e3f4dc" stroke-width="2"/>',
      royal_coat:'<path d="M25 15L12 59L25 68L40 60L56 68L67 59L54 15L40 22Z" fill="#aa626e" stroke="#714852" stroke-width="2"/><path d="M25 15L40 23L54 15L50 31H30Z" fill="#fff4d2"/><path d="M40 29V60" stroke="#e9bd59" stroke-width="3"/><circle cx="40" cy="32" r="4" fill="#e9bd59"/>',
      royal_scepter:'<path d="M23 69L51 25" stroke="#9e7635" stroke-width="10"/><path d="M23 69L51 25" stroke="#ecc764" stroke-width="4"/><path d="M42 29L34 14L47 17L55 4L62 16L74 12L65 29Z" fill="#e8bd4b" stroke="#957338" stroke-width="2"/><circle cx="54" cy="21" r="5" fill="#93679b"/>',
      royal_chalice:'<path d="M19 14H62V32Q61 48 41 51Q20 48 19 32ZM41 51V65M27 69H55" fill="#e7b344" stroke="#92702f" stroke-width="5"/><path d="M19 22H9V34Q11 46 27 42M62 22H72V34Q70 46 56 42" fill="none" stroke="#c89839" stroke-width="5"/><path d="M28 22V33Q28 40 35 42" fill="none" stroke="#fff0a9" stroke-width="4"/>',
      royal_crown:`<g transform="translate(-5 15) scale(1.18)">${crown}</g><ellipse cx="42" cy="64" rx="28" ry="6" fill="#bf945735"/>`,
      royal_carrot:`${resource('carrots',6,10,69)}<g transform="translate(27 -4) scale(.6)">${crown}</g>`,
      left_glove:'<path d="M25 66V44L12 28Q10 19 17 23L25 32V12Q26 5 31 12V27V7Q36 0 39 8V26V10Q44 3 47 12V28V18Q53 11 55 20V47L50 66Z" fill="#fff0ce" stroke="#a98b51" stroke-width="2"/><path d="M25 56H52V68H25Z" fill="#cfb267"/>',
    };
    treasures.right_glove=`<g transform="translate(78 0) scale(-1 1)">${treasures.left_glove}</g>`;
    picture=`<g transform="translate(0 3)">${treasures[id]||scroll}</g>${shield(s.points??s.pointsAlone??'?')}`;
    if(s.type==='paired_treasure')picture+=text(id==='left_glove'?'L':'R',13,17,14)+`<rect x="7" y="75" width="65" height="16" rx="8" fill="#fff3cb"/>`+text(`PAIR → ${s.pointsWithPartner}`,40,87,10);
  } else if(s.type==='points_per_resource'||s.type==='resource_threshold') {
    tone=({wood:'#dce9cb',fish:'#d4e9e9',carrots:'#f1dfbf'})[s.resource];
    if(s.type==='resource_threshold') {
      picture=`${resource(s.resource,31,29,51)}<g transform="translate(18 -1)">${crown}</g>`;
      cue=`${s.minimum}+ → ${s.points}`;
    } else {
      const tools={wood:'<path d="M29 63L66 13" stroke="#826144" stroke-width="5"/><path d="M58 22L69 9L82 26L69 34Z" fill="#9eafb0" stroke="#596e6d" stroke-width="2"/>',fish:'<path d="M20 67L44 10Q77 -3 86 29V49Q86 64 74 57" fill="none" stroke="#846341" stroke-width="3"/>',carrots:'<path d="M27 69L59 19M53 9L69 21M57 10L51 20M64 14L58 25M70 19L64 30" stroke="#836342" stroke-width="4"/>'};
      picture=`${bunny(15,17,53)}${tools[s.resource]}${resource(s.resource,62,37,38)}`;
      if(s.pointsPerUnit===2)picture+='<path d="M9 22L15 6L19 19L29 7L26 27" fill="#e4b446" stroke="#987134" stroke-width="2"/>';
      cue=`${s.pointsPerUnit} / resource`;
    }
  } else {
    const drawings={
      bureaucrat:[`<g transform="translate(8 9) rotate(-12 38 35)">${scroll}</g><g transform="translate(26 2)">${scroll}</g><path d="M63 61Q61 25 95 12Q96 35 70 54L62 67" fill="#71978b" stroke="#466f64" stroke-width="2"/>`,'1 / parchment'],
      burgomaster:[`${city(17,10,66)}<circle cx="86" cy="29" r="8" fill="none" stroke="#b88d3c" stroke-width="5"/><path d="M86 38V65H76M86 56H79" stroke="#b88d3c" stroke-width="5"/>`,'1 / city'],
      diplomat:[grid('edge'),'1 / edge'],
      explorer:[`${grid('corners')}<path d="M54 24L62 39L54 57L46 39Z" fill="#fae8b2" stroke="#53786c" stroke-width="2"/>`,'3 / corner'],
      merchant:[`${resource('diamond',10,35,37)}${resource('gold',69,35,38)}<path d="M59 10V66M40 67H78M21 28H96M29 28L17 49H42ZM88 28L76 49H101Z" fill="none" stroke="#a08442" stroke-width="3"/>`,'3 / luxury'],
      master_of_the_mountains:['<path d="M8 69L40 10L65 55L82 26L110 69Z" fill="#91a49c" stroke="#5b786f" stroke-width="2"/><path d="M28 32L40 10L54 35L40 29Z" fill="#fffae1"/><path d="M61 63L85 8M68 15Q87 5 103 23" fill="none" stroke="#95714b" stroke-width="5"/>','2 / mountain'],
      carrotistador:[`<path d="M15 41H43V67H15ZM45 41H73V67H45ZM45 13H73V39H45Z" fill="#a7be86" stroke="#658464" stroke-width="2"/>${flag(68,34)}${text('3+',45,58,19)}`,'4 / large fief'],
      harecingetorix:[`${flag(16,7)}${flag(68,9,'#648b9d')}${flag(39,40,'#c39948')}`,'1 / fief'],
      hun_ny_king:[`<g transform="translate(20 -4)">${crown}</g>${[0,1,2,3,4].map(i=>`<g transform="translate(${12+i*20} 32) scale(.5)">${flag(0,0)}${flag(0,42)}</g>`).join('')}`,'10+ fiefs → 12'],
      bun_shee:[`${city(45,25,48)}<path d="M20 64V33C7 6 24 3 28 28C29 3 45 4 39 30Q61 38 52 70L42 62L32 70Z" fill="#edf1e1" stroke="#83a099" stroke-width="2"/><circle cx="30" cy="42" r="3" fill="#688780"/><circle cx="43" cy="42" r="3" fill="#688780"/>${text('Ø',82,21,19)}`,'2 / barren city'],
      panpan_the_barbarian:[`<rect x="54" y="26" width="43" height="41" rx="4" fill="#bace99" stroke="#76926a" stroke-width="2"/>${text('Ø',76,55,27)}${bunny(9,13,53,'#ab805e')}<path d="M55 62L74 14Q88 5 89 20L63 65Z" fill="#876247" stroke="#694d38" stroke-width="2"/>`,'2 / empty land'],
      colonist:[`<rect x="27" y="5" width="58" height="67" rx="4" fill="#f9e9bd" stroke="#9a854e" stroke-width="2"/>${at(pieceArt({category:'camp'}),29,10,56)}`,'3 / camp card'],
      king_of_thieves:[`${city(61,32,43)}${bunny(9,4,64,'#7f8980')}<path d="M27 36L53 33L57 44L33 48Z" fill="#344e49"/><path d="M35 40L40 39M47 38L51 37" stroke="#fff1bd" stroke-width="3"/>`,'9+ cities → 12'],
      matriarch:[`<path d="M15 40H101V70H15Z" fill="#afc18b"/><path d="M15 55H101M36 40V70M58 40V70M80 40V70" stroke="#fff1ca" stroke-width="2"/>${bunny(34,14,55,'#ae6e86')}<g transform="translate(35 -1) scale(.62)">${crown}</g>`,'Most land → 12'],
      little_prince:[`<g transform="translate(17 -5)">${crown}</g>${flag(12,38)}${flag(49,38)}${flag(85,30)}<path d="M83 35L113 67M113 35L83 67" stroke="#af654e" stroke-width="4"/>`,'Harvest − best'],
      treasure_guardian:[`${shield('3',42,25)}<path d="M36 36L13 16L17 49L36 58M84 36L107 16L103 49L84 58" fill="#8ca6a0" stroke="#577c73" stroke-width="2"/>`,'3 / treasure'],
      treasure_hunter:['<path d="M19 37Q19 15 43 15Q67 15 67 37V67H19Z" fill="#b18b52" stroke="#765d3c" stroke-width="2"/><path d="M19 37H67M28 23V65M57 22V65" stroke="#f2ce74" stroke-width="4"/><rect x="37" y="36" width="12" height="12" rx="2" fill="#edc867"/><circle cx="85" cy="29" r="18" fill="#e9f4d8a8" stroke="#718c7b" stroke-width="4"/><path d="M95 44L108 64" stroke="#718c7b" stroke-width="7"/>','Treasure × 2'],
      liberal:[`<g transform="translate(-5 1) scale(.85)">${scroll}</g><g transform="translate(52 1) scale(.85)">${scroll}</g><path d="M29 63H91M78 50L93 63L78 76" fill="none" stroke="#9471a1" stroke-width="6" stroke-linejoin="round"/>`,'Copy right →'],
      socialist:[`<g transform="translate(-5 1) scale(.85)">${scroll}</g><g transform="translate(52 1) scale(.85)">${scroll}</g><path d="M29 63H91M42 50L27 63L42 76" fill="none" stroke="#628da1" stroke-width="6" stroke-linejoin="round"/>`,'← Copy left'],
      opportunist:[`<path d="M12 38H44V72H12Z" fill="#e6b853" stroke="#9d7d3e" stroke-width="2"/><path d="M44 19H77V72H44ZM77 49H108V72H77Z" fill="#aebca5"/>${text('2',28,62,26)}${text('1',61,44,21)}${text('3',92,67,17)}<path d="M16 29L28 16L40 29" fill="none" stroke="#b58537" stroke-width="4"/>`,'2nd place → 10'],
    };
    [picture,cue]=drawings[id]||[scroll,'Mission'];
  }
  return `<svg class="parchment-art ${card.parchmentType==='treasure'?'treasure-art':'mission-art'}" data-parchment-art="${esc(id)}" viewBox="0 0 120 96" aria-hidden="true" focusable="false"><rect x="2" y="2" width="116" height="92" rx="13" fill="${tone}"/><path d="M12 16V11H21M99 11H108V16M12 78V85H20M100 85H108V78" fill="none" stroke="#b5ad7c" stroke-width="1.5" opacity=".6"/>${picture}${cue?`<rect x="5" y="77" width="110" height="17" rx="6" fill="#fff5d9"/>${text(cue,60,89,10)}`:''}</svg>`;
}
