// Weekly goal templates (DESIGN_V2 §3.4). 3 seeded goals per 7 game days; unfinished goals roll
// over for up to 3 weeks. kind 'sum' adds a daily metric ('enrolled' | 'income' | 'xp');
// kind 'streak' counts consecutive days on which `cond` holds. target: number or [tier1, tier2, tier3].
// Reward: xp, cash x tier, plus BALANCE.weeklyGoalApples (credit key goal:<schoolNo>.<week>:<i>).
import { stat } from './dsl.js';

export const WEEKLY_GOALS = {
  enroll: { id: 'enroll', label: 'Enroll {target} students', kind: 'sum', metric: 'enrolled', target: [15, 25, 40], reward: { xp: 30, cash: 300 } },
  earn: { id: 'earn', label: 'Earn ${target} in tuition', kind: 'sum', metric: 'income', target: [3000, 6000, 10000], reward: { xp: 30, cash: 300 } },
  xp: { id: 'xp', label: 'Gain {target} XP', kind: 'sum', metric: 'xp', target: [30, 60, 100], reward: { xp: 20, cash: 400 } },
  clean: { id: 'clean', label: 'Keep cleanliness at 80+ all week', kind: 'streak', cond: stat('cleanliness', '>=', 80), target: 7, reward: { xp: 40, cash: 300 } },
  no_late: {
    id: 'no_late', label: 'No late classrooms for {target} days', kind: 'streak',
    cond: { all: [stat('lateRooms', '==', 0), stat('capacity', '>', 0)] }, target: 5, reward: { xp: 40, cash: 400 },
  },
  happy: { id: 'happy', label: 'Happiness 60+ for {target} days', kind: 'streak', cond: stat('happiness', '>=', 60), target: 5, reward: { xp: 40, cash: 300 } },
  learn: { id: 'learn', label: 'Learning 40+ for {target} days', kind: 'streak', cond: stat('learning', '>=', 40), target: 3, reward: { xp: 40, cash: 300 } },
  stars: { id: 'stars', label: 'Hold 3 stars for {target} days', kind: 'streak', cond: stat('stars', '>=', 3), target: 3, reward: { xp: 50, cash: 500 } },
};
export const WEEKLY_GOAL_ORDER = Object.keys(WEEKLY_GOALS);
