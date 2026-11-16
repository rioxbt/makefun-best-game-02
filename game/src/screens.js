// The panels the player reads: the harbour title with its stage select, the stage-clear and
// run-over results, the win, and the pause card. screens.js draws over the world the renderer has
// already drawn, and reads the run's numbers from the world.

import { PALETTE, PHYS, RULES, VIEW } from './config.js';
import { LEVELS } from './level.js';
import { commas, glowDot, panel, star, text } from './paint.js';

export class Screens {
  draw(world, ctx) {
    if (world.screen === 'title') this.drawTitle(world, ctx);
    else if (world.screen === 'clear') this.drawClear(world, ctx);
    else if (world.screen === 'over') this.drawOver(world, ctx);
    else if (world.screen === 'win') this.drawWin(world, ctx);
    if (world.screen === 'playing' && world.paused) this.drawPause(world, ctx);
  }

  scrim(ctx, alpha, tint = '#04070f') {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.globalAlpha = Math.min(1, alpha + 0.25);
    const shade = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    shade.addColorStop(0, 'rgba(4,7,15,0.9)');
    shade.addColorStop(0.5, 'rgba(4,7,15,0.1)');
    shade.addColorStop(1, 'rgba(4,7,15,0.92)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.restore();
  }

  blink(world, period = 1.4) {
    return 0.45 + 0.55 * Math.abs(Math.sin((world.clock / period) * Math.PI));
  }

  // ---------------------------------------------------------------- title

  drawTitle(world, ctx) {
    this.scrim(ctx, 0.42);
    const mid = VIEW.w / 2;
    glowDot(ctx, mid, 138, 320, 'rgba(255,196,90,0.13)');
    text(ctx, 'HALYARD', mid, 158, {
      size: 104,
      weight: 800,
      align: 'center',
      color: PALETTE.text,
      shadow: PALETTE.lampSoft,
      blur: 34,
    });
    text(ctx, 'storm-line salvage on the Farrow coast', mid, 200, {
      size: 25,
      weight: 600,
      align: 'center',
      color: PALETTE.lamp,
    });
    text(ctx, `best ${commas(world.best)}   ·   stars ${world.totalStars}/${LEVELS.length * 3}`, mid, 236, {
      size: 19,
      weight: 600,
      align: 'center',
      color: PALETTE.dim,
    });

    const wide = 188;
    const gap = 14;
    const startX = mid - (wide * LEVELS.length + gap * (LEVELS.length - 1)) / 2;
    for (let i = 0; i < LEVELS.length; i += 1) {
      const x = startX + i * (wide + gap);
      const locked = i > world.unlocked;
      const chosen = i === world.pick;
      panel(ctx, x, 268, wide, 106, {
        radius: 14,
        edge: chosen ? PALETTE.lamp : PALETTE.panelEdge,
        fill: locked ? 'rgba(8,12,22,0.7)' : chosen ? 'rgba(24,34,54,0.92)' : 'rgba(10,16,30,0.78)',
        glow: chosen ? PALETTE.lampSoft : null,
      });
      text(ctx, `${i + 1}`, x + 18, 300, { size: 22, weight: 800, color: locked ? PALETTE.faint : PALETTE.lamp });
      text(ctx, LEVELS[i].name.toUpperCase(), x + 18, 326, {
        size: 19,
        weight: 700,
        color: locked ? PALETTE.faint : PALETTE.text,
      });
      text(ctx, locked ? 'locked' : `${LEVELS[i].time}s of squall`, x + 18, 350, {
        size: 15,
        weight: 600,
        color: locked ? PALETTE.faint : PALETTE.dim,
      });
      for (let s = 0; s < 3; s += 1) star(ctx, x + 34 + s * 34, 358, 13, world.stars[i] > s);
    }

    panel(ctx, mid - 500, 400, 1000, 158, { radius: 16 });
    const rows = [
      ['LEFT MOUSE, held', 'hitch the line to a mast lamp — let go and you fly'],
      ['A D  or  ← →', 'pump the swing, either way'],
      ['W S  or  ↑ ↓', 'shorten and lengthen the line'],
      ['SPACE  or  right click', 'kick off the line for height and distance'],
    ];
    rows.forEach(([keys, action], i) => {
      const y = 432 + i * 32;
      text(ctx, keys, mid - 460, y, { size: 20, weight: 700, color: PALETTE.lamp });
      text(ctx, action, mid - 160, y, { size: 20, weight: 600, color: PALETTE.text });
    });
    text(ctx, 'three lines, five stages, and the beacon at Farrow Point to light', mid, 584, {
      size: 18,
      weight: 600,
      align: 'center',
      color: PALETTE.lamp,
    });

    ctx.save();
    ctx.globalAlpha = this.blink(world);
    text(ctx, 'PRESS SPACE TO SAIL', mid, 628, {
      size: 34,
      weight: 800,
      align: 'center',
      color: PALETTE.lamp,
      shadow: PALETTE.lampSoft,
      blur: 22,
    });
    ctx.restore();
    text(ctx, `stage ${world.pick + 1} of ${LEVELS.length} chosen · salvage aboard for up to three stars a stage`, mid, 668, {
      size: 17,
      weight: 600,
      align: 'center',
      color: PALETTE.dim,
    });
    text(ctx, 'a game made for the make.fun best-game bounty', mid, 700, {
      size: 14,
      weight: 600,
      align: 'center',
      color: PALETTE.faint,
    });
  }

  // ---------------------------------------------------------------- a stage cleared

  drawClear(world, ctx) {
    this.scrim(ctx, 0.5);
    const w = 780;
    const x = (VIEW.w - w) / 2;
    panel(ctx, x, 96, w, 528, { radius: 20, edge: PALETTE.lamp, glow: PALETTE.lampSoft });
    const stage = LEVELS[world.stageIndex];
    text(ctx, `${stage.name.toUpperCase()} — CLEARED`, VIEW.w / 2, 172, {
      size: 42,
      weight: 800,
      align: 'center',
      color: PALETTE.lamp,
      shadow: PALETTE.lampSoft,
      blur: 20,
    });
    for (let i = 0; i < 3; i += 1) star(ctx, VIEW.w / 2 - 74 + i * 74, 240, 30, world.lastStars > i);

    const rows = [
      ['salvage aboard', `${world.cratesTaken} of ${world.cratesTotal}`, `+${commas(world.cratesTaken * PHYS.crateScore)}`],
      ['squall left', `${Math.ceil(world.timeLeft)}s`, `+${commas(world.lastTimeBonus)}`],
      ['clear bonus', `stage ${world.stageIndex + 1}`, `+${commas(RULES.clearBase)}`],
      ['star bonus', `${world.lastStars} of 3`, `+${commas(world.lastStars * RULES.starBonus)}`],
    ];
    rows.forEach(([label, mid, right], i) => {
      const y = 312 + i * 40;
      text(ctx, label, x + 60, y, { size: 20, weight: 600, color: PALETTE.dim });
      text(ctx, mid, VIEW.w / 2, y, { size: 20, weight: 700, align: 'center', color: PALETTE.text });
      text(ctx, right, x + w - 60, y, { size: 20, weight: 700, align: 'right', color: PALETTE.lamp });
    });
    ctx.save();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 50, 486);
    ctx.lineTo(x + w - 50, 486);
    ctx.stroke();
    ctx.restore();
    text(ctx, 'RUN SCORE', x + 60, 530, { size: 22, weight: 700, color: PALETTE.dim });
    text(ctx, commas(world.score), x + w - 60, 532, { size: 40, weight: 800, align: 'right', color: PALETTE.text });

    ctx.save();
    ctx.globalAlpha = this.blink(world);
    text(ctx, `ENTER — stage ${world.stageIndex + 2} of ${LEVELS.length}: ${LEVELS[world.stageIndex + 1].name}`, VIEW.w / 2, 566, {
      size: 24,
      weight: 700,
      align: 'center',
      color: PALETTE.lamp,
    });
    ctx.restore();
    text(ctx, 'R replay stage · P pause · M sound', VIEW.w / 2, 600, {
      size: 17,
      weight: 600,
      align: 'center',
      color: PALETTE.dim,
    });
  }

  // ---------------------------------------------------------------- a run lost

  drawOver(world, ctx) {
    this.scrim(ctx, 0.62, '#120407');
    const w = 800;
    const x = (VIEW.w - w) / 2;
    panel(ctx, x, 110, w, 480, { radius: 20, edge: PALETTE.bad, glow: 'rgba(255,107,107,0.8)' });
    text(ctx, 'THE SQUALL TOOK YOUR LINE', VIEW.w / 2, 190, {
      size: 40,
      weight: 800,
      align: 'center',
      color: PALETTE.bad,
      shadow: '#ff6b6b',
      blur: 22,
    });
    text(ctx, `three lines run, and the last one parted at ${LEVELS[world.stageIndex].name}`, VIEW.w / 2, 224, {
      size: 19,
      weight: 600,
      align: 'center',
      color: PALETTE.dim,
    });
    const rows = [
      ['stages cleared', `${Math.min(world.stageIndex, LEVELS.length)} of ${LEVELS.length}`],
      ['salvage brought in', `${world.runCrates} crates`],
      ['run score', commas(world.score)],
      ['best score', commas(world.best)],
      ['stars earned', `${world.totalStars} of ${LEVELS.length * 3}`],
    ];
    rows.forEach(([label, value], i) => {
      const y = 288 + i * 42;
      text(ctx, label, x + 70, y, { size: 21, weight: 600, color: PALETTE.dim });
      text(ctx, value, x + w - 70, y, { size: 21, weight: 700, align: 'right', color: PALETTE.text });
    });
    ctx.save();
    ctx.globalAlpha = this.blink(world);
    text(ctx, 'R — SAIL THE RUN AGAIN', VIEW.w / 2, 528, {
      size: 28,
      weight: 800,
      align: 'center',
      color: PALETTE.lamp,
      shadow: PALETTE.lampSoft,
      blur: 18,
    });
    ctx.restore();
    text(ctx, 'ENTER — back to the harbour', VIEW.w / 2, 566, {
      size: 18,
      weight: 600,
      align: 'center',
      color: PALETTE.dim,
    });
  }

  // ---------------------------------------------------------------- every lamp lit

  drawWin(world, ctx) {
    this.scrim(ctx, 0.55, '#1a0f14');
    const w = 860;
    const x = (VIEW.w - w) / 2;
    panel(ctx, x, 76, w, 572, { radius: 20, edge: PALETTE.lamp, glow: PALETTE.lampSoft });
    glowDot(ctx, VIEW.w / 2, 130, 260, 'rgba(255,196,90,0.16)');
    text(ctx, 'FARROW POINT BURNS AGAIN', VIEW.w / 2, 164, {
      size: 44,
      weight: 800,
      align: 'center',
      color: PALETTE.lamp,
      shadow: PALETTE.lampSoft,
      blur: 26,
    });
    text(ctx, 'five stages swum, every crate you could reach, the coast lit end to end', VIEW.w / 2, 200, {
      size: 19,
      weight: 600,
      align: 'center',
      color: PALETTE.text,
    });
    LEVELS.forEach((stage, i) => {
      const y = 262 + i * 42;
      text(ctx, `${i + 1}. ${stage.name}`, x + 80, y, { size: 21, weight: 700, color: PALETTE.text });
      for (let s = 0; s < 3; s += 1) star(ctx, x + w - 260 + s * 46, y - 7, 17, world.stars[i] > s);
      text(ctx, `${world.stars[i]}/3`, x + w - 80, y, { size: 19, weight: 700, align: 'right', color: PALETTE.dim });
    });
    text(ctx, `stars ${world.totalStars} of ${LEVELS.length * 3}`, x + 80, 484, { size: 24, weight: 700, color: PALETTE.lamp });
    text(ctx, `run score ${commas(world.score)}`, x + w - 80, 484, {
      size: 24,
      weight: 700,
      align: 'right',
      color: PALETTE.text,
    });
    text(ctx, `best ${commas(world.best)}`, VIEW.w / 2, 522, { size: 19, weight: 600, align: 'center', color: PALETTE.dim });
    ctx.save();
    ctx.globalAlpha = this.blink(world);
    text(ctx, 'R — SAIL AGAIN FOR A CLEANER RUN', VIEW.w / 2, 580, {
      size: 26,
      weight: 800,
      align: 'center',
      color: PALETTE.lamp,
      shadow: PALETTE.lampSoft,
      blur: 18,
    });
    ctx.restore();
    text(ctx, 'ENTER — title screen', VIEW.w / 2, 618, { size: 18, weight: 600, align: 'center', color: PALETTE.dim });
  }

  // ---------------------------------------------------------------- pause

  drawPause(world, ctx) {
    this.scrim(ctx, 0.5);
    panel(ctx, VIEW.w / 2 - 300, 210, 600, 300, { radius: 20 });
    text(ctx, 'PAUSED', VIEW.w / 2, 292, { size: 46, weight: 800, align: 'center', color: PALETTE.text });
    const rows = [
      ['hold LEFT MOUSE on a lamp', 'hitch the line'],
      ['A D or ← →', 'pump the swing'],
      ['W S or ↑ ↓', 'shorten · lengthen'],
      ['SPACE or right button', 'kick off the line'],
      ['P resume · R restart · M sound', ''],
    ];
    rows.forEach(([left, right], i) => {
      const y = 344 + i * 32;
      text(ctx, left, VIEW.w / 2 - 260, y, { size: 19, weight: 600, color: PALETTE.text });
      text(ctx, right, VIEW.w / 2 + 260, y, { size: 19, weight: 600, align: 'right', color: PALETTE.dim });
    });
  }
}
