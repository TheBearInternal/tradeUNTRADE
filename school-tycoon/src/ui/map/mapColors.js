// Map palette derived from equipped cosmetics. Purely visual: never feeds the simulation.
import { cosmeticById, cosmeticColors, cosmeticEmoji, isDefaultCosmetic } from '../catalog.js';

const DEFAULT_FLOOR = '#E8E0C8';
const DEFAULT_BORDER = '#6B5440';

function parseHex(hex) {
  const h = String(hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

/** Linear mix of two hex colors; returns `a` if either is unparsable. */
export function mix(a, b, t) {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return a;
  return toHex(ca.map((v, i) => v + (cb[i] - v) * t));
}

export function shade(hex, amount) {
  return mix(hex, amount < 0 ? '#000000' : '#FFFFFF', Math.abs(amount));
}

/**
 * @param {{ wall?: string, floor?: string, mascot?: string, uniform?: string, skin?: string }} equipped
 */
export function mapTheme(equipped = {}) {
  const floor = cosmeticById(equipped.floor);
  const wall = cosmeticById(equipped.wall);
  const skin = cosmeticById(equipped.skin);
  const uniform = cosmeticById(equipped.uniform);
  const mascot = cosmeticById(equipped.mascot);

  const floorColors = cosmeticColors(floor);
  const lot = floorColors[0] || DEFAULT_FLOOR;
  const hall = shade(floorColors[1] || lot, floorColors[1] ? -0.12 : -0.2);
  const wallColors = isDefaultCosmetic(wall) ? [] : cosmeticColors(wall);
  const skinColors = isDefaultCosmetic(skin) ? [] : cosmeticColors(skin);
  const border = skinColors[0] || DEFAULT_BORDER;

  return {
    lot,
    hall,
    gridLine: 'rgba(0,0,0,0.07)',
    border,
    officeColor: skinColors[1] || null,
    uniform: cosmeticColors(uniform)[0] || null,
    mascotEmoji: isDefaultCosmetic(mascot) ? null : cosmeticEmoji(mascot),
    /** Room fill tinted by the wall cosmetic (rainbow walls cycle by room index). */
    roomColor(base, index) {
      const c = base || '#CCCCCC';
      if (!wallColors.length) return c;
      return mix(c, wallColors[index % wallColors.length], 0.35);
    },
  };
}
