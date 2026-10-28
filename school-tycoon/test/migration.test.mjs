import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, A, gridProblems } from './helpers.mjs';

// test/fixtures/v1_save.json was produced by the v1 engine: a starter school on day 12, plus the
// numbers the v1 engine computed for it (P&L, capacity, rating, per-room mods, next-day values).
const fixture = JSON.parse(readFileSync(new URL('./fixtures/v1_save.json', import.meta.url), 'utf8'));

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('v1 save migrates to v2 with starter layouts and identical numbers', () => {
  assert.equal(JSON.parse(fixture.save.game).version, 1);
  const r = E.deserialize(fixture.save);
  const g = r.game;
  assert.equal(g.version, E.GAME_VERSION);
  assert.equal(r.ledger.version, E.LEDGER_VERSION);
  assert.deepEqual(r.ledger.medals, {});
  assert.equal(r.ledger.equipped.furniture, 'furniture_default');
  assert.equal(g.mode, 'normal');
  assert.equal(g.scenario, null);
  assert.deepEqual(gridProblems(g), []);
  for (const id in g.rooms) {
    if (E.hasInterior(g.rooms[id].type)) {
      assert.deepEqual(g.interiors[id].items.map(({ itemType, cx, cy, rot }) => ({ itemType, cx, cy, rot })), E.LAYOUTS[g.rooms[id].type]);
    }
  }
  assert.equal(g.weekly.goals.length, 3);
  const x = fixture.expected;
  assert.deepEqual(E.selectDailyPnL(r), { ...x.pnl, vending: 0 });
  assert.equal(E.selectCapacity(r), x.capacity);
  assert.deepEqual(E.selectRating(r), x.rating);
  assert.deepEqual(E.selectDerived(r).connected, x.connected);
  const rs = E.selectDerived(r).roomStats;
  for (const id in x.roomStats) {
    for (const k of ['dR', 'dC', 'late', 'hR', 'hC']) assert.ok(near(rs[id][k], x.roomStats[id][k]), `${id}.${k}`);
  }
  // one more day of simulation matches v1 exactly
  const next = E.reduce(r, A.tick(24)).game;
  for (const k of ['cash', 'students', 'reputation', 'stars']) assert.equal(next[k], x.next[k], k);
  for (const k of ['happiness', 'learning', 'cleanliness']) assert.ok(near(next[k], x.next[k]), k);
});

test('migrated save round-trips', () => {
  const r = E.deserialize(fixture.save);
  assert.deepEqual(E.deserialize(E.serialize(r)), r);
});
