import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, days, starterSchool, quiet } from './helpers.mjs';

test('daily economy math', () => {
  let r = quiet(starterSchool());
  assert.equal(r.game.cash, 4000 - 2 * 500 - 300 - 9 * 10);
  const p0 = E.selectDailyPnL(r);
  const halls = r.game.grid.filter((v) => v === 'hall').length;
  assert.deepEqual(p0, { tuition: 0, salaries: 130, upkeep: 3 + Math.round(halls * 10 * 0.002), net: -133, vending: 0 });
  r = days(r, 3);
  const N = r.game.students;
  assert.equal(N, 18, 'applicants/day = 6 at rep 0');
  const p = E.selectDailyPnL(r);
  assert.equal(p.tuition, 10 * N);
  assert.equal(p.net, p.tuition - p.salaries - p.upkeep);
  const cash = r.game.cash;
  const r2 = E.reduce(r, A.tick(24));
  assert.equal(r2.game.cash, cash + p.net, 'settlement matches selectDailyPnL');
  assert.ok(Number.isInteger(r2.game.cash));
  assert.equal(r2.game.stats.totalEarned, r.game.stats.totalEarned + p.tuition);

  const up = run(r2, A.setTuition(2));
  assert.equal(E.selectDailyPnL(up).tuition, 12 * up.game.students);
  assert.equal(E.selectTuitionPerStudent(up), 12);
  const down = run(r2, A.setTuition(-2));
  assert.equal(E.selectDailyPnL(down).tuition, 8 * down.game.students);
});

test('xp, leveling and level-up apples', () => {
  assert.equal(E.xpForLevel(1), 0);
  assert.equal(E.xpForLevel(2), 60);
  assert.equal(E.xpForLevel(3), Math.round(60 * Math.pow(2, 1.6)));
  let r = starterSchool();
  r = days(r, 30);
  assert.ok(r.game.level >= 2);
  assert.ok(r.ledger.credited['lvl:2']);
  const xp = E.selectXpProgress(r);
  assert.ok(xp.xp >= xp.xpForThis && xp.xp < xp.xpForNext);
});

test('term report card every 15 days', () => {
  let r = starterSchool();
  r = days(r, 14);
  assert.equal(r.game.lastReport, null);
  r = days(r, 1);
  const rep = r.game.lastReport;
  assert.ok(rep);
  assert.equal(rep.term, 1);
  assert.equal(rep.year, 1);
  assert.equal(rep.net, rep.income - rep.salaries - rep.upkeep);
  assert.equal(rep.studentsStart, 0);
  assert.equal(rep.studentsEnd, r.game.students);
  assert.ok('ABCDF'.includes(rep.grade));
  assert.equal(rep.suggestBreak, false);
  r = run(r, A.dismissReport());
  assert.equal(r.game.lastReport, null);
  // under-13 profiles get a break suggestion after every 3rd term
  let kid = run(starterSchool(), A.setAgeGate('under13'));
  kid = days(kid, 30);
  assert.equal(kid.game.lastReport.suggestBreak, false);
  kid = days(kid, 15);
  assert.equal(kid.game.lastReport.suggestBreak, true);
  assert.equal(kid.game.lastReport.breakMessage, 'Great term — good time for a break!');
  assert.deepEqual(E.selectTimeLabel(r), { year: 1, term: 2, dayOfTerm: 1, hour: 0 });
});

test('unhappy students leave; excess students leave when capacity drops', () => {
  let r = days(starterSchool(), 10);
  assert.equal(r.game.students, 40);
  const t = Object.values(r.game.staff).find((s) => s.role === 'teacher');
  r = run(r, A.fire(t.id));
  r = days(r, 1);
  assert.equal(r.game.students, 20);
  const sad = { game: { ...r.game, happiness: 10 }, ledger: r.ledger };
  const r2 = E.reduce(sad, A.tick(24));
  const H = r2.game.happiness;
  assert.ok(H < 30);
  const leavers = Math.ceil((20 * (30 - H)) / 200);
  assert.ok(leavers > 0);
  // leavers go first, then applicants refill up to capacity
  assert.equal(r2.game.stats.totalStudentsEver - sad.game.stats.totalStudentsEver, leavers);
  assert.equal(r2.game.students, 20);
});
