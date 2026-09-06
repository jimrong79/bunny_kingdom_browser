// Original, synthesized effects: no downloads, looping music, or game-state dependencies.
const preferenceKey='bunny-kingdom-sound-v1';
const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
let enabled=true;
try {enabled=localStorage.getItem(preferenceKey)!=='off';} catch {/* Storage is optional. */}
let context,master,paper,generation=0;
const voices=new Set();
const hidden=()=>globalThis.document?.hidden;

function stop() {
  generation++;
  for(const voice of voices) {
    try {
      voice.gain.gain.cancelScheduledValues(context.currentTime);
      voice.gain.gain.setTargetAtTime(0,context.currentTime,.004);
      voice.source.stop(context.currentTime+.02);
    } catch {/* A voice may already have ended. */}
  }
}

async function unlock() {
  if(!enabled||!AudioContext||hidden())return;
  try {
    if(!context) {
      context=new AudioContext();master=context.createGain();
      master.gain.value=.2;master.connect(context.destination);
      paper=context.createBuffer(1,Math.ceil(context.sampleRate*.4),context.sampleRate);
      const samples=paper.getChannelData(0);
      for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    }
    if(context.state==='suspended'||context.state==='interrupted')await context.resume();
  } catch {/* Audio must never prevent a move, including when the browser blocks it. */}
}

function voice(source,at,duration,level,filter) {
  const gain=context.createGain(),start=context.currentTime+at;
  gain.gain.setValueAtTime(0,start);
  gain.gain.linearRampToValueAtTime(level,start+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  if(filter){source.connect(filter);filter.connect(gain);}else source.connect(gain);
  gain.connect(master);
  const item={source,gain};voices.add(item);
  source.onended=()=>{voices.delete(item);source.disconnect();gain.disconnect();filter?.disconnect();};
  source.start(start);source.stop(start+duration+.01);
}

function note(frequency,at=0,duration=.16,level=.2,type='sine',end=frequency) {
  const source=context.createOscillator();source.type=type;
  source.frequency.setValueAtTime(frequency,context.currentTime+at);
  source.frequency.exponentialRampToValueAtTime(end,context.currentTime+at+duration);
  voice(source,at,duration,level);
}

function rustle(at=0,duration=.12,level=.16,frequency=1800) {
  const source=context.createBufferSource(),filter=context.createBiquadFilter();
  source.buffer=paper;filter.type='lowpass';filter.frequency.value=frequency;
  voice(source,at,duration,level,filter);
}

const cues={
  select:()=>{rustle(0,.04,.1,2500);note(660,0,.07,.15,'triangle',820);},
  deselect:()=>note(530,0,.07,.13,'triangle',400),
  confirm:()=>{rustle(0,.12,.22,1700);note(330,0,.12,.16);note(440,.055,.14,.16);},
  claim:()=>{note(500,0,.1,.28,'sine',270);note(740,.065,.12,.12,'sine',480);},
  reserve:()=>{rustle(0,.08,.18,1600);note(280,0,.1,.23,'triangle',125);},
  place:()=>{note(280,0,.13,.3,'triangle',95);note(480,.065,.08,.12,'sine',220);rustle(0,.05,.15,700);},
  parchment:()=>{rustle(0,.16,.2,2200);note(880,.05,.22,.1);},
  provisions:()=>{rustle(0,.08,.2);rustle(.09,.1,.2);note(523,.04,.18,.13);note(659,.13,.18,.13);},
  discard:()=>rustle(0,.09,.18,1200),
  harvest:()=>[523,659,784,1047].forEach((f,i)=>note(f,i*.095,.32,.18)),
  reveal:()=>[392,523,659].forEach((f,i)=>note(f,i*.085,.35,.15)),
  round:()=>[392,523,659].forEach((f,i)=>note(f,i*.07,.22,.14,'triangle')),
  finish:()=>[523,659,784,1047,784,1047].forEach((f,i)=>note(f,i*.12,.4,.16)),
  error:()=>note(180,0,.14,.15,'sine',120),
};

async function play(cue) {
  const pending=generation;
  if(!enabled||hidden()||!cues[cue])return;
  await unlock();
  if(!enabled||hidden()||pending!==generation||context?.state!=='running')return;
  try {if(voices.size<32)cues[cue]();} catch {stop();}
}

export const soundEffects={
  get enabled(){return enabled;},
  get supported(){return Boolean(AudioContext);},
  unlock,play,stop,
  setEnabled(value) {
    enabled=Boolean(value);
    if(!enabled)stop();
    try {localStorage.setItem(preferenceKey,enabled?'on':'off');} catch {/* Keep the session preference. */}
  },
};

export function soundToggleHTML() {
  return `<button type="button" class="quiet" data-sound-toggle aria-pressed="${enabled&&soundEffects.supported}" ${soundEffects.supported?'':'disabled'}>${soundLabel()}</button>`;
}
function soundLabel(){return soundEffects.supported?`Sound: ${enabled?'on':'off'}`:'Sound unavailable';}
export function bindSoundToggles() {
  document.querySelectorAll('[data-sound-toggle]').forEach(button=>button.onclick=()=>{
    soundEffects.setEnabled(!enabled);
    document.querySelectorAll('[data-sound-toggle]').forEach(b=>{b.textContent=soundLabel();b.setAttribute('aria-pressed',String(enabled));});
    if(enabled)play('select');
  });
}

globalThis.document?.addEventListener('visibilitychange',()=>{
  if(hidden()) {
    stop();
    if(context?.state==='running')context.suspend().catch(()=>{});
  }
});
