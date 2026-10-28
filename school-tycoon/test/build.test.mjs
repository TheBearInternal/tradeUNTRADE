import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, withGame, gridProblems, hallRow } from './helpers.mjs';

test('build places a room, deducts cash and stamps the grid', () => {
  const r0 = E.createInitialState();
  const r1 = run(r0, A.build('classroom', 3, 7));
  assert.equal(r1.game.cash, 3500);
  const id = r1.game.grid[7 * 16 + 3];
  assert.equal(r1.game.rooms[id].type, 'classroom');
  assert.deepEqual(gridProblems(r1.game), []);
  assert.equal(r0.game.grid[7 * 16 + 3], null, 'original state untouched');
});

test('overlap, bounds, cash and locked checks', () => {
  const r = run(E.createInitialState(), A.build('classroom', 3, 7));
  assert.deepEqual(E.selectCanBuild(r, 'classroom', 4, 8), { ok: false, reason: 'occupied' });
  assert.deepEqual(E.selectCanBuild(r, 'classroom', 14, 0), { ok: false, reason: 'bounds' });
  assert.deepEqual(E.selectCanBuild(r, 'classroom', -1, 0), { ok: false, reason: 'bounds' });
  assert.deepEqual(E.selectCanBuild(r, 'hall', 7, 14), { ok: false, reason: 'occupied' }, 'office tile');
  assert.deepEqual(E.selectCanBuild(r, 'cafeteria', 0, 0), { ok: false, reason: 'locked' }, 'level 2');
  assert.deepEqual(E.selectCanBuild(r, 'library', 0, 0), { ok: false, reason: 'locked' }, 'tier 2');
  assert.deepEqual(E.selectCanBuild(r, 'office', 0, 0), { ok: false, reason: 'locked' });
  const poor = withGame(r, { cash: 499 });
  assert.deepEqual(E.selectCanBuild(poor, 'classroom', 10, 0), { ok: false, reason: 'cash' });
  assert.deepEqual(E.selectCanBuild(r, 'classroom', 10, 0), { ok: true, reason: null });
  for (const bad of [A.build('classroom', 4, 8), A.build('classroom', 14, 0), A.build('cafeteria', 0, 0),
    A.build('nope', 0, 0), A.build('classroom', 1.5, 0)]) {
    assert.equal(E.reduce(r, bad), r, JSON.stringify(bad));
  }
  assert.equal(E.reduce(poor, A.build('classroom', 10, 0)), poor);
});

test('buildHallLine skips invalid/occupied/unaffordable cells', () => {
  const r0 = withGame(E.createInitialState(), { cash: 35 });
  const r1 = run(r0, A.buildHallLine([{ x: 7, y: 10 }, { x: 7, y: 13 }, { x: 99, y: 0 }, null, { x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }]));
  assert.equal(r1.game.cash, 5);
  assert.equal(r1.game.grid.filter((v) => v === 'hall').length, 6);
  assert.equal(r1.game.grid[10 * 16 + 4], null, 'unaffordable cell skipped');
  assert.equal(E.reduce(r1, A.buildHallLine([{ x: 7, y: 13 }])), r1);
});

test('sell refunds 50%, office not sellable', () => {
  const r1 = run(E.createInitialState(), A.build('classroom', 3, 7), A.build('hall', 0, 0));
  const r2 = run(r1, A.sell(4, 8));
  assert.equal(r2.game.cash, r1.game.cash + 250);
  assert.equal(Object.values(r2.game.rooms).some((r) => r.type === 'classroom'), false);
  assert.deepEqual(gridProblems(r2.game), []);
  const r3 = run(r2, A.sell(0, 0));
  assert.equal(r3.game.cash, r2.game.cash + 5);
  assert.equal(E.reduce(r3, A.sell(7, 15)), r3, 'office');
  assert.equal(E.reduce(r3, A.sell(0, 0)), r3, 'empty');
});

test('tick without day rollover keeps grid/rooms references; invalid actions keep identity', () => {
  const r0 = run(E.createInitialState(), A.build('classroom', 3, 7));
  const r1 = E.reduce(r0, A.tick(1));
  assert.notEqual(r1, r0);
  assert.equal(r1.game.tick, 1);
  assert.equal(r1.game.grid, r0.game.grid);
  assert.equal(r1.game.rooms, r0.game.rooms);
  assert.equal(r1.game.staff, r0.game.staff);
  assert.equal(r1.ledger, r0.ledger);
  assert.equal(E.selectDerived(r1), E.selectDerived(r0), 'derived memoized');
  const r2 = E.reduce(r1, A.tick(24));
  assert.equal(r2.game.grid, r0.game.grid, 'day settlement does not touch grid');
  assert.equal(r2.game.rooms, r0.game.rooms);
  for (const bad of [A.tick(0), A.tick(97), A.tick(1.5), { type: 'nope' }, null, {}, A.setTuition(0), A.setTuition(3),
    A.dismissReport(), A.resolveEvent('x'), A.tierUp(), A.fire('s99'), A.equipCosmetic('wall_default')]) {
    assert.equal(E.reduce(r1, bad), r1, JSON.stringify(bad));
  }
  const rb = run(r1, A.buildHallLine(hallRow(0, 0, 2)));
  assert.equal(rb.game.rooms, r1.game.rooms, 'hall build keeps rooms reference');
});
