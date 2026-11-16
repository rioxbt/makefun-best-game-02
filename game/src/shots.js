// The four scenes the entry's screenshots are taken from: ?shot=start, play, clear or over, with
// ?seed= for the strike timings. A scene is built from the game's own stage data and drawn by the
// game's own renderer, with the simulation held still, so the shots are real renders of the code.

import { PHYS, RULES } from './config.js';
import { LEVELS } from './level.js';
import { SCREEN } from './world.js';

export const SHOTS = ['start', 'play', 'clear', 'over'];

export function applyShot(world, name, seed = 1) {
  if (name === 'play') return playShot(world, seed);
  if (name === 'clear') return clearShot(world);
  if (name === 'over') return overShot(world);
  return titleShot(world);
}

// The title screen, with a harbour's worth of progress already earned.
function titleShot(world) {
  world.screen = SCREEN.title;
  world.stars = [3, 3, 2, 0, 0];
  world.unlocked = 2;
  world.best = 9420;
  world.pick = 1;
  world.load(1, true);
  world.screen = SCREEN.title;
}

// Stage 3, mid-swing: a line to the Ropewalk's fourth mast, the beacon in sight, a salvage crate
// ahead and a strike already down on the left.
function playShot(world, seed) {
  const index = seed % 2 === 0 ? 2 : 3;
  world.stars = [3, 2, 1, 0, 0];
  world.unlocked = 3;
  world.best = 9420;
  world.pick = index;
  world.newRun();
  world.begin(index);
  const stage = world.stage;
  world.clock = 2.5 + seed * 0.37;
  world.timeLeft = stage.time * 0.42;

  const mast = world.masts[world.masts.length - 2];
  world.player.blip(mast.x + 118, mast.y + 236);
  world.player.vx = 560;
  world.player.vy = -210;
  world.player.facing = 1;
  world.player.invuln = 0;
  for (const node of world.player.scarf) {
    node.x -= 88;
    node.y += 26;
  }
  world.rope.latch(mast, world.player);
  world.rope.length = Math.min(world.rope.length, 268);
  world.aimTarget = null;
  world.aimPoint = { x: world.player.x + 240, y: world.player.y - 90 };
  world.camera.jump(world.player, stage.length);
  world.camera.x = Math.min(stage.length - 1280, world.player.x - 540);
  world.camera.shake = 0.18;
  world.notice = null;

  // Every crate the linehand has passed is aboard; the ones ahead still hang in the frame, so the
  // shot shows what the run is for.
  const aboard = world.crates.filter((crate) => crate.x < world.player.x - 380);
  for (const crate of aboard) crate.taken = true;
  world.cratesTaken = aboard.length;
  world.runCrates = aboard.length + 6;
  world.score = 400 + aboard.length * PHYS.crateScore + 1180;
  world.lives = 2;

  // Hold the frame at the moment the nearest strike is down: the scene the player actually fears.
  const near = world.bolts.reduce((best, bolt) => (Math.abs(bolt.x - world.player.x) < Math.abs(best.x - world.player.x) ? bolt : best));
  world.clock = near.period - 0.13 - near.offset + near.period * 4;
  world.burst(world.player.x - 26, world.player.y + 16, 8, '#cfe6ff');
}

// Stage 2 taken cleanly: three stars and the score breakdown.
function clearShot(world) {
  world.stars = [3, 2, 0, 0, 0];
  world.unlocked = 1;
  world.best = 9420;
  world.pick = 2;
  world.newRun();
  world.begin(1);
  world.clock = 4.2;
  world.timeLeft = 41;
  for (const crate of world.crates) crate.taken = true;
  world.cratesTaken = world.crates.length;
  world.runCrates = world.crates.length + 4;
  world.score = 2180;
  world.lives = 3;
  world.lastStars = 3;
  world.lastTimeBonus = 41 * RULES.timeBonus;
  world.lastBonus = RULES.clearBase + world.lastTimeBonus + 3 * RULES.starBonus;
  world.bonus = world.lastBonus;
  world.score += world.bonus;
  world.player.blip(world.beacon.x - 30, world.beacon.y + 10);
  world.camera.jump(world.player, world.stage.length);
  world.screen = SCREEN.clear;
}

// A run ended: the panel names the stage the last line parted at.
function overShot(world) {
  world.stars = [3, 2, 0, 0, 0];
  world.unlocked = 3;
  world.best = 9420;
  world.newRun();
  world.begin(2);
  world.clock = 5.6;
  world.score = 2340;
  world.runCrates = 12;
  world.lives = 0;
  world.cratesTaken = 5;
  world.timeLeft = 0.4;
  world.player.blip(world.masts[7].x + 40, PHYS.waterline - 30);
  world.camera.jump(world.player, world.stage.length);
  world.notice = null;
  world.screen = SCREEN.over;
}

export function stageName(index) {
  return LEVELS[index]?.name ?? '';
}
