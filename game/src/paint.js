// The drawing primitives the world and the menus share: text, panels, stars, bars, glows and
// rounded corners. Every one of them draws in the game's own 1280x720 coordinates.

import { FONT, PALETTE } from './config.js';

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function text(ctx, label, x, y, opts = {}) {
  const size = opts.size ?? 24;
  const weight = opts.weight ?? 600;
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = opts.baseline ?? 'alphabetic';
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (opts.shadow) {
    ctx.shadowColor = opts.shadow;
    ctx.shadowBlur = opts.blur ?? 12;
  }
  ctx.fillStyle = opts.color ?? PALETTE.text;
  ctx.fillText(label, x, y);
  ctx.restore();
}

export function panel(ctx, x, y, w, h, opts = {}) {
  ctx.save();
  roundRect(ctx, x, y, w, h, opts.radius ?? 18);
  ctx.fillStyle = opts.fill ?? PALETTE.panel;
  ctx.fill();
  ctx.lineWidth = opts.lineWidth ?? 2;
  ctx.strokeStyle = opts.edge ?? PALETTE.panelEdge;
  ctx.stroke();
  if (opts.glow) {
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = 26;
    ctx.stroke();
  }
  ctx.restore();
}

// One star of a stage's rating: hollow for the ones still to earn.
export function star(ctx, x, y, r, filled) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.44;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = PALETTE.lamp;
    ctx.shadowColor = PALETTE.lampSoft;
    ctx.shadowBlur = 16;
    ctx.fill();
  } else {
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = PALETTE.faint;
    ctx.stroke();
  }
  ctx.restore();
}

export function bar(ctx, x, y, w, h, fraction, color, back = 'rgba(255,255,255,0.13)') {
  ctx.save();
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = back;
  ctx.fill();
  const filled = Math.max(0, Math.min(1, fraction)) * w;
  if (filled > 1) {
    roundRect(ctx, x, y, filled, h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
}

export function glowDot(ctx, x, y, r, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const ring = ctx.createRadialGradient(x, y, 0, x, y, r);
  ring.addColorStop(0, color);
  ring.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// "1,608": score and time read far better in the HUD with separators.
export function commas(value) {
  return String(Math.max(0, Math.round(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
