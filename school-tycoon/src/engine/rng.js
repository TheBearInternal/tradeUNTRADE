// mulberry32 PRNG. The state is a uint32 stored in game.rng, so the sim stays deterministic.
export function seedToRng(seed) {
  const s = (Math.floor(Number(seed) || 0) >>> 0) ^ 0x9e3779b9;
  return s >>> 0;
}

// Returns { value in [0,1), state }.
export function rngNext(state) {
  const a = ((state >>> 0) + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: a >>> 0 };
}
