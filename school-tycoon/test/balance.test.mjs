import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, starterSchool } from './helpers.mjs';

// The DESIGN starter school: 2 classrooms, a restroom, hallways, 2 rookie teachers, 1 janitor.
// A passive player (events auto-resolve) must turn a profit within a few days and keep growing.
for (const seed of [12345, 1, 2, 3]) {
  test(`balance smoke test: starter school over 60 days (seed ${seed})`, () => {
    let r = starterSchool(seed);
    const startCash = r.game.cash;
    let firstPositiveDay = null;
    const cashByDay = [r.game.cash];
    for (let d = 1; d <= 60; d++) {
      r = E.reduce(r, A.tick(24));
      cashByDay.push(r.game.cash);
      if (firstPositiveDay === null && cashByDay[d] > cashByDay[d - 1]) firstPositiveDay = d;
    }
    assert.ok(firstPositiveDay !== null && firstPositiveDay <= 5, `first positive day ${firstPositiveDay}`);
    assert.ok(r.game.cash > startCash + 5000, `cash ${startCash} -> ${r.game.cash}`);
    assert.ok(cashByDay[60] > cashByDay[30] && cashByDay[30] > cashByDay[10], 'keeps growing');
    assert.ok(r.game.students > 20, `students ${r.game.students}`);
    assert.ok(r.game.level >= 2);
    const closed = (r.game.effects.closedUntil || 0) > r.game.day;
    assert.ok(closed || E.selectDailyPnL(r).net > 0, 'profitable unless closed for flu');
  });
}

test('balance: an active player reaches 3+ stars and earns reputation', () => {
  let r = starterSchool();
  const tryAct = (a) => { const n = E.reduce(r, a); r = n; return n; };
  for (let d = 1; d <= 120; d++) {
    r = E.reduce(r, A.tick(24));
    if (r.game.event) tryAct(A.resolveEvent(r.game.event.choices[0].id));
    if (r.game.level >= 2 && !Object.values(r.game.rooms).some((x) => x.type === 'cafeteria')) tryAct(A.build('cafeteria', 2, 11));
    if (r.game.level >= 3 && !Object.values(r.game.rooms).some((x) => x.type === 'playground')) {
      tryAct(A.build('playground', 12, 6));
      tryAct(A.build('hall', 12, 10));
    }
    if (r.game.level >= 2) for (const x of [0, 1, 13, 14, 15]) tryAct(A.build('bench', x, 0));
  }
  assert.ok(r.game.stars >= 3, `stars ${r.game.stars}`);
  assert.ok(r.game.reputation > 0, `rep ${r.game.reputation}`);
  assert.ok(r.game.cash > 4000);
});
