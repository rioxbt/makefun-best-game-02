// The harbour's sound, made with the browser's own WebAudio: a wind bed and a low swell under the
// game, a pluck when the line hitches, a whoosh on the kick, a bell for a crate, thunder for a
// strike. No sound files: every tone is built here.

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.muted = false;
  }

  // Browsers only allow sound after the player has touched the page: the first gesture starts it.
  ensure() {
    try {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
      }
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.buildNoise();
      this.startWeather();
      return this.ctx;
    } catch {
      this.ctx = null;
      return null;
    }
  }

  buildNoise() {
    const ctx = this.ctx;
    const frames = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < frames; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    this.noise = buffer;
  }

  // Rain and swell: filtered noise that breathes, over two low drones.
  startWeather() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 240;
    lfo.connect(lfoGain).connect(filter.frequency);
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    lfo.start();

    for (const [freq, level] of [[55, 0.035], [82.41, 0.022]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const swell = ctx.createGain();
      swell.gain.value = 0;
      const wave = ctx.createOscillator();
      wave.frequency.value = 0.045;
      const waveGain = ctx.createGain();
      waveGain.gain.value = level;
      wave.connect(waveGain).connect(swell.gain);
      osc.connect(swell).connect(this.master);
      osc.start();
      wave.start();
    }
  }

  // One shaped tone: a pluck, a bell or a chord note.
  voice({ freq, dur = 0.2, type = 'sine', gain = 0.2, slide = 0, delay = 0 }) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    try {
      const at = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, at);
      if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), at + dur);
      const level = ctx.createGain();
      level.gain.setValueAtTime(0.0001, at);
      level.gain.linearRampToValueAtTime(gain, at + 0.012);
      level.gain.exponentialRampToValueAtTime(0.0008, at + dur);
      osc.connect(level).connect(this.master);
      osc.start(at);
      osc.stop(at + dur + 0.03);
    } catch {
      // A sound that will not play is no reason to stop the game.
    }
  }

  // A burst of filtered noise: the kick's whoosh, the sea's slap, the thunder.
  burst({ dur = 0.3, gain = 0.2, from = 1600, to = 200, delay = 0 }) {
    const ctx = this.ensure();
    if (!ctx || this.muted || !this.noise) return;
    try {
      const at = ctx.currentTime + delay;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(from, at);
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), at + dur);
      const level = ctx.createGain();
      level.gain.setValueAtTime(gain, at);
      level.gain.exponentialRampToValueAtTime(0.0008, at + dur);
      src.connect(filter).connect(level).connect(this.master);
      src.start(at);
      src.stop(at + dur + 0.02);
    } catch {
      // As above.
    }
  }

  latch() {
    this.voice({ freq: 560, dur: 0.13, type: 'triangle', gain: 0.24, slide: 320 });
    this.burst({ dur: 0.12, gain: 0.1, from: 2200, to: 700 });
  }

  unlatch() {
    this.voice({ freq: 320, dur: 0.1, type: 'sine', gain: 0.12, slide: -140 });
  }

  launch() {
    this.burst({ dur: 0.3, gain: 0.22, from: 1900, to: 320 });
    this.voice({ freq: 420, dur: 0.22, type: 'triangle', gain: 0.16, slide: 340 });
  }

  // Each crate rings a note higher up the scale than the last.
  crate(count) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
    const freq = scale[Math.min(scale.length - 1, count - 1)];
    this.voice({ freq, dur: 0.28, type: 'triangle', gain: 0.2 });
    this.voice({ freq: freq * 1.5, dur: 0.34, type: 'sine', gain: 0.1, delay: 0.05 });
  }

  thunder() {
    this.burst({ dur: 1.5, gain: 0.34, from: 900, to: 60 });
    this.voice({ freq: 70, dur: 1.1, type: 'sine', gain: 0.16, slide: -30, delay: 0.05 });
  }

  lost() {
    this.burst({ dur: 0.5, gain: 0.24, from: 700, to: 120 });
    this.voice({ freq: 260, dur: 0.45, type: 'sawtooth', gain: 0.1, slide: -150 });
  }

  clear(stars) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i < Math.max(2, stars + 1); i += 1) {
      this.voice({ freq: notes[i % notes.length], dur: 0.34, type: 'triangle', gain: 0.2, delay: i * 0.11 });
    }
  }

  over() {
    const notes = [392, 329.63, 261.63, 196];
    notes.forEach((freq, i) => {
      this.voice({ freq, dur: 0.6, type: 'triangle', gain: 0.2, delay: i * 0.19 });
    });
    this.burst({ dur: 1.2, gain: 0.16, from: 500, to: 70, delay: 0.1 });
  }
}
