// Versioned persistence. serialize -> { game: string, ledger: string } (AsyncStorage keys
// st:game / st:ledger). deserialize runs migrations and throws on a newer version.
import { BALANCE, TIERS, DEFAULT_EQUIPPED, SCENARIOS } from './config/index.js';
import { GAME_VERSION, createInitialGame, DEFAULT_MODIFIERS } from './state.js';
import { LEDGER_VERSION, createInitialLedger } from './ledger.js';
import { starterInteriors } from './interior.js';
import { initialWeekly } from './weekly.js';
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
  // v1 -> v2: every room gets its free starter layout (reproduces v1 numbers exactly), plus
  // the replay-system fields. Weekly goals are drawn from the save's own RNG (deterministic).
  1: (g) => {
    const out = {
      ...g,
      interiors: starterInteriors(g.rooms || {}),
      unlockedItems: {},
      eventCooldowns: {},
      mode: 'normal',
      scenario: null,
      modifiers: DEFAULT_MODIFIERS,
      schoolNo: 1,
      version: 2,
    };
    out.weekly = null;
    return out;
  },
};

// v0 ledgers: { apples, credited } only.
export const LEDGER_MIGRATIONS = {
  0: (l) => ({ ...l, version: 1 }),
  1: (l) => ({ ...l, medals: {}, schools: 1, version: 2 }),
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
  g.size = Number.isInteger(g.size) && g.size >= 8 && g.size <= 64 ? g.size : TIERS[g.tier].size;
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
  g.interiors = obj(raw.interiors, null) || starterInteriors(g.rooms);
  for (const id in g.interiors) if (!g.rooms[id]) delete g.interiors[id];
  g.unlockedItems = obj(g.unlockedItems, {});
  g.eventCooldowns = obj(g.eventCooldowns, {});
  g.mode = g.mode === 'sandbox' || g.mode === 'scenario' ? g.mode : 'normal';
  g.scenario = g.scenario && SCENARIOS[g.scenario.id] && Array.isArray(g.scenario.goalsMet) ? g.scenario : null;
  if (g.mode === 'scenario' && !g.scenario) g.mode = 'normal';
  g.modifiers = { ...DEFAULT_MODIFIERS, ...obj(g.modifiers, {}) };
  g.schoolNo = Math.max(1, int(g.schoolNo, 1));
  if (!g.weekly || !Array.isArray(g.weekly.goals)) g.weekly = initialWeekly(g);
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
  l.medals = obj(l.medals, {});
  l.schools = Math.max(1, int(l.schools, 1));
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
  if (!rawGame && rawLedger) {
    // A fresh school on a salvaged ledger gets the next school number, so its weekly-goal
    // credit keys (goal:<schoolNo>.<week>:<i>) cannot collide with an earlier school's.
    const schools = ledger.schools + 1;
    return { game: createInitialGame(undefined, null, schools), ledger: { ...ledger, schools } };
  }
  const game = rawGame ? normalizeGame(migrate(rawGame, GAME_VERSION, GAME_MIGRATIONS, 'game')) : createInitialGame();
  return { game, ledger };
}
