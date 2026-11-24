/* Sound: everything is synthesised with WebAudio, so there are no sound files to manage.
   WG.audio.sfx(name, opts)  — one-shot effects
   WG.audio.music(style)     — gentle generative background music ('home' | 'sea' | 'dusk' | 'bubbles' | 'night' | 'paint' | null)
   WG.audio.voice(key)       — recorded voice lines (see sounds/voice/voice-lines.js) */
(function (WG) {
  const A = (WG.audio = {});
  let ctx = null, master, sfxBus, musicBus, noiseBuf;

  A.unlock = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(master);
    A.applyVolumes();
    // white noise buffer for splashes / swishes
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  };

  A.applyVolumes = function () {
    if (!ctx) return;
    sfxBus.gain.setTargetAtTime(WG.settings.sfxVol, ctx.currentTime, 0.05);
    musicBus.gain.setTargetAtTime(WG.settings.musicVol * 0.5, ctx.currentTime, 0.05);
  };

  const now = () => ctx.currentTime;
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function tone({ freq = 440, type = 'sine', t = 0, dur = 0.2, vol = 0.3, attack = 0.005, slideTo = null, bus = sfxBus, detune = 0 }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const s = now() + t;
    o.type = type; o.frequency.setValueAtTime(freq, s); o.detune.value = detune;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, s + dur);
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(vol, s + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
    o.connect(g); g.connect(bus);
    o.start(s); o.stop(s + dur + 0.05);
  }

  function noise({ t = 0, dur = 0.3, vol = 0.3, filter = 'bandpass', freq = 1200, q = 1, freqTo = null }) {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    const s = now() + t;
    src.buffer = noiseBuf; f.type = filter; f.frequency.setValueAtTime(freq, s); f.Q.value = q;
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, s + dur);
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(vol, s + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(s, Math.random()); src.stop(s + dur + 0.05);
  }

  // Pentatonic notes so random pitches always sound nice together
  const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84];

  const SFX = {
    pop: (o) => { const n = o.note != null ? o.note : WG.pick(PENTA); tone({ freq: midi(n + 12), type: 'sine', dur: 0.12, vol: 0.5, slideTo: midi(n + 24) }); tone({ freq: midi(n), type: 'triangle', dur: 0.35, vol: 0.25, t: 0.02 }); },
    splash: () => { noise({ dur: 0.45, vol: 0.5, filter: 'bandpass', freq: 2500, freqTo: 500, q: 0.8 }); tone({ freq: 600, slideTo: 1400, dur: 0.12, vol: 0.2 }); },
    coin: () => { tone({ freq: midi(83), type: 'square', dur: 0.08, vol: 0.12 }); tone({ freq: midi(88), type: 'square', dur: 0.3, vol: 0.12, t: 0.08 }); },
    gold: () => { [76, 79, 84, 88, 91].forEach((n, i) => tone({ freq: midi(n), type: 'triangle', dur: 0.3, vol: 0.25, t: i * 0.06 })); },
    slap: () => { noise({ dur: 0.18, vol: 0.9, filter: 'lowpass', freq: 3000, freqTo: 300 }); tone({ freq: 180, slideTo: 60, dur: 0.15, vol: 0.5 }); },
    boing: () => tone({ freq: 220, slideTo: 520, type: 'sine', dur: 0.3, vol: 0.4 }),
    nope: () => { tone({ freq: 330, type: 'triangle', dur: 0.14, vol: 0.3 }); tone({ freq: 262, type: 'triangle', dur: 0.25, vol: 0.3, t: 0.14 }); },
    chime: (o) => { const n = o.note != null ? o.note : WG.pick(PENTA) + 12; tone({ freq: midi(n), type: 'sine', dur: 1.1, vol: 0.35 }); tone({ freq: midi(n + 12), type: 'sine', dur: 0.7, vol: 0.12, t: 0.01 }); },
    swish: (o) => noise({ dur: 0.25, vol: 0.12 * (o.vol || 1), filter: 'bandpass', freq: 900 + Math.random() * 900, freqTo: 3000, q: 2 }),
    select: () => { tone({ freq: midi(72), type: 'triangle', dur: 0.12, vol: 0.3 }); tone({ freq: midi(79), type: 'triangle', dur: 0.25, vol: 0.3, t: 0.1 }); },
    tick: () => tone({ freq: midi(84), type: 'sine', dur: 0.05, vol: 0.12 }),
    beep: (o) => tone({ freq: o.high ? midi(84) : midi(72), type: 'square', dur: o.high ? 0.5 : 0.18, vol: 0.12 }),
    whoosh: () => noise({ dur: 0.5, vol: 0.25, filter: 'bandpass', freq: 400, freqTo: 4000, q: 1.5 }),
    fanfare: () => { [[72, 0], [76, 0.15], [79, 0.3], [84, 0.45], [79, 0.7], [84, 0.85]].forEach(([n, t]) => { tone({ freq: midi(n), type: 'square', dur: 0.3, vol: 0.09, t }); tone({ freq: midi(n - 12), type: 'triangle', dur: 0.35, vol: 0.2, t }); }); },
    sparkle: () => { for (let i = 0; i < 6; i++) tone({ freq: midi(WG.pick(PENTA) + 24), type: 'sine', dur: 0.25, vol: 0.12, t: i * 0.05 }); },
    paintClear: () => { noise({ dur: 0.7, vol: 0.3, filter: 'highpass', freq: 800, freqTo: 6000 }); },
  };

  A.sfx = function (name, opts = {}) {
    if (!ctx || WG.settings.sfxVol <= 0) return;
    try { SFX[name] && SFX[name](opts); } catch (e) { /* audio errors never stop the game */ }
  };

  // ---------- continuous mosquito buzz ----------
  let buzz = null;
  A.setBuzz = function (level) {
    if (!ctx) return;
    if (!buzz) {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 520; o2.type = 'sawtooth'; o2.frequency.value = 547;
      lfo.frequency.value = 7; lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
      f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.2; g.gain.value = 0;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus);
      o.start(); o2.start(); lfo.start();
      buzz = { g, stop: () => { o.stop(); o2.stop(); lfo.stop(); } };
    }
    buzz.g.gain.setTargetAtTime(Math.min(0.05, level * 0.012), now(), 0.15);
  };
  A.stopBuzz = function () { if (buzz) { buzz.g.gain.setTargetAtTime(0, now(), 0.05); const b = buzz; buzz = null; setTimeout(() => b.stop(), 400); } };

  // ---------- background music ----------
  const STYLES = {
    home:    { bpm: 104, root: 60, wave: 'triangle', prog: [0, 5, 7, 5], bass: true },
    sea:     { bpm: 92,  root: 57, wave: 'sine', prog: [0, 3, 5, 3], bass: true },
    dusk:    { bpm: 118, root: 62, wave: 'triangle', prog: [0, 7, 5, 7], bass: true },
    bubbles: { bpm: 96,  root: 65, wave: 'sine', prog: [0, 5, 3, 5], bass: false },
    night:   { bpm: 72,  root: 57, wave: 'sine', prog: [0, 3, 5, 0], bass: false },
    paint:   { bpm: 100, root: 60, wave: 'triangle', prog: [0, 5, 7, 0], bass: true },
  };
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
  let mus = null;

  A.music = function (style) {
    if (mus) { clearInterval(mus.timer); mus = null; }
    if (!ctx || !style || !STYLES[style]) return;
    const st = STYLES[style];
    const step = 60 / st.bpm / 2; // eighth notes
    let next = now() + 0.1, i = 0, last = 2;
    mus = {
      timer: setInterval(() => {
        if (!ctx || WG.settings.musicVol <= 0) { next = now() + 0.1; return; }
        while (next < now() + 0.3) {
          const bar = Math.floor(i / 8) % st.prog.length, chord = st.root + st.prog[bar];
          // melody: wandering pentatonic, sometimes resting
          if (i % 2 === 0 || Math.random() < 0.35) {
            if (Math.random() < 0.8) {
              last = WG.clamp(last + WG.pick([-2, -1, -1, 1, 1, 2, 0]), 0, SCALE.length - 1);
              tone({ freq: midi(chord + 12 + SCALE[last]), type: st.wave, dur: step * 1.8, vol: 0.12, t: next - now(), bus: musicBus });
            }
          }
          if (st.bass && i % 4 === 0) tone({ freq: midi(chord - 12), type: 'sine', dur: step * 3.5, vol: 0.22, t: next - now(), bus: musicBus });
          if (!st.bass && i % 8 === 0) [0, 4, 7].forEach((n) => tone({ freq: midi(chord + n), type: 'sine', dur: step * 7, vol: 0.05, attack: 0.4, t: next - now(), bus: musicBus }));
          next += step; i++;
        }
      }, 100),
    };
  };

  // ---------- voice: recorded clips in sounds/voice (natural, excited voice) ----------
  // WG.audio.voice('praise')  plays a random variant of that line.
  //   opts.interrupt (default true) stops whatever is being said
  //   opts.casual   true = skip if something is already being said (for frequent "Yay!"s)
  let current = null, lastVariant = {};
  const clipCache = new Map();
  function clip(file) {
    if (!clipCache.has(file)) { const a = new Audio('sounds/voice/' + file); a.preload = 'auto'; clipCache.set(file, a); }
    return clipCache.get(file);
  }
  A.preloadVoice = function () { Object.values(WG.VOICE_LINES || {}).forEach((vs) => vs.forEach((v) => clip(v.file))); };
  A.speaking = () => !!(current && !current.paused && !current.ended);

  A.voice = function (key, opts = {}) {
    if (!WG.settings.voice) return null;
    const vs = WG.VOICE_LINES && WG.VOICE_LINES[key];
    if (!vs || !vs.length) return null;
    if (opts.casual && A.speaking()) return null;
    let i = Math.floor(Math.random() * vs.length);
    if (vs.length > 1 && i === lastVariant[key]) i = (i + 1) % vs.length;
    lastVariant[key] = i;
    if (current && opts.interrupt !== false) { try { current.pause(); } catch (e) { /* ignore */ } }
    else if (A.speaking()) return null;
    const a = clip(vs[i].file);
    try {
      a.currentTime = 0;
      a.volume = WG.clamp(WG.settings.voiceVol, 0, 1);
      duck(true);
      a.onended = () => duck(false);
      const p = a.play();
      if (p && p.catch) p.catch(() => duck(false));
    } catch (e) { return null; }
    current = a;
    a.lineText = vs[i].text;
    return a;
  };

  // Play several lines one after another, e.g. intro then "Ready?"
  A.voiceChain = function (keys) {
    const [first, ...rest] = keys;
    const a = A.voice(first);
    if (a && rest.length) a.onended = () => { duck(false); A.voiceChain(rest); };
  };

  A.stopVoice = function () { if (current) { try { current.pause(); } catch (e) { /* ignore */ } } duck(false); };

  // music gets quieter while Momo talks
  function duck(on) {
    if (!ctx) return;
    musicBus.gain.setTargetAtTime(WG.settings.musicVol * 0.5 * (on ? 0.35 : 1), now(), 0.08);
  }

  // Fallback: browser speech for any text without a recording
  A.say = function (text) {
    if (!WG.settings.voice || !('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1; u.pitch = 1.15; speechSynthesis.speak(u); } catch (e) { /* ignore */ }
  };
})(window.WG);
