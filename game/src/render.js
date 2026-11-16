// Everything the player sees in the harbour: sky, set-back rigs, sea, the moving masts and their
// lamps, the salvage, the strikes, the wind, the beacon, the line, the linehand and the HUD.
// render.js reads the world and draws it; it changes nothing.

import { PALETTE, PHYS, VIEW } from './config.js';
import { bar, commas, glowDot, panel, roundRect, text } from './paint.js';
import { makeRng } from './random.js';
import { stageCount } from './level.js';

const STRIKE = 0.25;
const CHARGE = 0.85;
const PARALLAX = 0.34;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.skies = new Map();
    this.rigs = new Map();
  }

  // The canvas fills the window as a 16:9 letterbox, so the game keeps its shape at any size.
  resize() {
    const scale = Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.style.width = `${Math.round(VIEW.w * scale)}px`;
    this.canvas.style.height = `${Math.round(VIEW.h * scale)}px`;
    this.canvas.width = Math.round(VIEW.w * dpr);
    this.canvas.height = Math.round(VIEW.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(world) {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, VIEW.w, VIEW.h);
    const cam = world.camera;
    ctx.translate(-cam.x + cam.ox, -cam.y + cam.oy);
    this.drawSky(world, ctx, cam);
    this.drawRigs(world, ctx, cam);
    this.drawSea(world, ctx, cam);
    this.drawWinds(world, ctx);
    this.drawBolts(world, ctx);
    this.drawBeacon(world, ctx);
    this.drawMasts(world, ctx);
    this.drawCrates(world, ctx);
    this.drawAim(world, ctx);
    this.drawLine(world, ctx);
    this.drawLinehand(world, ctx);
    this.drawParticles(world, ctx);
    ctx.restore();
    this.drawRain(world, ctx, cam);
    if (world.flash > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.62, world.flash * 0.5);
      ctx.fillStyle = PALETTE.bolt;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      ctx.restore();
    }
    if (world.screen === 'playing') this.drawHud(world, ctx);
  }

  // ---------------------------------------------------------------- backdrop

  drawSky(world, ctx) {
    const theme = world.stage.theme;
    let fill = this.skies.get(world.stageIndex);
    if (!fill) {
      fill = ctx.createLinearGradient(0, -60, 0, PHYS.waterline);
      fill.addColorStop(0, theme.sky[0]);
      fill.addColorStop(0.62, theme.sky[1]);
      fill.addColorStop(1, theme.haze);
      this.skies.set(world.stageIndex, fill);
    }
    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(world.camera.x - 40, -80, VIEW.w + 80, PHYS.waterline + 90);
    // A low band of squall cloud, drawn as slow horizontal smears.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = theme.far;
    for (let i = 0; i < 7; i += 1) {
      const y = 60 + i * 34;
      const drift = Math.sin(world.clock * 0.06 + i) * 40;
      roundRect(ctx, world.camera.x + drift - 60 + i * 130, y, 420, 16 - i, 8);
      ctx.fill();
    }
    ctx.restore();
  }

  // The far shore: cranes, warehouses and stacks, set back by their own parallax.
  drawRigs(world, ctx, cam) {
    let rigs = this.rigs.get(world.stageIndex);
    if (!rigs) {
      const rng = makeRng(0x51a9 + world.stageIndex * 31);
      rigs = [];
      for (let x = -200; x < world.stage.length + 400; x += rng.range(180, 320)) {
        rigs.push({
          x,
          w: rng.range(60, 150),
          h: rng.range(90, 230),
          crane: rng() < 0.45,
          masts: rng.int(1, 3),
        });
      }
      this.rigs.set(world.stageIndex, rigs);
    }
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = world.stage.theme.far;
    for (const rig of rigs) {
      const x = rig.x - cam.x * PARALLAX;
      if (x < -300 || x > VIEW.w + 300) continue;
      const base = PHYS.waterline - cam.y * 0.1;
      ctx.fillRect(x, base - rig.h, rig.w, rig.h);
      for (let i = 0; i < rig.masts; i += 1) {
        ctx.fillRect(x + 8 + i * 22, base - rig.h - 34, 5, 34);
      }
      if (rig.crane) {
        ctx.fillRect(x + rig.w - 12, base - rig.h - 60, 6, 60);
        ctx.fillRect(x + rig.w - 70, base - rig.h - 58, 66, 5);
      }
    }
    ctx.restore();
  }

  drawSea(world, ctx, cam) {
    const top = PHYS.waterline - cam.y * 0.04;
    ctx.save();
    ctx.fillStyle = world.stage.theme.sea;
    ctx.fillRect(cam.x - 60, top, VIEW.w + 120, VIEW.h);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = PALETTE.postLit;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const y = top + 16 + i * 16;
      ctx.beginPath();
      for (let x = cam.x - 40; x < cam.x + VIEW.w + 40; x += 26) {
        const wave = Math.sin(x * 0.012 + world.clock * (1.1 + i * 0.2) + i) * (3 + i);
        if (x === cam.x - 40) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.globalAlpha = 0.24 - i * 0.03;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the squall

  drawWinds(world, ctx) {
    ctx.save();
    for (const wind of world.winds) {
      const live = wind.ax !== 0 || wind.ay !== 0;
      if (!live) continue;
      const gust = 0.55 + 0.45 * Math.sin((world.clock / wind.period) * Math.PI * 2 + wind.phase);
      ctx.globalAlpha = 0.06 + gust * 0.06;
      ctx.fillStyle = PALETTE.spray;
      ctx.fillRect(wind.x, wind.y, wind.w, wind.h);
      ctx.globalAlpha = 0.3 + gust * 0.3;
      ctx.strokeStyle = PALETTE.spray;
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i += 1) {
        const y = wind.y + ((i * 57 + world.clock * gust * 90) % wind.h);
        const x = wind.x + ((i * 131 + world.clock * gust * 240) % wind.w);
        const lean = Math.sign(wind.ax) * 34;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + lean, y + 8);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawBolts(world, ctx) {
    for (const bolt of world.bolts) {
      const local = (world.clock + bolt.offset) % bolt.period;
      const striking = local > bolt.period - STRIKE;
      const charging = !striking && local > bolt.period - STRIKE - CHARGE;
      if (striking) {
        ctx.save();
        glowDot(ctx, bolt.x, 120, 150, 'rgba(220,242,255,0.55)');
        ctx.strokeStyle = PALETTE.bolt;
        ctx.shadowColor = PALETTE.bolt;
        ctx.shadowBlur = 26;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(bolt.x, 0);
        let x = bolt.x;
        for (let y = 0; y < PHYS.waterline; y += 52) {
          x += Math.sin(y * 0.07) * 13;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.lineWidth = 12;
        ctx.globalAlpha = 0.25;
        ctx.stroke();
        ctx.restore();
        glowDot(ctx, bolt.x, PHYS.waterline - 6, 60, 'rgba(220,242,255,0.5)');
      } else if (charging) {
        const heat = 1 - (local - (bolt.period - STRIKE - CHARGE)) / CHARGE;
        ctx.save();
        ctx.globalAlpha = 0.22 + heat * 0.4 * (0.6 + 0.4 * Math.sin(world.clock * 40));
        ctx.strokeStyle = PALETTE.spray;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([12, 14]);
        ctx.beginPath();
        ctx.moveTo(bolt.x, 0);
        ctx.lineTo(bolt.x, PHYS.waterline);
        ctx.stroke();
        ctx.restore();
        glowDot(ctx, bolt.x, 90, 60 + heat * 70, 'rgba(190,230,255,0.35)');
      }
    }
  }

  // ---------------------------------------------------------------- the harbour

  drawMasts(world, ctx) {
    const aimed = world.aimTarget;
    for (const mast of world.masts) {
      const base = PHYS.waterline;
      ctx.save();
      ctx.fillStyle = PALETTE.post;
      ctx.fillRect(mast.x - 11, mast.y, 22, base - mast.y);
      ctx.fillStyle = PALETTE.postEdge;
      ctx.fillRect(mast.x - 11, mast.y, 5, base - mast.y);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = PALETTE.beam;
      for (let y = mast.y + 60; y < base - 20; y += 74) ctx.fillRect(mast.x - 34, y, 68, 7);
      ctx.restore();

      if (mast.kind === 'crane') {
        ctx.save();
        ctx.strokeStyle = PALETTE.postEdge;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(mast.x, mast.y - 46);
        ctx.lineTo(mast.x + 74, mast.y - 74);
        ctx.stroke();
        ctx.restore();
      } else if (mast.kind === 'boom') {
        ctx.save();
        ctx.strokeStyle = PALETTE.postEdge;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(mast.x, mast.y - 4);
        ctx.lineTo(mast.x - 96, mast.y - 44);
        ctx.stroke();
        ctx.restore();
      }

      const hot = aimed === mast ? 1 : 0;
      glowDot(ctx, mast.x, mast.y, 62 + hot * 34, hot ? 'rgba(255,216,138,0.75)' : 'rgba(255,196,90,0.45)');
      ctx.save();
      ctx.fillStyle = PALETTE.lamp;
      ctx.shadowColor = PALETTE.lampSoft;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(mast.x, mast.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = PALETTE.rope;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mast.x, mast.y - 15, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (hot) {
        ctx.save();
        ctx.strokeStyle = PALETTE.lamp;
        ctx.lineWidth = 2.4;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(mast.x, mast.y, 30 + Math.sin(world.clock * 6) * 3, world.clock * 2, world.clock * 2 + 2.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mast.x, mast.y, 30 + Math.sin(world.clock * 6) * 3, world.clock * 2 + Math.PI, world.clock * 2 + Math.PI + 2.1);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawCrates(world, ctx) {
    for (const crate of world.crates) {
      if (crate.taken) continue;
      // The same bob the pickup test uses, so what the player sees is what they collect.
      const y = crate.y + Math.sin(world.clock * 1.6 + crate.phase) * 6;
      ctx.save();
      glowDot(ctx, crate.x, y, 40, 'rgba(255,181,69,0.32)');
      ctx.fillStyle = PALETTE.crate;
      ctx.shadowColor = PALETTE.crateEdge;
      ctx.shadowBlur = 8;
      roundRect(ctx, crate.x - 15, y - 15, 30, 30, 5);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = PALETTE.crateStrap;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(crate.x - 15, y - 5);
      ctx.lineTo(crate.x + 15, y - 5);
      ctx.moveTo(crate.x - 15, y + 6);
      ctx.lineTo(crate.x + 15, y + 6);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawBeacon(world, ctx) {
    const { x, y } = world.beacon;
    const base = PHYS.waterline;
    ctx.save();
    ctx.strokeStyle = PALETTE.postEdge;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 26, base);
    ctx.lineTo(x - 10, y);
    ctx.moveTo(x + 26, base);
    ctx.lineTo(x + 10, y);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = 1; i < 6; i += 1) {
      const at = i / 6;
      const left = x - 26 + 16 * at;
      const right = x + 26 - 16 * at;
      const yy = base - (base - y) * at;
      ctx.beginPath();
      ctx.moveTo(left, yy);
      ctx.lineTo(right, yy);
      ctx.stroke();
    }
    const sweep = world.clock * 0.9;
    for (const side of [0, Math.PI]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sweep + side);
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = PALETTE.beacon;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(760, -110);
      ctx.lineTo(760, 110);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    glowDot(ctx, x, y, 130, 'rgba(143,230,255,0.45)');
    ctx.fillStyle = PALETTE.beaconCore;
    ctx.shadowColor = PALETTE.beacon;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- the line and its linehand

  drawAim(world, ctx) {
    if (world.rope.latched) return;
    const point = world.aimPoint;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = PALETTE.rope;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(world.player.x, world.player.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();
    if (world.aimTarget) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = PALETTE.rope;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(world.aimTarget.x, world.aimTarget.y, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawLine(world, ctx) {
    const rope = world.rope;
    if (!rope.latched) return;
    const a = rope.anchor;
    const p = world.player;
    const tension = rope.tension(p);
    const sag = (1 - tension) * rope.length * 0.34;
    ctx.save();
    ctx.strokeStyle = PALETTE.rope;
    ctx.lineWidth = 2 + tension * 1.6;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo((a.x + p.x) / 2, (a.y + p.y) / 2 + sag, p.x, p.y);
    ctx.stroke();
    if (tension > 0.985) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.fillStyle = PALETTE.rope;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawLinehand(world, ctx) {
    const p = world.player;
    const alpha = p.invuln > 0 ? 0.45 + 0.55 * Math.abs(Math.sin(world.clock * 16)) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    // The scarf: the line of the last swing, and where it is going next.
    ctx.strokeStyle = PALETTE.scarf;
    ctx.lineCap = 'round';
    for (let i = 1; i < p.scarf.length; i += 1) {
      const a = p.scarf[i - 1];
      const b = p.scarf[i];
      ctx.globalAlpha = alpha * (1 - i / (p.scarf.length + 2));
      ctx.lineWidth = 8 - i * 0.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    glowDot(ctx, p.x, p.y, 34, 'rgba(180,220,255,0.35)');
    ctx.fillStyle = PALETTE.linehand;
    ctx.shadowColor = '#8fc7ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.scarf;
    ctx.beginPath();
    ctx.arc(p.x + p.facing * 5, p.y - 1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.postEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - 8, p.y + 8);
    ctx.lineTo(p.x + 8, p.y - 6);
    ctx.stroke();
    ctx.restore();
  }

  drawParticles(world, ctx) {
    ctx.save();
    for (const p of world.particles) {
      const fade = Math.max(0, p.life / p.max);
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.color;
      if (p.kind === 'streak') {
        ctx.fillRect(p.x, p.y, 12, 1.5);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * fade, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawRain(world, ctx, cam) {
    ctx.save();
    ctx.strokeStyle = PALETTE.spray;
    ctx.lineWidth = 1;
    const span = VIEW.w + 720;
    for (const drop of world.rain) {
      const drift = (drop.x - cam.x * 0.18) % span;
      const x = drift < 0 ? drift + span : drift;
      const y = (drop.y + world.clock * drop.speed) % (VIEW.h + 60);
      ctx.globalAlpha = drop.alpha;
      ctx.beginPath();
      ctx.moveTo(x - 60, y - drop.length - 6);
      ctx.lineTo(x - 60 + drop.length * drop.slant * 3, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the HUD

  drawHud(world, ctx) {
    const stage = world.stage;
    panel(ctx, 18, 16, 470, 78, { radius: 14 });
    text(ctx, `${world.stageIndex + 1}. ${stage.name}`, 36, 52, { size: 27, weight: 700 });
    text(ctx, `stage ${world.stageIndex + 1}/${stageCount()} · salvage ${world.cratesTaken}/${world.cratesTotal}`, 36, 78, {
      size: 18,
      weight: 600,
      color: PALETTE.dim,
    });

    const share = world.timeLeft / stage.time;
    const low = share < 0.25;
    const color = share > 0.5 ? PALETTE.good : low ? PALETTE.bad : PALETTE.warn;
    bar(ctx, 36, 108, 430, 12, share, color);
    text(ctx, `squall  ${Math.ceil(world.timeLeft)}s`, 36, 146, { size: 19, weight: 700, color });

    text(ctx, `SCORE ${commas(world.score)}`, VIEW.w - 36, 54, { size: 30, weight: 700, align: 'right', color: PALETTE.lamp });
    text(ctx, `salvage aboard ${world.cratesTaken * PHYS.crateScore}`, VIEW.w - 36, 80, {
      size: 17,
      weight: 600,
      align: 'right',
      color: PALETTE.dim,
    });
    for (let i = 0; i < 3; i += 1) {
      const x = VIEW.w - 44 - i * 30;
      ctx.save();
      ctx.globalAlpha = i < world.lives ? 1 : 0.22;
      ctx.strokeStyle = i < world.lives ? PALETTE.scarf : PALETTE.faint;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(x, 112, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, 112, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    text(ctx, 'line', VIEW.w - 150, 118, { size: 15, weight: 600, align: 'right', color: PALETTE.dim });

    // The controls, while a hand is still learning them.
    if (world.stageIndex === 0 && world.timeLeft > world.stage.time - 14) {
      text(ctx, 'hold LEFT MOUSE on a lamp to hitch your line · A D pump · W S reel · SPACE kicks off', VIEW.w / 2, 190, {
        size: 19,
        weight: 600,
        align: 'center',
        color: PALETTE.text,
        alpha: 0.85,
        shadow: '#000000',
      });
    }
    if (world.notice) {
      const label = world.notice.text;
      ctx.save();
      ctx.globalAlpha = Math.min(1, world.notice.t);
      const w = Math.max(240, label.length * 16 + 90);
      panel(ctx, VIEW.w / 2 - w / 2, 224, w, 52, { radius: 26, edge: PALETTE.lamp, fill: 'rgba(10,16,30,0.82)' });
      text(ctx, label.toUpperCase(), VIEW.w / 2, 258, {
        size: 24,
        weight: 700,
        align: 'center',
        color: PALETTE.lamp,
      });
      ctx.restore();
    }
    text(ctx, 'P pause · R restart stage · M sound', 18, VIEW.h - 16, { size: 15, weight: 600, color: PALETTE.dim, alpha: 0.7 });
  }
}
