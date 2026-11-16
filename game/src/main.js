// The way in: one canvas, one world, one frame loop. main.js wires the input, the renderer, the
// panels and the sound together, keeps the canvas a 16:9 letterbox, and answers ?shot=<scene> by
// building one of the entry's screenshot scenes and holding it still for the camera.

import { Audio } from './audio.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { Screens } from './screens.js';
import { SHOTS, applyShot } from './shots.js';
import { SCREEN, World } from './world.js';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = new World();
const audio = new Audio();
const view = new Renderer(canvas);
const screens = new Screens();
const input = new Input(canvas);
world.audio = audio;

const params = new URLSearchParams(window.location.search);
const shot = SHOTS.includes(params.get('shot') ?? '') ? params.get('shot') : null;
const seed = Number(params.get('seed')) || 1;

view.resize();
window.addEventListener('resize', () => view.resize());

// Sound starts on the player's first touch of the page, as browsers require.
const wake = () => audio.ensure();
window.addEventListener('pointerdown', wake, { once: true });
window.addEventListener('keydown', wake, { once: true });

const SAY = {
  [SCREEN.title]: 'Halyard. Title screen. Pick a stage with the arrow keys, then press space to sail.',
  [SCREEN.playing]: 'Stage under way. Hitch the line with the mouse, pump the swing with A and D.',
  [SCREEN.clear]: 'Stage cleared. Press enter for the next stage.',
  [SCREEN.over]: 'The run is over. Press R to sail again.',
  [SCREEN.win]: 'Farrow Point is lit. The run is won.',
};
let announced = null;

if (shot) applyShot(world, shot, seed);

// A handle on the live run: the console (and a playtest driving real key and mouse events) can read
// where the linehand is, what it is latched to and which panel is up.
window.halyard = { world, view, screens, input, audio };

let last = performance.now();
let prepared = 0;
let ready = false;

function frame(now) {
  const dt = Math.min(1 / 20, Math.max(0, (now - last) / 1000));
  last = now;
  if (shot) {
    // A screenshot scene: the world is built once and drawn still.
    input.endFrame();
    prepared += 1;
  } else {
    world.update(dt, input);
  }
  view.draw(world);
  screens.draw(world, view.ctx);
  if (status && announced !== world.screen) {
    announced = world.screen;
    status.textContent = SAY[world.screen] ?? '';
  }
  if (shot && !ready && prepared > 2) {
    ready = true;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
