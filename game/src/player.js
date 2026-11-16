// The linehand: gravity and drag, pumping the swing along the rope's tangent, reeling, and the
// kick that fires them off the line when it is let go.

import { PHYS } from './config.js';

export class Player {
  constructor() {
    this.reset(0, 0);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.invuln = PHYS.invuln;
    this.scarf = [];
    for (let i = 0; i < 10; i += 1) this.scarf.push({ x, y });
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  // One step of the linehand. Steering either pumps the swing along the rope's tangent or, with no
  // line, drifts them sideways in the air; the reel is the rope's own business.
  step(dt, input, rope, levelLength) {
    const steer = input ? input.steer() : 0;
    if (steer !== 0) this.facing = steer;

    if (rope.latched) {
      const ax = this.x - rope.anchor.x;
      const ay = this.y - rope.anchor.y;
      const span = Math.hypot(ax, ay) || 1e-6;
      const nx = ax / span;
      const ny = ay / span;
      // Project the wanted push onto the rope's tangent, so a press always drives the swing the way
      // it is asked for, even straight under the mast where the tangent is horizontal.
      const along = steer * nx;
      const tx = steer - nx * along;
      const ty = -ny * along;
      const tl = Math.hypot(tx, ty);
      const strength = PHYS.pump * (0.42 + 0.58 * Math.min(1, tl)) * dt;
      if (tl > 0.001) {
        this.vx += (tx / tl) * strength;
        this.vy += (ty / tl) * strength;
      }
      // Level with the mast the tangent turns vertical and pushes nothing: nudge sideways instead,
      // so a press still answers there.
      if (tl < 0.5) this.vx += steer * PHYS.airControl * dt;
    } else if (steer !== 0) {
      this.vx += steer * PHYS.airControl * dt;
    }

    this.vy += PHYS.gravity * dt;
    const damp = Math.max(0, 1 - PHYS.drag * dt);
    this.vx *= damp;
    this.vy *= damp;

    const speed = this.speed;
    if (speed > PHYS.topSpeed) {
      this.vx = (this.vx / speed) * PHYS.topSpeed;
      this.vy = (this.vy / speed) * PHYS.topSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < 20) {
      this.x = 20;
      if (this.vx < 0) this.vx = 0;
    }
    if (this.x > levelLength - 20) this.x = levelLength - 20;
    if (this.y < PHYS.ceiling) {
      this.y = PHYS.ceiling;
      if (this.vy < 0) this.vy = 0;
    }

    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
    this.trail(dt);
  }

  // The scarf tails behind: pure feedback, but it shows the swing's line at a glance.
  trail(dt) {
    const head = this.scarf[0];
    const ease = Math.min(1, dt * 12);
    head.x += (this.x - head.x) * ease;
    head.y += (this.y - 10 - head.y) * ease;
    for (let i = 1; i < this.scarf.length; i += 1) {
      const prev = this.scarf[i - 1];
      const node = this.scarf[i];
      const step = Math.min(1, dt * 9);
      node.x += (prev.x - node.x) * step;
      node.y += (prev.y + 3 - node.y) * step;
    }
  }

  // Let go with the kick: an impulse along the swing, nudged upwards, and the faster the swing the
  // bigger it is, so the reward for a good arc is the flight after it.
  launch(rope) {
    const speed = this.speed;
    let dx = this.vx;
    let dy = this.vy;
    if (speed < 40) {
      dy = -1;
      dx = this.facing * 0.3;
    }
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    // Rotate the launch a little towards the sky: a kick should gain height.
    const tilt = -0.34 * this.facing;
    const rx = dx * Math.cos(tilt) - dy * Math.sin(tilt);
    const ry = dx * Math.sin(tilt) + dy * Math.cos(tilt);
    const power = Math.min(PHYS.launchMax, PHYS.launch + speed * PHYS.launchGain);
    this.vx += rx * power;
    this.vy += ry * power;
    rope.letGo();
    return { x: rx, y: ry, power };
  }

  // Where a mast behind the linehand is: the spot a lost line comes back to.
  blip(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.invuln = PHYS.invuln;
    for (const node of this.scarf) {
      node.x = x;
      node.y = y;
    }
  }
}
