// The line. One mast, one length. The rope only ever pulls, so the solver puts the linehand back
// on the circle it is tied to and drops the speed along the rope: the swing keeps the rest, which
// is what makes letting go at the low point fly.

import { PHYS } from './config.js';

export class Rope {
  constructor() {
    this.anchor = null;
    this.length = 0;
    this.sinceLatch = 0;
  }

  get latched() {
    return this.anchor !== null;
  }

  // Throw the line: it takes a little less than the distance it was thrown over, so the first
  // moment of a latch is a small pull towards the mast, and it never hangs deeper than the swell
  // allows: a fresh hitch alone can not drop the linehand into the sea.
  latch(anchor, player) {
    const span = Math.hypot(player.x - anchor.x, player.y - anchor.y) || 1e-6;
    const room = Math.max(PHYS.minLine, PHYS.waterline - anchor.y - 70);
    this.length = Math.max(PHYS.minLine, Math.min(PHYS.maxLine, room, span * 0.97));
    // The haul: a line thrown while flying turns part of the speed straight at the mast into the
    // swing around it, so hitching at speed carries momentum through the turn instead of stopping
    // the linehand dead on the rope.
    const nx = (player.x - anchor.x) / span;
    const ny = (player.y - anchor.y) / span;
    const along = player.vx * nx + player.vy * ny;
    const sideways = player.vx * -ny + player.vy * nx;
    if (Math.abs(along) > 40) {
      const gain = Math.abs(along) * PHYS.haul;
      const dir = Math.abs(sideways) > 30 ? Math.sign(sideways) : Math.sign(player.vx || 1);
      player.vx += -ny * gain * dir;
      player.vy += nx * gain * dir;
    }
    this.anchor = anchor;
    this.sinceLatch = 0;
    return this.length;
  }

  letGo() {
    const anchor = this.anchor;
    this.anchor = null;
    return anchor;
  }

  // The nearest mast to a point, within reach: what a thrown line finds.
  find(anchors, point, from) {
    let best = null;
    let bestScore = Infinity;
    for (const anchor of anchors) {
      const spread = Math.hypot(anchor.x - from.x, anchor.y - from.y);
      if (spread > PHYS.reach) continue;
      const cost = Math.hypot(anchor.x - point.x, anchor.y - point.y) + spread * 0.25;
      if (cost < bestScore) {
        bestScore = cost;
        best = anchor;
      }
    }
    return best;
  }

  // W and S reel the line in and out, then the constraint runs.
  update(player, input, dt) {
    this.sinceLatch += dt;
    if (this.anchor === null) return;
    const reel = input ? input.reel() : 0;
    if (reel !== 0) this.length += reel * PHYS.reel * dt;
    // Near the swell the linehand hauls in on their own: a mast that bobs down, or a gust leaning
    // on them, can not drag them under; the sea only takes a linehand who lets go of the line.
    if (player.y > PHYS.waterline - 90) this.length -= 320 * dt;
    this.length = Math.max(PHYS.minLine, Math.min(PHYS.maxLine, this.length));

    const anchor = this.anchor;
    const dx = player.x - anchor.x;
    const dy = player.y - anchor.y;
    const span = Math.hypot(dx, dy) || 1e-6;
    const taut = span >= this.length - 3;
    if (taut) {
      // A mast that swings or bobs carries the linehand with it.
      player.x += (anchor.vx || 0) * dt;
      player.y += (anchor.vy || 0) * dt;
    }
    if (span > this.length) {
      const nx = dx / span;
      const ny = dy / span;
      player.x = anchor.x + nx * this.length;
      player.y = anchor.y + ny * this.length;
      const along = player.vx * nx + player.vy * ny;
      if (along > 0) {
        player.vx -= along * nx;
        player.vy -= along * ny;
      }
    }
  }

  // 1 when the line is straight, 0 when it hangs slack: the renderer draws the difference and the
  // audio plays a creak when it snaps taut.
  tension(player) {
    if (this.anchor === null) return 0;
    const span = Math.hypot(player.x - this.anchor.x, player.y - this.anchor.y);
    return Math.max(0, Math.min(1, span / Math.max(1, this.length)));
  }
}
