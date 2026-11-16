// Keyboard and mouse for the linehand: which keys are held, which were tapped this frame, and
// where the pointer is in the game's own 1280x720 coordinates, so aiming the line works at any
// window size.

import { VIEW } from './config.js';

const SWALLOW = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.tapped = new Set();
    this.pointer = { x: VIEW.w * 0.5, y: VIEW.h * 0.5 };
    this.aiming = false;      // left mouse button down
    this.pointerUsed = false; // the player has moved the mouse at least once
    this.pointerMoved = 0;    // seconds since the pointer last moved, for keyboard-only play

    window.addEventListener('keydown', (event) => {
      if (SWALLOW.has(event.code)) event.preventDefault();
      if (event.repeat) return;
      this.held.add(event.code);
      this.tapped.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.held.delete(event.code));
    window.addEventListener('blur', () => {
      this.held.clear();
      this.aiming = false;
    });

    canvas.addEventListener('pointermove', (event) => {
      this.aim(event);
      this.pointerUsed = true;
      this.pointerMoved = 0;
    });
    canvas.addEventListener('pointerdown', (event) => {
      this.aim(event);
      canvas.setPointerCapture?.(event.pointerId);
      if (event.button === 0) {
        this.aiming = true;
        this.tapped.add('Mouse0');
      } else if (event.button === 2) {
        this.tapped.add('Mouse2');
      }
      this.pointerUsed = true;
    });
    const up = (event) => {
      if (event.button === 0) this.aiming = false;
      else if (event.button === 2) this.tapped.add('Mouse2Released');
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', () => { this.aiming = false; });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    canvas.addEventListener('click', () => this.tapped.add('Click'));
  }

  // Where the pointer is in game coordinates: the canvas fills the window and is letterboxed by
  // main.js, so the rect is all the mapping that is needed.
  aim(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * VIEW.w;
    this.pointer.y = ((event.clientY - rect.top) / rect.height) * VIEW.h;
  }

  isDown(code) {
    return this.held.has(code);
  }

  tap(code) {
    return this.tapped.has(code);
  }

  // Left or right, from either the arrows or A and D: the swing is played with both hands.
  steer() {
    let x = 0;
    if (this.isDown('ArrowLeft') || this.isDown('KeyA')) x -= 1;
    if (this.isDown('ArrowRight') || this.isDown('KeyD')) x += 1;
    return x;
  }

  // W and S shorten and lengthen the line.
  reel() {
    let x = 0;
    if (this.isDown('ArrowUp') || this.isDown('KeyW')) x -= 1;
    if (this.isDown('ArrowDown') || this.isDown('KeyS')) x += 1;
    return x;
  }

  // Confirm: Space, Enter or a left click, on the menus and to read the results.
  confirm() {
    return this.tap('Space') || this.tap('Enter') || this.tap('Mouse0') || this.tap('Click');
  }

  // The line is thrown with the left mouse button, or with E and Shift for keyboard-only hands.
  latchHeld() {
    return this.aiming || this.isDown('KeyE') || this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  // Release with the kick: let go of the button, tap SPACE, or tap the right mouse button.
  releaseTapped() {
    return this.tap('Space') || this.tap('Mouse2');
  }

  tick(dt) {
    this.pointerMoved += dt;
  }

  endFrame() {
    this.tapped.clear();
  }
}
