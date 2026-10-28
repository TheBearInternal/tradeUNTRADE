// Pure isometric helpers for the interior editor (2:1 diamond projection).
// A cell (cx, cy) is a diamond whose TOP corner is project(cx, cy); its centre is
// project(cx + 0.5, cy + 0.5). +cx goes right-down on screen, +cy goes left-down.
//   tw, th: diamond width/height in px (e.g. 48, 24); ox, oy: screen position of cell (0,0)'s top corner.

export function project(cx, cy, tw, th, ox, oy) {
  return { x: (ox || 0) + ((cx - cy) * tw) / 2, y: (oy || 0) + ((cx + cy) * th) / 2 };
}

// Screen point -> the cell containing it (integers; may be outside the room, caller checks bounds).
export function unproject(sx, sy, tw, th, ox, oy) {
  const p = unprojectExact(sx, sy, tw, th, ox, oy);
  return { cx: Math.floor(p.cx + 1e-9), cy: Math.floor(p.cy + 1e-9) };
}

// Inverse of project() without flooring (fractional cell coordinates).
export function unprojectExact(sx, sy, tw, th, ox, oy) {
  const a = (sx - (ox || 0)) / (tw / 2);
  const b = (sy - (oy || 0)) / (th / 2);
  return { cx: (a + b) / 2, cy: (b - a) / 2 };
}

// The 4 screen corners of a w x h footprint at (cx, cy): [top, right, bottom, left].
export function footprintPolygon(cx, cy, w, h, tw, th, ox, oy) {
  return [
    project(cx, cy, tw, th, ox, oy),
    project(cx + w, cy, tw, th, ox, oy),
    project(cx + w, cy + h, tw, th, ox, oy),
    project(cx, cy + h, tw, th, ox, oy),
  ];
}

const rangesOverlap = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;

// Back-to-front draw order for non-overlapping footprints [{ cx, cy, w, h, ... }]
// (w/h default 1; pass the rotated size). Returns a new array; the input is not mutated.
// A must be drawn before B when A is entirely behind B on one axis while overlapping it on the
// other; remaining ties are broken by (cx + cy), then cy, then input order.
export function depthSort(items) {
  const n = items.length;
  const box = items.map((it, i) => ({
    it, i, x0: it.cx, y0: it.cy, x1: it.cx + (it.w || 1), y1: it.cy + (it.h || 1),
  }));
  const before = box.map(() => []);
  const indeg = new Array(n).fill(0);
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      if (a === b) continue;
      const A = box[a];
      const B = box[b];
      const behindX = A.x1 <= B.x0 && rangesOverlap(A.y0, A.y1, B.y0, B.y1);
      const behindY = A.y1 <= B.y0 && rangesOverlap(A.x0, A.x1, B.x0, B.x1);
      if (behindX || behindY) { before[a].push(b); indeg[b]++; }
    }
  }
  const key = (k) => box[k].x0 + box[k].y0 + (box[k].x1 - box[k].x0 + box[k].y1 - box[k].y0) / 2;
  const cmp = (p, q) => (key(p) - key(q)) || (box[p].y0 - box[q].y0) || (p - q);
  const ready = [];
  for (let k = 0; k < n; k++) if (indeg[k] === 0) ready.push(k);
  const out = [];
  const done = new Array(n).fill(false);
  while (ready.length) {
    ready.sort(cmp);
    const k = ready.shift();
    done[k] = true;
    out.push(box[k].it);
    for (const m of before[k]) if (--indeg[m] === 0) ready.push(m);
  }
  if (out.length < n) { // cycles cannot happen for disjoint boxes; stay total anyway
    const rest = [];
    for (let k = 0; k < n; k++) if (!done[k]) rest.push(k);
    rest.sort(cmp);
    for (const k of rest) out.push(box[k].it);
  }
  return out;
}
