import test from 'node:test';
import assert from 'node:assert/strict';
import { E, starterSchool } from './helpers.mjs';

const HOUR = 3600 * 1000;

test('offline progress: 1 real second = 1 tick', () => {
  const r = starterSchool();
  const { root, summary } = E.simulateOffline(r, 24 * 1000 * 10);
  assert.equal(root.game.tick, 240);
  assert.equal(summary.days, 10);
  assert.equal(summary.cashDelta, root.game.cash - r.game.cash);
  assert.equal(summary.studentsDelta, root.game.students - r.game.students);
  assert.ok(summary.studentsDelta > 0);
});

test('offline progress is capped at 8 hours', () => {
  const r = starterSchool();
  const eight = E.simulateOffline(r, 8 * HOUR);
  const day = E.simulateOffline(r, 24 * HOUR);
  assert.equal(eight.root.game.tick, 8 * 3600);
  assert.equal(day.root.game.tick, 8 * 3600);
  assert.equal(day.summary.days, 1200);
  assert.deepEqual(day.root, eight.root);
  assert.equal(day.root.game.event === null || day.root.game.day - day.root.game.event.startedDay < 2, true, 'events auto-resolve while away');
});

test('offline with no or invalid elapsed time is a no-op', () => {
  const r = starterSchool();
  for (const ms of [0, -5000, NaN, undefined, 999]) {
    const out = E.simulateOffline(r, ms);
    assert.equal(out.root, r);
    assert.deepEqual(out.summary, { days: 0, cashDelta: 0, studentsDelta: 0 });
  }
});
