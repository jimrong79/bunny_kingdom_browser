// Public counting endpoint, supplied by the site's GoatCounter account.
// Leave empty to disable analytics. No account credentials belong here.
const GOATCOUNTER_ENDPOINT = '';
const liveSite = location.origin === 'https://jimrong79.github.io'
  && location.pathname.startsWith('/bunny_kingdom_browser/');

if (GOATCOUNTER_ENDPOINT && liveSite) {
  document.querySelector('#analytics-notice').hidden = false;
  window.goatcounter = {
    // Group visits regardless of query strings, board anchors, or index.html.
    path: '/bunny_kingdom_browser/',
    title: 'Bunny Kingdom Browser',
    // Keep referring site statistics without sending its full URL.
    referrer: document.referrer ? new URL(document.referrer).origin : '',
    no_events: true,
  };
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = GOATCOUNTER_ENDPOINT;
  script.referrerPolicy = 'strict-origin';
  document.head.append(script);
}
