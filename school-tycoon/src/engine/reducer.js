// reduce(root, action) -> root. Pure; invalid actions return the same root object.
import { ROOMS, STAFF, STAFF_NAMES, TIERS, BALANCE, COSMETICS, MAX_TIER } from './config/index.js';
import { stamp, resizeGrid } from './grid.js';
import { advanceTicks } from './sim.js';
import { applyChoice } from './events.js';
import { checkAchievements } from './progress.js';
import { debit, applyReceipt, claimLogin, isOwned } from './ledger.js';
import { createInitialGame } from './state.js';
import { canBuild, roomAvailability, earlyUnlocksLeft, tierProgress, selectCanHire } from './selectors.js';
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
    return { game: { ...game, grid, rooms, cash: game.cash + Math.round(room.cost * B.sellRefund) }, ledger };
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
      if (game.cash < c.price) return null;
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
    return { game: createInitialGame(seed), ledger };
  },
};

export function reduce(root, action) {
  if (!root || !root.game || !root.ledger || !action || typeof action.type !== 'string') return root;
  const handler = Object.prototype.hasOwnProperty.call(H, action.type) ? H[action.type] : null;
  if (!handler) return root;
  try {
    const res = handler(root.game, root.ledger, action);
    if (!res || !res.game || !res.ledger) return root;
    if (res.game === root.game && res.ledger === root.ledger) return root;
    const out = checkAchievements(res.game, res.ledger);
    return { game: out.game, ledger: out.ledger };
  } catch (e) {
    if (typeof globalThis !== 'undefined' && globalThis.__SCHOOL_TYCOON_DEBUG__) throw e;
    return root;
  }
}

