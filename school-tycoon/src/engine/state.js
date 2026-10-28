import { BALANCE, TIERS, SCENARIOS, SANDBOX_ID, MAX_TIER, MAX_LEVEL, ROOMS, STAFF, STAFF_NAMES } from './config/index.js';
import { makeInitialLayout, stamp, canPlace } from './grid.js';
import { seedToRng } from './rng.js';
import { createInitialLedger } from './ledger.js';
import { starterInteriors } from './interior.js';
import { initialWeekly } from './weekly.js';
import { xpForLevel } from './model.js';
import { own } from './util.js';

export const GAME_VERSION = 2;

export const DEFAULT_MODIFIERS = { salaryMult: 1, fluChanceMult: 1, tuitionMult: 1, bannedRooms: [] };

export function normalizeSeed(seed) {
  const n = Number(seed);
  return Number.isFinite(n) ? Math.floor(Math.abs(n)) % 4294967296 : 12345;
}

function baseGame(s, size, tier) {
  const { grid, rooms } = makeInitialLayout(size, BALANCE.hallStubLength);
  return {
    version: GAME_VERSION,
    seed: s,
    rng: seedToRng(s),
    tick: 0,
    day: 0,
    tier,
    size,
    grid,
    rooms,
    interiors: starterInteriors(rooms),
    nextId: 2,
    staff: {},
    students: BALANCE.startStudents,
    happiness: BALANCE.startHappiness,
    learning: BALANCE.startLearning,
    cleanliness: BALANCE.startCleanliness,
    reputation: BALANCE.startReputation,
    cash: BALANCE.startCash,
    tuitionStep: 0,
    xp: 0,
    level: 1,
    stars: 0,
    unlocked: {},
    unlockedItems: {},
    earlyUnlockLog: [],
    event: null,
    effects: {},
    eventCooldowns: {},
    lastInspectionGrade: null,
    inspectionDueDay: BALANCE.inspectionInterval,
    achievements: {},
    lastReport: null,
    log: [{ day: 0, text: 'Welcome, Principal! Build classrooms and connect them to the Front Office with hallways.', kind: 'info' }],
    stats: { totalEarned: 0, totalStudentsEver: 0 },
    termStats: { income: 0, salaries: 0, upkeep: 0, studentsStart: BALANCE.startStudents },
    mode: 'normal',
    scenario: null,
    modifiers: DEFAULT_MODIFIERS,
    schoolNo: 1,
    weekly: null,
  };
}

// Places a preset room ignoring cost/locks (scenario setup). Mutates g (fresh object).
function presetRoom(g, type, x, y) {
  const def = ROOMS[type];
  if (!def || def.buildable === false || canPlace(g.grid, g.size, x, y, def.w, def.h)) return;
  const id = `r${g.nextId}`;
  g.nextId += 1;
  stamp(g.grid, g.size, x, y, def.w, def.h, id);
  g.rooms[id] = { id, type, x, y, w: def.w, h: def.h, cost: def.cost };
}

function presetHire(g, role, grade) {
  const r = STAFF[role];
  const spec = role === 'teacher' ? r.grades[grade || 'rookie'] : r.grades.standard;
  const id = `s${g.nextId}`;
  const name = STAFF_NAMES[(g.nextId * 7) % STAFF_NAMES.length];
  g.staff[id] = { id, role, grade: spec.id, skill: spec.skill, salary: spec.salary, name };
  g.nextId += 1;
}

// scenarioId: undefined/null (normal game) | SANDBOX_ID | a SCENARIOS id. Unknown ids -> normal.
export function createInitialGame(seed = 12345, scenarioId = null, schoolNo = 1) {
  const s = normalizeSeed(seed);
  let g;
  if (scenarioId === SANDBOX_ID) {
    g = baseGame(s, TIERS[MAX_TIER].size, MAX_TIER);
    g.mode = 'sandbox';
    g.cash = BALANCE.sandboxCash;
    g.level = MAX_LEVEL;
    g.xp = xpForLevel(MAX_LEVEL);
    g.log = [{ day: 0, text: 'Sandbox: unlimited cash, everything unlocked. No medals, achievements or Apples.', kind: 'info' }];
  } else if (scenarioId && own(SCENARIOS, scenarioId)) {
    const sc = SCENARIOS[scenarioId];
    const tier = sc.tier || 1;
    g = baseGame(s, sc.size || TIERS[tier].size, tier);
    g.mode = 'scenario';
    g.cash = sc.cash;
    g.reputation = sc.reputation || 0;
    g.modifiers = { ...DEFAULT_MODIFIERS, ...sc.modifiers };
    const p = sc.preset || {};
    g.grid = g.grid.slice();
    g.rooms = { ...g.rooms };
    g.staff = {};
    for (const [x0, y0, x1, y1] of p.halls || []) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g.grid[y * g.size + x] === null) g.grid[y * g.size + x] = 'hall';
    }
    for (const r of p.rooms || []) presetRoom(g, r.type, r.x, r.y);
    for (const st of p.staff || []) presetHire(g, st.role, st.grade);
    g.interiors = starterInteriors(g.rooms);
    if (p.level) { g.level = p.level; g.xp = xpForLevel(p.level); }
    for (const k of ['students', 'happiness', 'cleanliness', 'learning']) if (typeof p[k] === 'number') g[k] = p[k];
    g.termStats = { ...g.termStats, studentsStart: g.students };
    g.scenario = { id: sc.id, goalsMet: [], endDay: sc.timeLimitDays, result: null };
    g.log = [{ day: 0, text: `Scenario: ${sc.name}. ${sc.desc}`, kind: 'info' }];
  } else {
    g = baseGame(s, TIERS[1].size, 1);
  }
  g.schoolNo = schoolNo;
  g.weekly = initialWeekly(g);
  return g;
}

export function createInitialState(seed = 12345, scenarioId = null) {
  return { game: createInitialGame(seed, scenarioId, 1), ledger: createInitialLedger() };
}
