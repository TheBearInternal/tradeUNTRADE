import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, days, withGame, starterSchool } from './helpers.mjs';

const apples = (root, n, tx = 'seed') => ({ game: root.game, ledger: { ...root.ledger, apples: n, credited: { ...root.ledger.credited, [`test:${tx}`]: true } } });

test('early unlock: cost, Apples debit and build', () => {
  const r = apples(E.createInitialState(), 100);
  const av = E.selectRoomAvailability(r, 'cafeteria');
  assert.equal(av.available, false);
  assert.equal(av.reason, 'level');
  assert.equal(av.canEarlyUnlock, true);
  assert.equal(av.earlyCost, 30);
  assert.ok(av.minutesSaved >= 1);
  assert.equal(E.selectRoomAvailability(r, 'staffroom').earlyCost, 90);
  const u = run(r, A.earlyUnlock('cafeteria'));
  assert.equal(u.ledger.apples, 70);
  assert.equal(u.game.unlocked.cafeteria, true);
  assert.deepEqual(u.game.earlyUnlockLog, [0]);
  assert.equal(E.selectRoomAvailability(u, 'cafeteria').available, true);
  assert.equal(E.selectCanBuild(u, 'cafeteria', 0, 0).ok, true);
  run(u, A.build('cafeteria', 0, 0));
  assert.equal(E.reduce(u, A.earlyUnlock('cafeteria')), u, 'already unlocked');
  assert.equal(E.reduce(u, A.earlyUnlock('classroom')), u, 'already available');
  assert.equal(E.selectEarlyUnlocksLeft(u), 2);
});

test('early unlock: weekly cap of 3', () => {
  let r = apples(E.createInitialState(), 1000);
  r = run(r, A.earlyUnlock('cafeteria'), A.earlyUnlock('playground'), A.earlyUnlock('staffroom'));
  assert.equal(r.ledger.apples, 1000 - 30 - 60 - 90);
  assert.equal(E.selectEarlyUnlocksLeft(r), 0);
  assert.equal(E.selectRoomAvailability(r, 'bench').canEarlyUnlock, false);
  assert.equal(E.reduce(r, A.earlyUnlock('bench')), r);
  r = days(r, 6);
  assert.equal(E.reduce(r, A.earlyUnlock('bench')), r, 'still inside the 7-day window');
  r = days(r, 1);
  assert.equal(E.selectEarlyUnlocksLeft(r), 3);
  r = run(r, A.earlyUnlock('bench'));
  assert.equal(E.selectEarlyUnlocksLeft(r), 2);
});

test('early unlock: not allowed for a higher tier or with insufficient Apples', () => {
  const rich = apples(E.createInitialState(), 5000);
  const lib = E.selectRoomAvailability(rich, 'library');
  assert.equal(lib.reason, 'tier');
  assert.equal(lib.canEarlyUnlock, false);
  assert.equal(E.reduce(rich, A.earlyUnlock('library')), rich);
  assert.equal(E.reduce(rich, A.earlyUnlock('auditorium')), rich);
  assert.equal(E.reduce(rich, A.earlyUnlock('office')), rich);
  const poor = apples(E.createInitialState(), 29);
  assert.equal(E.selectRoomAvailability(poor, 'cafeteria').affordable, false);
  assert.equal(E.reduce(poor, A.earlyUnlock('cafeteria')), poor);
  // tiers can never be bought: there is no action for it and tierUp ignores Apples
  assert.equal(E.reduce(rich, A.tierUp()), rich);
});

test('ledger: the same receipt twice is a no-op', () => {
  const r0 = E.createInitialState();
  const r1 = run(r0, A.applyReceipt({ txId: 'T1', productId: 'apples_120' }));
  assert.equal(r1.ledger.apples, 120);
  assert.equal(E.reduce(r1, A.applyReceipt({ txId: 'T1', productId: 'apples_120' })), r1);
  const r2 = run(r1, A.applyReceipt({ txId: 'T2', productId: 'apples_120' }));
  assert.equal(r2.ledger.apples, 240, 'consumables stack with new txIds');
  assert.equal(E.reduce(r2, A.applyReceipt({ txId: 'T3', productId: 'nope' })), r2);
  assert.equal(E.reduce(r2, A.applyReceipt(null)), r2);
  assert.equal(E.reduce(r2, A.applyReceipt({ productId: 'apples_120' })), r2);
  assert.equal(r2.game, r0.game, 'purchases never touch game');
});

test('ledger: credit() is idempotent by key', () => {
  const l = E.createInitialState().ledger;
  const a = E.credit(l, 'x:1', 50);
  assert.equal(a.apples, 50);
  assert.equal(E.credit(a, 'x:1', 50), a);
});

test('starter_pack can only be credited once', () => {
  let r = run(E.createInitialState(), A.applyReceipt({ txId: 'A', productId: 'starter_pack' }));
  assert.equal(r.ledger.apples, 500);
  assert.equal(r.ledger.owned.starter_pack, true);
  assert.equal(r.ledger.owned.mascot_hoot, true);
  assert.equal(E.reduce(r, A.applyReceipt({ txId: 'B', productId: 'starter_pack' })), r);
  r = run(r, A.applyReceipt({ txId: 'C', productId: 'supporter_pack' }));
  assert.equal(r.ledger.owned.skin_founder, true);
  assert.equal(r.ledger.apples, 500);
});

test('daily login: 7-day cycle, same dayKey twice, supporter doubles', () => {
  let r = E.createInitialState();
  assert.deepEqual(E.selectLoginReward(r, '2026-01-01'), { claimable: true, amount: 5, streakIndex: 0 });
  r = run(r, A.claimDailyLogin('2026-01-01'));
  assert.equal(r.ledger.apples, 5);
  assert.equal(E.reduce(r, A.claimDailyLogin('2026-01-01')), r);
  assert.equal(E.selectLoginReward(r, '2026-01-01').claimable, false);
  assert.equal(E.reduce(r, A.claimDailyLogin('2025-12-31')), r, 'clock moved back');
  assert.equal(E.reduce(r, A.claimDailyLogin('garbage')), r);
  const keys = ['2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09'];
  for (const k of keys) r = run(r, A.claimDailyLogin(k));
  assert.equal(r.ledger.apples, 5 + 5 + 10 + 5 + 5 + 10 + 25, 'missed days pause, not reset');
  assert.equal(r.ledger.login.streakIndex, 0);
  r = run(r, A.applyReceipt({ txId: 'S', productId: 'supporter_pack' }));
  assert.equal(E.selectLoginReward(r, '2026-01-10').amount, 10);
});

test('achievements credit Apples once, even across school resets', () => {
  let r = run(E.createInitialState(), A.build('classroom', 0, 0));
  assert.equal(r.game.achievements.first_classroom, true);
  assert.equal(r.ledger.apples, 10);
  r = run(r, A.hire('janitor'));
  assert.equal(r.ledger.apples, 20, 'first hire');
  r = run(r, A.resetSchool(5));
  assert.deepEqual(r.game.achievements, {});
  assert.equal(r.game.seed, 5);
  r = run(r, A.build('classroom', 0, 0), A.hire('janitor'));
  assert.equal(r.game.achievements.first_classroom, true);
  assert.equal(r.ledger.apples, 20, 'no double credit');
  assert.equal(Object.keys(r.ledger.credited).filter((k) => k === 'ach:first_classroom').length, 1);
});

test('cosmetics: buy with Apples or coins, equip, cannot buy free/achievement items', () => {
  let r = apples(E.createInitialState(), 200);
  r = run(r, A.buyCosmetic('wall_rainbow'));
  assert.equal(r.ledger.apples, 50);
  assert.equal(E.reduce(r, A.buyCosmetic('wall_rainbow')), r, 'already owned');
  assert.equal(E.reduce(r, A.buyCosmetic('wall_space')), r, 'not enough Apples');
  assert.equal(E.reduce(r, A.buyCosmetic('mascot_bear')), r, 'achievement only');
  assert.equal(E.reduce(r, A.buyCosmetic('skin_founder')), r, 'product only');
  r = run(r, A.buyCosmetic('wall_mint'));
  assert.equal(r.game.cash, 3200);
  r = run(r, A.equipCosmetic('wall_rainbow'));
  assert.equal(r.ledger.equipped.wall, 'wall_rainbow');
  assert.equal(E.reduce(r, A.equipCosmetic('floor_checker')), r, 'not owned');
  r = run(r, A.equipCosmetic('wall_default'));
  assert.equal(r.ledger.equipped.wall, 'wall_default');
});

test('age gate', () => {
  const r = run(E.createInitialState(), A.setAgeGate('under13'));
  assert.equal(r.ledger.ageGate, 'under13');
  assert.equal(E.reduce(r, A.setAgeGate('kid')), r);
});

test('rating ignores ledger and cosmetics', () => {
  const r = days(starterSchool(), 20);
  const other = {
    game: r.game,
    ledger: {
      ...r.ledger, apples: 99999, owned: { skin_founder: true, supporter_pack: true, mascot_hoot: true },
      equipped: { wall: 'wall_space', floor: 'floor_checker', mascot: 'mascot_hoot', uniform: 'uniform_varsity', skin: 'skin_founder' },
    },
  };
  assert.deepEqual(E.selectRating(other), E.selectRating(r));
  assert.deepEqual(E.selectRating({ game: r.game, ledger: null }), E.selectRating(r));
  // and the simulation itself ignores the ledger
  assert.deepEqual(days(other, 10).game, days(r, 10).game);
});
