// Evaluator for the whitelisted conditions / effects DSL (config/dsl.js).
import { BALANCE, ROOMS, COND_STATS, COND_OPS, EFFECT_KEYS } from './config/index.js';
import { computeBase, computeStaffing, computeQuality } from './derived.js';
import { schoolMods } from './model.js';
import { addXp } from './progress.js';
import { clamp, pushLog } from './util.js';

const B = BALANCE;

export function statValue(game, stat) {
  switch (stat) {
    case 'teachers': return computeStaffing(game).teachers;
    case 'staff': return Object.keys(game.staff).length;
    case 'capacity': return computeStaffing(game).capacity;
    case 'lateRooms': return schoolMods(game).lateRooms;
    default: return game[stat];
  }
}

function compare(a, op, b) {
  switch (op) {
    case '>=': return a >= b;
    case '>': return a > b;
    case '<=': return a <= b;
    case '<': return a < b;
    case '==': return a === b;
    default: return false;
  }
}

export function evalCond(game, cond) {
  if (!cond) return true;
  if (cond.all) return cond.all.every((c) => evalCond(game, c));
  if (cond.any) return cond.any.some((c) => evalCond(game, c));
  if (cond.not) return !evalCond(game, cond.not);
  const counts = computeBase(game).counts;
  if (cond.hasRoom) return (counts[cond.hasRoom] || 0) > 0;
  if (cond.hasAnyRoom) return cond.hasAnyRoom.some((t) => (counts[t] || 0) > 0);
  if (cond.roomCount) return (counts[cond.roomCount] || 0) >= cond.min;
  if (cond.stat) return compare(statValue(game, cond.stat), cond.op, cond.value);
  return false;
}

// Validation for validateConfig(); returns error strings.
export function checkCond(cond, path) {
  const e = [];
  if (!cond || typeof cond !== 'object') return [`${path}: condition must be an object`];
  const keys = Object.keys(cond);
  if (cond.all || cond.any) {
    const list = cond.all || cond.any;
    if (!Array.isArray(list) || keys.length !== 1) e.push(`${path}: all/any must be a lone array`);
    else list.forEach((c, i) => e.push(...checkCond(c, `${path}[${i}]`)));
  } else if (cond.not) {
    if (keys.length !== 1) e.push(`${path}: not must be alone`);
    e.push(...checkCond(cond.not, `${path}.not`));
  } else if (cond.hasRoom) {
    if (!ROOMS[cond.hasRoom] || keys.length !== 1) e.push(`${path}: bad hasRoom`);
  } else if (cond.hasAnyRoom) {
    if (!Array.isArray(cond.hasAnyRoom) || !cond.hasAnyRoom.every((t) => ROOMS[t]) || keys.length !== 1) e.push(`${path}: bad hasAnyRoom`);
  } else if (cond.roomCount) {
    if (!ROOMS[cond.roomCount] || !Number.isInteger(cond.min) || keys.length !== 2) e.push(`${path}: bad roomCount`);
  } else if (cond.stat) {
    if (!COND_STATS.includes(cond.stat)) e.push(`${path}: unknown stat ${cond.stat}`);
    if (!COND_OPS.includes(cond.op)) e.push(`${path}: unknown op ${cond.op}`);
    if (typeof cond.value !== 'number' || !Number.isFinite(cond.value)) e.push(`${path}: value must be a number`);
    if (keys.length !== 3) e.push(`${path}: unexpected keys`);
  } else {
    e.push(`${path}: unknown condition ${JSON.stringify(cond)}`);
  }
  return e;
}

export function checkEffect(eff, path) {
  const keys = eff && typeof eff === 'object' ? Object.keys(eff) : [];
  if (keys.length !== 1 || !EFFECT_KEYS.includes(keys[0])) return [`${path}: unknown effect ${JSON.stringify(eff)}`];
  const k = keys[0];
  const v = eff[k];
  if (k === 'win') return v === true ? [] : [`${path}: win must be true`];
  if (k === 'challenge') {
    return v && Number.isInteger(v.days) && v.days > 0 && Number.isInteger(v.reward) && v.reward > 0
      ? [] : [`${path}: challenge needs integer days and reward`];
  }
  if (!Number.isInteger(v)) return [`${path}: ${k} must be an integer`];
  if (['closeDays', 'offlineRestroomDays', 'teacherRaisePct'].includes(k) && v <= 0) return [`${path}: ${k} must be > 0`];
  return [];
}

// Trophy case: +15 rep for a won event outcome (one counts).
export function applyWin(g) {
  if ((computeBase(g).counts.trophycase || 0) > 0) {
    g.reputation = clamp(g.reputation + B.winRep, 0, B.repMax);
    pushLog(g, `🏆 A win for the Trophy Case! +${B.winRep} reputation.`, 'good', B.logSize);
  }
}

// Applies effects to a mutable game copy `g`. ctx: { mult, params }. Returns the ledger.
export function applyEffects(g, ledger, effects, ctx) {
  let L = ledger;
  const mult = (ctx && ctx.mult) || 1;
  const pos = (v) => (v > 0 ? Math.round(v * mult) : v);
  for (const eff of effects || []) {
    const k = Object.keys(eff)[0];
    const v = eff[k];
    if (k === 'cash') g.cash = Math.round(g.cash + pos(v));
    else if (k === 'rep') g.reputation = clamp(Math.round(g.reputation + pos(v)), 0, B.repMax);
    else if (k === 'happiness') g.happiness = clamp(g.happiness + v, 0, 100);
    else if (k === 'learning') g.learning = clamp(g.learning + v, 0, 100);
    else if (k === 'cleanliness') g.cleanliness = clamp(g.cleanliness + v, 0, 100);
    else if (k === 'xp') L = addXp(g, L, pos(v));
    else if (k === 'closeDays') {
      g.effects = { ...g.effects, closedUntil: Math.max((g.effects && g.effects.closedUntil) || 0, g.day + v) };
    } else if (k === 'offlineRestroomDays') {
      const quality = computeQuality(g);
      const base = computeBase(g);
      const offline = (g.effects && g.effects.offline) || {};
      const target = base.ids.find((id) => g.rooms[id].type === 'restroom' && base.connected[id]
        && quality[id] && quality[id].capacity > 0 && !offline[id]);
      if (target) g.effects = { ...g.effects, offline: { ...offline, [target]: g.day + v } };
    } else if (k === 'teacherRaisePct') {
      const staff = {};
      for (const id in g.staff) {
        const s = g.staff[id];
        staff[id] = s.role === 'teacher' ? { ...s, salary: Math.round((s.salary * (100 + v)) / 100) } : s;
      }
      g.staff = staff;
    } else if (k === 'challenge') {
      const room = ctx && ctx.params && ctx.params.room;
      if (room) g.effects = { ...g.effects, challenge: { room, until: g.day + v.days, reward: v.reward } };
    } else if (k === 'win') applyWin(g);
  }
  return L;
}
