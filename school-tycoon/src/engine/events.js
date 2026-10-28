// Inspection and flu events (DESIGN §5). All functions take a mutable game copy `g`
// and return the (possibly new) ledger.
import { BALANCE, ROOMS } from './config/index.js';
import { computeBase } from './derived.js';
import { computeCoverage, hasNurseCare } from './model.js';
import { rngNext } from './rng.js';
import { addXp } from './progress.js';
import { clamp, pushLog } from './util.js';

const B = BALANCE;

export const EVENT_CHOICES = {
  inspection: [
    { id: 'deepclean', label: 'Deep clean (+30 cleanliness, -10% learning for 5 days)' },
    { id: 'cram', label: 'Cram (+5 learning now, -5 happiness)' },
  ],
  inspection_result: [{ id: 'ok', label: 'OK' }],
  flu: [
    { id: 'close', label: 'Close school for 2 days (no tuition, flu ends)' },
    { id: 'open', label: 'Stay open (students sick for a few days)' },
  ],
};

function log(g, text, kind) { pushLog(g, text, kind, B.logSize); }

export function inspectionScore(g) {
  const W = B.inspectionWeights;
  const counts = computeBase(g).counts;
  let bonus = 0;
  for (const type in counts) if (ROOMS[type] && ROOMS[type].inspectionBonus && counts[type] > 0) bonus += ROOMS[type].inspectionBonus;
  return W.cleanliness * g.cleanliness + W.learning * g.learning + W.coverage * computeCoverage(g) + bonus;
}

export function gradeFor(score) {
  for (const [grade, min] of B.inspectionGrades) if (score >= min) return grade;
  return 'F';
}

// Applies a choice to the active event. Returns ledger, or null when the choice is invalid.
export function applyChoice(g, ledger, choiceId) {
  const ev = g.event;
  if (!ev || !ev.choices.some((c) => c.id === choiceId)) return null;
  const day = g.day;
  let L = ledger;
  if (ev.id === 'inspection' && ev.phase === 'announce') {
    if (choiceId === 'deepclean') {
      g.cleanliness = clamp(g.cleanliness + B.deepCleanBonus, 0, 100);
      g.effects = { ...g.effects, deepCleanUntil: day + B.deepCleanDays };
      log(g, 'Deep clean done. Sparkling halls, slower lessons for a few days.', 'info');
    } else {
      g.learning = clamp(g.learning + B.cramLearning, 0, 100);
      g.happiness = clamp(g.happiness - B.cramHappiness, 0, 100);
      log(g, 'Cram sessions! Learning up, spirits down.', 'info');
    }
  } else if (ev.id === 'flu') {
    if (choiceId === 'close') {
      g.effects = { ...g.effects, closedUntil: day + B.fluCloseDays, fluSickUntil: 0 };
      log(g, 'School closed for 2 days to stop the flu.', 'bad');
    } else {
      const days = hasNurseCare(g) ? B.fluSickDaysNurse : B.fluSickDays;
      g.effects = { ...g.effects, fluSickUntil: day + days };
      log(g, `School stays open. The flu will last ${days} day${days === 1 ? '' : 's'}.`, 'bad');
    }
  }
  g.event = null;
  return L;
}

// Called at day rollover (g.day is the new day). Returns the ledger.
export function dailyEvents(g, ledger) {
  let L = ledger;
  // 1. auto-resolve stale events with the first option
  if (g.event && g.day - g.event.startedDay >= B.eventAutoResolveDays) {
    L = applyChoice(g, L, g.event.choices[0].id) || L;
  }
  // 2. inspection due
  if (g.day >= g.inspectionDueDay) {
    if (g.event) L = applyChoice(g, L, g.event.choices[0].id) || L;
    const score = Math.round(inspectionScore(g) * 10) / 10;
    const grade = gradeFor(score);
    const rw = B.inspectionRewards[grade];
    g.reputation = clamp(g.reputation + rw.rep, 0, B.repMax);
    g.cash += rw.cash;
    if (rw.xp) L = addXp(g, L, rw.xp);
    g.lastInspectionGrade = grade;
    while (g.inspectionDueDay <= g.day) g.inspectionDueDay += B.inspectionInterval;
    const parts = [];
    if (rw.rep) parts.push(`${rw.rep > 0 ? '+' : ''}${rw.rep} reputation`);
    if (rw.cash) parts.push(`+$${rw.cash}`);
    if (rw.xp) parts.push(`+${rw.xp} XP`);
    const text = `Inspection grade ${grade} (score ${score}).${parts.length ? ' ' + parts.join(', ') + '.' : ''}`;
    g.event = {
      id: 'inspection', phase: 'result', title: 'Inspection results', text,
      grade, score, choices: EVENT_CHOICES.inspection_result, startedDay: g.day,
    };
    log(g, text, grade === 'A' || grade === 'B' ? 'good' : grade === 'C' ? 'info' : 'bad');
  }
  // 3. inspection announcement
  if (g.day === g.inspectionDueDay - B.inspectionAnnounceDays) {
    if (g.event) L = applyChoice(g, L, g.event.choices[0].id) || L;
    g.event = {
      id: 'inspection', phase: 'announce', title: 'Inspection in 5 days',
      text: 'The school inspector visits in 5 days. How do you prepare?',
      choices: EVENT_CHOICES.inspection, startedDay: g.day, dueDay: g.inspectionDueDay,
    };
    log(g, 'The inspector arrives in 5 days!', 'info');
  }
  // 4. flu outbreak (seeded)
  const fx = g.effects || {};
  const fluActive = (fx.fluSickUntil || 0) > g.day || (fx.closedUntil || 0) > g.day;
  if (!g.event && !fluActive && g.students >= B.fluMinStudents) {
    const r = rngNext(g.rng);
    g.rng = r.state;
    if (r.value < B.fluChance) {
      g.event = {
        id: 'flu', phase: 'outbreak', title: 'Flu outbreak!',
        text: 'A flu is spreading through the school. What do you do?',
        choices: EVENT_CHOICES.flu, startedDay: g.day,
      };
      log(g, 'Flu outbreak!', 'bad');
    }
  }
  return L;
}
