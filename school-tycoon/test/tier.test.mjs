import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, days, withGame, starterSchool, gridProblems } from './helpers.mjs';

test('tier eligibility', () => {
  const r = starterSchool();
  const p = E.selectTierProgress(r);
  assert.equal(p.nextTier, 2);
  assert.equal(p.eligible, false);
  assert.deepEqual(p.requirements.map((q) => q.label), ['Stars', 'Students', 'Reputation']);
  assert.equal(E.reduce(r, A.tierUp()), r);
  const almost = withGame(r, { stars: 3, students: 60, reputation: 149 });
  assert.equal(E.selectTierProgress(almost).eligible, false);
  assert.equal(E.selectTierProgress(withGame(r, { stars: 3, students: 60, reputation: 150 })).eligible, true);

  const t2 = withGame(r, { tier: 2, size: 20, stars: 5, students: 200, reputation: 900 });
  // tier 3 also needs inspection B or better
  const p3 = E.selectTierProgress(withGame(t2, { lastInspectionGrade: 'C' }));
  assert.equal(p3.nextTier, 3);
  assert.equal(p3.eligible, false);
  assert.equal(p3.requirements[3].met, false);
  assert.equal(E.selectTierProgress(withGame(t2, { lastInspectionGrade: 'B' })).eligible, true);
  assert.equal(E.selectTierProgress(withGame(t2, { lastInspectionGrade: 'A' })).eligible, true);
  assert.equal(E.selectTierProgress(withGame(t2, { lastInspectionGrade: null })).eligible, false);
  const max = E.selectTierProgress(withGame(r, { tier: 3, size: 24 }));
  assert.deepEqual(max, { nextTier: null, requirements: [], eligible: false });
});

test('tierUp resizes the lot and preserves rooms, connectivity and office position', () => {
  let r = days(starterSchool(), 8);
  const before = r;
  r = withGame(r, { stars: 3, students: 40, reputation: 200 });
  r = withGame(r, { students: 60 });
  const up = run(r, A.tierUp());
  const g = up.game;
  assert.equal(g.tier, 2);
  assert.equal(g.size, 20);
  assert.equal(g.grid.length, 400);
  assert.deepEqual(gridProblems(g), []);
  assert.equal(Object.keys(g.rooms).length, Object.keys(before.game.rooms).length);
  const office = Object.values(g.rooms).find((x) => x.type === 'office');
  assert.deepEqual([office.x, office.y], [8, 18], 'bottom-middle of 20x20');
  for (const id in before.game.rooms) {
    const a = before.game.rooms[id];
    const b = g.rooms[id];
    assert.equal(b.type, a.type);
    assert.equal(b.x, a.x + 2);
    assert.equal(b.y, a.y + 4);
  }
  assert.equal(g.grid.filter((v) => v === 'hall').length, before.game.grid.filter((v) => v === 'hall').length);
  assert.deepEqual(E.selectDerived(up).connected, E.selectDerived(before).connected);
  assert.equal(E.selectCapacity(up), 40);
  assert.equal(E.selectDailyPnL(up).tuition, 15 * g.students, 'tier 2 tuition base');
  assert.ok(up.game.achievements.reach_middle);
  assert.ok(up.ledger.owned.uniform_forest, 'achievement cosmetic');
  assert.equal(E.selectRoomAvailability(up, 'library').reason, 'level');
  // the new space is buildable
  assert.equal(E.selectCanBuild(up, 'classroom', 0, 0).ok, true);
});
