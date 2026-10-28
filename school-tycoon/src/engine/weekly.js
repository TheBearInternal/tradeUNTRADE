// Weekly goals (DESIGN_V2 §3.4). game.weekly = { week, goals: [goal] } where goal =
// { key, week, i, id, label, target, progress, done, reward: { xp, cash, apples } }.
import { BALANCE, WEEKLY_GOALS, WEEKLY_GOAL_ORDER } from './config/index.js';
import { rngNext } from './rng.js';
import { evalCond } from './cond.js';
import { addXp } from './progress.js';
import { credit } from './ledger.js';
import { pushLog } from './util.js';

const B = BALANCE;

const tierValue = (v, tier) => (Array.isArray(v) ? v[Math.min(v.length, tier) - 1] : v);

// Draws BALANCE.weeklyGoalsPerWeek distinct templates with the game RNG. g is mutable.
function makeGoals(g, week) {
  const pool = WEEKLY_GOAL_ORDER.slice();
  const out = [];
  for (let i = 0; i < B.weeklyGoalsPerWeek && pool.length; i++) {
    const r = rngNext(g.rng);
    g.rng = r.state;
    const id = pool.splice(Math.floor(r.value * pool.length), 1)[0];
    const t = WEEKLY_GOALS[id];
    const target = tierValue(t.target, g.tier);
    out.push({
      key: `goal:${g.schoolNo}.${week}:${i}`, week, i, id,
      label: t.label.replace('{target}', String(target)),
      target, progress: 0, done: false,
      reward: { xp: t.reward.xp, cash: t.reward.cash * g.tier, apples: B.weeklyGoalApples },
    });
  }
  return out;
}

export function initialWeekly(g) {
  if (g.mode === 'sandbox') return { week: 0, goals: [] };
  return { week: 0, goals: makeGoals(g, 0) };
}

// Called at day rollover after the sim; metrics: { enrolled, income, xp } for the day that ended.
export function updateWeekly(g, ledger, metrics) {
  if (g.mode === 'sandbox' || !g.weekly) return ledger;
  let L = ledger;
  const goals = g.weekly.goals.map((goal) => {
    if (goal.done) return goal;
    const t = WEEKLY_GOALS[goal.id];
    if (!t) return goal;
    let progress = goal.progress;
    if (t.kind === 'sum') progress += Math.max(0, Math.round(metrics[t.metric] || 0));
    else progress = evalCond(g, t.cond) ? progress + 1 : 0;
    const done = progress >= goal.target;
    if (done) {
      g.cash += goal.reward.cash;
      L = addXp(g, L, goal.reward.xp);
      L = credit(L, goal.key, goal.reward.apples);
      pushLog(g, `Weekly goal done: ${goal.label} (+$${goal.reward.cash}, +${goal.reward.xp} XP, +${goal.reward.apples} 🍎)`, 'good', B.logSize);
    }
    return { ...goal, progress: Math.min(progress, goal.target), done };
  });
  let weekly = { week: g.weekly.week, goals };
  const week = Math.floor(g.day / B.daysPerWeek);
  if (week !== g.weekly.week) {
    const kept = goals.filter((x) => !x.done && x.week > week - B.weeklyGoalWeeksKept);
    weekly = { week, goals: kept.concat(makeGoals(g, week)) };
  }
  g.weekly = weekly;
  return L;
}
