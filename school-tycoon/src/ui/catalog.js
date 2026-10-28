// Read-only views over the engine config, normalized for display.
// ENGINE_API.md fixes field names for ROOMS; STAFF/TIERS/COSMETICS/ACHIEVEMENTS shapes are
// looser, so everything here tolerates arrays or id-keyed objects and falls back to DESIGN.md.
import { ROOMS, STAFF, TIERS, COSMETICS, ACHIEVEMENTS, BALANCE } from '../engine/index.js';
import { productCatalog } from '../platform/store/products.js';
import { toList } from './util.js';

// ---------- Rooms ----------
export const ROOM_LIST = toList(ROOMS)
  .filter((r) => r.kind !== 'office')
  .sort((a, b) => (a.tier - b.tier) || (a.level - b.level) || (a.cost - b.cost));

export function roomDef(type) {
  return (ROOMS && ROOMS[type]) || toList(ROOMS).find((r) => r.id === type) || {
    id: type, name: type, emoji: '🏫', w: 1, h: 1, cost: 0, tier: 1, level: 1, kind: 'room', color: '#CCCCCC',
  };
}

/** Short label that fits inside a room block. */
export function shortName(def) {
  if (def.shortName) return def.shortName;
  const name = def.name || def.id;
  return name.length <= (def.w || 1) * 3 ? name : name.split(/[\s']/)[0];
}

// ---------- Tiers ----------
const TIER_FALLBACK = { 1: 'Elementary School', 2: 'Middle School', 3: 'High School' };

export function tierName(n) {
  const list = toList(TIERS);
  const t = list.find((x) => Number(x.tier ?? x.id ?? x.level) === n) || (Array.isArray(TIERS) ? TIERS[n - 1] : null);
  const name = t && (t.name || t.label);
  if (!name) return TIER_FALLBACK[n] || `Tier ${n}`;
  return /school/i.test(name) ? name : `${name} School`;
}

// ---------- Staff ----------
const STAFF_FALLBACK = [
  { role: 'teacher', grade: 'rookie', skill: 1, salary: 50, level: 1, tier: 1 },
  { role: 'teacher', grade: 'veteran', skill: 3, salary: 90, level: 5, tier: 1 },
  { role: 'teacher', grade: 'expert', skill: 5, salary: 140, level: 9, tier: 1 },
  { role: 'janitor', grade: null, skill: 0, salary: 30, level: 1, tier: 1 },
  { role: 'nurse', grade: null, skill: 0, salary: 50, level: 1, tier: 2 },
];
const GRADES = ['rookie', 'veteran', 'expert'];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

function staffEntry(role, grade, d = {}) {
  const fb = STAFF_FALLBACK.find((f) => f.role === role && (f.grade || null) === (grade || null)) || {};
  return {
    role,
    grade: grade || null,
    skill: Number(d.skill ?? fb.skill ?? 0),
    salary: Number(d.salary ?? fb.salary ?? 0),
    level: Number(d.level ?? d.minLevel ?? fb.level ?? 1),
    tier: Number(d.tier ?? d.minTier ?? fb.tier ?? 1),
    label: d.name || (grade ? `${cap(grade)} ${cap(role)}` : cap(role)),
  };
}

function buildStaffOptions() {
  if (!STAFF) return STAFF_FALLBACK.map((f) => staffEntry(f.role, f.grade));
  if (Array.isArray(STAFF)) {
    return STAFF.map((s) => staffEntry(s.role || s.id, s.grade || null, s));
  }
  const out = [];
  Object.keys(STAFF).forEach((role) => {
    const def = STAFF[role] || {};
    const grades = def.grades || (GRADES.some((g) => def[g]) ? def : null);
    if (grades && typeof grades === 'object') {
      toList(grades).forEach((g) => {
        if (g && typeof g === 'object' && (g.salary != null || g.skill != null)) out.push(staffEntry(role, g.id, g));
      });
    } else {
      out.push(staffEntry(role, null, def));
    }
  });
  return out.length ? out : STAFF_FALLBACK.map((f) => staffEntry(f.role, f.grade));
}

export const STAFF_OPTIONS = buildStaffOptions();
export const ROLE_EMOJI = {
  teacher: '👩‍🏫', janitor: '🧹', nurse: '🩺', counselor: '🧑‍💼',
  ...Object.fromEntries(Object.keys(STAFF || {}).filter((r) => STAFF[r].emoji).map((r) => [r, STAFF[r].emoji])),
};

// ---------- Cosmetics ----------
export const SLOTS = [
  { id: 'wall', label: 'Wall paint' },
  { id: 'floor', label: 'Floor' },
  { id: 'mascot', label: 'Mascot' },
  { id: 'uniform', label: 'Uniform' },
  { id: 'skin', label: 'Building skin' },
  { id: 'furniture', label: 'Furniture set (looks only)' },
];

export const COSMETIC_LIST = toList(COSMETICS);

export function cosmeticById(id) {
  if (!id) return null;
  return (COSMETICS && !Array.isArray(COSMETICS) && COSMETICS[id]) ? { id, ...COSMETICS[id] }
    : COSMETIC_LIST.find((c) => c.id === id) || null;
}

export function isDefaultCosmetic(c) {
  return !c || c.currency === 'free' || /_default$|_none$/.test(c.id);
}

/** All colors a cosmetic defines, as an array of strings. */
export function cosmeticColors(c) {
  if (!c) return [];
  const raw = c.colors ?? c.color ?? c.tint;
  if (!raw) return [];
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'string');
  return Object.values(raw).filter((x) => typeof x === 'string' && x.startsWith('#'));
}

export function cosmeticEmoji(c) {
  if (!c) return null;
  return c.emoji || (c.colors && c.colors.emoji) || null;
}

// ---------- Achievements ----------
export const ACHIEVEMENT_LIST = toList(ACHIEVEMENTS).map((a) => ({
  id: a.id,
  name: a.name || a.title || a.id,
  desc: a.desc || a.description || '',
  apples: Number(a.apples ?? a.reward ?? 0),
  cosmetic: a.cosmetic || a.grants || null,
}));

/** "How to earn" text for an achievement-only cosmetic. */
export function cosmeticEarnHint(c) {
  const achId = c.achievement || c.achievementId || c.requires || c.unlock;
  const ach = ACHIEVEMENT_LIST.find((a) => a.id === achId)
    || ACHIEVEMENT_LIST.find((a) => a.cosmetic === c.id || (Array.isArray(a.cosmetic) && a.cosmetic.includes(c.id)));
  return ach ? `Earn the "${ach.name}" achievement` : 'Earn it through an achievement';
}

// ---------- Products / Apples ----------
export const PRODUCT_LIST = productCatalog();

export function productGranting(cosmeticId) {
  const c = cosmeticById(cosmeticId);
  if (c && c.product) {
    const direct = PRODUCT_LIST.find((p) => p.id === c.product);
    if (direct) return direct;
  }
  return PRODUCT_LIST.find((p) => {
    const g = p.grants;
    if (!g) return false;
    if (Array.isArray(g)) return g.includes(cosmeticId);
    if (typeof g === 'string') return g === cosmeticId;
    return Object.prototype.hasOwnProperty.call(g, cosmeticId) || Object.values(g).includes(cosmeticId);
  }) || null;
}

const USD_PER_APPLE = BALANCE && Number(BALANCE.applesPerUsd) > 0
  ? 1 / Number(BALANCE.applesPerUsd)
  : 0.99 / 100;

/** "~$0.89" equivalent for an Apple amount (100 🍎 ≈ $0.99). */
export function applesToUsdLabel(apples) {
  return `~$${(apples * USD_PER_APPLE).toFixed(2)}`;
}

const LOGIN_FALLBACK = [5, 5, 10, 5, 5, 10, 25];
export const LOGIN_REWARDS = (() => {
  const v = BALANCE?.loginCycle ?? BALANCE?.dailyLogin ?? BALANCE?.loginRewards;
  return Array.isArray(v) && v.length === 7 ? v : LOGIN_FALLBACK;
})();
