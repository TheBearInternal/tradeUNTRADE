// Pure selectors (ENGINE_API.md "Selectors").
import {
  ROOMS, STAFF, TIERS, BALANCE, MAX_TIER, MAX_LEVEL, DAYS_PER_TERM, DAYS_PER_YEAR, TICKS_PER_DAY,
} from './config/index.js';
import { computeBase, computeDerivedView, computeStaffing } from './derived.js';
import { canPlace } from './grid.js';
import { computePnL, computeRating, xpForLevel, hasNurseCare } from './model.js';
import { loginReward } from './ledger.js';

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

export function roomAvailability(game, ledger, type) {
  const def = ROOMS[type];
  if (!def || def.buildable === false) {
    return { available: false, reason: 'tier', canEarlyUnlock: false, earlyCost: 0, minutesSaved: 0, affordable: false };
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
  const r = canPlace(game.grid, game.size, x, y, def.w, def.h);
  if (r) return { ok: false, reason: r };
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
  const g = root.game;
  return Math.round(TIERS[g.tier].tuitionBase * (1 + BALANCE.tuitionStepPct * g.tuitionStep));
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
  for (const id of base.seatRooms) {
    if (!st.assignment[id]) out.push({ icon: '👩‍🏫', text: `${NAME(g.rooms[id].type)} has no teacher`, roomId: id });
  }
  const hasSeats = base.seatRooms.length > 0;
  if (hasSeats && !(base.counts.restroom > 0)) out.push({ icon: '🚽', text: 'No restroom' });
  else if (view.restroomLoad !== null && view.restroomLoad > 1) out.push({ icon: '🚽', text: 'Restrooms are overcrowded' });
  if (hasSeats && !(base.counts.cafeteria > 0)) {
    if (g.level >= ROOMS.cafeteria.level || g.unlocked.cafeteria) out.push({ icon: '🍔', text: 'No cafeteria' });
  } else if (base.counts.cafeteria > 0 && view.cafeteriaOver) out.push({ icon: '🍔', text: 'Cafeteria is too full' });
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
  if (g.cleanliness < 60) out.push({ icon: '🧹', text: 'The school is dirty' });
  if (st.capacity > 0 && g.students >= st.capacity) out.push({ icon: '🪑', text: 'All seats are full' });
  if ((base.counts.nurse || 0) > 0 && !hasNurseCare(g)) out.push({ icon: '🩺', text: "Nurse's Office needs a nurse" });
  if (g.happiness < 35 && g.students > 0) out.push({ icon: '😞', text: 'Students are unhappy' });
  if (g.cash < 0) out.push({ icon: '💸', text: 'Cash is negative' });
  return out.slice(0, 6);
}
