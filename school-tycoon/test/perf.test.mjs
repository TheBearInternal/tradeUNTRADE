import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, starterSchool } from './helpers.mjs';

test('perf: 10k ticks under ~500ms', () => {
  let r = starterSchool();
  const t0 = Date.now();
  for (let i = 0; i < 10000; i++) r = E.reduce(r, A.tick(1));
  const ms = Date.now() - t0;
  assert.equal(r.game.tick, 10000);
  assert.ok(ms < 500, `took ${ms}ms`);
});
