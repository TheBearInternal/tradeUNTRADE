// Pure formulas shared by the daily sim, events and selectors (DESIGN §3).
import { ROOMS, BALANCE, TIERS } from './config/index.js';
import { computeBase, computeStaffing, computeDerivedView, computeFacilities } from './derived.js';
import { clamp } from './util.js';

const mod = (game, k) => (game.modifiers && typeof game.modifiers[k] === 'number' ? game.modifiers[k] : 1);

export function tuitionPerStudent(game) {
  const base = TIERS[game.tier].tuitionBase;
  return Math.round(base * (1 + BALANCE.tuitionStepPct * game.tuitionStep) * mod(game, 'tuitionMult'));
}

// Count of connected rooms of a type that actually work (bus stop must touch the lot edge).
export function workingCount(game, type) {
  const base = computeBase(game);
  if (!ROOMS[type] || !ROOMS[type].edge) return base.counts[type] || 0;
  let n = 0;
  for (const id of base.ids) if (game.rooms[id].type === type && base.connected[id] && base.onEdge[id]) n++;
  return n;
}

export function vendingIncome(game) {
  const n = Math.min(BALANCE.vendingMaxCount, computeBase(game).counts.vending || 0);
  return Math.round(n * ROOMS.vending.incomePerStudent * game.students);
}

export const isClosedOn = (game, day) => ((game.effects && game.effects.closedUntil) || 0) > day;
export const isSickOn = (game, day) => !isClosedOn(game, day) && ((game.effects && game.effects.fluSickUntil) || 0) > day;
export const isDeepCleanOn = (game, day) => ((game.effects && game.effects.deepCleanUntil) || 0) > day;

// Daily P&L for the day `day` (defaults to the current day).
export function computePnL(game, day) {
  const d = day === undefined ? game.day : day;
  const closed = isClosedOn(game, d);
  const tuition = closed ? 0 : tuitionPerStudent(game) * game.students;
  const vending = closed ? 0 : vendingIncome(game);
  const salaries = computeStaffing(game).salaries;
  const upkeep = computeBase(game).upkeep;
  return { tuition, salaries, upkeep, net: tuition + vending - salaries - upkeep, vending };
}

export function coverageKinds(tier) {
  return tier >= 2
    ? ['restroom', 'cafeteria', 'playground', 'staffroom', 'nurse', 'library']
    : ['restroom', 'cafeteria', 'playground', 'staffroom'];
}

export function computeCoverage(game) {
  const counts = computeBase(game).counts;
  const kinds = coverageKinds(game.tier);
  let met = 0;
  for (const k of kinds) if ((counts[k] || 0) > 0) met++;
  return Math.round((100 * met) / kinds.length);
}

export function starsFor(score) {
  let s = 0;
  for (const t of BALANCE.starThresholds) if (score >= t) s++;
  return s;
}

// Reads only game state (never the ledger / cosmetics).
export function computeRating(game) {
  const W = BALANCE.ratingWeights;
  const coverage = computeCoverage(game);
  const score = W.learning * game.learning + W.happiness * game.happiness + W.coverage * coverage;
  const rounded = Math.round(score * 10) / 10;
  return { score: rounded, stars: starsFor(score), coverage };
}

export function hasNurseCare(game) {
  const base = computeBase(game);
  return (base.counts.nurse || 0) > 0 && computeStaffing(game).nurses > 0;
}

export function hasCounselor(game) {
  const base = computeBase(game);
  return (base.counts.counselor || 0) > 0 && computeStaffing(game).counselors > 0;
}

// Seat-weighted school averages over active seat rooms.
export function schoolMods(game) {
  const B = BALANCE;
  const st = computeStaffing(game);
  const view = computeDerivedView(game);
  let seats = 0;
  let hR = 0;
  let hC = 0;
  let late = 0;
  let learn = 0;
  let happy = 0;
  let lateRooms = 0;
  for (const a of st.active) {
    const m = view.roomStats[a.id];
    seats += a.seats;
    hR += a.seats * m.hR;
    hC += a.seats * m.hC;
    late += a.seats * m.late;
    happy += a.seats * a.happy;
    if (m.late > 0) lateRooms++;
    learn += a.seats * (B.learnBase + B.learnPerSkill * a.skill) * a.bonus * (1 - B.lateLearnPenalty * m.late);
  }
  if (seats === 0) return { hR: 0, hC: 0, late: 0, learn: 0, roomHappy: 0, seats: 0, lateRooms: 0 };
  return { hR: hR / seats, hC: hC / seats, late: late / seats, learn: learn / seats, roomHappy: happy / seats, seats, lateRooms };
}

export function roomHappinessBonus(game) {
  const counts = computeBase(game).counts;
  let bonus = 0;
  for (const type in counts) {
    const def = ROOMS[type];
    if (def && def.happiness && counts[type] > 0) bonus += def.happiness; // max 1 of each counts
  }
  return bonus;
}

export function happinessTarget(game, mods, sick) {
  const B = BALANCE;
  const base = computeBase(game);
  const cap = computeStaffing(game).capacity;
  const dirt = -B.dirtPenaltyMax * (1 - game.cleanliness / 100);
  const fac = computeFacilities(game);
  let t = B.happinessBase + mods.hR + mods.hC + base.decor + roomHappinessBonus(game) + dirt
    + mods.roomHappy + fac.otherHappy
    - (game.students > cap ? B.overCapacityPenalty : 0)
    - B.tuitionStepHappiness * game.tuitionStep;
  if (sick) t -= B.fluHappinessPenalty;
  return t;
}

export function learningTarget(game, mods, H, day) {
  const B = BALANCE;
  const fac = computeFacilities(game);
  let learn = mods.learn * (B.learnHappyBase + H / B.learnHappyDiv);
  learn *= 1 + fac.libraryBonus;
  if (isSickOn(game, day)) learn *= B.fluLearnMult;
  if (isDeepCleanOn(game, day)) learn *= B.deepCleanLearnMult;
  return clamp(learn * B.learnTargetScale, 0, 100);
}

export function roomReputation(game) {
  const counts = computeBase(game).counts;
  let rep = 0;
  for (const type in counts) {
    const def = ROOMS[type];
    if (def && def.repPerDay) rep += def.repPerDay * counts[type];
  }
  return rep + computeFacilities(game).furnitureRep;
}

export function applicantsPerDay(game) {
  const B = BALANCE;
  const bus = workingCount(game, 'busstop') > 0 ? ROOMS.busstop.applicantMult : 1;
  const raw = (B.applicantBase + game.reputation / B.applicantRepDivisor) * (1 - B.applicantStepPenalty * game.tuitionStep) * bus;
  return Math.max(0, Math.floor(raw + 1e-9));
}

export function xpForLevel(n) {
  if (n <= 1) return 0;
  return Math.round(BALANCE.xpLevelBase * Math.pow(n - 1, BALANCE.xpLevelExp));
}
