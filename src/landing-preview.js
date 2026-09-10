import { rabbitArt, terrainArt, pieceArt, resourceArt } from './art.js';

const directions = [
  { id: 'classic', name: 'Current', note: 'The original parchment palette and familiar, compact setup.' },
  { id: 'atlas', name: 'Royal atlas', note: 'The same game pieces, with a richer palette and room for the kingdom.' },
  { id: 'storybook', name: 'Storybook', note: 'An original watercolor world, with the familiar parchment and forest-green controls.' },
];

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

// Reuse the actual form nodes so changing art preserves values and game handlers.
// The preview is attached only to setup; starting/resuming clears it with setup.
export function landingPreview() {
  const setup = document.querySelector('.setup');
  const original = [...setup.children];
  const introNodes = original.filter(node => node.matches('.eyebrow,h1,.lede'));
  const form = setup.querySelector('#setup');
  const optionLabels = [...form.querySelectorAll('option')].map(option => [option, option.textContent]);
  const resume = setup.querySelector('.resume');
  const sound = setup.querySelector('[data-sound-toggle]');
  const scope = setup.querySelector('#setup-scope');
  const support = setup.querySelector('.support-note');
  const toolbar = document.createElement('nav');
  toolbar.className = 'landing-studio';
  toolbar.setAttribute('aria-label', 'Landing page design previews');
  toolbar.innerHTML = `<div class="studio-label"><span class="studio-dot"></span><strong>Landing studio</strong><span>Art exploration</span></div>
    <div class="studio-directions" aria-label="Choose a design">${directions.map(d=>`<button type="button" data-direction="${d.id}" aria-pressed="false">${d.name}</button>`).join('')}</div>
    <p class="studio-note" aria-live="polite"></p>`;
  setup.before(toolbar);

  function show(id, updateURL = true) {
    const direction = directions.find(d => d.id === id) || directions[1];
    setup.replaceChildren(...original);
    for (const [option, label] of optionLabels) option.textContent = label;
    setup.dataset.landing = direction.id;
    setup.classList.toggle('landing-composed', direction.id !== 'classic');
    if (direction.id !== 'classic') {
      for (const option of form.querySelectorAll('[name=bots] option')) {
        const bots = Number(option.value);
        option.textContent = `${bots} bot${bots === 1 ? '' : 's'} · ${bots + 1} players`;
      }
      for (const option of form.querySelectorAll('[name=difficulty] option')) {
        option.textContent = option.value === 'normal' ? 'Normal' : 'Easy';
      }
      const intro = document.createElement('div');
      intro.className = 'landing-intro';
      intro.append(...introNodes);
      const art = document.createElement('div');
      art.className = 'landing-art';
      art.innerHTML = direction.id === 'storybook'
        ? '<img class="storybook-image" src="assets/landing/storybook-kingdom.webp" width="1536" height="1024" alt="A rabbit in a green cloak overlooks a painted kingdom, with a castle in the clouds." decoding="async" fetchpriority="high">'
        : atlasArt();
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
    for (const button of toolbar.querySelectorAll('[data-direction]')) {
      button.setAttribute('aria-pressed', String(button.dataset.direction === direction.id));
    }
    toolbar.querySelector('.studio-note').textContent = direction.note;
    if (updateURL) {
      const url = new URL(location.href);
      url.searchParams.set('landing', direction.id);
      history.replaceState(null, '', url);
    }
  }
  toolbar.addEventListener('click', event => {
    const button = event.target.closest('[data-direction]');
    if (button) show(button.dataset.direction);
  });
  show(new URL(location.href).searchParams.get('landing'), false);
}
