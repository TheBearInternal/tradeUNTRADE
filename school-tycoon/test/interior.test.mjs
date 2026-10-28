import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, days, withGame, starterSchool, quiet } from './helpers.mjs';

const roomOf = (r, type) => Object.keys(r.game.rooms).find((k) => r.game.rooms[k].type === type);
const itemsOf = (r, roomId) => r.game.interiors[roomId].items;
const clear = (r, roomId) => {
  let x = r;
  for (const it of itemsOf(r, roomId)) x = run(x, A.removeItem(roomId, it.id));
  return x;
};

test('rooms are auto-furnished with the free starter layout (v1 numbers)', () => {
  const r = starterSchool();
  const cls = roomOf(r, 'classroom');
  const view = E.selectInterior(r, cls);
  assert.equal(view.cols, 9);
  assert.equal(view.rows, 9);
  assert.deepEqual(view.door, { cx: 4, cy: 8 });
  assert.equal(view.items.length, 12);
  assert.ok(view.items.every((it) => view.counted[it.id]));
  assert.equal(view.occupancy.length, 81);
  assert.equal(view.occupancy[8 * 9 + 4], null, 'door is clear');
  assert.equal(view.reachable[8 * 9 + 4], true);
  const q = E.selectRoomQuality(r, cls);
  assert.deepEqual([q.seats, q.capacity, q.learnMult, q.happyBonus, q.hygiene, q.score], [20, 20, 1, 0, 0, 50]);
  assert.deepEqual(q.missing, []);
  const rest = E.selectRoomQuality(r, roomOf(r, 'restroom'));
  assert.equal(rest.capacity, 40);
  assert.ok(r.game.interiors.r1, 'the office has an interior too');
  assert.equal(E.selectInterior(r, 'nope'), null);
  assert.equal(r.game.interiors[roomOf(r, 'classroom')].items.every((i) => /^i\d+$/.test(i.id)), true);
  // every starter layout reproduces the room's v1 numbers (validateConfig asserts it too)
  assert.deepEqual(E.validateConfig(), []);
});

test('placement: collisions, bounds, door, wall, room type, lock, cash, rot', () => {
  const r = starterSchool();
  const cls = roomOf(r, 'classroom');
  const chk = (type, cx, cy, rot, root = r) => E.selectCanPlaceItem(root, cls, type, cx, cy, rot).reason;
  assert.equal(chk('globe', 4, 4, 0), null);
  assert.equal(chk('globe', 0, 3, 0), 'occupied', 'desk pair there');
  assert.equal(chk('globe', 9, 0, 0), 'bounds');
  assert.equal(chk('globe', -1, 0, 0), 'bounds');
  assert.equal(chk('bookshelf', 4, 8, 0), 'bounds', '1x2 sticks out of the bottom');
  assert.equal(chk('globe', 4, 8, 0), 'door');
  assert.equal(chk('desk_pair', 3, 8, 0), 'door');
  assert.equal(chk('chalkboard', 3, 4, 0), 'wall');
  assert.equal(chk('chalkboard', 0, 0, 1), null, 'rotated along the left wall');
  assert.equal(chk('lunch_table', 4, 4, 0), 'wrongRoom');
  assert.equal(chk('smartboard', 6, 0, 0), 'locked', 'tier 2 item');
  assert.equal(chk('ergo_desk', 3, 4, 0), 'locked', 'level 3 item');
  assert.equal(chk('globe', 4, 4, 2), 'rot');
  assert.equal(chk('nope', 4, 4, 0), 'item');
  assert.equal(E.selectCanPlaceItem(r, 'r999', 'globe', 4, 4, 0).reason, 'room');
  assert.equal(E.selectCanPlaceItem(r, 'r1', 'globe', 4, 4, 0).reason, 'wrongRoom', 'office');
  assert.equal(chk('globe', 4, 4, 0, withGame(r, { cash: 79 })), 'cash');
  for (const bad of [A.placeItem(cls, 'globe', 0, 3), A.placeItem(cls, 'globe', 4, 8), A.placeItem(cls, 'smartboard', 6, 0)]) {
    assert.equal(E.reduce(r, bad), r);
  }
});

test('place, move, remove (50% refund), autoArrange; identity rules', () => {
  const r0 = starterSchool();
  const cls = roomOf(r0, 'classroom');
  const r1 = run(r0, A.placeItem(cls, 'globe', 4, 4));
  assert.equal(r1.game.cash, r0.game.cash - 80);
  assert.equal(r1.game.rooms, r0.game.rooms, 'rooms identity kept');
  assert.equal(r1.game.grid, r0.game.grid);
  assert.equal(E.selectDerived(r1).hallDist, E.selectDerived(r0).hallDist, 'BFS not recomputed');
  assert.notEqual(r1.game.interiors, r0.game.interiors);
  assert.equal(r1.game.interiors.r1, r0.game.interiors.r1, 'other rooms untouched');
  const g = itemsOf(r1, cls).find((i) => i.itemType === 'globe');
  assert.equal(g.id, 'i13');
  assert.deepEqual(E.selectRoomQuality(r1, cls).learnMult, 1 + 0.25 * (1 / 21));
  const r2 = run(r1, A.moveItem(cls, g.id, 4, 6));
  assert.equal(r2.game.cash, r1.game.cash, 'moving is free');
  assert.equal(E.reduce(r2, A.moveItem(cls, g.id, 4, 6)), r2, 'same position');
  assert.equal(E.reduce(r2, A.moveItem(cls, g.id, 0, 3)), r2, 'occupied');
  assert.equal(E.reduce(r2, A.moveItem(cls, 'i999', 1, 1)), r2);
  const r3 = run(r2, A.removeItem(cls, g.id));
  assert.equal(r3.game.cash, r2.game.cash + 40);
  const r4 = run(r3, A.removeItem(cls, 'i1'));
  assert.equal(r4.game.cash, r3.game.cash, 'free items refund 0');
  const r5 = run(run(r4, A.placeItem(cls, 'bookshelf', 0, 1)), A.autoArrange(cls));
  assert.deepEqual(itemsOf(r5, cls), E.LAYOUTS.classroom.map((l, i) => ({ id: `i${i + 1}`, ...l })));
  assert.equal(r5.game.cash, r4.game.cash - 150 + 75, 'autoArrange refunds 50% of paid items');
  assert.equal(E.reduce(r5, A.autoArrange(cls)), r5, 'already the starter layout');
  // tick keeps interiors identity
  assert.equal(E.reduce(r5, A.tick(1)).game.interiors, r5.game.interiors);
  assert.equal(E.reduce(r5, A.tick(24)).game.interiors, r5.game.interiors);
});

test('max 40 items per room', () => {
  let r = withGame(starterSchool(), { cash: 100000, level: 3 });
  const cls = roomOf(r, 'classroom');
  r = clear(r, cls);
  let n = 0;
  for (let cy = 0; cy < 9 && n < 40; cy++) {
    for (let cx = 0; cx < 9 && n < 40; cx++) {
      if (cx === 4) continue;
      r = run(r, A.placeItem(cls, 'globe', cx, cy));
      n++;
    }
  }
  assert.equal(itemsOf(r, cls).length, 40);
  assert.equal(E.selectCanPlaceItem(r, cls, 'globe', 4, 0, 0).reason, 'limit');
});

test('missing teacher desk gives 0 seats; restroom without sink does not work', () => {
  let r = days(starterSchool(), 8);
  const cls = roomOf(r, 'classroom');
  assert.equal(E.selectCapacity(r), 40);
  const desk = itemsOf(r, cls).find((i) => i.itemType === 'teacher_desk');
  r = run(r, A.removeItem(cls, desk.id));
  const q = E.selectRoomQuality(r, cls);
  assert.equal(q.seats, 0);
  assert.deepEqual(q.missing, ["Teacher's Desk"]);
  assert.equal(q.score, 0);
  assert.equal(E.selectCapacity(r), 20);
  assert.ok(E.selectBubbles(r).some((b) => b.icon === '🪑' && b.roomId === cls && b.text.includes("Teacher's Desk")));
  r = run(r, A.placeItem(cls, 'teacher_desk', 3, 1));
  assert.equal(E.selectCapacity(r), 40);

  const rest = roomOf(r, 'restroom');
  const sink = itemsOf(r, rest).find((i) => i.itemType === 'sink');
  const noSink = run(r, A.removeItem(rest, sink.id));
  assert.equal(E.selectRoomQuality(noSink, rest).capacity, 0);
  const st = E.selectDerived(noSink).roomStats[cls];
  assert.equal(st.hR, -20, 'no working restroom');
  assert.equal(st.dR, 99);
  assert.ok(E.selectBubbles(noSink).some((b) => b.text === 'No restroom'));
  const stall = itemsOf(r, rest).find((i) => i.itemType === 'stall');
  assert.equal(E.selectRoomQuality(run(r, A.removeItem(rest, stall.id)), rest).capacity, 30, '10 per stall');
});

test('reachability: a walled-in desk does not count', () => {
  let r = withGame(starterSchool(), { cash: 100000 });
  const cls = roomOf(r, 'classroom');
  r = clear(r, cls);
  r = run(r, A.placeItem(cls, 'teacher_desk', 3, 1), A.placeItem(cls, 'desk_pair', 0, 0),
    A.placeItem(cls, 'desk_pair', 0, 1), A.placeItem(cls, 'globe', 2, 0));
  const view = E.selectInterior(r, cls);
  const [, corner, below] = view.items;
  assert.equal(view.reachable[0], false);
  assert.equal(view.counted[corner.id], false, 'walled in by a desk and a globe');
  assert.equal(view.counted[below.id], true);
  assert.equal(E.selectRoomQuality(r, cls).seats, 2);
  // opening a gap makes it count
  const globe = view.items[3];
  r = run(r, A.removeItem(cls, globe.id));
  assert.equal(E.selectRoomQuality(r, cls).seats, 4);
  // blocking every path from the door: nothing that needs access counts
  let w = withGame(starterSchool(), { cash: 100000 });
  w = clear(w, cls);
  w = run(w, A.placeItem(cls, 'teacher_desk', 3, 1), A.placeItem(cls, 'desk_pair', 0, 3));
  for (const cx of [0, 2, 5, 7]) w = run(w, A.placeItem(cls, 'desk_pair', cx, 7));
  w = run(w, A.placeItem(cls, 'globe', 3, 8), A.placeItem(cls, 'globe', 5, 8), A.placeItem(cls, 'globe', 4, 7));
  const q = E.selectRoomQuality(w, cls);
  assert.equal(q.seats, 0);
  assert.deepEqual(q.missing, ["Teacher's Desk"]);
});

test('quality: diminishing returns and caps', () => {
  const r = starterSchool();
  const cls = roomOf(r, 'classroom');
  const withItems = (type, n) => {
    const items = itemsOf(r, cls).concat(Array.from({ length: n }, (_, k) => ({ id: `x${k}`, itemType: type, cx: 7, cy: 1, rot: 0 })));
    return withGame(r, { interiors: { ...r.game.interiors, [cls]: { items } } });
  };
  const ms = [];
  for (let n = 0; n <= 30; n++) {
    const m = E.selectRoomQuality(withItems('bookshelf', n), cls).learnMult; // F = 4n
    assert.ok(Math.abs(m - (1 + 0.25 * (4 * n) / (4 * n + 20))) < 1e-12);
    assert.ok(m < 1.25, 'capped below +25%');
    ms.push(m);
  }
  for (let n = 2; n <= 30; n++) assert.ok(ms[n] - ms[n - 1] < ms[n - 1] - ms[n - 2], 'each extra item adds less');
  const comfy = E.selectRoomQuality(withItems('beanbag', 200), cls);
  assert.ok(comfy.happyBonus < 8 && comfy.happyBonus > 7.8);
  assert.ok(comfy.score <= 100 && comfy.score > 70);
  // furniture rep capped at +3 school-wide
  const off = withGame(r, { interiors: { ...r.game.interiors, r1: { items: Array.from({ length: 10 }, (_, k) => ({ id: `t${k}`, itemType: 'trophy_shelf', cx: 0, cy: 0, rot: 0 })) } } });
  const rep0 = E.reduce(quiet(withGame(r, { reputation: 100 })), A.tick(24)).game.reputation;
  const rep1 = E.reduce(quiet(withGame(off, { reputation: 100 })), A.tick(24)).game.reputation;
  assert.equal(rep1 - rep0, 3);
  // hygiene reduces dirt, with diminishing returns (max -30%)
  const dirty = withGame(quiet(days(r, 8)), { cleanliness: 50 });
  const rest = roomOf(r, 'restroom');
  const hy = withGame(dirty, { interiors: { ...dirty.game.interiors, [rest]: { items: itemsOf(r, rest).concat([{ id: 'h1', itemType: 'touchless', cx: 5, cy: 3, rot: 0 }]) } } });
  const c0 = E.reduce(dirty, A.tick(24)).game.cleanliness;
  const c1 = E.reduce(hy, A.tick(24)).game.cleanliness;
  const N = dirty.game.students;
  assert.ok(Math.abs((c1 - c0) - N * 0.15 * 0.3 * (6 / 16)) < 1e-6, `${c1 - c0}`);
});

test('comfort and focus feed the simulation', () => {
  const base = quiet(days(starterSchool(), 8));
  const cls = roomOf(base, 'classroom');
  const rich = run(withGame(base, { cash: 100000, level: 3 }), A.placeItem(cls, 'bookshelf', 0, 1), A.placeItem(cls, 'beanbag', 7, 1));
  const plain = withGame(base, { cash: 100000, level: 3 });
  const a = E.reduce(rich, A.tick(24)).game;
  const b = E.reduce(plain, A.tick(24)).game;
  assert.ok(a.learning > b.learning);
  assert.ok(a.happiness > b.happiness);
});

test('library needs 4 shelves for its bonus; cafeteria capacity = counted table seats', () => {
  let r = withGame(starterSchool(), { tier: 2, size: 16, level: 6, cash: 100000 });
  r = run(r, A.build('library', 12, 11), A.buildHallLine([{ x: 12, y: 10 }]), A.build('cafeteria', 0, 11), A.buildHallLine([{ x: 0, y: 10 }, { x: 1, y: 10 }, { x: 2, y: 10 }]));
  const lib = roomOf(r, 'library');
  assert.ok(Math.abs(E.selectRoomQuality(r, lib).learnMult - 1.1) < 1e-12);
  const shelf = itemsOf(r, lib).find((i) => i.itemType === 'shelf');
  const r2 = run(r, A.removeItem(lib, shelf.id));
  const q2 = E.selectRoomQuality(r2, lib);
  assert.equal(q2.learnMult, 1);
  assert.deepEqual(q2.missing, ['4 × Shelf (3/4)']);
  const caf = roomOf(r, 'cafeteria');
  assert.equal(E.selectRoomQuality(r, caf).capacity, 60);
  const table = itemsOf(r, caf).find((i) => i.itemType === 'lunch_table');
  assert.equal(E.selectRoomQuality(run(r, A.removeItem(caf, table.id)), caf).capacity, 50);
  const counter = itemsOf(r, caf).find((i) => i.itemType === 'serving_counter');
  assert.equal(E.selectRoomQuality(run(r, A.removeItem(caf, counter.id)), caf).capacity, 0);
});

test('items list, availability and early unlock (shares the room cap)', () => {
  const r0 = { game: E.createInitialState().game, ledger: { ...E.createInitialState().ledger, apples: 1000 } };
  const list = E.selectItemsForRoom(r0, 'classroom');
  assert.ok(list.length >= 8);
  const ergo = list.find((x) => x.itemType === 'ergo_desk');
  assert.deepEqual([ergo.available, ergo.reason, ergo.earlyCost, ergo.canEarlyUnlock], [false, 'level', 60, true]);
  assert.equal(list.find((x) => x.itemType === 'smartboard').reason, 'tier');
  assert.equal(list.find((x) => x.itemType === 'desk_pair').available, true);
  assert.equal(E.reduce(r0, A.earlyUnlockItem('smartboard')), r0, 'never across tiers');
  let r = run(r0, A.earlyUnlockItem('ergo_desk'));
  assert.equal(r.ledger.apples, 940);
  assert.equal(r.game.unlockedItems.ergo_desk, true);
  assert.equal(E.selectItemAvailability(r, 'ergo_desk').available, true);
  r = run(r, A.earlyUnlock('cafeteria'), A.earlyUnlockItem('beanbag'));
  assert.equal(E.selectEarlyUnlocksLeft(r), 0);
  assert.equal(E.reduce(r, A.earlyUnlockItem('pet_tank')), r, 'cap shared with rooms');
  const poor = { game: r0.game, ledger: { ...r0.ledger, apples: 10 } };
  assert.equal(E.reduce(poor, A.earlyUnlockItem('ergo_desk')), poor);
  // early-unlocked items still cost coins to place
  const r2 = run(r, A.build('classroom', 3, 7));
  const cls = roomOf(r2, 'classroom');
  const r3 = run(r2, A.placeItem(cls, 'ergo_desk', 3, 4));
  assert.equal(r3.game.cash, r2.game.cash - 120);
});

test('rating stays ledger-blind with furniture skins', () => {
  const r = days(starterSchool(), 12);
  const gold = run({ game: r.game, ledger: { ...r.ledger, apples: 1000 } }, A.applyReceipt({ txId: 'g', productId: 'designer_bundle_gold' }), A.buyCosmetic('furniture_neon'), A.equipCosmetic('furniture_gold'));
  assert.equal(gold.ledger.equipped.furniture, 'furniture_gold');
  assert.equal(gold.ledger.owned.furniture_gold, true);
  assert.equal(gold.game, r.game);
  assert.deepEqual(E.selectRating(gold), E.selectRating(r));
  const cls = roomOf(r, 'classroom');
  assert.deepEqual(E.selectRoomQuality(gold, cls), E.selectRoomQuality(r, cls));
  assert.deepEqual(days(gold, 10).game, days(r, 10).game);
  assert.equal(E.reduce(gold, A.buyCosmetic('furniture_gold')), gold, 'already owned');
});

test('selling a room refunds its paid furniture and drops the interior', () => {
  const r0 = withGame(starterSchool(), { level: 3 });
  const cls = roomOf(r0, 'classroom');
  const r1 = run(r0, A.placeItem(cls, 'bookshelf', 0, 1));
  const r2 = run(r1, A.sell(4, 8));
  assert.equal(r2.game.cash, r1.game.cash + 250 + 75);
  assert.equal(r2.game.interiors[cls], undefined);
});
