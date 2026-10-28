// All gameplay tunables. Numbers follow DESIGN.md §2/§3/§5/§7 unless noted.
//
// Deviations from DESIGN.md (tuned for a fun, positive early game; see test/balance.test.mjs):
//  1. Applicants/day: DESIGN says floor((1 + rep/100) * (1 - 0.15*step)). With 0 starting
//     students and rep 0 that is 1 student/day, so a starter school (2 classrooms, 2 rookies,
//     janitor: $130/day salaries) would bleed money for ~2 weeks. We use
//     floor((applicantBase + rep/applicantRepDivisor) * (1 - 0.15*step)) with base 6 and
//     divisor 50, so the starter school turns a profit on day 3-4 and reputation matters more.
//  2. Upkeep "min $1 per room" applies to rooms and decor. Hallway tiles are not rooms: they pay
//     0.2% of $10 each, summed and rounded (about $1 per 50 tiles). The pre-placed Front
//     Office pays no upkeep.
//  3. "Spotless" achievement needs cleanliness 100 *and* at least 30 students (the school starts
//     at 100 cleanliness, so otherwise it would trigger on the first action).
//  4. The Nurse's Office shortens flu (3 days -> 1) only when at least one Nurse is on staff.
//  5. Flu "20% of students sick" is modelled in aggregate as learning x0.7 and happiness
//     target -5 for the whole school while the flu lasts.
//  6. Closed school days: no tuition, no learning change and no cleanliness decay; salaries
//     and upkeep are still paid.

export const TICKS_PER_DAY = 24;
export const DAYS_PER_TERM = 15;
export const TERMS_PER_YEAR = 3;
export const DAYS_PER_YEAR = DAYS_PER_TERM * TERMS_PER_YEAR; // 45
export const MAX_LEVEL = 20;
export const MAX_TIER = 3;

export const BALANCE = {
  // start
  startCash: 4000,
  startStudents: 0,
  startHappiness: 50,
  startLearning: 0,
  startCleanliness: 100,
  startReputation: 0,
  hallStubLength: 3,

  // building
  sellRefund: 0.5,
  upkeepRate: 0.002,
  upkeepMinPerRoom: 1,
  maxHallLine: 400,

  // time
  maxTickBatch: 96,
  offlineCapMs: 8 * 60 * 60 * 1000,
  msPerTickOffline: 1000,
  secondsPerDayAt1x: 24,

  // staff
  maxStaff: 60,
  noStaffRoomSkillPenalty: 1,
  minTeacherSkill: 1,

  // facilities
  restroomCapacity: 40,
  restroomOverloadDistance: 10, // dR_eff = dR + 10 * max(0, L - 1)
  cafeteriaCapacity: 60,
  missingDistance: 99,

  // per-room modifiers
  lateRestroomFree: 8,
  lateRestroomDiv: 20,
  lateCafeteriaFree: 12,
  lateCafeteriaDiv: 30,
  lateMax: 0.6,
  lateLearnPenalty: 0.4,
  hRestroomBase: 10,
  hRestroomSpan: 30,
  hRestroomDiv: 16,
  hRestroomMissing: -20,
  hCafeteriaBase: 10,
  hCafeteriaSpan: 35,
  hCafeteriaDiv: 20,
  hCafeteriaBad: -25,

  // cleanliness
  dirtPerStudent: 0.15,
  cleanPerJanitor: 12,
  dirtPenaltyMax: 20,

  // happiness
  happinessBase: 50,
  decorCap: 15,
  overCapacityPenalty: 15,
  tuitionStepHappiness: 3,
  happinessRate: 0.1,
  fluHappinessPenalty: 5,

  // learning
  learnBase: 0.6,
  learnPerSkill: 0.2,
  learnHappyBase: 0.5,
  learnHappyDiv: 200,
  learnTargetScale: 60,
  learningRate: 0.1,
  libraryBonus: 1.1,
  fluLearnMult: 0.7,
  deepCleanLearnMult: 0.9,

  // rating
  ratingWeights: { learning: 0.4, happiness: 0.4, coverage: 0.2 },
  starThresholds: [20, 40, 60, 75, 90],

  // reputation
  repPerStarOver2: 2,
  repMax: 1000,

  // enrollment
  tuitionStepPct: 0.1,
  applicantBase: 6, // DESIGN: 1 (see deviation 1)
  applicantRepDivisor: 50, // DESIGN: 100 (see deviation 1)
  applicantStepPenalty: 0.15,
  leaverHappinessThreshold: 30,
  leaverDiv: 200,

  // xp
  xpStudentsDiv: 10,
  xpPerTerm: 25,
  xpInspectionA: 100,
  xpLevelBase: 60,
  xpLevelExp: 1.6,
  applesPerLevel: 20,

  // events
  inspectionInterval: 45,
  inspectionAnnounceDays: 5,
  inspectionWeights: { cleanliness: 0.35, learning: 0.35, coverage: 0.3 },
  inspectionGrades: [['A', 85], ['B', 70], ['C', 55], ['D', 40]],
  inspectionRewards: {
    A: { rep: 100, cash: 2000, xp: 100 },
    B: { rep: 40, cash: 500, xp: 0 },
    C: { rep: 0, cash: 0, xp: 0 },
    D: { rep: -20, cash: 0, xp: 0 },
    F: { rep: -50, cash: 0, xp: 0 },
  },
  deepCleanBonus: 30,
  deepCleanDays: 5,
  cramLearning: 5,
  cramHappiness: 5,
  fluChance: 0.015,
  fluMinStudents: 30,
  fluCloseDays: 2,
  fluSickDays: 3,
  fluSickDaysNurse: 1,
  eventAutoResolveDays: 2,
  spotlessMinStudents: 30,

  // monetization
  earlyUnlockApplesPerLevel: 30,
  earlyUnlockLimit: 3,
  earlyUnlockWindowDays: 7,
  loginCycle: [5, 5, 10, 5, 5, 10, 25],
  applesPerUsd: 100 / 0.99,

  // misc
  logSize: 20,
};
