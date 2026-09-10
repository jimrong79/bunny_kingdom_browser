import { rabbitArt, terrainArt, pieceArt, resourceArt } from './art.js';

function atlasArt() {
  const terrain = [
    'forest','forest','plains','sea','sea','field',
    'forest','plains','city','sea','field','field',
    'mountain','plains','plains','sea','plains','forest',
    'mountain','field','city','plains','forest','forest',
    'mountain','field','plains','sea','sea','forest',
    'field','field','plains','sea','plains','forest',
  ];
  const rabbits = { 7:'#ce6270', 14:'#d5aa4f', 22:'#76a9bb' };
  return `<div class="atlas-art" aria-hidden="true">
    <div class="atlas-orbit orbit-one"></div><div class="atlas-orbit orbit-two"></div>
    <span class="atlas-compass">N<span>✦</span></span>
    <div class="atlas-map">${terrain.map((t,i)=>`<span class="atlas-tile ${t}">${terrainArt(t)}${t==='city'?`<span class="atlas-city">${pieceArt({category:'city',strength:i===8?3:2})}</span>`:''}${rabbits[i]?`<span class="atlas-rabbit" style="color:${rabbits[i]}">${rabbitArt()}</span>`:''}</span>`).join('')}</div>
    <div class="atlas-seal">${rabbitArt()}<span>A small beginning.<br>A kingdom of possibilities.</span></div>
    <div class="atlas-resource resource-one">${resourceArt('carrots')}</div>
    <div class="atlas-resource resource-two">${resourceArt('fish')}</div>
  </div>`;
}

// Arrange the existing setup nodes without replacing their values or handlers.
// Starting or resuming a game removes this layout along with the setup screen.
export function renderLanding() {
  const setup = document.querySelector('.setup');
  const introNodes = [...setup.children].filter(node => node.matches('.eyebrow,h1,.lede'));
  const form = setup.querySelector('#setup');
  const resume = setup.querySelector('.resume');
  const sound = setup.querySelector('[data-sound-toggle]');
  const scope = setup.querySelector('#setup-scope');
  const support = setup.querySelector('.support-note');
  setup.classList.add('royal-atlas');
  for (const option of form.querySelectorAll('[name=bots] option')) {
    const bots = Number(option.value);
    option.textContent = `${bots} bot${bots === 1 ? '' : 's'} · ${bots + 1} players`;
  }
  for (const option of form.querySelectorAll('[name=difficulty] option')) {
    option.textContent = {normal:'Normal',hard:'Hard (test)',easy:'Easy'}[option.value] || option.textContent;
  }
  const intro = document.createElement('div');
  intro.className = 'landing-intro';
  intro.append(...introNodes);
  const art = document.createElement('div');
  art.className = 'landing-art';
  art.innerHTML = atlasArt();
  intro.append(art);
  const play = document.createElement('section');
  play.className = 'landing-play';
  play.setAttribute('aria-labelledby', 'landing-play-title');
  play.innerHTML = `<div class="landing-play-heading"><span class="landing-play-rabbit">${rabbitArt()}</span><div><p class="landing-kicker">YOUR SEAT AT THE TABLE</p><h2 id="landing-play-title">Gather your court.</h2></div></div>`;
  if (resume) play.append(resume);
  play.append(form);
  const utilities = document.createElement('div');
  utilities.className = 'landing-utilities';
  utilities.append(sound);
  const local = document.createElement('span');
  local.textContent = 'Play in your browser · Autosave';
  utilities.append(local);
  play.append(utilities, scope);
  const footer = document.createElement('div');
  footer.className = 'landing-footer';
  footer.innerHTML = '<div class="landing-facts"><span><b>01</b> Draft your cards</span><span><b>02</b> Build your kingdom</span><span><b>03</b> Harvest your fortune</span></div>';
  footer.append(support);
  setup.replaceChildren(intro, play, footer);
}
