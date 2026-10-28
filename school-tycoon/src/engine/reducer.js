// reduce(root, action) -> root. Pure; invalid actions return the same root object.
import {
  ROOMS, STAFF, STAFF_NAMES, TIERS, BALANCE, COSMETICS, MAX_TIER, ITEMS, SCENARIOS, SANDBOX_ID, hasInterior,
} from './config/index.js';
import { stamp, resizeGrid } from './grid.js';
import { advanceTicks } from './sim.js';
import { applyChoice } from './events.js';
import { checkAchievements } from './progress.js';
import { debit, applyReceipt, claimLogin, isOwned } from './ledger.js';
import { createInitialGame } from './state.js';
import {
  canBuild, roomAvailability, earlyUnlocksLeft, tierProgress, selectCanHire, itemAvailability, canPlaceItem,
} from './selectors.js';
import { starterInterior, nextItemId } from './interior.js';
import { pushLog, isInt } from './util.js';

const B = BALANCE;
const log = (g, text, kind) => pushLog(g, text, kind, B.logSize);

function placeHall(game, x, y) {
  if (!canBuild(game, 'hall', x, y).ok) return null;
  const grid = game.grid.slice();
  grid[y * game.size + x] = 'hall';
  return { ...game, grid, cash: game.cash - ROOMS.hall.cost };
}

const H = {
  tick(game, ledger, a) {
    const n = a.n === undefined ? 1 : a.n;
    if (!isInt(n) || n < 1 || n > B.maxTickBatch) return null;
    return advanceTicks(game, ledger, n);
  },

  build(game, ledger, a) {
    const type = a.roomType;
    const { x, y } = a;
    if (!canBuild(game, type, x, y).ok) return null;
    if (type === 'hall') return { game: placeHall(game, x, y), ledger };
    const def = ROOMS[type];
    const id = `r${game.nextId}`;
    const grid = game.grid.slice();
    stamp(grid, game.size, x, y, def.w, def.h, id);
    const g = {
      ...game,
      grid,
      rooms: { ...game.rooms, [id]: { id, type, x, y, w: def.w, h: def.h, cost: def.cost } },
      nextId: game.nextId + 1,
      cash: game.cash - def.cost,
    };
    if (hasInterior(type)) g.interiors = { ...game.interiors, [id]: starterInterior(type) };
    return { game: g, ledger };
  },

  buildHallLine(game, ledger, a) {
    if (!Array.isArray(a.cells)) return null;
    let g = game;
    let grid = null;
    let spent = 0;
    const cells = a.cells.slice(0, B.maxHallLine);
    for (const c of cells) {
      if (!c || typeof c !== 'object') continue;
      const probe = grid ? { ...g, grid, cash: g.cash - spent } : g;
      if (!canBuild(probe, 'hall', c.x, c.y).ok) continue;
      if (!grid) grid = g.grid.slice();
      grid[c.y * g.size + c.x] = 'hall';
      spent += ROOMS.hall.cost;
    }
    if (!grid) return null;
    return { game: { ...g, grid, cash: g.cash - spent }, ledger };
  },

  sell(game, ledger, a) {
    const { x, y } = a;
    const { size } = game;
    if (!isInt(x) || !isInt(y) || x < 0 || y < 0 || x >= size || y >= size) return null;
    const v = game.grid[y * size + x];
    if (v === null || v === undefined) return null;
    if (v === 'hall') {
      const grid = game.grid.slice();
      grid[y * size + x] = null;
      return { game: { ...game, grid, cash: game.cash + Math.round(ROOMS.hall.cost * B.sellRefund) }, ledger };
    }
    const room = game.rooms[v];
    if (!room || room.type === 'office') return null;
    const grid = game.grid.slice();
    stamp(grid, size, room.x, room.y, room.w, room.h, null);
    const rooms = { ...game.rooms };
    delete rooms[v];
    let refund = Math.round(room.cost * B.sellRefund);
    let interiors = game.interiors;
    if (interiors && interiors[v]) {
      refund += itemsRefund(interiors[v].items);
      interiors = { ...interiors };
      delete interiors[v];
    }
    let effects = game.effects;
    if (effects && effects.offline && effects.offline[v]) {
      const offline = { ...effects.offline };
      delete offline[v];
      effects = { ...effects, offline };
    }
    return { game: { ...game, grid, rooms, interiors, effects, cash: game.cash + refund }, ledger };
  },

  hire(game, ledger, a) {
    const chk = selectCanHire({ game, ledger }, a.role, a.grade);
    if (!chk.ok) return null;
    const role = STAFF[a.role];
    const spec = a.role === 'teacher' ? role.grades[a.grade] : role.grades.standard;
    const id = `s${game.nextId}`;
    const name = STAFF_NAMES[(game.nextId * 7) % STAFF_NAMES.length];
    const member = { id, role: a.role, grade: spec.id, skill: spec.skill, salary: spec.salary, name };
    const g = { ...game, staff: { ...game.staff, [id]: member }, nextId: game.nextId + 1 };
    log(g, `Hired ${name} (${spec.name}, $${spec.salary}/day).`, 'info');
    return { game: g, ledger };
  },

  fire(game, ledger, a) {
    const s = game.staff[a.staffId];
    if (!s) return null;
    const staff = { ...game.staff };
    delete staff[a.staffId];
    const g = { ...game, staff };
    log(g, `${s.name} left the school.`, 'info');
    return { game: g, ledger };
  },

  setTuition(game, ledger, a) {
    const s = a.step;
    if (!isInt(s) || s < -2 || s > 2 || s === game.tuitionStep) return null;
    return { game: { ...game, tuitionStep: s }, ledger };
  },

  resolveEvent(game, ledger, a) {
    if (!game.event) return null;
    const g = { ...game };
    const L = applyChoice(g, ledger, a.choiceId);
    if (L === null) return null;
    return { game: g, ledger: L };
  },

  dismissReport(game, ledger) {
    if (!game.lastReport) return null;
    return { game: { ...game, lastReport: null }, ledger };
  },

  tierUp(game, ledger) {
    if (game.tier >= MAX_TIER || !tierProgress(game).eligible) return null;
    const tier = game.tier + 1;
    const size = TIERS[tier].size;
    const { grid, rooms } = resizeGrid(game.grid, game.rooms, game.size, size);
    const g = { ...game, tier, size, grid, rooms };
    log(g, `Congratulations! You are now a ${TIERS[tier].name}. The lot grew to ${size}×${size}.`, 'good');
    return { game: g, ledger };
  },

  earlyUnlock(game, ledger, a) {
    const av = roomAvailability(game, ledger, a.roomType);
    if (av.available || av.reason !== 'level' || !av.canEarlyUnlock) return null;
    const L = debit(ledger, av.earlyCost);
    if (!L) return null;
    const g = {
      ...game,
      unlocked: { ...game.unlocked, [a.roomType]: true },
      earlyUnlockLog: [...game.earlyUnlockLog.filter((d) => d > game.day - B.earlyUnlockWindowDays), game.day],
    };
    log(g, `Unlocked ${ROOMS[a.roomType].name} early (-${av.earlyCost} 🍎).`, 'info');
    return { game: g, ledger: L };
  },

  buyCosmetic(game, ledger, a) {
    const c = COSMETICS[a.cosmeticId];
    if (!c || ledger.owned[c.id]) return null;
    if (c.currency === 'apples') {
      const L = debit(ledger, c.price);
      if (!L) return null;
      return { game, ledger: { ...L, owned: { ...L.owned, [c.id]: true } } };
    }
    if (c.currency === 'coins') {
      if (game.mode === 'sandbox' || game.cash < c.price) return null; // sandbox coins are not real
      return { game: { ...game, cash: game.cash - c.price }, ledger: { ...ledger, owned: { ...ledger.owned, [c.id]: true } } };
    }
    return null;
  },

  equipCosmetic(game, ledger, a) {
    const c = COSMETICS[a.cosmeticId];
    if (!c || !isOwned(ledger, c.id) || ledger.equipped[c.slot] === c.id) return null;
    return { game, ledger: { ...ledger, equipped: { ...ledger.equipped, [c.slot]: c.id } } };
  },

  claimDailyLogin(game, ledger, a) {
    const L = claimLogin(ledger, a.dayKey);
    return L === ledger ? null : { game, ledger: L };
  },

  applyReceipt(game, ledger, a) {
    const L = applyReceipt(ledger, a.receipt);
    return L === ledger ? null : { game, ledger: L };
  },

  setAgeGate(game, ledger, a) {
    if ((a.value !== 'under13' && a.value !== 'adult') || ledger.ageGate === a.value) return null;
    return { game, ledger: { ...ledger, ageGate: a.value } };
  },

  resetSchool(game, ledger, a) {
    const seed = a.seed === undefined || a.seed === null ? game.seed + 1 : a.seed;
    if (!Number.isFinite(Number(seed))) return null;
    const sid = a.scenarioId === undefined ? null : a.scenarioId;
    if (sid !== null && sid !== SANDBOX_ID && !SCENARIOS[sid]) return null;
    const schools = (ledger.schools || 1) + 1;
    return { game: createInitialGame(seed, sid, schools), ledger: { ...ledger, schools } };
  },

  placeItem(game, ledger, a) {
    const rot = a.rot === undefined ? 0 : a.rot;
    if (!canPlaceItem(game, a.roomId, a.itemType, a.cx, a.cy, rot, null).ok) return null;
    const interior = game.interiors[a.roomId] || { items: [] };
    const item = { id: nextItemId(interior), itemType: a.itemType, cx: a.cx, cy: a.cy, rot };
    return {
      game: {
        ...game,
        cash: game.cash - ITEMS[a.itemType].cost,
        interiors: { ...game.interiors, [a.roomId]: { ...interior, items: interior.items.concat([item]) } },
      },
      ledger,
    };
  },

  moveItem(game, ledger, a) {
    const interior = game.interiors && game.interiors[a.roomId];
    if (!interior) return null;
    const k = interior.items.findIndex((it) => it.id === a.itemId);
    if (k < 0) return null;
    const cur = interior.items[k];
    const rot = a.rot === undefined ? cur.rot : a.rot;
    if (cur.cx === a.cx && cur.cy === a.cy && cur.rot === rot) return null;
    if (!canPlaceItem(game, a.roomId, cur.itemType, a.cx, a.cy, rot, cur.id).ok) return null;
    const items = interior.items.slice();
    items[k] = { ...cur, cx: a.cx, cy: a.cy, rot };
    return { game: { ...game, interiors: { ...game.interiors, [a.roomId]: { ...interior, items } } }, ledger };
  },

  removeItem(game, ledger, a) {
    const interior = game.interiors && game.interiors[a.roomId];
    if (!interior) return null;
    const cur = interior.items.find((it) => it.id === a.itemId);
    if (!cur) return null;
    const items = interior.items.filter((it) => it.id !== a.itemId);
    return {
      game: {
        ...game,
        cash: game.cash + itemsRefund([cur]),
        interiors: { ...game.interiors, [a.roomId]: { ...interior, items } },
      },
      ledger,
    };
  },

  autoArrange(game, ledger, a) {
    const room = game.rooms[a.roomId];
    if (!room || !hasInterior(room.type)) return null;
    const cur = (game.interiors && game.interiors[a.roomId]) || { items: [] };
    const fresh = starterInterior(room.type);
    if (JSON.stringify(cur.items) === JSON.stringify(fresh.items)) return null;
    return {
      game: { ...game, cash: game.cash + itemsRefund(cur.items), interiors: { ...game.interiors, [a.roomId]: fresh } },
      ledger,
    };
  },

  earlyUnlockItem(game, ledger, a) {
    const av = itemAvailability(game, ledger, a.itemType);
    if (av.available || av.reason !== 'level' || !av.canEarlyUnlock) return null;
    const L = debit(ledger, av.earlyCost);
    if (!L) return null;
    const g = {
      ...game,
      unlockedItems: { ...game.unlockedItems, [a.itemType]: true },
      earlyUnlockLog: [...game.earlyUnlockLog.filter((d) => d > game.day - B.earlyUnlockWindowDays), game.day],
    };
    log(g, `Unlocked ${ITEMS[a.itemType].name} early (-${av.earlyCost} 🍎).`, 'info');
    return { game: g, ledger: L };
  },
};

function itemsRefund(items) {
  let r = 0;
  for (const it of items) {
    const def = ITEMS[it.itemType];
    if (def) r += Math.round(def.cost * B.itemRefund);
  }
  return r;
}

// Sandbox: cash is pinned to a huge constant after every action.
function pinSandbox(game) {
  if (game.mode !== 'sandbox' || game.cash === B.sandboxCash) return game;
  return { ...game, cash: B.sandboxCash };
}

export function reduce(root, action) {
  if (!root || !root.game || !root.ledger || !action || typeof action.type !== 'string') return root;
  const handler = Object.prototype.hasOwnProperty.call(H, action.type) ? H[action.type] : null;
  if (!handler) return root;
  try {
    const res = handler(root.game, root.ledger, action);
    if (!res || !res.game || !res.ledger) return root;
    if (res.game === root.game && res.ledger === root.ledger) return root;
    const out = checkAchievements(pinSandbox(res.game), res.ledger);
    return { game: out.game, ledger: out.ledger };
  } catch (e) {
    if (typeof globalThis !== 'undefined' && globalThis.__SCHOOL_TYCOON_DEBUG__) throw e;
    return root;
  }
}

