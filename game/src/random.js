// A small seeded generator: the scenery, the squall's gusts and the screenshot scenes all come
// from one, so a scene draws the same way twice and the game never calls Math.random.

export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  const rng = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (lo, hi) => lo + rng() * (hi - lo);
  rng.int = (lo, hi) => Math.floor(rng.range(lo, hi + 1));
  rng.pick = (list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  return rng;
}

// A steady stream of rain drops, fixed for the whole game so the sky never flickers oddly.
export function makeRain(rng, count, width, height) {
  const drops = [];
  for (let i = 0; i < count; i += 1) {
    drops.push({
      x: rng.range(-width * 0.2, width * 1.2),
      y: rng.range(0, height),
      speed: rng.range(520, 900),
      slant: rng.range(0.1, 0.24),
      length: rng.range(9, 22),
      alpha: rng.range(0.1, 0.34),
    });
  }
  return drops;
}
