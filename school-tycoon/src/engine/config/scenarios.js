// Scenarios (DESIGN_V2 §3.1). Medal = number of goals met (bronze 1, silver 2, gold 3).
// A scenario ends when every goal is met or at timeLimitDays; the best medal per scenario is
// stored in ledger.medals (never purchasable).
// preset: { rooms: [{type,x,y}], halls: [[x0,y0,x1,y1]], staff: [{role,grade}], students, level,
//           happiness, cleanliness, learning } (all optional).
import { stat } from './dsl.js';

const MEDALS = { bronze: 1, silver: 2, gold: 3 };
const NONE = { salaryMult: 1, fluChanceMult: 1, tuitionMult: 1, bannedRooms: [] };
const STARTER = {
  halls: [[3, 10, 11, 10]],
  rooms: [{ type: 'classroom', x: 3, y: 7 }, { type: 'classroom', x: 9, y: 7 }, { type: 'restroom', x: 7, y: 8 }],
  staff: [{ role: 'teacher', grade: 'rookie' }, { role: 'teacher', grade: 'rookie' }, { role: 'janitor' }],
};

export const SANDBOX_ID = 'sandbox';

export const SCENARIOS = {
  rescue_riverside: {
    id: 'rescue_riverside', name: 'Rescue Riverside', emoji: '🛟',
    desc: 'A run-down school: dirty halls, a restroom nobody can reach and unhappy kids. Turn it around.',
    size: 16, tier: 1, cash: 1500, reputation: 20, modifiers: NONE,
    preset: {
      halls: [[3, 10, 11, 10]],
      rooms: [{ type: 'classroom', x: 3, y: 7 }, { type: 'classroom', x: 9, y: 7 }, { type: 'restroom', x: 0, y: 0 }],
      staff: [{ role: 'teacher', grade: 'rookie' }, { role: 'teacher', grade: 'rookie' }],
      students: 35, happiness: 30, cleanliness: 35, level: 2,
    },
    goals: [
      { cond: stat('cleanliness', '>=', 80), label: 'Cleanliness 80+' },
      { cond: stat('happiness', '>=', 50), label: 'Happiness 50+' },
      { cond: stat('stars', '>=', 3), label: 'Reach 3 stars' },
    ],
    timeLimitDays: 60, medals: MEDALS,
  },
  tiny_lot: {
    id: 'tiny_lot', name: 'Tiny Lot', emoji: '📐',
    desc: 'Only a 12x12 lot in the city centre. Every tile counts.',
    size: 12, tier: 1, cash: 4000, reputation: 0, modifiers: NONE,
    goals: [
      { cond: stat('students', '>=', 40), label: '40 students' },
      { cond: stat('stars', '>=', 3), label: 'Reach 3 stars' },
      { cond: stat('cash', '>=', 10000), label: 'Have $10,000' },
    ],
    timeLimitDays: 90, medals: MEDALS,
  },
  flu_season: {
    id: 'flu_season', name: 'Flu Season', emoji: '🤧',
    desc: 'Flu is everywhere this year (8x as likely). Keep the school healthy and happy.',
    size: 16, tier: 1, cash: 3000, reputation: 30,
    modifiers: { salaryMult: 1, fluChanceMult: 8, tuitionMult: 1, bannedRooms: [] },
    preset: { ...STARTER, students: 40, level: 2 },
    goals: [
      { cond: stat('happiness', '>=', 45), label: 'Happiness 45+' },
      { cond: stat('learning', '>=', 35), label: 'Learning 35+' },
      { cond: stat('students', '>=', 60), label: '60 students' },
    ],
    timeLimitDays: 60, medals: MEDALS,
  },
  budget_cuts: {
    id: 'budget_cuts', name: 'Budget Cuts', emoji: '✂️',
    desc: 'Salaries cost 30% more and tuition is capped 15% lower. Balance the books.',
    size: 16, tier: 1, cash: 2500, reputation: 0,
    modifiers: { salaryMult: 1.3, fluChanceMult: 1, tuitionMult: 0.85, bannedRooms: [] },
    preset: { ...STARTER },
    goals: [
      { cond: stat('cash', '>=', 8000), label: 'Have $8,000' },
      { cond: stat('students', '>=', 60), label: '60 students' },
      { cond: stat('stars', '>=', 3), label: 'Reach 3 stars' },
    ],
    timeLimitDays: 90, medals: MEDALS,
  },
  grand_opening: {
    id: 'grand_opening', name: 'Grand Opening', emoji: '🎉',
    desc: 'A big grant and a waiting list. Grow as fast as you can.',
    size: 16, tier: 1, cash: 20000, reputation: 0, modifiers: NONE,
    preset: { level: 3 },
    goals: [
      { cond: stat('students', '>=', 60), label: '60 students' },
      { cond: stat('students', '>=', 100), label: '100 students' },
      { cond: stat('reputation', '>=', 50), label: 'Reputation 50' },
    ],
    timeLimitDays: 50, medals: MEDALS,
  },
  clean_sweep: {
    id: 'clean_sweep', name: 'Clean Sweep', emoji: '🧽',
    desc: 'The last principal never hired a janitor. Make it sparkle.',
    size: 16, tier: 1, cash: 2000, reputation: 10, modifiers: NONE,
    preset: {
      halls: [[0, 10, 11, 10]],
      rooms: [{ type: 'classroom', x: 3, y: 7 }, { type: 'classroom', x: 9, y: 7 }, { type: 'classroom', x: 0, y: 11 }, { type: 'restroom', x: 7, y: 8 }],
      staff: [{ role: 'teacher', grade: 'rookie' }, { role: 'teacher', grade: 'rookie' }, { role: 'teacher', grade: 'rookie' }],
      students: 60, cleanliness: 15, happiness: 40,
    },
    goals: [
      { cond: stat('cleanliness', '>=', 70), label: 'Cleanliness 70+' },
      { cond: stat('cleanliness', '>=', 100), label: 'Spotless (100)' },
      { cond: stat('happiness', '>=', 50), label: 'Happiness 50+' },
    ],
    timeLimitDays: 30, medals: MEDALS,
  },
  brain_trust: {
    id: 'brain_trust', name: 'Brain Trust', emoji: '🧠',
    desc: 'Build the smartest school in the state: average learning of 85.',
    size: 16, tier: 1, cash: 8000, reputation: 0, modifiers: NONE,
    preset: { level: 4 },
    goals: [
      { cond: stat('learning', '>=', 60), label: 'Learning 60' },
      { cond: stat('learning', '>=', 75), label: 'Learning 75' },
      { cond: stat('learning', '>=', 85), label: 'Learning 85' },
    ],
    timeLimitDays: 150, medals: MEDALS,
  },
  big_campus: {
    id: 'big_campus', name: 'Big Campus', emoji: '🏫',
    desc: 'From a small elementary school to a High School campus.',
    size: 16, tier: 1, cash: 5000, reputation: 0, modifiers: NONE,
    goals: [
      { cond: stat('tier', '>=', 2), label: 'Become a Middle School' },
      { cond: stat('tier', '>=', 3), label: 'Become a High School' },
      { cond: stat('students', '>=', 150), label: '150 students' },
    ],
    timeLimitDays: 400, medals: MEDALS,
  },
};
export const SCENARIO_ORDER = Object.keys(SCENARIOS);
export const MEDAL_RANK = { bronze: 1, silver: 2, gold: 3 };
