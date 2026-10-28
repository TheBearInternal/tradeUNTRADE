import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, gridProblems, starterSchool } from './helpers.mjs';

// Test-local PRNG (independent from the engine's).
function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TYPES = Object.keys(E.ROOMS);
const COS = Object.keys(E.COSMETICS);
const PRODS = Object.keys(E.PRODUCTS);
const ITEM_TYPES = Object.keys(E.ITEMS);
const SCEN = [undefined, undefined, E.SANDBOX_ID, ...E.SCENARIO_ORDER];

function itemAction(rand, root) {
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const ids = Object.keys(root.game.interiors || {});
  const roomId = ids.length && rand() < 0.95 ? pick(ids) : 'r999';
  const items = (root.game.interiors[roomId] && root.game.interiors[roomId].items) || [];
  const type = root.game.rooms[roomId] && rand() < 0.8
    ? pick(ITEM_TYPES.filter((t) => E.ITEMS[t].rooms.indexOf(root.game.rooms[roomId].type) >= 0).concat(['globe']))
    : pick(ITEM_TYPES);
  const c = () => Math.floor(rand() * 20) - 2;
  const k = rand();
  if (k < 0.5) return A.placeItem(roomId, type, c(), c(), pick([0, 0, 1, 2]));
  if (k < 0.7) return A.moveItem(roomId, items.length ? pick(items).id : 'i1', c(), c(), pick([0, 1, undefined]));
  if (k < 0.85) return A.removeItem(roomId, items.length ? pick(items).id : 'i99');
  if (k < 0.93) return A.autoArrange(roomId);
  return A.earlyUnlockItem(pick(ITEM_TYPES));
}

function randomAction(rand, root) {
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const size = root.game.size;
  const xy = () => Math.floor(rand() * (size + 2)) - 1;
  if (rand() < 0.22) return itemAction(rand, root);
  const k = rand();
  if (k < 0.25) return A.tick(pick([1, 1, 5, 24, 24, 48, 96]));
  if (k < 0.45) return A.build(pick(TYPES), xy(), xy());
  if (k < 0.52) {
    const cells = [];
    let x = xy();
    let y = xy();
    for (let i = 0; i < 8; i++) { cells.push({ x, y }); if (rand() < 0.5) x++; else y++; }
    return A.buildHallLine(cells);
  }
  if (k < 0.6) return A.sell(xy(), xy());
  if (k < 0.67) return A.hire(pick(['teacher', 'teacher', 'janitor', 'nurse', 'x']), pick(['rookie', 'veteran', 'expert', undefined]));
  if (k < 0.71) {
    const ids = Object.keys(root.game.staff);
    return A.fire(ids.length ? pick(ids) : 's1');
  }
  if (k < 0.74) return A.setTuition(pick([-2, -1, 0, 1, 2, 3]));
  if (k < 0.8) return A.resolveEvent(root.game.event && rand() < 0.8 ? pick(root.game.event.choices).id : 'nope');
  if (k < 0.82) return A.dismissReport();
  if (k < 0.84) return A.tierUp();
  if (k < 0.87) return A.earlyUnlock(pick(TYPES));
  if (k < 0.89) return A.buyCosmetic(pick(COS));
  if (k < 0.91) return A.equipCosmetic(pick(COS));
  if (k < 0.93) return A.claimDailyLogin(`2026-02-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`);
  if (k < 0.96) return A.applyReceipt({ txId: `t${Math.floor(rand() * 20)}`, productId: pick(PRODS) });
  if (k < 0.97) return A.setAgeGate(pick(['adult', 'under13', 'x']));
  if (k < 0.975) return A.resetSchool(Math.floor(rand() * 100), pick(SCEN));
  return pick([{ type: 'garbage' }, { type: 'build' }, { type: 'tick', n: NaN }, { type: 'sell', x: 'a' }, null]);
}

function checkInvariants(root, where) {
  const g = root.game;
  const L = root.ledger;
  for (const k of ['cash', 'students', 'reputation', 'xp', 'level', 'tick', 'day', 'stars', 'nextId', 'rng']) {
    assert.ok(Number.isInteger(g[k]), `${where}: ${k}=${g[k]} not integer`);
  }
  for (const k of ['happiness', 'learning', 'cleanliness']) {
    assert.ok(Number.isFinite(g[k]) && g[k] >= 0 && g[k] <= 100, `${where}: ${k}=${g[k]}`);
  }
  assert.ok(g.reputation >= 0 && g.reputation <= 1000);
  assert.ok(g.students >= 0);
  assert.equal(g.day, Math.floor(g.tick / 24));
  assert.ok(Number.isInteger(L.apples) && L.apples >= 0, `${where}: apples ${L.apples}`);
  assert.deepEqual(gridProblems(g), [], where);
  assert.ok(Object.values(g.rooms).filter((r) => r.type === 'office').length === 1, `${where}: one office`);
  const pnl = E.selectDailyPnL(root);
  for (const k in pnl) assert.ok(Number.isInteger(pnl[k]), `${where}: pnl.${k}`);
  assert.ok(E.selectCapacity(root) >= 0);
  const rating = E.selectRating(root);
  assert.ok(Number.isFinite(rating.score) && rating.stars >= 0 && rating.stars <= 5);
  assert.ok(!JSON.stringify(g).includes('NaN') && !JSON.stringify(g).includes('null,null,"x"'));
  if (g.mode === 'sandbox') assert.equal(g.cash, E.BALANCE.sandboxCash);
  // interiors consistent with rooms and placement rules
  for (const id in g.rooms) {
    if (E.hasInterior(g.rooms[id].type)) assert.ok(g.interiors[id], `${where}: interior for ${id}`);
  }
  for (const id in g.interiors) {
    const room = g.rooms[id];
    assert.ok(room && E.hasInterior(room.type), `${where}: stray interior ${id}`);
    const { cols, rows, door } = E.interiorDims(room.type);
    const items = g.interiors[id].items;
    assert.ok(items.length <= E.BALANCE.maxItemsPerRoom, `${where}: too many items`);
    assert.equal(new Set(items.map((i) => i.id)).size, items.length, `${where}: duplicate item ids`);
    const occ = new Array(cols * rows).fill(null);
    for (const it of items) {
      const def = E.ITEMS[it.itemType];
      assert.ok(def && def.rooms.indexOf(room.type) >= 0, `${where}: item ${it.itemType} in ${room.type}`);
      const { w, h } = E.itemSize(def, it.rot);
      assert.ok(it.cx >= 0 && it.cy >= 0 && it.cx + w <= cols && it.cy + h <= rows, `${where}: item out of bounds`);
      if (def.wall) assert.ok(it.cx === 0 || it.cy === 0, `${where}: wall item off the wall`);
      for (let y = it.cy; y < it.cy + h; y++) {
        for (let x = it.cx; x < it.cx + w; x++) {
          assert.equal(occ[y * cols + x], null, `${where}: overlap in ${id}`);
          occ[y * cols + x] = it.id;
        }
      }
    }
    assert.equal(occ[door.cy * cols + door.cx], null, `${where}: door blocked in ${id}`);
    const q = E.selectRoomQuality(root, id);
    assert.ok(Number.isFinite(q.score) && q.score >= 0 && q.score <= 100);
  }
}

test('fuzz: 2000 random actions (incl. items, scenarios, sandbox) keep the state consistent', () => {
  globalThis.__SCHOOL_TYCOON_DEBUG__ = true; // surface exceptions instead of swallowing them
  try {
    for (const seed of [1, 2]) {
      const rand = prng(seed);
      let root = seed === 1 ? E.createInitialState(seed) : starterSchool(seed);
      root = { game: { ...root.game, cash: 50000 }, ledger: root.ledger };
      for (let i = 0; i < 2000; i++) {
        const a = randomAction(rand, root);
        const next = E.reduce(root, a);
        checkInvariants(next, `seed ${seed} step ${i} ${JSON.stringify(a)}`);
        root = next;
      }
    }
  } finally {
    delete globalThis.__SCHOOL_TYCOON_DEBUG__;
  }
});

test('determinism: same seed + actions give deep-equal state', () => {
  const play = () => {
    const rand = prng(42);
    let root = E.createInitialState(777);
    root = { game: { ...root.game, cash: 50000 }, ledger: root.ledger };
    for (let i = 0; i < 1500; i++) root = E.reduce(root, randomAction(rand, root));
    return root;
  };
  const a = play();
  const b = play();
  assert.deepEqual(a, b);
  assert.ok(a.game.tick > 0);
});

test('flu rolls are seeded: different seeds diverge, same seed matches', () => {
  const sim = (seed) => {
    let r = starterSchool(seed);
    const seen = [];
    for (let d = 0; d < 300; d++) {
      r = E.reduce(r, A.tick(24));
      if (r.game.event && r.game.event.id === 'flu' && r.game.event.startedDay === r.game.day) seen.push(r.game.day);
    }
    return seen;
  };
  assert.deepEqual(sim(3), sim(3));
  const all = [1, 2, 3, 4, 5].map((s) => sim(s).join(','));
  assert.ok(new Set(all).size > 1);
});
