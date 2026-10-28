import * as E from '../src/engine/index.js';

export { E };
export const A = E.actions;

// Applies actions and asserts each one was valid (changed the root).
export function run(root, ...acts) {
  let r = root;
  for (const a of acts) {
    const n = E.reduce(r, a);
    if (n === r) throw new Error(`action was rejected: ${JSON.stringify(a)}`);
    r = n;
  }
  return r;
}

export function days(root, n) {
  let r = root;
  for (let i = 0; i < n; i++) r = E.reduce(r, A.tick(24));
  return r;
}

export const hallRow = (y, x0, x1) => {
  const cells = [];
  for (let x = x0; x <= x1; x++) cells.push({ x, y });
  return cells;
};
export const hallCol = (x, y0, y1) => {
  const cells = [];
  for (let y = y0; y <= y1; y++) cells.push({ x, y });
  return cells;
};

// DESIGN starter school on the 16x16 lot: office at x6..8,y14..15, stub (7,11..13).
export function starterSchool(seed = 12345) {
  return run(
    E.createInitialState(seed),
    A.buildHallLine(hallRow(10, 3, 11)),
    A.build('classroom', 3, 7),
    A.build('classroom', 9, 7),
    A.build('restroom', 7, 8),
    A.hire('teacher', 'rookie'),
    A.hire('teacher', 'rookie'),
    A.hire('janitor'),
  );
}

// Removes weekly goals so exact cash/XP comparisons are not disturbed by goal rewards.
export function quiet(root) {
  return { game: { ...root.game, weekly: { week: root.game.weekly.week, goals: [] } }, ledger: root.ledger };
}

export function withGame(root, patch) {
  return { game: { ...root.game, ...patch }, ledger: root.ledger };
}

// Grid <-> rooms consistency; returns a list of problems.
export function gridProblems(game) {
  const out = [];
  const { grid, rooms, size } = game;
  if (grid.length !== size * size) out.push('grid length');
  const seen = {};
  for (let i = 0; i < grid.length; i++) {
    const v = grid[i];
    if (v === null || v === 'hall') continue;
    const r = rooms[v];
    if (!r) { out.push(`orphan tile ${v}@${i}`); continue; }
    const x = i % size;
    const y = Math.floor(i / size);
    if (x < r.x || x >= r.x + r.w || y < r.y || y >= r.y + r.h) out.push(`tile outside footprint ${v}`);
    seen[v] = (seen[v] || 0) + 1;
  }
  for (const id in rooms) {
    const r = rooms[id];
    if (r.id !== id) out.push(`id mismatch ${id}`);
    if (seen[id] !== r.w * r.h) out.push(`footprint count ${id}: ${seen[id]} != ${r.w * r.h}`);
    if (r.w !== E.ROOMS[r.type].w || r.h !== E.ROOMS[r.type].h) out.push(`size mismatch ${id}`);
  }
  return out;
}
