// validateConfig() -> string[] of config errors ([] = OK).
import {
  ROOMS, ROOM_ORDER, STAFF, TIERS, COSMETICS, COSMETIC_SLOTS, DEFAULT_EQUIPPED, PRODUCTS,
  ACHIEVEMENTS, BALANCE, MAX_LEVEL, MAX_TIER, ITEMS, LAYOUTS, EVENTS, WEEKLY_GOALS, SCENARIOS,
  hasInterior,
} from './config/index.js';
import { ACHIEVEMENT_CHECKS } from './progress.js';
import { checkCond, checkEffect } from './cond.js';
import { starterInterior, checkItemGeometry, roomQuality } from './interior.js';
import { createInitialGame } from './state.js';

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
  e.push(...validateV2());
  return e;
}

const STAT_KEYS = ['F', 'Cf', 'Hy', 'rep'];

function validateV2() {
  const e = [];
  // items
  for (const id in ITEMS) {
    const it = ITEMS[id];
    const p = `ITEMS.${id}`;
    if (it.id !== id) e.push(`${p}: id mismatch`);
    for (const f of ['name', 'emoji', 'color']) if (typeof it[f] !== 'string') e.push(`${p}: missing ${f}`);
    if (!posInt(it.w) || !posInt(it.h) || it.w > 3 || it.h > 3) e.push(`${p}: footprint must be 1..3`);
    if (!nonNegInt(it.cost)) e.push(`${p}: bad cost`);
    if (!TIERS[it.tier] || !(posInt(it.level) && it.level <= MAX_LEVEL)) e.push(`${p}: bad gate`);
    if (!Array.isArray(it.rooms) || !it.rooms.length) e.push(`${p}: no rooms`);
    for (const r of it.rooms || []) if (!hasInterior(r)) e.push(`${p}: room ${r} has no interior`);
    if (!it.stats || typeof it.stats !== 'object') e.push(`${p}: stats missing`);
    for (const k in it.stats || {}) {
      if (STAT_KEYS.indexOf(k) < 0 || !posInt(it.stats[k])) e.push(`${p}: bad stat ${k}`);
    }
    if (it.stats && it.stats.F) {
      const ok = it.rooms.every((r) => ROOMS[r].category === 'seat' || ROOMS[r].category === 'library');
      if (!ok) e.push(`${p}: F only works in seat rooms and libraries`);
    }
    if (it.clean !== undefined && !Number.isInteger(it.clean)) e.push(`${p}: bad clean`);
    if (it.seats !== undefined && !posInt(it.seats)) e.push(`${p}: bad seats`);
    if (it.stalls !== undefined && !posInt(it.stalls)) e.push(`${p}: bad stalls`);
    if (it.skinPart && ['desk', 'table', 'stall', 'shelf', 'lockers'].indexOf(it.skinPart) < 0) e.push(`${p}: bad skinPart`);
    for (const r of it.rooms || []) {
      if (hasInterior(r) && (it.w > ROOMS[r].w * BALANCE.cellsPerTile || it.h > ROOMS[r].h * BALANCE.cellsPerTile)) e.push(`${p}: too big for ${r}`);
    }
  }
  // requirements + starter layouts (must reproduce v1 numbers exactly)
  for (const type in ROOMS) {
    const def = ROOMS[type];
    for (const r of def.requires || []) {
      if (!ITEMS[r.item] || !posInt(r.count) || ITEMS[r.item].rooms.indexOf(type) < 0) e.push(`ROOMS.${type}: bad requirement ${r.item}`);
    }
    if (!hasInterior(type)) {
      if (LAYOUTS[type]) e.push(`LAYOUTS.${type}: room has no interior`);
      continue;
    }
    const layout = LAYOUTS[type] || [];
    let partial = { items: [] };
    starterInterior(type).items.forEach((item, k) => {
      const it = ITEMS[item.itemType];
      const p = `LAYOUTS.${type}[${k}]`;
      if (!it) { e.push(`${p}: unknown item`); return; }
      if (it.cost !== 0 || Object.keys(it.stats).length || it.clean) e.push(`${p}: starter items must be free with no stats`);
      if (it.tier !== 1 || it.level !== 1) e.push(`${p}: starter items must be ungated`);
      if (it.rooms.indexOf(type) < 0) e.push(`${p}: item not allowed in ${type}`);
      const g = checkItemGeometry(type, partial, item.itemType, item.cx, item.cy, item.rot, null);
      if (g) e.push(`${p}: ${g}`);
      partial = { items: partial.items.concat([item]) };
    });
    if (layout.length > BALANCE.maxItemsPerRoom) e.push(`LAYOUTS.${type}: too many items`);
    const q = roomQuality(type, partial);
    if (!q.functional) e.push(`LAYOUTS.${type}: missing ${q.missing.join(', ')}`);
    if (Object.keys(q.counted).some((k) => !q.counted[k])) e.push(`LAYOUTS.${type}: unreachable items`);
    if (q.stats.F || q.stats.Cf || q.stats.Hy || q.stats.rep || q.stats.clean) e.push(`LAYOUTS.${type}: must have zero stats`);
    if (def.seats && q.seats !== def.seats) e.push(`LAYOUTS.${type}: ${q.seats} seats, expected ${def.seats}`);
    if (def.facility && q.capacity !== def.serves) e.push(`LAYOUTS.${type}: capacity ${q.capacity}, expected ${def.serves}`);
    if (type === 'library' && Math.abs(q.libraryBonus - def.schoolLearnBonus) > 1e-12) e.push('LAYOUTS.library: bonus mismatch');
  }
  for (const type in LAYOUTS) if (!ROOMS[type]) e.push(`LAYOUTS.${type}: unknown room`);
  // events
  for (const id in EVENTS) {
    const ev = EVENTS[id];
    const p = `EVENTS.${id}`;
    if (ev.id !== id) e.push(`${p}: id mismatch`);
    if (!(ev.chance > 0 && ev.chance < 1)) e.push(`${p}: bad chance`);
    if (!nonNegInt(ev.cooldownDays) || !nonNegInt(ev.minDay)) e.push(`${p}: bad cooldown/minDay`);
    e.push(...checkCond(ev.cond, `${p}.cond`));
    for (const rm of ev.rewardMult || []) {
      e.push(...checkCond(rm.cond, `${p}.rewardMult`));
      if (!(rm.mult >= 1)) e.push(`${p}: bad rewardMult`);
    }
    if (!Array.isArray(ev.choices) || ev.choices.length < 2) e.push(`${p}: needs >= 2 choices`);
    for (const c of ev.choices || []) {
      if (typeof c.id !== 'string' || typeof c.label !== 'string') e.push(`${p}: bad choice`);
      (c.effects || []).forEach((eff, k) => e.push(...checkEffect(eff, `${p}.${c.id}[${k}]`)));
      if ((c.effects || []).some((eff) => eff.challenge) && ev.params !== 'challengeRoom') e.push(`${p}: challenge needs params`);
    }
    if (ev.params && ev.params !== 'challengeRoom') e.push(`${p}: unknown params`);
    if (ev.params === 'challengeRoom' && !(Array.isArray(ev.challengeRooms) && ev.challengeRooms.every((t) => ROOMS[t]))) e.push(`${p}: bad challengeRooms`);
  }
  // weekly goals
  for (const id in WEEKLY_GOALS) {
    const t = WEEKLY_GOALS[id];
    const p = `WEEKLY_GOALS.${id}`;
    if (t.id !== id) e.push(`${p}: id mismatch`);
    const targets = Array.isArray(t.target) ? t.target : [t.target];
    if (!targets.every(posInt) || (Array.isArray(t.target) && t.target.length !== MAX_TIER)) e.push(`${p}: bad target`);
    if (t.kind === 'sum') { if (['enrolled', 'income', 'xp'].indexOf(t.metric) < 0) e.push(`${p}: bad metric`); }
    else if (t.kind === 'streak') e.push(...checkCond(t.cond, `${p}.cond`));
    else e.push(`${p}: bad kind`);
    if (!t.reward || !nonNegInt(t.reward.xp) || !nonNegInt(t.reward.cash)) e.push(`${p}: bad reward`);
  }
  if (Object.keys(WEEKLY_GOALS).length < BALANCE.weeklyGoalsPerWeek) e.push('WEEKLY_GOALS: not enough templates');
  // scenarios
  for (const id in SCENARIOS) {
    const sc = SCENARIOS[id];
    const p = `SCENARIOS.${id}`;
    if (sc.id !== id) e.push(`${p}: id mismatch`);
    if (!posInt(sc.size) || sc.size < 10 || !TIERS[sc.tier] || !Number.isInteger(sc.cash)) e.push(`${p}: bad basics`);
    const m = sc.modifiers || {};
    for (const k of ['salaryMult', 'fluChanceMult', 'tuitionMult']) if (!(m[k] > 0)) e.push(`${p}: bad modifier ${k}`);
    if (!Array.isArray(m.bannedRooms) || !m.bannedRooms.every((t) => ROOMS[t])) e.push(`${p}: bad bannedRooms`);
    if (!Array.isArray(sc.goals) || sc.goals.length < 1) e.push(`${p}: no goals`);
    (sc.goals || []).forEach((gl, k) => {
      if (typeof gl.label !== 'string') e.push(`${p}.goals[${k}]: label`);
      e.push(...checkCond(gl.cond, `${p}.goals[${k}]`));
    });
    if (!posInt(sc.timeLimitDays)) e.push(`${p}: bad timeLimitDays`);
    const md = sc.medals || {};
    if (!(posInt(md.bronze) && md.bronze <= md.silver && md.silver <= md.gold && md.gold <= sc.goals.length)) e.push(`${p}: bad medals`);
    const pr = sc.preset || {};
    const g = createInitialGame(1, id);
    if ((pr.rooms || []).length + 1 !== Object.keys(g.rooms).length) e.push(`${p}: preset rooms do not fit`);
    if ((pr.staff || []).length !== Object.keys(g.staff).length) e.push(`${p}: preset staff invalid`);
  }
  // furniture skins
  for (const id in COSMETICS) {
    const c = COSMETICS[id];
    if (c.slot === 'furniture') {
      for (const part of ['desk', 'table', 'stall', 'shelf', 'lockers']) {
        if (!c.colors || typeof c.colors[part] !== 'string') e.push(`COSMETICS.${id}: missing color ${part}`);
      }
    }
  }
  return e;
}
