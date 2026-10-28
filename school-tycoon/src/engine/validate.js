// validateConfig() -> string[] of config errors ([] = OK).
import {
  ROOMS, ROOM_ORDER, STAFF, TIERS, COSMETICS, COSMETIC_SLOTS, DEFAULT_EQUIPPED, PRODUCTS,
  ACHIEVEMENTS, BALANCE, MAX_LEVEL, MAX_TIER,
} from './config/index.js';
import { ACHIEVEMENT_CHECKS } from './progress.js';

const posInt = (v) => Number.isInteger(v) && v > 0;
const nonNegInt = (v) => Number.isInteger(v) && v >= 0;

export function validateConfig() {
  const e = [];
  const kinds = ['hall', 'room', 'decor', 'office'];
  for (const id in ROOMS) {
    const r = ROOMS[id];
    const p = `ROOMS.${id}`;
    if (r.id !== id) e.push(`${p}: id mismatch`);
    for (const f of ['name', 'emoji', 'color', 'desc']) if (typeof r[f] !== 'string') e.push(`${p}: missing ${f}`);
    if (!posInt(r.w) || !posInt(r.h)) e.push(`${p}: bad size`);
    if (!nonNegInt(r.cost)) e.push(`${p}: bad cost`);
    if (!TIERS[r.tier]) e.push(`${p}: bad tier`);
    if (!(posInt(r.level) && r.level <= MAX_LEVEL)) e.push(`${p}: bad level`);
    if (!kinds.includes(r.kind)) e.push(`${p}: bad kind`);
    if (r.seats !== undefined && (!posInt(r.seats) || !r.needsTeacher || !(r.learnBonus > 0))) e.push(`${p}: seat room needs seats, needsTeacher, learnBonus`);
    if (r.kind === 'decor' && !(r.decor > 0)) e.push(`${p}: decor needs decor value`);
    if (r.w > TIERS[1].size || r.h > TIERS[1].size - 3) e.push(`${p}: does not fit the starting lot`);
    if (r.kind !== 'office' && !ROOM_ORDER.includes(id)) e.push(`${p}: missing from ROOM_ORDER`);
  }
  if (!ROOMS.office || ROOMS.office.buildable !== false) e.push('ROOMS.office must exist and be unbuildable');
  for (const id of ROOM_ORDER) if (!ROOMS[id]) e.push(`ROOM_ORDER: unknown room ${id}`);

  for (const role in STAFF) {
    const s = STAFF[role];
    if (s.role !== role) e.push(`STAFF.${role}: role mismatch`);
    if (!s.grades || !Object.keys(s.grades).length) e.push(`STAFF.${role}: no grades`);
    for (const gid in s.grades || {}) {
      const g = s.grades[gid];
      if (g.id !== gid) e.push(`STAFF.${role}.${gid}: id mismatch`);
      if (!posInt(g.salary)) e.push(`STAFF.${role}.${gid}: bad salary`);
      if (!nonNegInt(g.skill)) e.push(`STAFF.${role}.${gid}: bad skill`);
      if (!TIERS[g.tier] || !posInt(g.level)) e.push(`STAFF.${role}.${gid}: bad gate`);
    }
    if (role !== 'teacher' && !s.grades.standard) e.push(`STAFF.${role}: needs standard grade`);
  }

  for (let t = 1; t <= MAX_TIER; t++) {
    const tier = TIERS[t];
    if (!tier || tier.tier !== t) { e.push(`TIERS.${t}: missing`); continue; }
    if (!posInt(tier.size) || !posInt(tier.tuitionBase)) e.push(`TIERS.${t}: bad size/tuition`);
    if (t > 1 && (!tier.requirements || tier.size <= TIERS[t - 1].size)) e.push(`TIERS.${t}: bad requirements/size`);
  }

  const currencies = ['free', 'apples', 'coins', 'achievement', 'product'];
  for (const id in COSMETICS) {
    const c = COSMETICS[id];
    const p = `COSMETICS.${id}`;
    if (c.id !== id) e.push(`${p}: id mismatch`);
    if (!COSMETIC_SLOTS.includes(c.slot)) e.push(`${p}: bad slot`);
    if (!currencies.includes(c.currency)) e.push(`${p}: bad currency`);
    if (!nonNegInt(c.price)) e.push(`${p}: bad price`);
    if ((c.currency === 'apples' || c.currency === 'coins') && !posInt(c.price)) e.push(`${p}: needs a price`);
    if (c.currency === 'achievement' && !(ACHIEVEMENTS[c.achievement] && ACHIEVEMENTS[c.achievement].cosmetic === id)) e.push(`${p}: achievement link broken`);
    if (c.product && !(PRODUCTS[c.product] && PRODUCTS[c.product].grants.includes(id))) e.push(`${p}: product link broken`);
    if (c.currency === 'product' && !c.product) e.push(`${p}: product cosmetic needs product`);
  }
  for (const slot of COSMETIC_SLOTS) {
    const d = COSMETICS[DEFAULT_EQUIPPED[slot]];
    if (!d || d.slot !== slot || d.currency !== 'free') e.push(`DEFAULT_EQUIPPED.${slot}: bad default`);
  }

  for (const id in PRODUCTS) {
    const p = PRODUCTS[id];
    if (p.id !== id) e.push(`PRODUCTS.${id}: id mismatch`);
    if (p.type !== 'consumable' && p.type !== 'nonconsumable') e.push(`PRODUCTS.${id}: bad type`);
    if (!nonNegInt(p.apples) || !Array.isArray(p.grants)) e.push(`PRODUCTS.${id}: bad contents`);
    if (!(p.usdReference > 0)) e.push(`PRODUCTS.${id}: bad usdReference`);
    for (const g of p.grants || []) if (!COSMETICS[g]) e.push(`PRODUCTS.${id}: unknown grant ${g}`);
    if (p.type === 'consumable' && p.grants.length) e.push(`PRODUCTS.${id}: consumables cannot grant items`);
  }

  for (const id in ACHIEVEMENTS) {
    const a = ACHIEVEMENTS[id];
    if (a.id !== id) e.push(`ACHIEVEMENTS.${id}: id mismatch`);
    if (!posInt(a.apples)) e.push(`ACHIEVEMENTS.${id}: bad apples`);
    if (typeof ACHIEVEMENT_CHECKS[id] !== 'function') e.push(`ACHIEVEMENTS.${id}: no check`);
    if (a.cosmetic && !COSMETICS[a.cosmetic]) e.push(`ACHIEVEMENTS.${id}: unknown cosmetic`);
  }

  for (const k in BALANCE) {
    const v = BALANCE[k];
    if (typeof v === 'number' && !Number.isFinite(v)) e.push(`BALANCE.${k}: not finite`);
  }
  if (BALANCE.loginCycle.length !== 7 || !BALANCE.loginCycle.every(posInt)) e.push('BALANCE.loginCycle: bad');
  return e;
}
