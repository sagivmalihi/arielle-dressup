/* sound.js — tiny happy sound effects, synthesised with WebAudio (no audio files). */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  let ctx = null, master = null, muted = false;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { ctx = null; return false; }
    return true;
  }
  /* one soft note */
  function note(freq, t0, dur, type = 'sine', vol = 0.25, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  const SFX = {
    tap: (t) => note(740, t, 0.07, 'sine', 0.16, 980),
    pick: (t) => { note(660, t, 0.09, 'triangle', 0.22); note(990, t + 0.07, 0.13, 'triangle', 0.2); },
    off: (t) => note(620, t, 0.12, 'sine', 0.16, 380),
    tab: (t) => note(520, t, 0.06, 'triangle', 0.14, 700),
    locked: (t) => { note(330, t, 0.1, 'sine', 0.16); note(294, t + 0.1, 0.14, 'sine', 0.14); },
    buy: (t) => { note(1319, t, 0.08, 'square', 0.09); note(1760, t + 0.08, 0.22, 'square', 0.09); note(2637, t + 0.16, 0.25, 'sine', 0.1); },
    star: (t) => note(1568, t, 0.05, 'sine', 0.1, 2093),
    hmm: (t) => { note(440, t, 0.18, 'sine', 0.16); note(392, t + 0.18, 0.26, 'sine', 0.14); },
    save: (t) => { note(784, t, 0.09, 'triangle', 0.2); note(1047, t + 0.09, 0.09, 'triangle', 0.2); note(1319, t + 0.18, 0.2, 'triangle', 0.2); },
    camera: (t) => { note(1800, t, 0.03, 'square', 0.08); note(900, t + 0.05, 0.06, 'square', 0.06); },
    fanfare: (t) => {
      [523, 659, 784, 1047, 1319].forEach((f, i) => note(f, t + i * 0.1, 0.22, 'triangle', 0.22));
      [1047, 1319, 1568].forEach((f) => note(f, t + 0.55, 0.7, 'sine', 0.13));
      for (let i = 0; i < 8; i++) note(1800 + Math.random() * 1800, t + 0.7 + i * 0.07, 0.09, 'sine', 0.06);
    },
  };
  DU.sound = {
    play(name) {
      if (muted || !SFX[name] || !ensure()) return;
      try { SFX[name](ctx.currentTime + 0.005); } catch (e) { /* never let a sound break the game */ }
    },
    /* one soft note for other modules: DU.sound.tone(880, { dur, type, vol, at (seconds from now), slide }) */
    tone(freq, o = {}) {
      if (muted || !ensure()) return;
      try { note(freq, ctx.currentTime + 0.005 + (o.at || 0), o.dur || 0.2, o.type || 'sine', o.vol || 0.18, o.slide); } catch (e) { /* ignore */ }
    },
    setMuted(m) { muted = !!m; },
    get muted() { return muted; },
    unlock: ensure,
  };
})();
