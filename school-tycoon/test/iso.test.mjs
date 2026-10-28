import test from 'node:test';
import assert from 'node:assert/strict';
import { E } from './helpers.mjs';

test('iso: project / unproject round trip', () => {
  for (const [tw, th, ox, oy] of [[48, 24, 0, 0], [64, 32, 200, 40], [30, 15, -7.5, 3]]) {
    for (let cx = 0; cx < 12; cx++) {
      for (let cy = 0; cy < 9; cy++) {
        const c = E.project(cx + 0.5, cy + 0.5, tw, th, ox, oy);
        assert.deepEqual(E.unproject(c.x, c.y, tw, th, ox, oy), { cx, cy });
        const corner = E.project(cx, cy, tw, th, ox, oy);
        const back = E.unprojectExact(corner.x, corner.y, tw, th, ox, oy);
        assert.ok(Math.abs(back.cx - cx) < 1e-9 && Math.abs(back.cy - cy) < 1e-9);
        assert.deepEqual(E.unproject(corner.x, corner.y, tw, th, ox, oy), { cx, cy }, 'top corner belongs to its cell');
      }
    }
  }
});

test('iso: projection geometry', () => {
  assert.deepEqual(E.project(0, 0, 48, 24, 100, 10), { x: 100, y: 10 });
  assert.deepEqual(E.project(1, 0, 48, 24, 100, 10), { x: 124, y: 22 }, '+cx goes right-down');
  assert.deepEqual(E.project(0, 1, 48, 24, 100, 10), { x: 76, y: 22 }, '+cy goes left-down');
  const poly = E.footprintPolygon(0, 0, 2, 1, 48, 24, 0, 0);
  assert.deepEqual(poly, [{ x: 0, y: 0 }, { x: 48, y: 24 }, { x: 24, y: 36 }, { x: -24, y: 12 }]);
  assert.deepEqual(E.unproject(0, -1, 48, 24, 0, 0).cy, -1, 'outside cells are returned as-is');
});

test('iso: depthSort draws back to front', () => {
  const items = [
    { id: 'front', cx: 5, cy: 5, w: 1, h: 1 },
    { id: 'back', cx: 0, cy: 0, w: 1, h: 1 },
    { id: 'long', cx: 0, cy: 2, w: 3, h: 1 }, // in front of 'tall' on y... and behind 'front'
    { id: 'tall', cx: 1, cy: 0, w: 1, h: 2 },
  ];
  const copy = items.slice();
  const out = E.depthSort(items);
  assert.deepEqual(items, copy, 'input not mutated');
  assert.equal(out.length, 4);
  const pos = Object.fromEntries(out.map((it, i) => [it.id, i]));
  assert.ok(pos.back < pos.tall, 'left neighbour first');
  assert.ok(pos.tall < pos.long, 'row behind first');
  assert.ok(pos.long < pos.front);
  assert.equal(pos.back, 0);
  assert.equal(pos.front, 3);
  // a long item spanning in front of two small ones
  const o2 = E.depthSort([{ id: 'wide', cx: 0, cy: 1, w: 3, h: 1 }, { id: 'a', cx: 2, cy: 0 }, { id: 'b', cx: 0, cy: 0 }]);
  assert.equal(o2[2].id, 'wide');
  assert.deepEqual(E.depthSort([]), []);
});

test('iso: depthSort on a real interior is a total order consistent with overlap', () => {
  const r = E.createInitialState();
  const r2 = E.reduce(r, E.actions.build('classroom', 3, 7));
  const id = Object.keys(r2.game.rooms).find((k) => r2.game.rooms[k].type === 'classroom');
  const view = E.selectInterior(r2, id);
  const sorted = E.depthSort(view.items);
  assert.equal(sorted.length, view.items.length);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[j]; // drawn later
      const b = sorted[i];
      const yOverlap = a.cy < b.cy + b.h && b.cy < a.cy + a.h;
      const xOverlap = a.cx < b.cx + b.w && b.cx < a.cx + a.w;
      assert.ok(!(a.cx + a.w <= b.cx && yOverlap), `${a.id} should be before ${b.id}`);
      assert.ok(!(a.cy + a.h <= b.cy && xOverlap), `${a.id} should be before ${b.id}`);
    }
  }
});
