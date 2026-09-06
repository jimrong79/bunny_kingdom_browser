"""Exercise native Web Audio output, mute, playback, persistence, and silent fallback."""
from playwright.sync_api import sync_playwright
from browser_smoke import snapshot
from browser_controls import scenario
from browser_animations import choose_two


PROBE = """()=>{
  window.audioProbe={contexts:[],starts:0,active:0,peak:0};
  const Native=window.AudioContext;
  window.AudioContext=class extends Native {
    constructor(...args) {
      super(...args);audioProbe.contexts.push(this);
      const meter=this.createAnalyser(),samples=new Float32Array(256);
      meter.fftSize=256;
      const sample=()=>{meter.getFloatTimeDomainData(samples);for(const s of samples)audioProbe.peak=Math.max(audioProbe.peak,Math.abs(s));requestAnimationFrame(sample);};
      requestAnimationFrame(sample);
      const gain=this.createGain.bind(this);
      this.createGain=()=>{
        const node=gain(),connect=node.connect.bind(node);
        node.connect=(target,...rest)=>{if(target===this.destination)connect(meter);return connect(target,...rest);};
        return node;
      };
      for(const name of ['createOscillator','createBufferSource']) {
        const create=this[name].bind(this);
        this[name]=()=>{
          const node=create(),start=node.start.bind(node);
          node.start=(...args)=>{audioProbe.starts++;audioProbe.active++;return start(...args);};
          node.addEventListener('ended',()=>audioProbe.active--);
          return node;
        };
      }
    }
  };
} """


def audio_controls(page):
    page.add_init_script(f'({PROBE})()')
    page.goto('http://127.0.0.1:8000')
    page.locator('[data-sound-toggle]').wait_for()
    assert page.evaluate('audioProbe.contexts.length') == 0
    page.locator('[data-sound-toggle]').click()
    page.locator('[name=bots]').select_option('3')
    page.locator('[name=difficulty]').select_option('easy')
    page.locator('[name=seed]').fill('1788624816571')
    page.locator('#setup button').click()
    page.locator('[data-card=territory_A7]').click()
    page.locator('[data-card=provisions_1]').click()
    assert page.evaluate('audioProbe.starts') == 0
    page.reload()
    assert page.locator('[data-sound-toggle]').get_attribute('aria-pressed') == 'false'
    page.locator('#resume-game').click()
    assert page.evaluate('audioProbe.starts') == 0
    page.locator('[data-sound-toggle]').click()
    # An actual signal reaches the output, beyond merely requesting playback.
    page.wait_for_function('audioProbe.peak > .001')
    page.locator('#confirm-draft').click()
    settled = snapshot(page)
    page.locator('#turn-animation').wait_for()
    assert page.locator('#app').evaluate('(el)=>el.inert')
    page.locator('#turn-animation [data-sound-toggle]').click()
    starts = page.evaluate('audioProbe.starts')
    page.wait_for_function('audioProbe.active === 0')
    page.locator('#turn-animation[data-player="1"]').wait_for()
    assert page.evaluate('audioProbe.starts') == starts
    assert snapshot(page) == settled
    page.locator('#turn-animation [data-sound-toggle]').click()
    page.wait_for_function(f'audioProbe.starts > {starts}')
    page.keyboard.press('Escape')
    page.locator('#turn-animation').wait_for(state='detached')
    page.wait_for_function('audioProbe.active === 0')
    assert snapshot(page) == settled
    assert page.locator('[data-sound-toggle]').get_attribute('aria-pressed') == 'true'

    page.emulate_media(reduced_motion='reduce')
    starts = page.evaluate('audioProbe.starts')
    choose_two(page)
    page.wait_for_function(f'audioProbe.starts > {starts}')
    assert page.locator('#turn-animation').count() == 0
    assert snapshot(page)['draftTurn'] == 3
    scenario(page, 'markets', [], {})
    starts = page.evaluate('audioProbe.starts')
    page.locator('#confirm-markets').click()
    page.wait_for_function(f'audioProbe.starts > {starts}')
    assert snapshot(page)['phase'] == 'harvest'
    scenario(page, 'parchments', [], {})
    page.locator('#finish-scoring').click()
    page.wait_for_function('audioProbe.active > 0')
    assert snapshot(page)['phase'] == 'finished'
    page.evaluate("""()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}""")
    page.wait_for_function('audioProbe.contexts.every(c=>c.state === "suspended")')
    starts = page.evaluate('audioProbe.starts')
    page.evaluate("async()=>{const {soundEffects}=await import('./src/sound.js');await soundEffects.play('harvest');}")
    assert page.evaluate('audioProbe.starts') == starts
    page.evaluate("delete document.hidden; document.dispatchEvent(new Event('visibilitychange'))")
    page.locator('[data-sound-toggle]').click()
    page.locator('#new-game').click()
    assert page.locator('[data-sound-toggle]').get_attribute('aria-pressed') == 'false'
    assert page.evaluate('audioProbe.peak') < .2
    print('Native output, silent load/resume, saved mute, mute during playback, skip, reduced motion, scoring, and hidden-tab silence passed.', flush=True)


def unavailable_audio(page):
    page.add_init_script('window.AudioContext=undefined;window.webkitAudioContext=undefined;')
    page.goto('http://127.0.0.1:8000')
    assert page.locator('[data-sound-toggle]').is_disabled()
    page.locator('#setup button').click()
    choose_two(page)
    assert snapshot(page)['draftTurn'] == 2
    print('Play remains available without Web Audio support.', flush=True)


if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch()
        errors = []
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.on('pageerror', lambda error: errors.append(str(error)))
        audio_controls(page)
        fallback = browser.new_page(reduced_motion='reduce')
        fallback.on('pageerror', lambda error: errors.append(str(error)))
        unavailable_audio(fallback)
        assert not errors, errors
        browser.close()
