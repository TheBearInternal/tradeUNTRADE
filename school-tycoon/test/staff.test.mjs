import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, withGame } from './helpers.mjs';

test('hire and fire', () => {
  const r0 = E.createInitialState();
  const r1 = run(r0, A.hire('teacher', 'rookie'), A.hire('janitor'));
  const staff = Object.values(r1.game.staff);
  assert.equal(staff.length, 2);
  const t = staff.find((s) => s.role === 'teacher');
  assert.equal(t.skill, 1);
  assert.equal(t.salary, 50);
  assert.equal(typeof t.name, 'string');
  assert.ok(/^s\d+$/.test(t.id));
  assert.equal(staff.find((s) => s.role === 'janitor').salary, 30);
  assert.equal(E.selectDailyPnL(r1).salaries, 80);
  const r2 = run(r1, A.fire(t.id));
  assert.equal(Object.keys(r2.game.staff).length, 1);
  assert.equal(E.reduce(r2, A.fire(t.id)), r2);
});

test('hire gating by level and tier', () => {
  const r = E.createInitialState();
  for (const bad of [A.hire('teacher', 'veteran'), A.hire('teacher', 'expert'), A.hire('nurse'), A.hire('teacher'),
    A.hire('wizard'), A.hire('teacher', 'boss')]) {
    assert.equal(E.reduce(r, bad), r, JSON.stringify(bad));
  }
  const lv5 = withGame(r, { level: 5 });
  const r2 = run(lv5, A.hire('teacher', 'veteran'));
  assert.equal(Object.values(r2.game.staff)[0].skill, 3);
  assert.equal(E.reduce(lv5, A.hire('teacher', 'expert')), lv5);
  run(withGame(r, { tier: 2 }), A.hire('nurse'));
});

test('best teacher goes to the best room; staff room removes skill penalty', () => {
  const lv = withGame(E.createInitialState(), { level: 5 });
  const r = run(lv,
    A.buildHallLine([{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }, { x: 8, y: 10 }, { x: 9, y: 10 }]),
    A.build('classroom', 4, 7), A.build('classroom', 8, 7),
    A.hire('teacher', 'rookie'), A.hire('teacher', 'veteran'), A.hire('teacher', 'rookie'));
  const st = E.selectStaffing(r);
  assert.equal(st.capacity, 40);
  const vet = Object.values(r.game.staff).find((s) => s.grade === 'veteran');
  const firstRoom = r.game.grid[7 * 16 + 4];
  assert.equal(st.assignment[firstRoom], vet.id, 'tie on room quality -> oldest room gets best teacher');
  assert.equal(st.active.find((a) => a.id === firstRoom).skill, 2, 'no staff room: skill - 1');
  const withSR = run(r, A.build('staffroom', 10, 11), A.buildHallLine([{ x: 10, y: 10 }]));
  // staff room is level 4; we are level 5
  assert.equal(E.selectStaffing(withSR).active.find((a) => a.id === firstRoom).skill, 3);
});
