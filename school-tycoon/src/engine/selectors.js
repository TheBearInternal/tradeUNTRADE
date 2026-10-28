// Pure selectors (ENGINE_API.md "Selectors").
import {
  ROOMS, STAFF, TIERS, BALANCE, MAX_TIER, MAX_LEVEL, DAYS_PER_TERM, DAYS_PER_YEAR, TICKS_PER_DAY,
  ITEMS, ITEM_ORDER, SCENARIOS, SANDBOX_ID, hasInterior,
} from './config/index.js';
import { computeBase, computeDerivedView, computeStaffing, computeQuality, computeFacilities } from './derived.js';
import { canPlace } from './grid.js';
import { computePnL, computeRating, xpForLevel, hasNurseCare, hasCounselor, tuitionPerStudent } from './model.js';
import { loginReward } from './ledger.js';
import { checkItemGeometry, itemSize } from './interior.js';
import { medalFor } from './scenario.js';

export function selectDerived(root) {
  return computeDerivedView(root.game);
}

export function selectCapacity(root) {
  return computeStaffing(root.game).capacity;
}

export function selectStaffing(root) {
  return computeStaffing(root.game);
}

export function selectDailyPnL(root) {
  return computePnL(root.game);
}

// Never reads root.ledger.
export function selectRating(root) {
  return computeRating(root.game);
}

export function earlyUnlocksLeft(game) {
  const since = game.day - BALANCE.earlyUnlockWindowDays;
  let used = 0;
  for (const d of game.earlyUnlockLog) if (d > since) used++;
  return Math.max(0, BALANCE.earlyUnlockLimit - used);
}

export function selectEarlyUnlocksLeft(root) {
  return earlyUnlocksLeft(root.game);
}

function minutesSavedFor(game, level) {
  const need = xpForLevel(level) - game.xp;
  if (need <= 0) return 0;
  const perDay = Math.max(1, Math.ceil(game.students / BALANCE.xpStudentsDiv)) + BALANCE.xpPerTerm / DAYS_PER_TERM;
  const days = need / perDay;
  return Math.max(1, Math.round((days * BALANCE.secondsPerDayAt1x) / 60));
}

const isBanned = (game, type) => !!(game.modifiers && game.modifiers.bannedRooms && game.modifiers.bannedRooms.indexOf(type) >= 0);

// Shared tier/level gate for rooms (unlockMap = game.unlocked) and items (game.unlockedItems).
function gateAvailability(game, ledger, def, unlockMap) {
  if (def.tier > game.tier) {
    return { available: false, reason: 'tier', canEarlyUnlock: false, earlyCost: 0, minutesSaved: 0, affordable: false };
  }
  if (def.level > game.level && !(unlockMap && unlockMap[def.id])) {
    const earlyCost = BALANCE.earlyUnlockApplesPerLevel * (def.level - game.level);
    return {
      available: false,
      reason: 'level',
      canEarlyUnlock: earlyUnlocksLeft(game) > 0,
      earlyCost,
      minutesSaved: minutesSavedFor(game, def.level),
      affordable: !!ledger && ledger.apples >= earlyCost,
    };
  }
  return { available: true, reason: null, canEarlyUnlock: false, earlyCost: 0, minutesSaved: 0, affordable: true };
}

export function itemAvailability(game, ledger, itemType) {
  const def = ITEMS[itemType];
  if (!def) return { available: false, reason: 'tier', canEarlyUnlock: false, earlyCost: 0, minutesSaved: 0, affordable: false };
  return gateAvailability(game, ledger, def, game.unlockedItems);
}

export function selectItemAvailability(root, itemType) {
  return itemAvailability(root.game, root.ledger, itemType);
}

export function roomAvailability(game, ledger, type) {
  const def = ROOMS[type];
  if (!def || def.buildable === false) {
    return { available: false, reason: 'tier', canEarlyUnlock: false, earlyCost: 0, minutesSaved: 0, affordable: false };
  }
  if (isBanned(game, type)) {
    return { available: false, reason: 'banned', canEarlyUnlock: false, earlyCost: 0, minutesSaved: 0, affordable: false };
  }
  if (def.tier > game.tier) {
    return { available: false, reason: 'tier', canEarlyUnlock: false, earlyCost: 0, minutesSaved: 0, affordable: false };
  }
  if (def.level > game.level && !game.unlocked[type]) {
    const earlyCost = BALANCE.earlyUnlockApplesPerLevel * (def.level - game.level);
    return {
      available: false,
      reason: 'level',
      canEarlyUnlock: earlyUnlocksLeft(game) > 0,
      earlyCost,
      minutesSaved: minutesSavedFor(game, def.level),
      affordable: !!ledger && ledger.apples >= earlyCost,
    };
  }
  return { available: true, reason: null, canEarlyUnlock: false, earlyCost: 0, minutesSaved: 0, affordable: true };
}

export function selectRoomAvailability(root, type) {
  return roomAvailability(root.game, root.ledger, type);
}

export function canBuild(game, type, x, y) {
  const def = ROOMS[type];
  if (!def || def.buildable === false) return { ok: false, reason: 'locked' };
  if (def.tier > game.tier || (def.level > game.level && !game.unlocked[type])) return { ok: false, reason: 'locked' };
  if (isBanned(game, type)) return { ok: false, reason: 'banned' };
  const r = canPlace(game.grid, game.size, x, y, def.w, def.h);
  if (r) return { ok: false, reason: r };
  if (def.edge && !(x === 0 || y === 0 || x + def.w === game.size || y + def.h === game.size)) return { ok: false, reason: 'edge' };
  if (game.cash < def.cost) return { ok: false, reason: 'cash' };
  return { ok: true, reason: null };
}

export function selectCanBuild(root, type, x, y) {
  return canBuild(root.game, type, x, y);
}

const GRADE_RANK = { A: 5, B: 4, C: 3, D: 2, F: 1 };

export function tierProgress(game) {
  if (game.tier >= MAX_TIER) return { nextTier: null, requirements: [], eligible: false };
  const nextTier = game.tier + 1;
  const req = TIERS[nextTier].requirements;
  const requirements = [
    { label: 'Stars', current: game.stars, target: req.stars, met: game.stars >= req.stars },
    { label: 'Students', current: game.students, target: req.students, met: game.students >= req.students },
    { label: 'Reputation', current: game.reputation, target: req.reputation, met: game.reputation >= req.reputation },
  ];
  if (req.inspection) {
    const g = game.lastInspectionGrade;
    requirements.push({
      label: 'Last inspection',
      current: g || '—',
      target: req.inspection,
      met: !!g && GRADE_RANK[g] >= GRADE_RANK[req.inspection],
    });
  }
  return { nextTier, requirements, eligible: requirements.every((r) => r.met) };
}

export function selectTierProgress(root) {
  return tierProgress(root.game);
}

export function selectXpProgress(root) {
  const { level, xp } = root.game;
  const xpForThis = xpForLevel(level);
  if (level >= MAX_LEVEL) return { level, xp, xpForThis, xpForNext: Math.max(xp, xpForThis + 1), isMax: true };
  return { level, xp, xpForThis, xpForNext: xpForLevel(level + 1), isMax: false };
}

export function selectLoginReward(root, dayKey) {
  return loginReward(root.ledger, dayKey);
}

export function selectTimeLabel(root) {
  const { tick } = root.game;
  const day = Math.floor(tick / TICKS_PER_DAY);
  return {
    year: Math.floor(day / DAYS_PER_YEAR) + 1,
    term: Math.floor((day % DAYS_PER_YEAR) / DAYS_PER_TERM) + 1,
    dayOfTerm: (day % DAYS_PER_TERM) + 1,
    hour: tick % TICKS_PER_DAY,
  };
}

export function selectTuitionPerStudent(root) {
  return tuitionPerStudent(root.game);
}

// Hire availability: { ok, reason: null|'tier'|'level'|'role'|'limit', salary, skill }.
export function selectCanHire(root, role, grade) {
  const g = root.game;
  const r = STAFF[role];
  if (!r) return { ok: false, reason: 'role', salary: 0, skill: 0 };
  const spec = role === 'teacher' ? r.grades[grade] : r.grades.standard;
  if (!spec) return { ok: false, reason: 'role', salary: 0, skill: 0 };
  let reason = null;
  if (spec.tier > g.tier) reason = 'tier';
  else if (spec.level > g.level) reason = 'level';
  else if (Object.keys(g.staff).length >= BALANCE.maxStaff) reason = 'limit';
  return { ok: reason === null, reason, salary: spec.salary, skill: spec.skill };
}

const NAME = (type) => (ROOMS[type] ? ROOMS[type].name : type);

// Top problems, most important first (max 6).
export function selectBubbles(root) {
  const g = root.game;
  const base = computeBase(g);
  const view = computeDerivedView(g);
  const st = computeStaffing(g);
  const out = [];
  const ids = Object.keys(g.rooms);
  for (const id of ids) {
    const r = g.rooms[id];
    const def = ROOMS[r.type];
    if (def && def.kind === 'room' && !base.connected[id]) {
      out.push({ icon: '⚠️', text: `${NAME(r.type)} is not connected to a hallway`, roomId: id });
    }
  }
  const fac = computeFacilities(g);
  for (const id of fac.seatRooms) {
    if (!st.assignment[id]) out.push({ icon: '👩‍🏫', text: `${NAME(g.rooms[id].type)} has no teacher`, roomId: id });
  }
  const hasSeats = fac.seatRooms.length > 0;
  if (hasSeats && !(computeFacilities(g).restroomCapacity > 0)) out.push({ icon: '🚽', text: 'No restroom' });
  else if (view.restroomLoad !== null && view.restroomLoad > 1) out.push({ icon: '🚽', text: 'Restrooms are overcrowded' });
  if (hasSeats && !(computeFacilities(g).cafeteriaCapacity > 0)) {
    if (g.level >= ROOMS.cafeteria.level || g.unlocked.cafeteria) out.push({ icon: '🍔', text: 'No cafeteria' });
  } else if (computeFacilities(g).cafeteriaCapacity > 0 && view.cafeteriaOver) out.push({ icon: '🍔', text: 'Cafeteria is too full' });
  for (const a of st.active) {
    const m = view.roomStats[a.id];
    if (m.dR !== BALANCE.missingDistance && m.dR > BALANCE.lateRestroomFree) {
      out.push({ icon: '🚽', text: 'Restroom too far', roomId: a.id });
      break;
    }
  }
  for (const a of st.active) {
    const m = view.roomStats[a.id];
    if (m.dC !== BALANCE.missingDistance && m.dC > BALANCE.lateCafeteriaFree) {
      out.push({ icon: '🍔', text: 'Cafeteria too far', roomId: a.id });
      break;
    }
  }
  const quality = computeQuality(g);
  for (const id of base.ids) {
    const q = quality[id];
    if (q && q.missing.length && base.connected[id]) {
      out.push({ icon: '🪑', text: `${NAME(g.rooms[id].type)} is missing ${q.missing.join(', ')}`, roomId: id });
    }
  }
  const offline = (g.effects && g.effects.offline) || {};
  for (const id in offline) if (g.rooms[id]) out.push({ icon: '🔧', text: 'A restroom is out of order', roomId: id });
  for (const id of base.ids) {
    if (g.rooms[id].type === 'busstop' && !base.onEdge[id]) out.push({ icon: '🚌', text: 'Bus Stop must touch the lot edge', roomId: id });
  }
  if ((base.counts.counselor || 0) > 0 && !hasCounselor(g)) out.push({ icon: '💬', text: "Counselor's Office needs a counselor" });
  if (g.cleanliness < 60) out.push({ icon: '🧹', text: 'The school is dirty' });
  if (st.capacity > 0 && g.students >= st.capacity) out.push({ icon: '🪑', text: 'All seats are full' });
  if ((base.counts.nurse || 0) > 0 && !hasNurseCare(g)) out.push({ icon: '🩺', text: "Nurse's Office needs a nurse" });
  if (g.happiness < 35 && g.students > 0) out.push({ icon: '😞', text: 'Students are unhappy' });
  if (g.cash < 0) out.push({ icon: '💸', text: 'Cash is negative' });
  return out.slice(0, 8);
}

// ---------------------------------------------------------------- v2: interiors

const viewCache = new WeakMap(); // quality -> interior view

export function selectInterior(root, roomId) {
  const g = root.game;
  const room = g.rooms[roomId];
  if (!room || !hasInterior(room.type)) return null;
  const q = computeQuality(g)[roomId];
  const interior = (g.interiors && g.interiors[roomId]) || { items: [] };
  const hit = viewCache.get(q);
  if (hit && hit.interior === interior) return hit.view;
  const items = interior.items.map((it) => {
    const def = ITEMS[it.itemType];
    const sz = def ? itemSize(def, it.rot) : { w: 1, h: 1 };
    return { id: it.id, itemType: it.itemType, cx: it.cx, cy: it.cy, rot: it.rot, w: sz.w, h: sz.h };
  });
  const occupancy = new Array(q.cols * q.rows);
  const reachable = new Array(q.cols * q.rows);
  for (let i = 0; i < occupancy.length; i++) {
    occupancy[i] = q.occupancy[i] >= 0 ? interior.items[q.occupancy[i]].id : null;
    reachable[i] = q.reachable[i] === 1;
  }
  const view = {
    roomId, roomType: room.type, cols: q.cols, rows: q.rows, door: q.door, items, occupancy, reachable,
    counted: q.counted, itemCount: items.length, maxItems: BALANCE.maxItemsPerRoom,
  };
  viewCache.set(q, { interior, view });
  return view;
}

export function selectRoomQuality(root, roomId) {
  const g = root.game;
  const room = g.rooms[roomId];
  if (!room || !hasInterior(room.type)) return null;
  const q = computeQuality(g)[roomId];
  return {
    score: q.score, learnMult: q.learnMult, happyBonus: q.happyBonus, hygiene: q.hygiene,
    seats: q.seats, capacity: q.capacity, missing: q.missing,
    functional: q.functional, category: q.category, stats: q.stats, libraryBonus: q.libraryBonus,
  };
}

// skipItemId: the item being moved (ignored for collisions, free of charge).
export function canPlaceItem(game, roomId, itemType, cx, cy, rot, skipItemId) {
  const room = game.rooms[roomId];
  if (!room || !hasInterior(room.type)) return { ok: false, reason: 'room' };
  const def = ITEMS[itemType];
  if (!def) return { ok: false, reason: 'item' };
  if (def.rooms.indexOf(room.type) < 0) return { ok: false, reason: 'wrongRoom' };
  if (!itemAvailability(game, null, itemType).available) return { ok: false, reason: 'locked' };
  const interior = (game.interiors && game.interiors[roomId]) || { items: [] };
  if (!skipItemId && interior.items.length >= BALANCE.maxItemsPerRoom) return { ok: false, reason: 'limit' };
  const r = checkItemGeometry(room.type, interior, itemType, cx, cy, rot === undefined ? 0 : rot, skipItemId);
  if (r) return { ok: false, reason: r };
  if (!skipItemId && game.cash < def.cost) return { ok: false, reason: 'cash' };
  return { ok: true, reason: null };
}

export function selectCanPlaceItem(root, roomId, itemType, cx, cy, rot) {
  return canPlaceItem(root.game, roomId, itemType, cx, cy, rot, null);
}

export function selectItemsForRoom(root, roomType) {
  const g = root.game;
  const out = [];
  for (const id of ITEM_ORDER) {
    const def = ITEMS[id];
    if (def.rooms.indexOf(roomType) < 0) continue;
    const av = itemAvailability(g, root.ledger, id);
    out.push({ itemType: id, item: def, ...av, canAffordCoins: g.cash >= def.cost });
  }
  return out;
}

// ---------------------------------------------------------------- v2: replay

export function selectWeeklyGoals(root) {
  const g = root.game;
  const w = g.weekly || { week: 0, goals: [] };
  const dpw = BALANCE.daysPerWeek;
  return {
    week: w.week,
    daysLeft: dpw - (g.day % dpw),
    goals: w.goals.map((x) => ({
      key: x.key, id: x.id, label: x.label, progress: x.progress, target: x.target, done: x.done,
      week: x.week, carriedOver: x.week < w.week, reward: x.reward,
      credited: !!(root.ledger && root.ledger.credited[x.key]),
    })),
  };
}

export function selectScenario(root) {
  const g = root.game;
  if (g.mode === 'sandbox') {
    return { id: SANDBOX_ID, name: 'Sandbox', sandbox: true, goals: [], goalsMet: 0, endDay: null, daysLeft: null, result: null, medal: null, bestMedal: null };
  }
  const sc = g.scenario;
  if (!sc || !SCENARIOS[sc.id]) return null;
  const def = SCENARIOS[sc.id];
  return {
    id: sc.id, name: def.name, emoji: def.emoji, desc: def.desc, sandbox: false,
    goals: def.goals.map((x, i) => ({ label: x.label, met: sc.goalsMet.indexOf(i) >= 0 })),
    goalsMet: sc.goalsMet.length,
    endDay: sc.endDay,
    daysLeft: Math.max(0, sc.endDay - g.day),
    result: sc.result,
    medal: sc.result || (sc.goalsMet.length ? medalFor(def, sc.goalsMet.length) : null),
    bestMedal: (root.ledger && root.ledger.medals && root.ledger.medals[sc.id]) || null,
    modifiers: g.modifiers,
  };
}
