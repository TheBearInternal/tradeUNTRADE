import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, days, starterSchool, withGame } from './helpers.mjs';

function toAnnouncement(seed = 12345) {
  let r = starterSchool(seed);
  for (let d = 0; d < 40; d++) {
    r = E.reduce(r, A.tick(24));
    if (r.game.event && r.game.event.id === 'flu') r = run(r, A.resolveEvent('open'));
  }
  return r;
}

test('inspection: announced 5 days ahead, cram choice', () => {
  const r = toAnnouncement();
  assert.equal(r.game.day, 40);
  const ev = r.game.event;
  assert.equal(ev.id, 'inspection');
  assert.equal(ev.phase, 'announce');
  assert.deepEqual(ev.choices.map((c) => c.id), ['deepclean', 'cram']);
  assert.equal(ev.startedDay, 40);
  const c = run(r, A.resolveEvent('cram'));
  assert.equal(c.game.event, null);
  assert.ok(Math.abs(c.game.learning - (r.game.learning + 5)) < 1e-9);
  assert.ok(Math.abs(c.game.happiness - (r.game.happiness - 5)) < 1e-9);
  assert.equal(E.reduce(c, A.resolveEvent('cram')), c, 'no active event');
  assert.equal(E.reduce(r, A.resolveEvent('bogus')), r, 'invalid choice');
});

test('inspection: deep clean, then grade at day 45', () => {
  let r = toAnnouncement();
  r = withGame(r, { cleanliness: 50 });
  r = run(r, A.resolveEvent('deepclean'));
  assert.equal(r.game.cleanliness, 80);
  assert.equal(r.game.effects.deepCleanUntil, 45);
  r = days(r, 4);
  assert.equal(r.game.day, 44);
  if (r.game.event) r = run(r, A.resolveEvent(r.game.event.choices[0].id));
  r = E.reduce(r, A.tick(24));
  const ev = r.game.event;
  assert.equal(ev.id, 'inspection');
  assert.equal(ev.phase, 'result');
  assert.ok('ABCDF'.includes(ev.grade));
  assert.equal(r.game.lastInspectionGrade, ev.grade);
  assert.equal(r.game.inspectionDueDay, 90);
  assert.deepEqual(ev.choices.map((c) => c.id), ['ok']);
  const ok = run(r, A.resolveEvent('ok'));
  assert.equal(ok.game.event, null);
});

test('inspection grade A: +100 rep, +$2000, +100 XP, achievement + cosmetic', () => {
  let r = withGame(starterSchool(), { level: 3 });
  r = run(r, A.build('cafeteria', 2, 11), A.build('playground', 12, 6), A.build('hall', 12, 10));
  r = withGame(r, { tick: 44 * 24, day: 44, learning: 100, cleanliness: 100, students: 40, reputation: 10 });
  const pnl = E.selectDailyPnL(r);
  const r2 = E.reduce(r, A.tick(24));
  assert.equal(r2.game.lastInspectionGrade, 'A', JSON.stringify(r2.game.event));
  assert.equal(r2.game.cash, r.game.cash + pnl.net + 2000);
  const stars = r2.game.stars;
  assert.equal(r2.game.reputation, 10 + (stars - 2) * 2 + 100);
  assert.ok(r2.game.xp >= r.game.xp + 100);
  assert.ok(r2.game.achievements.inspection_a);
  assert.ok(r2.ledger.owned.skin_sunset);
  assert.ok(r2.ledger.credited['ach:inspection_a']);
});

test('unresolved events auto-pick the first option after 2 days', () => {
  let r = toAnnouncement();
  r = days(r, 1);
  assert.ok(r.game.event, 'still pending after 1 day');
  r = days(r, 1);
  assert.equal(r.game.event, null);
  assert.equal(r.game.effects.deepCleanUntil, 42 + 5);
});

function withFlu(fn) {
  const old = E.BALANCE.fluChance;
  E.BALANCE.fluChance = 1;
  try { return fn(); } finally { E.BALANCE.fluChance = old; }
}

function toFlu() {
  let r = starterSchool();
  while (!r.game.event) r = E.reduce(r, A.tick(24));
  return r;
}

test('flu outbreak: close school', () => withFlu(() => {
  const r = toFlu();
  assert.equal(r.game.event.id, 'flu');
  assert.ok(r.game.students >= 30);
  assert.deepEqual(r.game.event.choices.map((c) => c.id), ['close', 'open']);
  const c = run(r, A.resolveEvent('close'));
  assert.equal(c.game.effects.closedUntil, c.game.day + 2);
  assert.equal(E.selectDailyPnL(c).tuition, 0);
  const d1 = E.reduce(c, A.tick(24));
  const pnl = E.selectDailyPnL(c);
  assert.equal(d1.game.cash, c.game.cash - pnl.salaries - pnl.upkeep, 'no tuition while closed');
  assert.equal(d1.game.event, null, 'no new flu while closed');
  const d2 = E.reduce(d1, A.tick(24));
  assert.equal(d2.game.cash, d1.game.cash - pnl.salaries - pnl.upkeep);
  const d3 = E.reduce(d2, A.tick(24));
  assert.ok(d3.game.cash > d2.game.cash, 'reopened');
}));

test('flu outbreak: stay open makes students sick for 3 days', () => withFlu(() => {
  const r = toFlu();
  const o = run(r, A.resolveEvent('open'));
  assert.equal(o.game.effects.fluSickUntil, o.game.day + 3);
  assert.ok(E.selectDailyPnL(o).tuition > 0);
  // sick learning is slower than healthy learning
  const sick = E.reduce(o, A.tick(24));
  const healthy = E.reduce({ game: { ...o.game, effects: {} }, ledger: o.ledger }, A.tick(24));
  assert.ok(sick.game.learning < healthy.game.learning);
  assert.ok(sick.game.happiness < healthy.game.happiness);
}));

test('flu auto-resolves to closing the school', () => withFlu(() => {
  let r = toFlu();
  const start = r.game.day;
  r = days(r, 2);
  assert.equal(r.game.event, null);
  assert.equal(r.game.effects.closedUntil, start + 2 + 2);
}));

test('flu needs at least 30 students', () => withFlu(() => {
  const r = days(starterSchool(), 4);
  assert.equal(r.game.students, 24);
  assert.equal(r.game.event, null);
}));
