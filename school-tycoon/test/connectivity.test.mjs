import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, days, hallRow, hallCol } from './helpers.mjs';

test('an unconnected room is inert and connects once a hallway is added', () => {
  let r = run(E.createInitialState(), A.build('classroom', 3, 7), A.build('restroom', 9, 8), A.hire('teacher', 'rookie'));
  const cls = r.game.grid[7 * 16 + 3];
  assert.equal(E.selectDerived(r).connected[cls], false);
  assert.equal(E.selectCapacity(r), 0);
  assert.ok(E.selectBubbles(r).some((b) => b.icon === '⚠️' && b.roomId === cls));
  r = days(r, 3);
  assert.equal(r.game.students, 0, 'inert classroom enrolls nobody');

  r = run(r, A.buildHallLine(hallRow(10, 3, 10)));
  const d = E.selectDerived(r);
  assert.equal(d.connected[cls], true);
  assert.equal(E.selectCapacity(r), 20);
  assert.ok(d.hallDist instanceof Int16Array);
  assert.equal(d.hallDist[13 * 16 + 7], 0, 'stub tile next to office');
  assert.equal(d.hallDist[10 * 16 + 3], 7);
  r = days(r, 2);
  assert.ok(r.game.students > 0);

  // breaking the hallway disconnects it again
  r = run(r, A.sell(7, 11));
  assert.equal(E.selectDerived(r).connected[cls], false);
  assert.equal(E.selectCapacity(r), 0);
});

test('a hallway touching only an unconnected segment does not connect', () => {
  const r = run(E.createInitialState(), A.build('classroom', 0, 0), A.buildHallLine(hallRow(3, 0, 4)), A.hire('teacher', 'rookie'));
  const cls = r.game.grid[0];
  assert.equal(E.selectDerived(r).connected[cls], false);
});

function layout(nearRestroom) {
  let r = E.createInitialState(99);
  r = run(r, A.buildHallLine(hallRow(10, 0, 13)), A.build('classroom', 10, 7));
  if (nearRestroom) r = run(r, A.build('restroom', 8, 8));
  else r = run(r, A.buildHallLine(hallCol(0, 3, 9)), A.build('restroom', 1, 3));
  return run(r, A.hire('teacher', 'rookie'), A.hire('janitor'));
}

test('distances affect happiness', () => {
  const near = layout(true);
  const far = layout(false);
  const cn = near.game.grid[7 * 16 + 10];
  const cf = far.game.grid[7 * 16 + 10];
  const sn = E.selectDerived(near).roomStats[cn];
  const sf = E.selectDerived(far).roomStats[cf];
  assert.equal(sn.dR, 2);
  assert.equal(sf.dR, 17, 'restroom touches (0,3),(0,4); (0,4)->(10,10) = 16 steps, +1');
  assert.equal(sn.dC, 99, 'no cafeteria');
  assert.ok(sf.hR < sn.hR);
  assert.ok(sf.late >= sn.late);
  const n2 = days(near, 20);
  const f2 = days(far, 20);
  assert.equal(n2.game.students, f2.game.students);
  assert.ok(n2.game.happiness > f2.game.happiness + 1, `${n2.game.happiness} vs ${f2.game.happiness}`);
  assert.ok(E.selectBubbles(f2).some((b) => b.text === 'Restroom too far'));
});

test('restroom overload raises effective distance', () => {
  const r = layout(true);
  const id = r.game.grid[7 * 16 + 10];
  const many = { game: { ...r.game, students: 120 }, ledger: r.ledger };
  const a = E.selectDerived(r).roomStats[id];
  const b = E.selectDerived(many).roomStats[id];
  assert.equal(a.hR, 10);
  assert.ok(b.hR < a.hR, 'L = 3 adds 20 to dR_eff');
});
