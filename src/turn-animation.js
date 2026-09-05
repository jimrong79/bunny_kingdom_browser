import { rabbitArt, cardArt, pieceArt } from './art.js';
import { cardBackArt, productionCounts } from './kingdom-ui.js';
import { fiefs } from './fiefs.js';
const turnKey=state=>state.lastTurn?`${state.lastTurn.round}:${state.lastTurn.pick}`:null;

// The timeline contains public events only. It never needs a rival's hand or parchment identities.
export function animationEvents(before,after,catalog) {
  const events=[];
  if(turnKey(before)!==turnKey(after)&&after.lastTurn)for(const {playerId,actions} of after.lastTurn.players)for(const action of actions) {
    if(action.type==='territory')events.push({type:'claim',playerId,coordinate:action.coordinate,campOwner:action.campOwner});
    if(action.type==='building')events.push({type:'reserve',playerId,card:catalog.find(c=>c.name===action.name)});
    if(['parchment','provisions','discard'].includes(action.type))events.push({type:action.type,playerId});
  }
  const placed=new Set();
  const cells=Object.values(after.cells).sort((a,b)=>(a.building?.category==='camp'?a.building.priority:10+a.owner)-(b.building?.category==='camp'?b.building.priority:10+b.owner));
  for(const cell of cells) {
    if(!cell.building?.instanceId||before.cells[cell.coordinate]?.building?.instanceId===cell.building.instanceId)continue;
    events.push({type:'place',playerId:cell.owner,coordinate:cell.coordinate,building:{...cell.building},
      name:catalog.find(c=>c.id===cell.building.cardId)?.name||'Building',removeFromTray:!placed.has(cell.building.instanceId)});
    placed.add(cell.building.instanceId);
  }
  return events;
}

export function capturePresentation(state) {
  return {cells:structuredClone(state.cells),lastTurn:state.lastTurn,
    players:state.players.map(p=>({id:p.id,buildings:p.buildings.length,parchments:p.parchments.length})),
    markup:new Map([...document.querySelectorAll('[data-cell]')].map(el=>[el.dataset.cell,el.innerHTML]))};
}

function visibleCenter(element) {
  if(!element)return null;
  const r=element.getBoundingClientRect();
  if(!r.width||!r.height)return null;
  let left=Math.max(0,r.left),top=Math.max(0,r.top),right=Math.min(innerWidth,r.right),bottom=Math.min(innerHeight,r.bottom);
  for(let p=element.parentElement;p;p=p.parentElement)if(/auto|scroll|hidden/.test(getComputedStyle(p).overflow)) {
    const b=p.getBoundingClientRect();left=Math.max(left,b.left);top=Math.max(top,b.top);right=Math.min(right,b.right);bottom=Math.min(bottom,b.bottom);
  }
  return right-left>8&&bottom-top>8?{x:(left+right)/2,y:(top+bottom)/2}:null;
}

export async function playAnimation(before,state,events) {
  const app=document.querySelector('#app'),sidebar=document.querySelector('.table-sidebar');
  const sideScroll=sidebar.scrollTop;
  const active=new Set(),sprites=new Set();let skipped=false;
  const overlay=document.createElement('section');overlay.id='turn-animation';overlay.className='turn-animation';
  overlay.setAttribute('aria-label','Turn playback');
  overlay.innerHTML='<span class="animation-origin"></span><div class="animation-caption"><small class="animation-progress"></small><b role="status" aria-live="polite"></b></div><span class="animation-destination"></span><button id="skip-animation" class="quiet">Skip <small>Esc</small></button>';
  document.body.append(overlay);app.inert=true;
  if(innerWidth>900)sidebar.scrollTop=0;
  const skip=()=>{skipped=true;for(const a of active)a.cancel();};
  const escape=e=>{if(e.key==='Escape'){e.preventDefault();skip();}};
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('keydown',escape);reduce.addEventListener('change',skip);
  overlay.querySelector('button').onclick=skip;overlay.querySelector('button').focus({preventScroll:true});
  try {
    const origin=overlay.querySelector('.animation-origin'),destination=overlay.querySelector('.animation-destination');
    const virtual={cells:structuredClone(before.cells),blockedConnections:state.blockedConnections};
    const counts=structuredClone(before.players);
    const pendingPlaces=new Set(events.filter(e=>e.type==='place').map(e=>e.coordinate));
    const finalMarkup=new Map();
    const cellElement=id=>document.querySelector(`[data-cell="${id}"]`);
    for(const coordinate of new Set(events.map(e=>e.coordinate).filter(Boolean))) {
      const el=cellElement(coordinate);finalMarkup.set(coordinate,el.innerHTML);
      el.innerHTML=before.markup.get(coordinate);el.classList.toggle('owned',before.cells[coordinate].owner!==null);
      el.style.setProperty('--owner',state.players[before.cells[coordinate].owner]?.color||'transparent');
      el.dataset.owner=before.cells[coordinate].owner??'';
    }
    document.querySelectorAll('.fief-highlight,.has-fief-focus').forEach(el=>el.classList.remove('fief-highlight','has-fief-focus'));
    document.querySelector('#fief-readout').textContent='Watch each player’s move. You can skip at any time.';
    const paintCounts=()=>{
      for(const player of state.players) {
        const panel=document.querySelector(`[data-player="${player.id}"]`);
        const production=productionCounts(virtual,player.id);
        for(const el of panel.querySelectorAll('[data-production] b'))el.textContent=production.counts[el.parentElement.dataset.production];
        panel.querySelector('[data-player-stats]').textContent=`${production.territories} territories · ${fiefs(virtual,player.id).length} fiefs`;
        for(const pile of ['buildings','parchments'])panel.querySelector(`[data-pile="${pile}"] [data-pile-count]`).textContent=counts[player.id][pile];
      }
    };
    const animate=async(el,keyframes,options)=>{
      if(skipped)return;
      const animation=el.animate(keyframes,options);active.add(animation);
      try{await animation.finished;}catch{/* Cancellation settles the already-saved move. */}
      finally{active.delete(animation);animation.cancel();}
    };
    const fly=async(art,from,to,color,type)=>{
      const sprite=document.createElement('div');sprite.className=`turn-sprite ${type}`;sprite.dataset.animationKind=type;
      sprite.style.color=color;sprite.style.setProperty('--owner',color);sprite.innerHTML=art;
      sprite.style.left=from.x+'px';sprite.style.top=from.y+'px';document.body.append(sprite);sprites.add(sprite);
      const dx=to.x-from.x,dy=to.y-from.y;
      await animate(sprite,[{transform:'translate(-50%,-50%) scale(.6)',opacity:0},
        {transform:`translate(calc(-50% + ${dx*.45}px),calc(-50% + ${dy*.45-65}px)) scale(1.15) rotate(-9deg)`,opacity:1,offset:.45},
        {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.58)`,opacity:1}],
        {duration:events.length>14?360:510,easing:'cubic-bezier(.25,.6,.45,1)',fill:'forwards'});
      sprite.remove();sprites.delete(sprite);
    };
    paintCounts();
    for(const [index,event] of events.entries()) {
      if(skipped)break;
      const player=state.players[event.playerId],pile=event.type==='parchment'?'parchments':'buildings';
      overlay.dataset.event=event.type;overlay.dataset.player=player.id;overlay.style.setProperty('--player',player.color);
      origin.style.color=player.color;origin.innerHTML=rabbitArt();
      const label=({claim:`claims ${event.coordinate}${event.campOwner!==null&&event.campOwner!==undefined?' · replaces a Camp':''}`,reserve:`adds ${event.card?.name||'a building'} to the tray`,parchment:'keeps a face-down parchment',provisions:'opens Provisions · 2 extra cards',discard:'discards a face-down card',place:`places ${event.name} at ${event.coordinate}`})[event.type];
      overlay.querySelector('[role=status]').textContent=player.name+' '+label;
      overlay.querySelector('.animation-progress').textContent=`${event.type==='place'?`Construction · Round ${state.round}`:`Round ${state.lastTurn.round} · Pick ${state.lastTurn.pick}`} · ${index+1} / ${events.length}`;
      let art=event.type==='claim'?rabbitArt():event.type==='reserve'&&event.card?cardArt(event.card):event.type==='place'?pieceArt(event.building):event.type==='provisions'?cardArt({category:'provisions'}):cardBackArt();
      if(event.type==='place'&&event.building.category==='camp')art+=`<span class="flying-camp-rabbit">${rabbitArt()}</span>`;
      destination.innerHTML=event.coordinate?`<b>${event.coordinate}</b>`:event.type==='parchment'?cardBackArt():event.type==='reserve'?pieceArt({category:'city',strength:2}):art;
      const cell=event.coordinate?cellElement(event.coordinate):null;
      if(cell&&!visibleCenter(cell))cell.scrollIntoView({block:'center',inline:'center',behavior:'instant'});
      let to=cell||document.querySelector(`[data-pile="${pile}"][data-pile-player="${player.id}"]`);
      if(['provisions','discard'].includes(event.type))to=destination;
      const from=event.type==='place'?document.querySelector(`[data-pile="buildings"][data-pile-player="${player.id}"]`):document.querySelector(`[data-player-origin="${player.id}"]`);
      await fly(art,visibleCenter(from)||visibleCenter(origin),visibleCenter(to)||visibleCenter(destination),player.color,event.type);
      if(skipped)break;
      if(event.type==='reserve')counts[player.id].buildings++;
      if(event.type==='parchment')counts[player.id].parchments++;
      if(event.type==='claim'||event.type==='place') {
        const c=virtual.cells[event.coordinate];c.owner=player.id;
        if(event.type==='claim'&&c.building?.category==='camp')c.building=null;
        if(event.type==='place') {
          c.building=state.cells[event.coordinate].building;pendingPlaces.delete(event.coordinate);
          if(event.removeFromTray)counts[player.id].buildings--;
        }
        cell.innerHTML=finalMarkup.get(event.coordinate);
        if(pendingPlaces.has(event.coordinate))cell.querySelector('.piece')?.remove();
        cell.classList.add('owned');cell.style.setProperty('--owner',player.color);cell.dataset.owner=player.id;
      }
      paintCounts();
      await animate(to,[{boxShadow:`0 0 0 0 ${player.color}aa`},{boxShadow:`0 0 0 9px ${player.color}00`}],{duration:170,easing:'ease-out'});
    }
  } finally {
    for(const a of active)a.cancel();for(const el of sprites)el.remove();
    document.removeEventListener('keydown',escape);reduce.removeEventListener('change',skip);
    overlay.remove();app.inert=false;sidebar.scrollTop=sideScroll;
    // The caller re-renders settled engine state, including when playback was skipped or interrupted.
  }
}
