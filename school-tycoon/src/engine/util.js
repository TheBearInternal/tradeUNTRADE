export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const isInt = (v) => typeof v === 'number' && Number.isInteger(v);
// Own-key lookup guard: config maps are plain objects, so ids like 'constructor' must not resolve.
export const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export const idNum = (id) => {
  const n = parseInt(String(id).slice(1), 10);
  return Number.isFinite(n) ? n : 0;
};
export const byIdNum = (a, b) => idNum(a) - idNum(b);

// Appends to the log of an already-copied game object (mutates g.log reference only).
export function pushLog(g, text, kind, size) {
  const log = g.log ? g.log.slice(-(size - 1)) : [];
  log.push({ day: g.day, text, kind: kind || 'info' });
  g.log = log;
}
