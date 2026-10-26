// CarbonLog – sound effects, synthesized with the Web Audio API (no audio files).
// - Soft wooden "pluck" on buttons, a two-note chime on page links, a tick on tabs and toggles.
// - CLSound.success() / .error() / .step() for pages that want them (forms, footsteps while walking).
// - Pages with <body data-ambience> get a quiet meadow ambience (wind + birds) after the first click.
// - CLSound.bigBang() for the logo reveal and CLSound.burn(level) for a soft fire bed under the hot globe.
// - A speaker button with [data-sound-toggle] turns everything on or off; the choice is remembered in this browser.
(() => {
  'use strict';
  const KEY = 'carbonlog-sound';
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* storage blocked: default on */ }

  let ac = null, master = null, noiseBuf = null, amb = null, lastStep = 0;
  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ac = new AC(); } catch (e) { return null; }
      master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  const ready = () => enabled && ctx();

  function tone(freq, t0, dur, type, gain, glideTo, dest) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + .006);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(dest || master);
    o.start(t0); o.stop(t0 + dur + .03);
  }
  function noise(t0, dur, freq, q, gain, dest) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.playbackRate.value = .8 + Math.random() * .4;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(f).connect(g).connect(dest || master);
    s.start(t0, Math.random()); s.stop(t0 + dur + .05);
  }

  const PENTA = [523.25, 587.33, 659.25, 783.99, 880];   // C major pentatonic: any two clicks sound good together
  const S = {
    click() { if (!ready()) return; const t = ac.currentTime, f = PENTA[Math.random() * PENTA.length | 0];
      tone(f, t, .22, 'sine', .14); tone(f * 2.01, t, .09, 'triangle', .04); noise(t, .03, 2400, 1.2, .03); },
    nav() { if (!ready()) return; const t = ac.currentTime;
      tone(659.25, t, .25, 'sine', .11); tone(987.77, t + .07, .35, 'sine', .1); tone(1975.5, t + .07, .12, 'triangle', .02); },
    tick() { if (!ready()) return; const t = ac.currentTime; tone(1568, t, .06, 'triangle', .06); },
    success() { if (!ready()) return; const t = ac.currentTime; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * .07, .3, 'sine', .1)); },
    error() { if (!ready()) return; const t = ac.currentTime; tone(220, t, .22, 'sine', .14, 160); },
    step() {                                              // soft footstep on grass
      if (!enabled || !ac || ac.state !== 'running') return;
      const now = performance.now(); if (now - lastStep < 140) return; lastStep = now;
      const t = ac.currentTime; noise(t, .09, 380 + Math.random() * 160, .9, .05); noise(t + .02, .05, 1800, 2, .012);
    },
    bigBang() {                                           // the logo bursts out of the black hole
      if (!enabled || !ac || ac.state !== 'running') return;
      const t = ac.currentTime;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(master);
      const bus = ac.createGain(); bus.gain.value = 1; bus.connect(comp);
      // a short suck-in, then the blast
      const pre = ac.createBufferSource(), pf = ac.createBiquadFilter(), pg = ac.createGain();
      pre.buffer = noiseBuf; pf.type = 'bandpass'; pf.Q.value = 1.4;
      pf.frequency.setValueAtTime(300, t); pf.frequency.exponentialRampToValueAtTime(3200, t + .22);
      pg.gain.setValueAtTime(.0001, t); pg.gain.exponentialRampToValueAtTime(.14, t + .2); pg.gain.exponentialRampToValueAtTime(.0001, t + .26);
      pre.connect(pf).connect(pg).connect(bus); pre.start(t); pre.stop(t + .3);
      const b = t + .22;
      tone(95, b, 2.6, 'sine', .7, 26, bus);                // sub-bass boom
      tone(48, b, 3.2, 'sine', .45, 22, bus);
      const s = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; s.loop = true; lp.type = 'lowpass'; lp.Q.value = .7;
      lp.frequency.setValueAtTime(7000, b); lp.frequency.exponentialRampToValueAtTime(140, b + 3);
      g.gain.setValueAtTime(.0001, b); g.gain.exponentialRampToValueAtTime(.55, b + .012); g.gain.exponentialRampToValueAtTime(.0001, b + 3.4);
      s.connect(lp).connect(g).connect(bus); s.start(b); s.stop(b + 3.5);
      noise(b, .14, 5200, .6, .3, bus);                      // the crack of the flash
      [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => { // a shimmer as the name appears
        tone(f, b + .35 + i * .09, 2.4, 'sine', .028, null, bus); tone(f * 1.006, b + .35 + i * .09, 2.4, 'sine', .018, null, bus);
      });
    },
    burn(level) {                                         // a soft fire bed while the hot globe is on screen (0..1)
      if (!enabled || !ac || ac.state !== 'running') { if (fire) fire.g.gain.setTargetAtTime(0, ac ? ac.currentTime : 0, .2); return; }
      if (!fire && level > .01) {
        const g = ac.createGain(); g.gain.value = 0; g.connect(master);
        const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = .6;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
        const roar = ac.createGain(); roar.gain.value = .07;
        const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .37; lg.gain.value = .025; lfo.connect(lg).connect(roar.gain);
        src.connect(bp).connect(lp).connect(roar).connect(g); src.start(); lfo.start();
        fire = { g, level: 0 };
        fire.timer = setInterval(() => {                    // crackles: tiny bright pops, more of them the hotter it gets
          if (!fire || fire.level < .02 || ac.state !== 'running') return;
          const n = Math.random() < fire.level * .9 ? 1 + (Math.random() * 3 | 0) : 0;
          for (let i = 0; i < n; i++) noise(ac.currentTime + Math.random() * .08, .012 + Math.random() * .03, 2200 + Math.random() * 3800, 3, .03 + Math.random() * .05 * fire.level, fire.g);
        }, 70);
      }
      if (!fire) return;
      level = Math.max(0, Math.min(1, level));
      if (Math.abs(level - fire.level) > .01) { fire.level = level; fire.g.gain.setTargetAtTime(level * .9, ac.currentTime, .25); }
    },
    get enabled() { return enabled; },
  };
  let fire = null;
  // stop all sound while the tab is hidden
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (enabled) ac.resume(); });

  // ---------- meadow ambience: wind plus the odd bird ----------
  function startAmbience() {
    if (amb || !document.body.hasAttribute('data-ambience') || !ready()) return;
    const out = ac.createGain(); out.gain.value = .0001; out.connect(master);
    out.gain.exponentialRampToValueAtTime(.9, ac.currentTime + 2.5);
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const wind = ac.createGain(); wind.gain.value = .035;
    const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = .09; lfoG.gain.value = .022;
    lfo.connect(lfoG).connect(wind.gain);
    src.connect(lp).connect(wind).connect(out); src.start(); lfo.start();
    const birds = setInterval(() => {
      if (!ac || ac.state !== 'running' || Math.random() < .35 || (document.body.dataset.scene && document.body.dataset.scene !== 'walk')) return;   // birds only in the green valley
      const t = ac.currentTime + Math.random() * .4, base = 2300 + Math.random() * 1500, n = 2 + (Math.random() * 4 | 0);
      for (let i = 0; i < n; i++) tone(base * (1 + Math.random() * .15), t + i * .11, .09, 'sine', .018, base * 1.35, out);
    }, 1700);
    amb = { out, src, lfo, birds };
  }
  function stopAmbience() {
    if (!amb) return;
    const a = amb; amb = null; clearInterval(a.birds);
    try { a.out.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .6); setTimeout(() => { a.src.stop(); a.lfo.stop(); }, 700); } catch (e) {}
  }

  // ---------- speaker toggle ----------
  function paint() {
    document.querySelectorAll('[data-sound-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(enabled));
      b.setAttribute('aria-label', enabled ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on');
      b.title = enabled ? 'Sound on' : 'Sound off';
    });
  }
  document.addEventListener('click', (e) => {
    const tg = e.target.closest('[data-sound-toggle]');
    if (tg) {
      enabled = !enabled;
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (err) {}
      paint();
      if (enabled) { S.success(); startAmbience(); } else { stopAmbience(); if (fire) { fire.level = 0; fire.g.gain.setTargetAtTime(0, ac.currentTime, .1); } }
      return;
    }
    const el = e.target.closest('a[href], button, summary, [role="tab"], select, input[type="checkbox"], input[type="radio"]');
    if (!el || el.disabled) return;
    if (el.matches('[role="tab"], summary, [aria-pressed], select, input')) S.tick();
    else if (el.matches('a[href]') && isPageLink(el, e)) {
      S.nav();
      if (enabled && ac) {                                // let the chime start before the page changes
        e.preventDefault();
        const href = el.href;
        setTimeout(() => { location.href = href; }, 130);
      }
    } else S.click();
  }, true);
  function isPageLink(a, e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    const url = new URL(a.href, location.href);
    if (url.protocol !== location.protocol || url.host !== location.host) return false;
    return !(url.pathname === location.pathname && url.hash);   // same-page anchors scroll, they don't navigate
  }
  // the first click or key press unlocks audio (browsers require a gesture) and starts the ambience
  const unlock = () => { if (enabled && ctx()) startAmbience(); };
  addEventListener('pointerdown', unlock, { once: true, capture: true });
  addEventListener('keydown', unlock, { once: true, capture: true });

  paint();
  window.CLSound = S;
})();
