// Scenario goals and medals (DESIGN_V2 §3.1). game.scenario = { id, goalsMet: [goalIndex],
// endDay, result: null | 'bronze' | 'silver' | 'gold' | 'failed' }.
import { BALANCE, SCENARIOS, MEDAL_RANK } from './config/index.js';
import { evalCond } from './cond.js';
import { pushLog } from './util.js';

export function medalFor(def, met) {
  let best = 'failed';
  for (const m of ['bronze', 'silver', 'gold']) if (met >= def.medals[m]) best = m;
  return best;
}

// Daily evaluation; g is a mutable copy. Returns the (possibly new) ledger.
export function updateScenario(g, ledger) {
  const sc = g.scenario;
  if (!sc || sc.result) return ledger;
  const def = SCENARIOS[sc.id];
  if (!def) return ledger;
  let goalsMet = sc.goalsMet;
  def.goals.forEach((goal, i) => {
    if (goalsMet.indexOf(i) < 0 && evalCond(g, goal.cond)) {
      goalsMet = goalsMet.concat([i]).sort((a, b) => a - b);
      pushLog(g, `Scenario goal met: ${goal.label}`, 'good', BALANCE.logSize);
    }
  });
  let result = null;
  if (goalsMet.length === def.goals.length || g.day >= sc.endDay) result = medalFor(def, goalsMet.length);
  g.scenario = { ...sc, goalsMet, result };
  if (!result) return ledger;
  pushLog(g, result === 'failed' ? `Scenario over: ${def.name} failed.` : `Scenario complete: ${def.name}, ${result} medal!`,
    result === 'failed' ? 'bad' : 'good', BALANCE.logSize);
  if (result === 'failed') return ledger;
  const prev = ledger.medals && ledger.medals[sc.id];
  if (prev && MEDAL_RANK[prev] >= MEDAL_RANK[result]) return ledger;
  return { ...ledger, medals: { ...(ledger.medals || {}), [sc.id]: result } };
}
