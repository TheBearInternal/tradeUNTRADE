// Daily settlement (DESIGN §3). Called once per day rollover with g.day already advanced.
import { BALANCE, DAYS_PER_TERM, TERMS_PER_YEAR, TICKS_PER_DAY } from './config/index.js';
import { computeStaffing, computeFacilities, computeBase } from './derived.js';
import {
  computePnL, isClosedOn, isSickOn, schoolMods, happinessTarget, learningTarget,
  computeRating, roomReputation, applicantsPerDay, hasCounselor,
} from './model.js';
import { ROOMS } from './config/index.js';
import { addXp } from './progress.js';
import { dailyEvents, updateChallenge } from './events.js';
import { updateScenario } from './scenario.js';
import { updateWeekly } from './weekly.js';
import { clamp, pushLog } from './util.js';

const B = BALANCE;

export function reportGrade(learning) {
  if (learning >= 85) return 'A';
  if (learning >= 70) return 'B';
  if (learning >= 55) return 'C';
  if (learning >= 40) return 'D';
  return 'F';
}

const round3 = (v) => Math.round(v * 1000) / 1000;

// Returns { game, ledger }. Never touches grid/rooms/staff references.
export function settleDay(game, ledger) {
  const g = { ...game };
  let L = ledger;
  const dEnded = g.day - 1;
  const closed = isClosedOn(g, dEnded);
  const sick = isSickOn(g, dEnded);
  const N = g.students;
  const st = computeStaffing(g);
  const cap = st.capacity;

  // money (integers)
  const pnl = computePnL(g, dEnded);
  const cashBefore = g.cash;
  g.cash = Math.round(g.cash + pnl.net);
  g.stats = { ...g.stats, totalEarned: g.stats.totalEarned + pnl.tuition + (pnl.vending || 0) };
  const xpBefore = g.xp;
  const ts = g.termStats;
  g.termStats = {
    income: ts.income + pnl.tuition,
    salaries: ts.salaries + pnl.salaries,
    upkeep: ts.upkeep + pnl.upkeep,
    studentsStart: ts.studentsStart,
  };
  if (cashBefore >= 0 && g.cash < 0) pushLog(g, 'Cash is negative! Cut costs or raise income.', 'bad', B.logSize);

  // cleanliness
  const fac = computeFacilities(g);
  let C = g.cleanliness;
  if (!closed) C -= N * B.dirtPerStudent * fac.hygieneMult;
  C += B.cleanPerJanitor * st.janitors + fac.furnitureClean - ROOMS.vending.dirtPerDay * (computeBase(g).counts.vending || 0);
  g.cleanliness = round3(clamp(C, 0, 100));

  // happiness
  const mods = schoolMods(g);
  const hTarget = happinessTarget(g, mods, sick);
  g.happiness = round3(clamp(g.happiness + B.happinessRate * (hTarget - g.happiness), 0, 100));

  // learning
  if (!closed) {
    const gTarget = learningTarget(g, mods, g.happiness, dEnded);
    g.learning = round3(clamp(g.learning + B.learningRate * (gTarget - g.learning), 0, 100));
  }

  // rating & reputation
  const rating = computeRating(g);
  g.stars = rating.stars;
  g.reputation = clamp(Math.round(g.reputation + (g.stars - 2) * B.repPerStarOver2 + roomReputation(g)), 0, B.repMax);

  // enrollment
  let n = N;
  if (g.happiness < B.leaverHappinessThreshold && n > 0) {
    let leavers = Math.ceil((n * (B.leaverHappinessThreshold - g.happiness)) / B.leaverDiv);
    if (hasCounselor(g)) leavers = Math.floor(leavers * ROOMS.counselor.leaverMult);
    n -= Math.min(n, leavers);
  }
  if (n > cap) n = cap;
  const enroll = Math.min(applicantsPerDay(g), Math.max(0, cap - n));
  n += enroll;
  g.students = n;
  if (enroll > 0) g.stats = { ...g.stats, totalStudentsEver: g.stats.totalStudentsEver + enroll };

  // xp
  L = addXp(g, L, Math.ceil(N / B.xpStudentsDiv));

  // term end
  if ((dEnded + 1) % DAYS_PER_TERM === 0) {
    const termIndex = Math.floor(dEnded / DAYS_PER_TERM);
    const t = g.termStats;
    g.lastReport = {
      term: (termIndex % TERMS_PER_YEAR) + 1,
      year: Math.floor(termIndex / TERMS_PER_YEAR) + 1,
      income: t.income,
      salaries: t.salaries,
      upkeep: t.upkeep,
      net: t.income - t.salaries - t.upkeep,
      studentsStart: t.studentsStart,
      studentsEnd: g.students,
      happiness: Math.round(g.happiness),
      learning: Math.round(g.learning),
      stars: g.stars,
      grade: reportGrade(g.learning),
      // DESIGN_V2 §4: under-13 profiles get a gentle break suggestion every 3rd consecutive term.
      suggestBreak: ledger.ageGate === 'under13' && (termIndex + 1) % 3 === 0,
    };
    if (g.lastReport.suggestBreak) g.lastReport.breakMessage = 'Great term — good time for a break!';
    g.termStats = { income: 0, salaries: 0, upkeep: 0, studentsStart: g.students };
    L = addXp(g, L, B.xpPerTerm);
    pushLog(g, `Term ${g.lastReport.term} report card: grade ${g.lastReport.grade}, net $${g.lastReport.net}.`, 'info', B.logSize);
  }

  // events
  L = dailyEvents(g, L);
  updateChallenge(g);
  const off = g.effects && g.effects.offline;
  if (off) {
    const keep = {};
    let changed = false;
    for (const id in off) {
      if (off[id] > g.day && g.rooms[id]) keep[id] = off[id];
      else changed = true;
    }
    if (changed) g.effects = { ...g.effects, offline: keep };
  }

  // replay systems
  L = updateScenario(g, L);
  L = updateWeekly(g, L, { enrolled: enroll, income: pnl.tuition, xp: g.xp - xpBefore });

  return { game: g, ledger: L };
}

// Advances n ticks. Only creates a new game when something changed; a tick that crosses no
// day boundary only replaces `tick`.
export function advanceTicks(game, ledger, n) {
  let g = game;
  let L = ledger;
  let t = g.tick;
  const end = t + n;
  while (t < end) {
    const boundary = (Math.floor(t / TICKS_PER_DAY) + 1) * TICKS_PER_DAY;
    if (boundary > end) { t = end; break; }
    t = boundary;
    const r = settleDay({ ...g, tick: t, day: t / TICKS_PER_DAY }, L);
    g = r.game;
    L = r.ledger;
  }
  if (g.tick !== t) g = { ...g, tick: t };
  return { game: g, ledger: L };
}
