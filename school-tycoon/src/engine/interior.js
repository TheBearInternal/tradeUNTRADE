// Room interiors (DESIGN_V2 §2). game.interiors[roomId] = { items: [{ id, itemType, cx, cy, rot }] }.
import { ROOMS, ITEMS, LAYOUTS, BALANCE, hasInterior } from './config/index.js';
import { idNum } from './util.js';

const B = BALANCE;

export function interiorDims(type) {
  const def = ROOMS[type];
  const cols = def.w * B.cellsPerTile;
  const rows = def.h * B.cellsPerTile;
  return { cols, rows, door: { cx: Math.floor(cols / 2), cy: rows - 1 } };
}

export function itemSize(def, rot) {
  return rot === 1 ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

export const needsAccess = (def) => !!(def.seats || def.stalls || def.required || def.shelf);

export function starterInterior(type) {
  const layout = LAYOUTS[type] || [];
  return { items: layout.map((l, i) => ({ id: `i${i + 1}`, itemType: l.itemType, cx: l.cx, cy: l.cy, rot: l.rot || 0 })) };
}

export function starterInteriors(rooms) {
  const out = {};
  for (const id in rooms) if (hasInterior(rooms[id].type)) out[id] = starterInterior(rooms[id].type);
  return out;
}

export function nextItemId(interior) {
  let max = 0;
  for (const it of interior.items) max = Math.max(max, idNum(it.id));
  return `i${max + 1}`;
}

// Occupancy grid: index of the item in interior.items, or -1.
export function occupancyOf(type, interior, skipItemId) {
  const { cols, rows } = interiorDims(type);
  const occ = new Int16Array(cols * rows).fill(-1);
  interior.items.forEach((it, k) => {
    const def = ITEMS[it.itemType];
    if (!def || it.id === skipItemId) return;
    const { w, h } = itemSize(def, it.rot);
    for (let y = it.cy; y < it.cy + h; y++) {
      for (let x = it.cx; x < it.cx + w; x++) {
        if (x >= 0 && y >= 0 && x < cols && y < rows) occ[y * cols + x] = k;
      }
    }
  });
  return occ;
}

// Geometric placement check. null when OK, else 'bounds' | 'occupied' | 'door' | 'wall' | 'rot'.
export function checkItemGeometry(type, interior, itemType, cx, cy, rot, skipItemId) {
  const def = ITEMS[itemType];
  if (rot !== 0 && rot !== 1) return 'rot';
  const { cols, rows, door } = interiorDims(type);
  const { w, h } = itemSize(def, rot);
  if (!Number.isInteger(cx) || !Number.isInteger(cy) || cx < 0 || cy < 0 || cx + w > cols || cy + h > rows) return 'bounds';
  if (door.cx >= cx && door.cx < cx + w && door.cy >= cy && door.cy < cy + h) return 'door';
  if (def.wall && cx !== 0 && cy !== 0) return 'wall';
  const occ = occupancyOf(type, interior, skipItemId);
  for (let y = cy; y < cy + h; y++) for (let x = cx; x < cx + w; x++) if (occ[y * cols + x] >= 0) return 'occupied';
  return null;
}

const sat = (v, half) => (v > 0 ? v / (v + half) : 0);

const qCache = new WeakMap(); // interior -> { type, q }

// Per-room interior analysis (memoized per interior object).
export function roomQuality(type, interior) {
  const hit = qCache.get(interior);
  if (hit && hit.type === type) return hit.q;
  const q = buildQuality(type, interior);
  qCache.set(interior, { type, q });
  return q;
}

function buildQuality(type, interior) {
  const def = ROOMS[type];
  const { cols, rows, door } = interiorDims(type);
  const occ = occupancyOf(type, interior, null);
  const reach = new Uint8Array(cols * rows);
  const di = door.cy * cols + door.cx;
  if (occ[di] < 0) {
    const queue = [di];
    reach[di] = 1;
    for (let h = 0; h < queue.length; h++) {
      const i = queue[h];
      const x = i % cols;
      const nb = [x > 0 ? i - 1 : -1, x < cols - 1 ? i + 1 : -1, i - cols, i + cols < cols * rows ? i + cols : -1];
      for (const j of nb) if (j >= 0 && !reach[j] && occ[j] < 0) { reach[j] = 1; queue.push(j); }
    }
  }
  const counted = {};
  const has = {};
  let F = 0; let Cf = 0; let Hy = 0; let rep = 0; let clean = 0; let seatSum = 0; let stalls = 0;
  for (const it of interior.items) {
    const idef = ITEMS[it.itemType];
    if (!idef) { counted[it.id] = false; continue; }
    let ok = true;
    if (needsAccess(idef)) {
      ok = false;
      const { w, h } = itemSize(idef, it.rot);
      const probe = (x, y) => { if (x >= 0 && y >= 0 && x < cols && y < rows && reach[y * cols + x]) ok = true; };
      for (let x = it.cx; x < it.cx + w; x++) { probe(x, it.cy - 1); probe(x, it.cy + h); }
      for (let y = it.cy; y < it.cy + h; y++) { probe(it.cx - 1, y); probe(it.cx + w, y); }
    }
    counted[it.id] = ok;
    if (!ok) continue;
    has[it.itemType] = (has[it.itemType] || 0) + 1;
    const s = idef.stats || {};
    F += s.F || 0; Cf += s.Cf || 0; Hy += s.Hy || 0; rep += s.rep || 0;
    clean += idef.clean || 0;
    seatSum += idef.seats || 0;
    stalls += idef.stalls || 0;
  }
  const missing = [];
  for (const r of def.requires || []) {
    const n = has[r.item] || 0;
    if (n < r.count) {
      const name = ITEMS[r.item].name;
      missing.push(r.count === 1 ? name : `${r.count} × ${name} (${n}/${r.count})`);
    }
  }
  const functional = missing.length === 0;
  const category = def.category || 'other';
  let seats = 0; let capacity = 0; let learnMult = 1; let happyBonus = 0; let libraryBonus = 0; let ratio;
  const fS = sat(F, B.seatFocusHalf);
  const cS = sat(Cf, B.seatComfortHalf);
  const hS = sat(Hy, B.hygieneHalf);
  if (category === 'seat') {
    seats = functional ? Math.min(def.seats, seatSum) : 0;
    capacity = seats;
    learnMult = 1 + B.seatFocusMax * fS;
    happyBonus = B.seatComfortMax * cS;
    ratio = (fS + cS) / 2;
  } else if (category === 'restroom' || category === 'cafeteria') {
    if (category === 'restroom') capacity = functional ? B.stallCapacity * stalls : 0;
    else { seats = seatSum; capacity = functional ? seatSum : 0; }
    happyBonus = B.facilityComfortMax * sat(Cf, B.facilityComfortHalf);
    ratio = (sat(Cf, B.facilityComfortHalf) + hS) / 2;
  } else {
    happyBonus = B.otherComfortMax * sat(Cf, B.otherComfortHalf);
    if (category === 'library') {
      libraryBonus = functional ? B.libraryBase + B.libraryFocusMax * sat(F, B.libraryFocusHalf) : 0;
      learnMult = 1 + libraryBonus;
      ratio = (sat(F, B.libraryFocusHalf) + sat(Cf, B.otherComfortHalf)) / 2;
    } else {
      ratio = (sat(Cf, B.otherComfortHalf) + hS + Math.min(rep, B.furnitureRepCap) / B.furnitureRepCap) / 3;
    }
  }
  return {
    type, category, cols, rows, door, occupancy: occ, reachable: reach, counted,
    stats: { F, Cf, Hy, rep, clean }, has, seatSum, stalls, missing, functional,
    seats, capacity, learnMult, happyBonus, libraryBonus, hygiene: Hy,
    score: functional ? Math.round(50 + 50 * ratio) : 0,
  };
}
