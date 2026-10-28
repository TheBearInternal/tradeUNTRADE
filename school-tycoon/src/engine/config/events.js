// Data-driven event pack (DESIGN_V2 §3.3). Inspection and flu stay hard-coded (v1 behaviour).
// The first choice is the one auto-picked after 2 days, so it is always a sensible default.
import { stat } from './dsl.js';

export const EVENTS = {
  sports_day: {
    id: 'sports_day', name: 'Sports Day', emoji: '🏅', chance: 0.02, cooldownDays: 30, minDay: 10,
    cond: { all: [{ hasAnyRoom: ['gym', 'sportsfield'] }, stat('students', '>=', 20)] },
    text: 'The students want a Sports Day! Host one?',
    choices: [
      { id: 'host', label: 'Host it ($300): +8 happiness, +10 reputation', effects: [{ cash: -300 }, { happiness: 8 }, { rep: 10 }, { win: true }] },
      { id: 'skip', label: 'Not this year', effects: [{ happiness: -2 }] },
    ],
  },
  science_fair: {
    id: 'science_fair', name: 'Science Fair', emoji: '🧪', chance: 0.02, cooldownDays: 30, minDay: 10,
    cond: { hasAnyRoom: ['sciencelab', 'roboticslab'] },
    rewardMult: [{ cond: { hasRoom: 'roboticslab' }, mult: 2 }],
    text: 'A regional Science Fair is open for entries.',
    choices: [
      { id: 'enter', label: 'Enter ($200): +15 reputation, +30 XP, +3 learning', effects: [{ cash: -200 }, { rep: 15 }, { xp: 30 }, { learning: 3 }, { win: true }] },
      { id: 'skip', label: 'Skip it', effects: [] },
    ],
  },
  teacher_raise: {
    id: 'teacher_raise', name: 'Teacher Raise', emoji: '💼', chance: 0.01, cooldownDays: 60, minDay: 20,
    cond: stat('teachers', '>=', 2),
    text: 'Your teachers ask for a 10% raise.',
    choices: [
      { id: 'accept', label: 'Accept: salaries +10%, +5 happiness', effects: [{ teacherRaisePct: 10 }, { happiness: 5 }] },
      { id: 'decline', label: 'Decline: -8 happiness, -3 learning', effects: [{ happiness: -8 }, { learning: -3 }] },
    ],
  },
  donor_challenge: {
    id: 'donor_challenge', name: 'Donor Challenge', emoji: '🎁', chance: 0.015, cooldownDays: 30, minDay: 10,
    cond: stat('students', '>=', 10), params: 'challengeRoom',
    challengeRooms: ['cafeteria', 'playground', 'staffroom', 'garden', 'artroom', 'library', 'nurse', 'musicroom', 'gym', 'sciencelab', 'sportsfield', 'computerlab'],
    text: 'A donor offers $5000 if you build a {room} within 10 days.',
    choices: [
      { id: 'accept', label: 'Accept the challenge', effects: [{ challenge: { days: 10, reward: 5000 } }] },
      { id: 'decline', label: 'No thanks', effects: [] },
    ],
  },
  broken_plumbing: {
    id: 'broken_plumbing', name: 'Broken Plumbing', emoji: '🔧', chance: 0.01, cooldownDays: 30, minDay: 10,
    cond: stat('students', '>=', 20),
    text: 'A pipe burst in a restroom!',
    choices: [
      { id: 'repair', label: 'Emergency repair ($400)', effects: [{ cash: -400 }] },
      { id: 'wait', label: 'Wait for the plumber (restroom closed 3 days)', effects: [{ offlineRestroomDays: 3 }] },
    ],
  },
  snow_day: {
    id: 'snow_day', name: 'Snow Day', emoji: '❄️', chance: 0.01, cooldownDays: 20, minDay: 10,
    cond: stat('students', '>=', 1),
    text: 'Heavy snow overnight. Close the school for the day?',
    choices: [
      { id: 'close', label: 'Snow day! (closed 1 day, +5 happiness)', effects: [{ closeDays: 1 }, { happiness: 5 }] },
      { id: 'open', label: 'Stay open (-5 happiness, -10 cleanliness)', effects: [{ happiness: -5 }, { cleanliness: -10 }] },
    ],
  },
  concert: {
    id: 'concert', name: 'Concert', emoji: '🎵', chance: 0.02, cooldownDays: 30, minDay: 10,
    cond: { hasRoom: 'musicroom' },
    text: 'The music room is ready for a school concert.',
    choices: [
      { id: 'host', label: 'Host it: +$500 tickets, +10 reputation, +5 happiness', effects: [{ cash: 500 }, { rep: 10 }, { happiness: 5 }, { win: true }] },
      { id: 'skip', label: 'Maybe later', effects: [] },
    ],
  },
};
export const EVENT_ORDER = Object.keys(EVENTS);
