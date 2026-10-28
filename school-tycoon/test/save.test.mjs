import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, days, starterSchool } from './helpers.mjs';

test('serialize / deserialize round trip', () => {
  let r = days(starterSchool(), 33);
  r = run(r, A.applyReceipt({ txId: 'X', productId: 'starter_pack' }), A.claimDailyLogin('2026-03-01'));
  const s = E.serialize(r);
  assert.equal(typeof s.game, 'string');
  assert.equal(typeof s.ledger, 'string');
  const back = E.deserialize(s);
  assert.deepEqual(back, r);
  assert.deepEqual(E.selectDerived(back).connected, E.selectDerived(r).connected);
  // continues identically
  assert.deepEqual(days(back, 20), days(r, 20));
});

test('deserialize with no game starts a new school but keeps the ledger', () => {
  const r = run(E.createInitialState(), A.applyReceipt({ txId: 'X', productId: 'apples_120' }));
  const back = E.deserialize({ game: null, ledger: E.serialize(r).ledger });
  assert.equal(back.ledger.apples, 120);
  assert.equal(back.game.tick, 0);
  const fresh = E.deserialize({});
  assert.deepEqual(fresh, E.createInitialState());
});

test('v0 fixture migrates to v1', () => {
  const base = E.createInitialState(321).game;
  const v0 = {
    seed: 321, rng: 999, tick: 50, tier: 1, size: 16, grid: base.grid, rooms: base.rooms, nextId: 2,
    staff: { s5: { id: 's5', role: 'janitor', skill: 0, salary: 30, name: 'Old Bob' } },
    students: 12, happiness: 61, learning: 22, cleanliness: 90, reputation: 15,
    money: 777, tuition: 1, xp: 10, level: 1, stars: 1,
  };
  const back = E.deserialize({ game: JSON.stringify(v0), ledger: JSON.stringify({ apples: 40, credited: { 'tx:1': true } }) });
  const g = back.game;
  assert.equal(g.version, 1);
  assert.equal(g.cash, 777);
  assert.equal(g.tuitionStep, 1);
  assert.equal('money' in g, false);
  assert.equal(g.day, 2);
  assert.equal(g.nextId, 6, 'nextId above every existing id');
  assert.deepEqual(g.effects, {});
  assert.deepEqual(g.earlyUnlockLog, []);
  assert.equal(g.event, null);
  assert.equal(back.ledger.version, 1);
  assert.equal(back.ledger.apples, 40);
  assert.equal(back.ledger.equipped.wall, 'wall_default');
  // the migrated game plays
  const later = days(back, 5);
  assert.ok(Number.isInteger(later.game.cash));
  assert.equal(E.reduce(back, A.hire('janitor')).game.staff.s6.role, 'janitor');
});

test('newer save versions are rejected', () => {
  const r = E.createInitialState();
  const s = E.serialize(r);
  const g = JSON.parse(s.game);
  g.version = 2;
  assert.throws(() => E.deserialize({ game: JSON.stringify(g), ledger: s.ledger }), /newer/);
  const l = JSON.parse(s.ledger);
  l.version = 9;
  assert.throws(() => E.deserialize({ game: s.game, ledger: JSON.stringify(l) }), /newer/);
  assert.throws(() => E.deserialize({ game: '{not json', ledger: s.ledger }));
});
