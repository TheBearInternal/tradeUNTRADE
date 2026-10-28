import test from 'node:test';
import assert from 'node:assert/strict';
import { E } from './helpers.mjs';

test('validateConfig() returns []', () => {
  assert.deepEqual(E.validateConfig(), []);
});

test('contract exports exist', () => {
  const fns = ['createInitialState', 'reduce', 'simulateOffline', 'serialize', 'deserialize', 'validateConfig',
    'selectDerived', 'selectCapacity', 'selectDailyPnL', 'selectRating', 'selectRoomAvailability', 'selectCanBuild',
    'selectTierProgress', 'selectXpProgress', 'selectBubbles', 'selectEarlyUnlocksLeft', 'selectLoginReward',
    'selectTimeLabel'];
  for (const f of fns) assert.equal(typeof E[f], 'function', f);
  const creators = ['tick', 'build', 'buildHallLine', 'sell', 'hire', 'fire', 'setTuition', 'resolveEvent',
    'dismissReport', 'tierUp', 'earlyUnlock', 'buyCosmetic', 'equipCosmetic', 'claimDailyLogin', 'applyReceipt',
    'setAgeGate', 'resetSchool'];
  for (const c of creators) assert.equal(typeof E.actions[c], 'function', c);
  for (const k of ['ROOMS', 'STAFF', 'TIERS', 'COSMETICS', 'PRODUCTS', 'ACHIEVEMENTS', 'BALANCE']) assert.equal(typeof E[k], 'object', k);
  assert.equal(E.TICKS_PER_DAY, 24);
  assert.equal(E.DAYS_PER_TERM, 15);
  assert.equal(E.TERMS_PER_YEAR, 3);
});

test('initial state matches the contract shape', () => {
  const { game, ledger } = E.createInitialState(7);
  const keys = ['version', 'seed', 'rng', 'tick', 'day', 'tier', 'size', 'grid', 'rooms', 'nextId', 'staff', 'students',
    'happiness', 'learning', 'cleanliness', 'reputation', 'cash', 'tuitionStep', 'xp', 'level', 'stars', 'unlocked',
    'earlyUnlockLog', 'event', 'effects', 'lastInspectionGrade', 'inspectionDueDay', 'achievements', 'lastReport', 'log', 'stats'];
  for (const k of keys) assert.ok(k in game, k);
  for (const k of ['version', 'apples', 'credited', 'owned', 'equipped', 'login', 'ageGate']) assert.ok(k in ledger, k);
  assert.equal(game.cash, 4000);
  assert.equal(game.size, 16);
  assert.equal(game.grid.length, 256);
  const office = Object.values(game.rooms).find((r) => r.type === 'office');
  assert.deepEqual([office.x, office.y, office.w, office.h], [6, 14, 3, 2]);
  assert.equal(game.grid.filter((v) => v === 'hall').length, 3);
  assert.deepEqual(E.selectTimeLabel({ game, ledger }), { year: 1, term: 1, dayOfTerm: 1, hour: 0 });
});
