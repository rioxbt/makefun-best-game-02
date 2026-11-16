// The run itself: stages, the squall's clock, the salvage, the strikes, the wind, the lines left,
// the score, and which panel is up. Nothing here touches the DOM, the canvas or the audio device,
// so a stage can be simulated headless (see tools/autopilot.mjs) exactly as it is played.

import { KEYS, PHYS, RULES, VIEW } from './config.js';
import { Camera } from './camera.js';
import { LEVELS, MAST_MOTION } from './level.js';
import { Player } from './player.js';
import { makeRain, makeRng } from './random.js';
import { Rope } from './rope.js';

export const SCREEN = {
  title: 'title',
  playing: 'playing',
  clear: 'clear',
  over: 'over',
  win: 'win',
};

const CHARGE = 0.85;   // seconds a strike telegraphs itself before it lands
const STRIKE = 0.25;   // seconds the bolt is down
const NOTICE = 2.2;    // seconds a line of feedback stays on screen

export class World {
  constructor() {
    this.rng = makeRng(0x51ee7);
    this.rain = makeRain(makeRng(0x9a17), 170, VIEW.w + 720, VIEW.h);
    this.player = new Player();
    this.rope = new Rope();
    this.camera = new Camera();
    this.audio = null;
    this.clock = 0;
    this.timeScale = 1;
    this.flash = 0;
    this.screen = SCREEN.title;
    this.paused = false;
    this.pick = 0;
    this.notice = null;
    this.stars = [0, 0, 0, 0, 0];
    this.unlocked = 0;
    this.best = 0;
    this.readProgress();
    this.newRun();
    this.load(0, true);
    this.screen = SCREEN.title;
  }

  // ---------------------------------------------------------------- progress

  readProgress() {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(KEYS.progress);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.stars)) this.stars = LEVELS.map((_, i) => Number(saved.stars[i]) || 0);
        this.unlocked = Math.max(0, Math.min(LEVELS.length - 1, Number(saved.unlocked) || 0));
      }
      this.best = Number(localStorage.getItem(KEYS.best)) || 0;
    } catch {
      // A browser with storage switched off still plays; the run just is not remembered.
    }
  }

  writeProgress() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(KEYS.progress, JSON.stringify({ stars: this.stars, unlocked: this.unlocked }));
      localStorage.setItem(KEYS.best, String(Math.max(this.best, this.score)));
    } catch {
      // Same: nothing to do but carry on.
    }
  }

  get totalStars() {
    return this.stars.reduce((sum, n) => sum + n, 0);
  }

  // ---------------------------------------------------------------- the stage

  newRun() {
    this.score = 0;
    this.lives = RULES.lives;
    this.runCrates = 0;
    this.stageIndex = 0;
    this.linesRun = 0;
  }

  load(index, keepQuiet) {
    const stage = LEVELS[index];
    this.stageIndex = index;
    this.stage = stage;
    this.rng = makeRng(0x5eed + index * 977);
    this.timeLeft = stage.time;
    this.cratesTaken = 0;
    this.particles = [];
    this.masts = stage.masts.map((mast) => {
      const motion = MAST_MOTION[mast.kind] ?? MAST_MOTION.mast;
      return {
        x: mast.x,
        y: mast.y,
        bx: mast.x,
        by: mast.y,
        vx: 0,
        vy: 0,
        kind: mast.kind,
        lamp: mast.y,
        phase: this.rng.range(0, Math.PI * 2),
        motion,
      };
    });
    this.crates = stage.crates.map((crate) => ({ x: crate.x, y: crate.y, taken: false, phase: crate.x * 0.01 }));
    this.bolts = stage.bolts.map((bolt) => ({
      x: bolt.x,
      period: bolt.period,
      offset: bolt.offset,
      phase: 'idle',
      struck: false,
    }));
    this.winds = stage.winds.map((wind) => ({ ...wind }));
    this.beacon = { x: stage.beacon.x, y: stage.beacon.y };
    this.rope.letGo();
    // A stage opens with the line already hitched to the first mast: the linehand starts the run
    // hanging, not falling, and the first thing on screen is the thing the game is about.
    const first = this.masts[0];
    this.player.reset(first.x - 130, first.y + 195);
    this.rope.latch(first, this.player);
    this.camera.jump(this.player, stage.length);
    this.steady = true;   // the line is held for the player until they take it in hand
    this.spent = false;   // a kick spends the hold: a fresh press hitches the line again
    this.notice = keepQuiet ? null : { text: `${index + 1}. ${stage.name}`, t: 3.2 };
    this.aimPoint = { x: this.player.x + 300, y: this.player.y - 140 };
    this.aimTarget = null;
    this.boltEvents = 0;
  }

  // ---------------------------------------------------------------- the loop

  update(dt, input) {
    this.clock += dt;
    this.camera.update(dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.4);
    if (this.notice) {
      this.notice.t -= dt;
      if (this.notice.t <= 0) this.notice = null;
    }
    const step = Math.min(dt, 1 / 30);
    if (this.screen === SCREEN.playing) {
      if (input.tap('KeyP') || input.tap('Escape')) this.paused = !this.paused;
      if (input.tap('KeyM')) this.toggleMute();
      if (!this.paused) {
        if (input.tap('KeyR')) this.load(this.stageIndex);
        else this.simulate(step, input);
      }
    } else if (this.screen === SCREEN.title) {
      this.titleKeys(input);
    } else if (this.screen === SCREEN.clear) {
      input.tick(dt);
      if (input.tap('KeyR')) this.begin(this.stageIndex);
      else if (input.confirm()) {
        if (this.stageIndex + 1 < LEVELS.length) this.begin(this.stageIndex + 1);
        else this.screen = SCREEN.title;
      }
      this.idleScene(step);
    } else if (this.screen === SCREEN.over || this.screen === SCREEN.win) {
      input.tick(dt);
      if (input.tap('KeyR')) this.startRun();
      else if (input.confirm()) {
        this.screen = SCREEN.title;
        this.pick = 0;
      }
      this.idleScene(step);
    } else {
      input.tick(dt);
    }
    input.endFrame();
  }

  titleKeys(input) {
    if (input.tap('ArrowLeft') || input.tap('KeyA')) this.pick = Math.max(0, this.pick - 1);
    if (input.tap('ArrowRight') || input.tap('KeyD')) this.pick = Math.min(this.unlocked, this.pick + 1);
    for (let i = 0; i < LEVELS.length; i += 1) {
      if (input.tap(`Digit${i + 1}`) && i <= this.unlocked) {
        this.pick = i;
        this.startRun();
        return;
      }
    }
    if (input.confirm()) {
      this.startRun();
      return;
    }
    // The title screen keeps the sea, the masts and the strikes moving behind its plaque.
    this.simulateScenery(1 / 30);
  }

  // A stage, played: the title and the result panels keep the world breathing with the same code.
  simulateScenery(dt) {
    this.moveMasts(dt);
    this.stepBolts(dt, false);
    this.tickParticles(dt);
  }

  // The world behind a result panel: masts and rain keep moving, nothing hurts.
  idleScene(dt) {
    this.simulateScenery(dt);
    this.rope.update(this.player, null, dt);
    this.player.step(dt, null, this.rope, this.stage.length);
    this.camera.follow(this.player, dt, this.stage.length);
  }

  startRun() {
    this.newRun();
    this.begin(this.pick);
  }

  begin(index) {
    this.load(index);
    this.screen = SCREEN.playing;
    this.paused = false;
  }

  toggleMute() {
    if (!this.audio) return;
    this.audio.muted = !this.audio.muted;
    this.notice = { text: this.audio.muted ? 'sound off' : 'sound on', t: 1.4 };
  }

  // ---------------------------------------------------------------- the play

  simulate(dt, input) {
    const player = this.player;
    const rope = this.rope;

    // The aim: the mouse where it has been moved, otherwise a point ahead and above, so the whole
    // game can also be played on the keyboard alone.
    if (input.pointerUsed) {
      this.aimPoint = { x: this.camera.x + input.pointer.x, y: this.camera.y + input.pointer.y };
    } else {
      this.aimPoint = { x: player.x + player.facing * 300, y: player.y - 150 };
    }
    this.aimTarget = rope.find(this.masts, this.aimPoint, player);

    const holding = input.latchHeld() || this.steady;
    if (input.latchHeld()) this.steady = false;
    if (rope.latched && input.releaseTapped()) {
      const shot = player.launch(rope);
      this.audio?.launch();
      this.camera.kick(0.35);
      this.spray(player.x, player.y, 10, shot);
      this.spent = true;   // the kick spends the hold: let the button go to hitch again
    } else if (rope.latched && !holding) {
      rope.letGo();
      this.audio?.unlatch();
    } else if (!rope.latched && holding && !this.spent && this.aimTarget) {
      rope.latch(this.aimTarget, player);
      this.audio?.latch();
      this.spray(this.aimTarget.x, this.aimTarget.y, 6, { power: 120 });
    }
    if (!input.latchHeld()) this.spent = false;
    rope.update(player, input, dt);
    player.step(dt, input, rope, this.stage.length);

    this.applyWind(dt);
    this.moveMasts(dt);
    this.stepBolts(dt, true);
    this.share(dt);
    this.tickParticles(dt);
    this.camera.follow(player, dt, this.stage.length);

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.lose('the squall');
    } else if (player.y > PHYS.waterline) {
      this.lose('the deep');
    } else if (this.reachedBeacon()) {
      this.clear();
    }
  }

  moveMasts(dt) {
    for (const mast of this.masts) {
      const { amp, period, axis } = mast.motion;
      const prevX = mast.x;
      const prevY = mast.y;
      const wave = Math.sin((this.clock / period) * Math.PI * 2 + mast.phase);
      mast.x = mast.bx + (axis === 'x' ? wave * amp : 0);
      mast.y = mast.by + (axis === 'y' ? wave * amp : 0);
      mast.vx = (mast.x - prevX) / Math.max(dt, 1e-4);
      mast.vy = (mast.y - prevY) / Math.max(dt, 1e-4);
    }
  }

  applyWind(dt) {
    const player = this.player;
    for (const wind of this.winds) {
      if (player.x < wind.x || player.x > wind.x + wind.w) continue;
      if (player.y < wind.y || player.y > wind.y + wind.h) continue;
      const gust = 0.6 + 0.4 * Math.sin((this.clock / wind.period) * Math.PI * 2 + wind.phase);
      player.vx += wind.ax * gust * dt;
      player.vy += wind.ay * gust * dt;
      if (this.rng() < dt * 12) {
        this.particles.push({
          x: player.x + this.rng.range(-40, 40),
          y: player.y + this.rng.range(-40, 40),
          vx: wind.ax * 0.5,
          vy: wind.ay * 0.5 + this.rng.range(-20, 20),
          life: 0.5,
          max: 0.5,
          size: 2,
          color: '#cfe6ff',
          kind: 'streak',
        });
      }
    }
  }

  stepBolts(dt, live) {
    for (const bolt of this.bolts) {
      const local = (this.clock + bolt.offset) % bolt.period;
      const phase = local > bolt.period - STRIKE ? 'strike' : local > bolt.period - STRIKE - CHARGE ? 'charge' : 'idle';
      if (phase === 'strike' && bolt.phase !== 'strike') {
        this.boltEvents += 1;
        this.audio?.thunder();
        this.camera.kick(0.8);
        this.flash = Math.min(1, this.flash + 0.55);
        for (let i = 0; i < 14; i += 1) {
          this.particles.push({
            x: bolt.x + this.rng.range(-16, 16),
            y: PHYS.waterline + this.rng.range(-10, 10),
            vx: this.rng.range(-160, 160),
            vy: this.rng.range(-320, -90),
            life: 0.7,
            max: 0.7,
            size: 3,
            color: '#dcf2ff',
            kind: 'spray',
          });
        }
        if (live && this.player.invuln <= 0 && Math.abs(this.player.x - bolt.x) < 22) {
          this.lose('the strike');
        }
      }
      bolt.phase = phase;
    }
  }

  share(dt) {
    const player = this.player;
    for (const crate of this.crates) {
      if (crate.taken) continue;
      const bob = Math.sin(this.clock * 1.6 + crate.phase) * 6;
      const dx = player.x - crate.x;
      const dy = player.y - (crate.y + bob);
      if (dx * dx + dy * dy < PHYS.shareRadius * PHYS.shareRadius) {
        crate.taken = true;
        this.cratesTaken += 1;
        this.runCrates += 1;
        this.score += PHYS.crateScore;
        this.audio?.crate(this.cratesTaken);
        this.camera.kick(0.2);
        this.burst(crate.x, crate.y, 14, '#ffb545');
      }
    }
  }

  reachedBeacon() {
    const dx = this.player.x - this.beacon.x;
    const dy = this.player.y - this.beacon.y;
    return dx * dx + dy * dy < PHYS.beaconRadius * PHYS.beaconRadius;
  }

  // ---------------------------------------------------------------- outcomes

  get cratesTotal() {
    return this.crates.length;
  }

  starsFor(share) {
    let stars = 0;
    for (const line of RULES.starShares) if (share >= line) stars += 1;
    return stars;
  }

  get starsEarned() {
    return this.starsFor(this.cratesTotal === 0 ? 1 : this.cratesTaken / this.cratesTotal);
  }

  clear() {
    const stars = this.starsEarned;
    const timeBonus = Math.floor(this.timeLeft) * RULES.timeBonus;
    this.bonus = RULES.clearBase + timeBonus + stars * RULES.starBonus;
    this.score += this.bonus;
    this.stars[this.stageIndex] = Math.max(this.stars[this.stageIndex], stars);
    this.unlocked = Math.min(LEVELS.length - 1, Math.max(this.unlocked, this.stageIndex + 1));
    this.best = Math.max(this.best, this.score);
    this.writeProgress();
    this.audio?.clear(stars);
    this.linesRun += 1;
    this.lastStars = stars;
    this.lastBonus = this.bonus;
    this.lastTimeBonus = timeBonus;
    this.flash = 0.5;
    this.screen = this.stageIndex + 1 < LEVELS.length ? SCREEN.clear : SCREEN.win;
  }

  lose(reason) {
    if (this.player.invuln > 0) return;
    this.lives -= 1;
    this.linesRun += 1;
    this.flash = 1;
    this.camera.kick(1.3);
    this.audio?.lost();
    this.burst(this.player.x, this.player.y, 22, '#ff6b6b');
    this.notice = { text: reason === 'the deep' ? 'overboard' : reason === 'the strike' ? 'struck by the squall' : reason, t: NOTICE };
    if (this.lives <= 0) {
      this.best = Math.max(this.best, this.score);
      this.writeProgress();
      this.screen = SCREEN.over;
      this.audio?.over();
      return;
    }
    if (reason === 'the squall') this.timeLeft = Math.max(this.timeLeft, 22);
    const behind = this.masts.filter((mast) => mast.x <= this.player.x - 60);
    const post = behind.length > 0 ? behind[behind.length - 1] : this.masts[0];
    this.rope.letGo();
    this.player.blip(post.x - 120, Math.min(PHYS.waterline - 140, post.y + 170));
    this.rope.latch(post, this.player);
    this.camera.jump(this.player, this.stage.length);
  }

  // ---------------------------------------------------------------- the sea spray

  burst(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      const angle = this.rng.range(0, Math.PI * 2);
      const speed = this.rng.range(60, 300);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: this.rng.range(0.35, 0.8),
        max: 0.8,
        size: this.rng.range(2, 4.5),
        color,
        kind: 'spark',
      });
    }
  }

  spray(x, y, count, shot) {
    for (let i = 0; i < count; i += 1) {
      const spread = this.rng.range(-0.7, 0.7);
      this.particles.push({
        x,
        y,
        vx: (shot?.x ?? 0) * (shot?.power ?? 80) + Math.cos(spread) * 120 - 60,
        vy: (shot?.y ?? -1) * (shot?.power ?? 80) + Math.sin(spread) * 80,
        life: 0.45,
        max: 0.45,
        size: 2.5,
        color: '#ffe6b0',
        kind: 'spark',
      });
    }
  }

  tickParticles(dt) {
    const keep = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.kind === 'spray' ? 900 : 420) * dt;
      p.vx *= 1 - Math.min(1, dt * 1.4);
      keep.push(p);
    }
    this.particles = keep;
  }
}
