// Versioned persistence. serialize -> { game: string, ledger: string } (AsyncStorage keys
// st:game / st:ledger). deserialize runs migrations and throws on a newer version.
import { BALANCE, TIERS, DEFAULT_EQUIPPED } from './config/index.js';
import { GAME_VERSION, createInitialGame } from './state.js';
import { LEDGER_VERSION, createInitialLedger } from './ledger.js';
import { idNum } from './util.js';

// v0 (pre-release prototype) saves: no `version`, money in `money`, tuition step in `tuition`,
// none of: effects, unlocked, earlyUnlockLog, achievements, log, stats, termStats, event.
export const GAME_MIGRATIONS = {
  0: (g) => {
    const out = { ...g };
    if (out.cash === undefined && out.money !== undefined) out.cash = out.money;
    if (out.tuitionStep === undefined && out.tuition !== undefined) out.tuitionStep = out.tuition;
    delete out.money;
    delete out.tuition;
    out.version = 1;
    return out;
  },
};

// v0 ledgers: { apples, credited } only.
export const LEDGER_MIGRATIONS = {
  0: (l) => ({ ...l, version: 1 }),
};

function migrate(obj, current, migrations, what) {
  let o = obj;
  let v = typeof o.version === 'number' ? o.version : 0;
  if (v > current) throw new Error(`${what} save version ${v} is newer than supported ${current}`);
  while (v < current) {
    const m = migrations[v];
    if (!m) throw new Error(`No ${what} migration from version ${v}`);
    o = m(o);
    v = o.version;
  }
  return o;
}

const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const int = (v, d) => Math.round(num(v, d));
const obj = (v, d) => (v && typeof v === 'object' && !Array.isArray(v) ? v : d);

function normalizeGame(raw) {
  const d = createInitialGame(raw.seed);
  const g = { ...d, ...raw };
  g.tier = TIERS[g.tier] ? g.tier : 1;
  g.size = TIERS[g.tier].size;
  if (!Array.isArray(g.grid) || g.grid.length !== g.size * g.size) throw new Error('Corrupt save: grid size mismatch');
  g.grid = g.grid.map((v) => (v === undefined ? null : v));
  g.rooms = obj(g.rooms, d.rooms);
  g.staff = obj(g.staff, {});
  let maxId = 1;
  for (const id in g.rooms) maxId = Math.max(maxId, idNum(id));
  for (const id in g.staff) maxId = Math.max(maxId, idNum(id));
  g.nextId = Math.max(int(g.nextId, maxId + 1), maxId + 1);
  g.tick = Math.max(0, int(g.tick, 0));
  g.day = Math.floor(g.tick / 24);
  g.rng = num(g.rng, d.rng) >>> 0;
  g.cash = int(g.cash, BALANCE.startCash);
  g.students = Math.max(0, int(g.students, 0));
  g.reputation = Math.max(0, Math.min(BALANCE.repMax, int(g.reputation, 0)));
  g.xp = Math.max(0, int(g.xp, 0));
  g.level = Math.max(1, int(g.level, 1));
  g.stars = int(g.stars, 0);
  g.tuitionStep = Math.max(-2, Math.min(2, int(g.tuitionStep, 0)));
  g.happiness = num(g.happiness, d.happiness);
  g.learning = num(g.learning, d.learning);
  g.cleanliness = num(g.cleanliness, d.cleanliness);
  g.unlocked = obj(g.unlocked, {});
  g.earlyUnlockLog = Array.isArray(g.earlyUnlockLog) ? g.earlyUnlockLog : [];
  g.effects = obj(g.effects, {});
  g.achievements = obj(g.achievements, {});
  g.log = Array.isArray(g.log) ? g.log : [];
  g.stats = { ...d.stats, ...obj(g.stats, {}) };
  g.termStats = { ...d.termStats, ...obj(g.termStats, {}) };
  if (g.event !== null && !(g.event && Array.isArray(g.event.choices) && g.event.choices.length)) g.event = null;
  g.inspectionDueDay = int(g.inspectionDueDay, d.inspectionDueDay);
  while (g.inspectionDueDay <= g.day) g.inspectionDueDay += BALANCE.inspectionInterval;
  g.version = GAME_VERSION;
  return g;
}

function normalizeLedger(raw) {
  const d = createInitialLedger();
  const l = { ...d, ...raw };
  l.apples = Math.max(0, int(l.apples, 0));
  l.credited = obj(l.credited, {});
  l.owned = obj(l.owned, {});
  l.equipped = { ...DEFAULT_EQUIPPED, ...obj(l.equipped, {}) };
  l.login = { ...d.login, ...obj(l.login, {}) };
  if (l.ageGate !== 'under13' && l.ageGate !== 'adult') l.ageGate = null;
  l.version = LEDGER_VERSION;
  return l;
}

export function serialize(root) {
  return { game: JSON.stringify(root.game), ledger: JSON.stringify(root.ledger) };
}

const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

export function deserialize(data) {
  const src = data || {};
  const rawGame = parse(src.game);
  const rawLedger = parse(src.ledger);
  const ledger = rawLedger ? normalizeLedger(migrate(rawLedger, LEDGER_VERSION, LEDGER_MIGRATIONS, 'ledger')) : createInitialLedger();
  const game = rawGame ? normalizeGame(migrate(rawGame, GAME_VERSION, GAME_MIGRATIONS, 'game')) : createInitialGame();
  return { game, ledger };
}
