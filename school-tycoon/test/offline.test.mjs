import test from 'node:test';
import assert from 'node:assert/strict';
import { E, starterSchool } from './helpers.mjs';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

test('offline progress: 1 tick per whole real minute away', () => {
  assert.equal(E.BALANCE.offlineTicksPerMinute, 1);
  assert.equal(E.BALANCE.offlineMaxTicks, 72);
  const r = starterSchool();
  const { root, summary } = E.simulateOffline(r, 48 * MIN + 59 * 1000);
  assert.equal(root.game.tick, 48);
  assert.equal(summary.days, 2);
  assert.equal(summary.cashDelta, root.game.cash - r.game.cash);
  assert.equal(summary.studentsDelta, root.game.students - r.game.students);
  assert.ok(summary.studentsDelta > 0);
  assert.equal(E.offlineTicksFor(59 * 1000), 0);
  assert.equal(E.offlineTicksFor(5 * MIN), 5);
});

test('offline progress is capped at 72 ticks (3 game days)', () => {
  const r = starterSchool();
  const capped = E.simulateOffline(r, 72 * MIN);
  const hours = E.simulateOffline(r, 8 * HOUR);
  const week = E.simulateOffline(r, 7 * 24 * HOUR);
  assert.equal(capped.root.game.tick, 72);
  assert.equal(hours.root.game.tick, 72);
  assert.equal(week.summary.days, 3);
  assert.deepEqual(week.root, capped.root);
});

test('offline with no, negative (clock moved back) or invalid elapsed time is a no-op', () => {
  const r = starterSchool();
  for (const ms of [0, -5000, -10 * HOUR, NaN, undefined, 59 * 1000]) {
    const out = E.simulateOffline(r, ms);
    assert.equal(out.root, r);
    assert.deepEqual(out.summary, { days: 0, cashDelta: 0, studentsDelta: 0 });
  }
});
