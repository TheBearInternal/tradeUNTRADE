import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, days, withGame, starterSchool } from './helpers.mjs';

const goal = (r, id, target, progress = 0, week = 0, i = 0) => ({
  key: `goal:${r.game.schoolNo}.${week}:${i}`, week, i, id, label: id, target, progress, done: false,
  reward: { xp: 30, cash: 300, apples: 5 },
});

test('three seeded weekly goals per week', () => {
  const r = starterSchool();
  const w = E.selectWeeklyGoals(r);
  assert.equal(w.week, 0);
  assert.equal(w.daysLeft, 7);
  assert.equal(w.goals.length, 3);
  assert.equal(new Set(w.goals.map((x) => x.id)).size, 3);
  assert.deepEqual(w.goals.map((x) => x.key), ['goal:1.0:0', 'goal:1.0:1', 'goal:1.0:2']);
  assert.deepEqual(E.selectWeeklyGoals(starterSchool()), w, 'seeded');
  const r7 = days(r, 7);
  const w7 = E.selectWeeklyGoals(r7);
  assert.equal(w7.week, 1);
  assert.ok(w7.goals.filter((x) => x.week === 1).length === 3);
  assert.ok(w7.goals.every((x) => !x.done || x.week === 1));
});

test('weekly goal crediting is idempotent', () => {
  let r = days(starterSchool(), 1);
  r = withGame(r, { weekly: { week: 0, goals: [goal(r, 'enroll', 10, 9)] } });
  const cash = r.game.cash;
  const pnl = E.selectDailyPnL(r);
  const a = E.reduce(r, A.tick(24));
  assert.equal(a.game.weekly.goals[0].done, true);
  assert.equal(a.ledger.apples, r.ledger.apples + 5);
  assert.equal(a.ledger.credited['goal:1.0:0'], true);
  assert.equal(a.game.cash, cash + pnl.net + 300);
  // the same goal key can never pay Apples twice (e.g. re-played from an old save)
  const replay = { game: r.game, ledger: a.ledger };
  const b = E.reduce(replay, A.tick(24));
  assert.equal(b.ledger.apples, a.ledger.apples);
  // a finished goal pays nothing more
  const c = E.reduce(a, A.tick(24));
  assert.equal(c.ledger.apples, a.ledger.apples);
  assert.equal(c.game.weekly.goals[0].progress, 10);
  // a new school uses new keys
  const fresh = run(a, A.resetSchool(77));
  assert.equal(fresh.game.schoolNo, 2);
  assert.ok(E.selectWeeklyGoals(fresh).goals.every((x) => x.key.startsWith('goal:2.0:')));
});

test('streak goals reset on a bad day; unfinished goals roll over for 3 weeks', () => {
  let r = days(starterSchool(), 1);
  r = withGame(r, { weekly: { week: 0, goals: [goal(r, 'clean', 7, 3)] } });
  const good = E.reduce(r, A.tick(24));
  assert.equal(good.game.weekly.goals[0].progress, 4);
  const bad = E.reduce(withGame(r, { cleanliness: 10 }), A.tick(24));
  assert.equal(bad.game.weekly.goals[0].progress, 0);
  // never-finishable goal from week 0: kept in weeks 1 and 2, dropped in week 3
  let x = withGame(r, { weekly: { week: 0, goals: [goal(r, 'stars', 999, 0)] } });
  x = days(x, 6); // day 7 -> week 1
  assert.ok(x.game.weekly.goals.some((g) => g.week === 0));
  x = days(x, 14); // day 21 -> week 3
  assert.equal(x.game.weekly.week, 3);
  assert.ok(!x.game.weekly.goals.some((g) => g.week === 0));
  assert.ok(E.selectWeeklyGoals(x).goals.some((g) => g.carriedOver) || x.game.weekly.goals.every((g) => g.week >= 1));
});
