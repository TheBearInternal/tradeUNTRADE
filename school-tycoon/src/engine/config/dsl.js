// Whitelisted conditions / effects DSL shared by events, scenarios and weekly goals.
//
// Condition (one of):
//   { stat, op, value }        stat in COND_STATS, op in COND_OPS, value number
//   { hasRoom: type }          at least one connected room of that type
//   { hasAnyRoom: [types] }
//   { roomCount: type, min }   at least `min` connected rooms of that type
//   { all: [cond] } | { any: [cond] } | { not: cond }
// Effect (exactly one key each):
//   { cash: n } { rep: n } { happiness: n } { learning: n } { cleanliness: n } { xp: n }
//   { closeDays: n }            school closed for n days (no tuition)
//   { offlineRestroomDays: n }  one restroom stops working for n days
//   { teacherRaisePct: n }      every teacher's salary rises by n percent (rounded)
//   { challenge: { days, reward } }  build the event's `room` param within `days` -> +$reward (a win)
//   { win: true }               counts as a won event (Trophy Case: +15 rep)
export const COND_STATS = [
  'students', 'cash', 'reputation', 'happiness', 'learning', 'cleanliness', 'stars', 'day', 'tier',
  'level', 'teachers', 'staff', 'capacity', 'xp', 'lateRooms',
];
export const COND_OPS = ['>=', '>', '<=', '<', '=='];
export const EFFECT_KEYS = [
  'cash', 'rep', 'happiness', 'learning', 'cleanliness', 'xp', 'closeDays', 'offlineRestroomDays',
  'teacherRaisePct', 'challenge', 'win',
];

export const stat = (s, op, value) => ({ stat: s, op, value });
