import {terrainArt,rabbitArt,resourceArt,pieceArt,cardArt} from '../../src/art.js';
import {cardBackArt} from '../../src/kingdom-ui.js';

// This page is an isolated layout study. It never loads or writes a saved game.
// Only the New World geography comes from the verified data; cloud contents are samples.
const response=await fetch('../../data/maps/original-board.json');
if(!response.ok)throw Error('Could not load the New World map.');
const map=await response.json(),root=document.querySelector('#preview');
const players=[['You','#c84164',84],['Sir Rabbiton','#3978a8',79],['Lady Cottontail','#a37514',72],['Duke Thumper','#23834b',68],['Baron Fluffington','#7952a5',76]];
const roman=['I','II','III','IV','V'];
const connected=['land:A1','land:A2','land:A3','land:B1','land:B2','sky:3-1','sky:3-2','sky:4-1'];
const sampleOwners=new Map([
  ...connected.map(id=>[id,1]),...['D4','D5','E4','E5','F4','F5','J2'].map(c=>['land:'+c,0]),
  ...['G7','G8','H7','H8','H9'].map(c=>['land:'+c,2]),...['F2','G2','H2','I2'].map(c=>['land:'+c,3]),
  ...['I9','I10','J9','J10'].map(c=>['land:'+c,4]),['sky:1-2',0],['sky:2-2',0],['sky:4-5',2],['sky:5-5',2],['sky:5-6',3],['sky:5-7',3]
]);
const cells=new Map();
let pinned=null,hovered=null,showLink=false,playerCount=4;
const linkEnds=['land:A3','sky:3-2'];
function tile(cell) {
  cells.set(cell.id,cell);
  const owner=sampleOwners.get(cell.id),visibleOwner=owner<playerCount?owner:undefined;
  const building=cell.building,link=linkEnds.includes(cell.id);
  return `<button class="tile ${cell.terrain} ${cell.lava||''}" data-territory="${cell.id}" style="--owner:${visibleOwner===undefined?'#899ca3':players[visibleOwner][1]}" aria-label="${cell.label}, ${cell.terrain}, ${visibleOwner===undefined?'unclaimed':players[visibleOwner][0]}">${['nimbus','wonder'].includes(cell.terrain)?'':terrainArt(cell.terrain)}${visibleOwner===undefined?'':`<span class="owner-shade"></span><span class="bunny">${rabbitArt()}</span>`}<span class="coordinate">${cell.label.replace('Land · ','').replace('Cloud · ','☁ ')}</span>${cell.resource?`<span class="natural">${resourceArt(cell.resource)}</span>`:''}${building?`<span class="piece">${pieceArt(building)}<span class="strength">${building.strength||building.priority}</span></span>`:''}${link?'<span class="link-token" title="Example Rainbow pair 1">1</span>':''}</button>`;
}
function renderBoards() {
  cells.clear();
  const blocked=new Set(map.blockedConnections.flatMap(e=>[e.from+':'+e.to,e.to+':'+e.from]));
  document.querySelector('#ground').innerHTML=map.cells.map(c=>tile({id:'land:'+c.coordinate,label:'Land · '+c.coordinate,terrain:c.terrain,resource:c.baseResource,
    lava:[blocked.has(c.coordinate+':'+c.row+(c.column+1))?'lava-right':'',blocked.has(c.coordinate+':'+String.fromCharCode(c.row.charCodeAt(0)+1)+c.column)?'lava-bottom':''].join(' '),
    building:c.coordinate==='A2'?{category:'city',strength:2}:c.coordinate==='J2'?{category:'camp',priority:2}:c.startingCityStrength?{category:'city',strength:c.startingCityStrength}:null})).join('');
  // Preserve the staggered silhouette for the comparison, without importing a rules map.
  const examples=[['nimbus','wonder','nimbus','sea','wonder'],['forest','nimbus','city','nimbus','wonder','nimbus'],['wonder','nimbus','sea','nimbus','wonder','forest','nimbus'],['nimbus','wonder','nimbus','city','nimbus','sea'],['field','nimbus','wonder','nimbus','forest','nimbus','wonder']];
  document.querySelector('#cloud').innerHTML=examples.map((row,r)=>`<div class="cloud-row">${row.map((terrain,c)=>tile({id:`sky:${r+1}-${c+1}`,label:`Cloud · ${roman[r]}${c+1}`,terrain,resource:{forest:'wood',sea:'fish',field:'carrots'}[terrain],building:terrain==='city'?{category:'city',strength:2}:null})).join('')}</div>`).join('');
  for(const button of document.querySelectorAll('[data-territory]')) {
    const id=button.dataset.territory;
    button.onmouseenter=button.onfocus=()=>{hovered=id;inspect(id);};
    button.onmouseleave=button.onblur=()=>{hovered=null;inspect(pinned);};
    button.onclick=()=>{pinned=pinned===id?null:id;inspect(pinned);};
  }
  inspect(pinned);
}
function inspect(id) {
  const cell=cells.get(id),linked=connected.includes(id);
  for(const button of document.querySelectorAll('[data-territory]'))button.classList.toggle('highlight',linked?connected.includes(button.dataset.territory):button.dataset.territory===id);
  document.querySelector('#detail').innerHTML=cell?`<span class="detail-badge">${cell.id.startsWith('sky:')?'THE GREAT CLOUD':'THE NEW WORLD'}</span><h3>${cell.label}</h3><p>${cell.terrain[0].toUpperCase()+cell.terrain.slice(1)} territory${cell.building?' · city / token shown':''}</p>${linked?'<p class="detail-owner">Sir Rabbiton’s example fief</p><p>Both boards highlight together. Matching <b>1</b> tokens show the connection.</p>':'<p>Ownership and pieces are sample placements for comparing readability.</p>'}`:'<span class="detail-badge">HOVER OR TAP A TERRITORY</span><h3>Look across worlds</h3><p>Try a blue rabbit or a <b>1</b> token to see a connected fief across both boards.</p><p>Details stay here while the maps remain visible.</p>';
  document.querySelector('#connections').classList.toggle('visible',linked||showLink);
  drawConnection();
}
function drawConnection() {
  const svg=document.querySelector('#connections'),box=svg.getBoundingClientRect();
  const points=linkEnds.map(id=>{const r=document.querySelector(`[data-territory="${id}"]`).getBoundingClientRect();return {x:r.x+r.width*.75-box.x,y:r.y+r.height*.75-box.y};});
  const [a,b]=points,arch=Math.max(8,Math.min(a.y,b.y)-60);
  svg.querySelector('path').setAttribute('d',`M${a.x} ${a.y} C${a.x} ${arch},${b.x} ${arch},${b.x} ${b.y}`);
  svg.querySelectorAll('circle').forEach((circle,i)=>{circle.setAttribute('cx',points[i].x);circle.setAttribute('cy',points[i].y);});
}
function renderPlayers() {
  document.querySelector('.roster').style.setProperty('--players',playerCount);
  document.querySelector('.roster').innerHTML=players.slice(0,playerCount).map(([name,color,score],i)=>`<section class="sample-player" style="--owner:${color}"><div class="player-top">${rabbitArt()}<b>${name}</b><strong>${score}</strong></div><div class="sample-stats">${['wood','fish','carrots'].map((r,n)=>`<span>${resourceArt(r)}${(i+n+3)%7+1}</span>`).join('')}<span>♜ ${4+i} cities</span><span title="Example coin value">◉ ${5+i}</span></div></section>`).join('');
  document.querySelector('#activity').innerHTML=players.slice(0,playerCount).map(([name,color],i)=>`<article class="action" style="--owner:${color}"><b>${name}</b><p>${['Claimed D4 and Cloud I2.','Claimed Cloud III2. Kept a parchment.','Kept a parchment and a farm.','Claimed G2 and Cloud V6.','Claimed J9. Kept a parchment.'][i]}</p></article>`).join('');
  renderBoards();renderHand();
}
function renderHand() {
  const count={3:15,4:12,5:10}[playerCount],land=map.cells.filter(c=>['A2','D4','F6','H2','I3'].includes(c.coordinate)).map(c=>({name:c.coordinate,tag:'LAND TERRITORY',target:'land:'+c.coordinate,art:terrainArt(c.terrain)}));
  const sky=['1-2','2-4','3-2','4-5'].map(id=>({name:'Cloud '+roman[Number(id[0])-1]+id.at(-1),tag:'CLOUD TERRITORY',target:'sky:'+id,art:'☁',className:'cloud-card'}));
  const rest=[{name:'City 3',tag:'BUILDING',art:pieceArt({category:'city',strength:3})},{name:'Pearl Farm',tag:'LUXURY FARM',art:resourceArt('pearl')},{name:'Tax Collector',tag:'ACTION',art:'◉'},
    {name:'Royal Carrot',tag:'TREASURE',art:cardArt({category:'parchment',id:'royal_carrot',parchmentType:'treasure',scoringSpec:{type:'fixed_points',points:6}}),className:'parchment-card'},
    {name:'General Mafayette',tag:'MISSION',art:cardBackArt(),className:'parchment-card'},
    {name:'Left Glove',tag:'TREASURE',art:cardBackArt(),className:'parchment-card'}];
  const skyCount=playerCount===5?2:playerCount===4?3:4;
  const cards=[...land.slice(0,count-skyCount-rest.length),...sky.slice(0,skyCount),...rest];
  document.querySelector('#hand-count').textContent=`${cards.length} cards`;
  document.querySelector('#pick-instruction').textContent=`Choose ${playerCount===3?3:2} cards to play`;
  document.querySelector('#hand').innerHTML=cards.map(c=>`<button class="sample-card ${c.className||''}" ${c.target?`data-preview-target="${c.target}"`:''} aria-label="Preview ${c.name}" title="${c.name}"><span class="card-tag">${c.tag}</span><span class="illustration">${c.art}</span><b>${c.name}</b><small>${c.target?'Locate on board':'Sample card · layout only'}</small></button>`).join('');
  for(const button of document.querySelectorAll('.sample-card')) {
    button.onmouseenter=button.onfocus=()=>{
      const id=button.dataset.previewTarget;
      for(const tile of document.querySelectorAll('[data-territory]'))tile.classList.toggle('card-target',tile.dataset.territory===id);
      if(id)inspect(id);
      else {inspect(null);document.querySelector('#detail').innerHTML=`<span class="detail-badge">${button.querySelector('.card-tag').textContent}</span><h3>${button.querySelector('b').textContent}</h3><p>This space shows the selected card’s details during play. This sample only demonstrates the layout.</p>`;}
    };
    button.onmouseleave=button.onblur=()=>{document.querySelectorAll('.card-target').forEach(b=>b.classList.remove('card-target'));inspect(pinned);};
    button.onclick=()=>{const id=button.dataset.previewTarget;if(id){pinned=id;inspect(id);}};
  }
}
for(const button of document.querySelectorAll('[data-layout]'))if(button.tagName==='BUTTON')button.onclick=()=>{
  root.dataset.layout=button.dataset.layout;
  document.querySelectorAll('button[data-layout]').forEach(b=>b.setAttribute('aria-pressed',b===button));
};
document.querySelector('#player-count').onchange=event=>{playerCount=Number(event.target.value);renderPlayers();};
document.querySelector('#links').onclick=event=>{showLink=!showLink;event.target.setAttribute('aria-pressed',showLink);inspect(hovered||pinned);};
document.querySelector('.reserve-pieces').innerHTML=pieceArt({category:'city',strength:3})+resourceArt('pearl')+pieceArt({category:'sky_tower'});
document.querySelector('.parchment-pile').innerHTML=cardBackArt();
renderPlayers();
new ResizeObserver(()=>{
  const ground=document.querySelector('#ground .tile').getBoundingClientRect(),cloud=document.querySelector('#cloud .tile').getBoundingClientRect();
  document.querySelector('#measurements').textContent=`Territory size: land ${Math.round(ground.width)}px · cloud ${Math.round(cloud.width)}px. Both boards use comparable scales.`;
  drawConnection();
}).observe(document.querySelector('.boards'));
