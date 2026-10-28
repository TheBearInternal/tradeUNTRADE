// Pure geometry + color helpers for the isometric room editor (no React).
// Uses the engine's iso.js projection so taps and drawing agree with engine math.
import { footprintPolygon, project } from '../../engine/index.js';
import { cosmeticById, cosmeticColors } from '../catalog.js';
import { mix, shade } from '../map/mapColors.js';

/** Wall height in units of the diamond height `th`. */
const WALL_UNITS = 2.2;
const PAD = 12;

/**
 * Scene layout for a cols x rows interior at diamond width `tw` (th = tw / 2).
 * @returns {{ tw, th, ox, oy, width, height, wallH }}
 */
export function sceneLayout(cols, rows, tw) {
  const th = tw / 2;
  const wallH = th * WALL_UNITS;
  return {
    tw,
    th,
    wallH,
    ox: PAD + (rows * tw) / 2,
    oy: PAD + wallH,
    width: PAD * 2 + ((cols + rows) * tw) / 2,
    height: PAD * 2 + wallH + ((cols + rows) * th) / 2,
  };
}

/** Largest diamond width that fits the whole scene (incl. walls) into w x h. */
export function fitTileWidth(cols, rows, w, h) {
  const span = (cols + rows) / 2;
  const byW = (w - PAD * 2) / span;
  const byH = (h - PAD * 2) / (span / 2 + WALL_UNITS / 2);
  return Math.max(8, Math.floor(Math.min(byW, byH)));
}

export const pts = (list) => list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
const up = (p, dy) => ({ x: p.x, y: p.y - dy });

export function cellPolygon(cx, cy, L) {
  return footprintPolygon(cx, cy, 1, 1, L.tw, L.th, L.ox, L.oy);
}

/** One SVG path string with a diamond for every cell index in `cells`. */
export function cellsPath(cells, cols, L) {
  let d = '';
  for (const i of cells) {
    const [a, b, c, e] = cellPolygon(i % cols, Math.floor(i / cols), L);
    d += `M${a.x},${a.y}L${b.x},${b.y}L${c.x},${c.y}L${e.x},${e.y}Z`;
  }
  return d;
}

/** Grid lines across the floor diamond. */
export function gridPath(cols, rows, L) {
  let d = '';
  for (let cx = 1; cx < cols; cx += 1) {
    const a = project(cx, 0, L.tw, L.th, L.ox, L.oy);
    const b = project(cx, rows, L.tw, L.th, L.ox, L.oy);
    d += `M${a.x},${a.y}L${b.x},${b.y}`;
  }
  for (let cy = 1; cy < rows; cy += 1) {
    const a = project(0, cy, L.tw, L.th, L.ox, L.oy);
    const b = project(cols, cy, L.tw, L.th, L.ox, L.oy);
    d += `M${a.x},${a.y}L${b.x},${b.y}`;
  }
  return d;
}

/** Two back walls: along cy = 0 (right) and cx = 0 (left). */
export function wallPolygons(cols, rows, L) {
  const o = project(0, 0, L.tw, L.th, L.ox, L.oy);
  const r = project(cols, 0, L.tw, L.th, L.ox, L.oy);
  const l = project(0, rows, L.tw, L.th, L.ox, L.oy);
  return {
    right: [o, r, up(r, L.wallH), up(o, L.wallH)],
    left: [l, o, up(o, L.wallH), up(l, L.wallH)],
  };
}

/** Item height in units of th: config `height` if present, else a per-category default. */
export function itemHeightUnits(def) {
  if (def.height != null) return Number(def.height);
  if (def.wall) return 1.9;
  if (def.stalls) return 1.7;
  if (def.shelf || def.skinPart === 'shelf') return 1.5;
  if (def.seats) return 0.7;
  if (def.required) return 0.9;
  return 0.8;
}

/** Extruded box: top face plus the two viewer-facing sides. */
export function boxFaces(cx, cy, w, h, heightPx, L) {
  const [t, r, b, l] = footprintPolygon(cx, cy, w, h, L.tw, L.th, L.ox, L.oy);
  return {
    top: [up(t, heightPx), up(r, heightPx), up(b, heightPx), up(l, heightPx)],
    left: [l, b, up(b, heightPx), up(l, heightPx)],
    right: [b, r, up(r, heightPx), up(b, heightPx)],
    base: [t, r, b, l],
  };
}

/** Screen point at the centre of an item's top face (for emoji labels). */
export function itemLabelPoint(cx, cy, w, h, heightPx, L) {
  const c = project(cx + w / 2, cy + h / 2, L.tw, L.th, L.ox, L.oy);
  return { x: c.x, y: c.y - heightPx };
}

/** Face colors for an item, recolored by the equipped furniture skin (looks only). */
export function itemColors(def, furnitureId) {
  const skin = cosmeticById(furnitureId);
  const skinColors = skin && skin.colors && typeof skin.colors === 'object' && !Array.isArray(skin.colors) ? skin.colors : null;
  const base = (def.skinPart && skinColors && skinColors[def.skinPart]) || def.color || '#B0A090';
  return { top: base, left: shade(base, -0.18), right: shade(base, -0.34), stroke: shade(base, -0.5) };
}

/** Floor and wall palette from the equipped floor / wall cosmetics. */
export function roomPalette(equipped = {}) {
  const floor = cosmeticColors(cosmeticById(equipped.floor));
  const wall = cosmeticColors(cosmeticById(equipped.wall));
  const f0 = floor[0] || '#E9E4DA';
  const w0 = wall[0] || '#F3EAD8';
  return {
    floorA: f0,
    floorB: floor[1] ? mix(f0, floor[1], 0.6) : shade(f0, -0.06),
    grid: 'rgba(0,0,0,0.10)',
    wallLeft: shade(w0, -0.08),
    wallRight: wall[1] || shade(w0, -0.18),
    wallTop: shade(w0, -0.35),
    door: '#8C5A3C',
  };
}
