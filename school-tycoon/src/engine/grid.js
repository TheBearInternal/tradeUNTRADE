// Grid helpers. Tiles: null | 'hall' | roomInstanceId. Index = y * size + x.
import { ROOMS } from './config/index.js';

export const idx = (x, y, size) => y * size + x;

export function inBounds(x, y, w, h, size) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x + w <= size && y + h <= size;
}

// null when placeable, else 'bounds' | 'occupied'.
export function canPlace(grid, size, x, y, w, h) {
  if (!inBounds(x, y, w, h, size)) return 'bounds';
  for (let yy = y; yy < y + h; yy++) {
    const row = yy * size;
    for (let xx = x; xx < x + w; xx++) if (grid[row + xx] !== null) return 'occupied';
  }
  return null;
}

// Writes `value` over a room footprint. Mutates `grid` (callers pass a copy).
export function stamp(grid, size, x, y, w, h, value) {
  for (let yy = y; yy < y + h; yy++) {
    const row = yy * size;
    for (let xx = x; xx < x + w; xx++) grid[row + xx] = value;
  }
}

// In-bounds tile indices orthogonally adjacent to a footprint.
export function adjacentIndices(r, size) {
  const out = [];
  const { x, y, w, h } = r;
  for (let xx = x; xx < x + w; xx++) {
    if (y - 1 >= 0) out.push((y - 1) * size + xx);
    if (y + h < size) out.push((y + h) * size + xx);
  }
  for (let yy = y; yy < y + h; yy++) {
    if (x - 1 >= 0) out.push(yy * size + x - 1);
    if (x + w < size) out.push(yy * size + x + w);
  }
  return out;
}

export function officeOrigin(size) {
  const o = ROOMS.office;
  return { x: Math.floor((size - o.w) / 2), y: size - o.h };
}

// Fresh lot with the office at bottom-middle and a hallway stub leading up from it.
export function makeInitialLayout(size, stubLength) {
  const grid = new Array(size * size).fill(null);
  const o = ROOMS.office;
  const { x, y } = officeOrigin(size);
  const office = { id: 'r1', type: 'office', x, y, w: o.w, h: o.h, cost: 0 };
  stamp(grid, size, x, y, o.w, o.h, office.id);
  const sx = x + Math.floor(o.w / 2);
  for (let i = 1; i <= stubLength; i++) grid[(y - i) * size + sx] = 'hall';
  return { grid, rooms: { [office.id]: office } };
}

// Grows the lot, shifting everything so the office stays bottom-middle.
export function resizeGrid(grid, rooms, oldSize, newSize) {
  const a = officeOrigin(oldSize);
  const b = officeOrigin(newSize);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const out = new Array(newSize * newSize).fill(null);
  for (let y = 0; y < oldSize; y++) {
    for (let x = 0; x < oldSize; x++) {
      const v = grid[y * oldSize + x];
      if (v !== null) out[(y + dy) * newSize + x + dx] = v;
    }
  }
  const newRooms = {};
  for (const id in rooms) newRooms[id] = { ...rooms[id], x: rooms[id].x + dx, y: rooms[id].y + dy };
  return { grid: out, rooms: newRooms, dx, dy };
}

// BFS over hallway tiles. sources: indices with distance 0. allowed: optional Int16Array
// (only tiles with allowed[i] >= 0 may be visited). Returns Int16Array of distances (-1 = unreached).
export function hallBfs(grid, size, sources, allowed) {
  const n = size * size;
  const dist = new Int16Array(n).fill(-1);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (let k = 0; k < sources.length; k++) {
    const i = sources[k];
    if (dist[i] < 0 && grid[i] === 'hall' && (!allowed || allowed[i] >= 0)) {
      dist[i] = 0;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % size;
    const d = dist[i] + 1;
    const nb0 = x > 0 ? i - 1 : -1;
    const nb1 = x < size - 1 ? i + 1 : -1;
    const nb2 = i - size;
    const nb3 = i + size < n ? i + size : -1;
    const nbs = [nb0, nb1, nb2, nb3];
    for (let k = 0; k < 4; k++) {
      const j = nbs[k];
      if (j >= 0 && dist[j] < 0 && grid[j] === 'hall' && (!allowed || allowed[j] >= 0)) {
        dist[j] = d;
        queue[tail++] = j;
      }
    }
  }
  return dist;
}
