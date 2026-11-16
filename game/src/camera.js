// The camera: it trails the linehand, leads a little where they are going, and shakes on the
// thunder. It never leaves the level.

import { VIEW } from './config.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.shake = 0;
    this.time = 0;
    this.ox = 0;
    this.oy = 0;
  }

  // Follow the linehand: lean the frame towards where the swing is heading, and clamp to the level.
  follow(player, dt, levelLength) {
    const lead = Math.max(-180, Math.min(180, player.vx * 0.16));
    const targetX = player.x - VIEW.w * 0.44 + lead;
    const targetY = Math.min(60, Math.max(-30, (player.y - VIEW.h * 0.52) * 0.5));
    const ease = 1 - Math.exp(-5 * dt);
    this.x += (targetX - this.x) * ease;
    this.y += (targetY - this.y) * ease;
    this.clamp(levelLength);
  }

  // Snap straight to the linehand: used when a level starts or a life is lost.
  jump(player, levelLength) {
    this.x = player.x - VIEW.w * 0.44;
    this.y = Math.min(60, Math.max(-30, (player.y - VIEW.h * 0.52) * 0.5));
    this.clamp(levelLength);
  }

  clamp(levelLength) {
    const travel = Math.max(0, levelLength - VIEW.w);
    this.x = Math.max(0, Math.min(travel, this.x));
    this.y = Math.max(-40, Math.min(70, this.y));
  }

  kick(power) {
    this.shake = Math.min(1.6, this.shake + power);
  }

  update(dt) {
    this.time += dt;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.6);
      const amp = this.shake * this.shake * 16;
      this.ox = Math.sin(this.time * 71) * amp;
      this.oy = Math.cos(this.time * 57) * amp * 0.7;
    } else {
      this.ox = 0;
      this.oy = 0;
    }
  }
}
