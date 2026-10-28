// Regression tests for defects found in the QA review of the v2 engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, days, starterSchool } from './helpers.mjs';

const allFinite = (o) => {
  if (typeof o === 'number') return Number.isFinite(o);
  if (!o || typeof o !== 'object' || ArrayBuffer.isView(o)) return true;
  return Object.keys(o).every((k) => allFinite(o[k]));
};

test('hire with an Object.prototype key as grade or role is rejected (no NaN salaries)', () => {
  const r = starterSchool();
  for (const [role, grade] of [['teacher', 'constructor'], ['teacher', '__proto__'], ['teacher', 'toString']]) {
    assert.equal(E.reduce(r, A.hire(role, grade)), r, `${role}/${grade}`);
    assert.equal(E.selectCanHire(r, role, grade).ok, false);
  }
  for (const role of ['__proto__', 'constructor', 'toString']) {
    assert.doesNotThrow(() => E.selectCanHire(r, role));
    assert.equal(E.selectCanHire(r, role).ok, false);
    assert.equal(E.reduce(r, A.hire(role)), r);
  }
  const next = E.reduce(E.reduce(r, A.hire('teacher', 'constructor')), A.tick(24));
  assert.ok(Number.isFinite(next.game.cash));
});

test('resetSchool / createInitialState with an Object.prototype key as scenario id is invalid', () => {
  const r = E.createInitialState();
  for (const id of ['toString', '__proto__', 'constructor', 'hasOwnProperty']) {
    assert.equal(E.reduce(r, A.resetSchool(1, id)), r, id);
    const s = E.createInitialState(1, id);
    assert.equal(s.game.mode, 'normal', id);
    assert.ok(allFinite(s.game), id);
  }
});

test('applyReceipt with an Object.prototype key as productId is a no-op', () => {
  const r = E.createInitialState();
  for (const id of ['toString', 'constructor', '__proto__']) {
    assert.equal(E.reduce(r, A.applyReceipt({ txId: `t-${id}`, productId: id })), r, id);
  }
});

test('deserialize with no game numbers the new school after the ledger (weekly-goal Apples are not lost)', () => {
  // School 1 finishes its week-0 goals (their credit keys are goal:1.0:i), then the player resets twice.
  let r = starterSchool();
  const keys1 = r.game.weekly.goals.map((g) => g.key);
  r = { game: r.game, ledger: keys1.reduce((L, k) => E.credit(L, k, 5), r.ledger) };
  r = run(r, A.resetSchool(5), A.resetSchool(6));
  assert.equal(r.ledger.schools, 3);
  // The game save is lost: the ledger is salvaged onto a fresh school.
  const back = E.deserialize({ game: null, ledger: E.serialize(r).ledger });
  assert.ok(back.game.schoolNo > r.ledger.schools, `schoolNo ${back.game.schoolNo}`);
  assert.equal(back.ledger.schools, back.game.schoolNo);
  for (const g of E.selectWeeklyGoals(back).goals) assert.equal(g.credited, false, g.key);
  // the next reset still gets a fresh number
  const next = run(back, A.resetSchool(9));
  assert.ok(next.game.schoolNo > back.game.schoolNo);
  // a week-0 goal of the salvaged school still pays its Apples
  const g0 = back.game.weekly.goals[0];
  const forced = {
    game: { ...back.game, weekly: { week: 0, goals: [{ ...back.game.weekly.goals[0], id: 'learn', target: 1, progress: 0 }] }, learning: 90 },
    ledger: back.ledger,
  };
  const after = days(forced, 1);
  assert.equal(after.ledger.credited[g0.key], true);
  assert.equal(after.ledger.apples, back.ledger.apples + E.BALANCE.weeklyGoalApples);
});

test('a saved pack event whose choice id no longer exists cannot freeze the clock', () => {
  const r = starterSchool();
  const ev = {
    id: 'snow_day', kind: 'pack', phase: 'decision', title: 'Snow Day', text: '', params: {},
    choices: [{ id: 'old_close', label: 'renamed in a later config' }, { id: 'open', label: 'Stay open' }], startedDay: 0,
  };
  const saved = E.deserialize(E.serialize({ game: { ...r.game, event: ev }, ledger: r.ledger }));
  const later = days(saved, 3);
  assert.equal(later.game.day, 3, 'ticks must keep advancing');
  assert.ok(!later.game.event || later.game.event.choices.every((c) => c.id !== 'old_close'));
  // resolving the stale choice by hand simply closes the event
  const closed = E.reduce(saved, A.resolveEvent('old_close'));
  assert.notEqual(closed, saved);
  assert.equal(closed.game.event, null);
});

test('broken plumbing needs a restroom to break', async () => {
  const { evalCond } = await import('../src/engine/cond.js');
  const r = starterSchool();
  const cond = E.EVENTS.broken_plumbing.cond;
  const withStudents = { ...r.game, students: 50 };
  assert.equal(evalCond(withStudents, cond), true);
  const restroomIds = Object.keys(r.game.rooms).filter((id) => r.game.rooms[id].type === 'restroom');
  assert.ok(restroomIds.length > 0);
  const rooms = { ...r.game.rooms };
  for (const id of restroomIds) delete rooms[id];
  assert.equal(evalCond({ ...withStudents, rooms }, cond), false);
});
