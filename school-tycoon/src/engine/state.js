import { BALANCE, TIERS } from './config/index.js';
import { makeInitialLayout } from './grid.js';
import { seedToRng } from './rng.js';
import { createInitialLedger } from './ledger.js';

export const GAME_VERSION = 1;

export function normalizeSeed(seed) {
  const n = Number(seed);
  return Number.isFinite(n) ? Math.floor(Math.abs(n)) % 4294967296 : 12345;
}

export function createInitialGame(seed = 12345) {
  const s = normalizeSeed(seed);
  const size = TIERS[1].size;
  const { grid, rooms } = makeInitialLayout(size, BALANCE.hallStubLength);
  return {
    version: GAME_VERSION,
    seed: s,
    rng: seedToRng(s),
    tick: 0,
    day: 0,
    tier: 1,
    size,
    grid,
    rooms,
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
    earlyUnlockLog: [],
    event: null,
    effects: {},
    lastInspectionGrade: null,
    inspectionDueDay: BALANCE.inspectionInterval,
    achievements: {},
    lastReport: null,
    log: [{ day: 0, text: 'Welcome, Principal! Build classrooms and connect them to the Front Office with hallways.', kind: 'info' }],
    stats: { totalEarned: 0, totalStudentsEver: 0 },
    termStats: { income: 0, salaries: 0, upkeep: 0, studentsStart: BALANCE.startStudents },
  };
}

export function createInitialState(seed = 12345) {
  return { game: createInitialGame(seed), ledger: createInitialLedger() };
}
