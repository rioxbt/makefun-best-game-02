// Every number that shapes how Halyard feels, and its palette, in one place: the linehand's
// physics, the line, the storm, the canvas, and the colours the renderer draws with.

export const VIEW = { w: 1280, h: 720 };

// The linehand: gravity, drag, pumping, the line itself, the launch and the safety rails.
export const PHYS = {
  gravity: 1400,      // px/s^2
  drag: 0.10,         // per second, so a long swing stays readable in the air
  airControl: 620,    // px/s^2 sideways when no line is latched
  pump: 1150,         // px/s^2 along the line's tangent when one is
  reel: 250,          // px/s the line shortens or lengthens
  minLine: 70,
  maxLine: 540,
  reach: 620,         // the furthest mast a thrown line finds
  launch: 300,        // the kick SPACE adds on release
  launchGain: 0.30,   // plus this much of the speed already carried
  launchMax: 780,
  haul: 0.3,          // of the incoming speed turned into the swing by a fresh hitch
  topSpeed: 1400,
  ceiling: 26,
  waterline: 688,
  invuln: 1.3,        // s of grace after a hit
  crateScore: 100,
  shareRadius: 46,    // how near a crate must be to come aboard
  beaconRadius: 120,
};

// A run: three lines (lives), three lines of rope per level is the ropewalk's own joke.
export const RULES = {
  lives: 3,
  starShares: [0.3, 0.65, 1],  // crates aboard for 1, 2 and 3 stars
  timeBonus: 12,               // score a second of the squall left
  clearBase: 500,
  starBonus: 250,
};

export const KEYS = {
  best: 'halyard.best',
  progress: 'halyard.progress',
};

// Night, salt and lamp light: one palette the whole game draws from.
export const INK = '#050810';
export const PALETTE = {
  post: '#22324a',
  postEdge: '#3f5f88',
  postLit: '#5b86b5',
  beam: '#2b3d57',
  lamp: '#ffd88a',
  lampSoft: '#ffb03a',
  rope: '#f0e2bd',
  crate: '#ffb545',
  crateEdge: '#b06c12',
  crateStrap: '#7d4a10',
  linehand: '#eef4ff',
  scarf: '#ff6b5a',
  scarfDim: '#a83b32',
  bolt: '#dcf2ff',
  beacon: '#8fe6ff',
  beaconCore: '#ffffff',
  text: '#e9f1ff',
  dim: '#8ea4c6',
  faint: '#4f6688',
  good: '#7ee0a1',
  warn: '#ffd05c',
  bad: '#ff6b6b',
  panel: 'rgba(7,12,24,0.86)',
  panelEdge: '#31486b',
  spark: '#ffd9a0',
  spray: '#bfe3ff',
};

// The sea and sky the game is set in, one theme for each stage of the run.
export const SHOTS_READY = '__shotReady';
export const FONT = 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
