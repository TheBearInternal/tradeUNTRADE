// XP / levels and achievements.
import { ACHIEVEMENTS, BALANCE, MAX_LEVEL } from './config/index.js';
import { credit } from './ledger.js';
import { xpForLevel } from './model.js';
import { computeStaffing } from './derived.js';
import { pushLog } from './util.js';

export function levelForXp(xp) {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= xpForLevel(lvl + 1)) lvl++;
  return lvl;
}

// g is a mutable copy. Returns the (possibly new) ledger.
export function addXp(g, ledger, amount) {
  const amt = Math.max(0, Math.round(amount));
  if (!amt) return ledger;
  g.xp += amt;
  let L = ledger;
  const lvl = levelForXp(g.xp);
  while (g.level < lvl) {
    g.level += 1;
    L = credit(L, `lvl:${g.level}`, BALANCE.applesPerLevel);
    pushLog(g, `Level up! You are now level ${g.level} (+${BALANCE.applesPerLevel} 🍎).`, 'good', BALANCE.logSize);
  }
  return L;
}

function hasRoomType(g, type) {
  for (const id in g.rooms) if (g.rooms[id].type === type) return true;
  return false;
}

export const ACHIEVEMENT_CHECKS = {
  first_classroom: (g) => hasRoomType(g, 'classroom'),
  students_25: (g) => g.students >= 25,
  students_100: (g) => g.students >= 100,
  first_hire: (g) => Object.keys(g.staff).length > 0,
  stars_3: (g) => g.stars >= 3,
  stars_5: (g) => g.stars >= 5,
  inspection_a: (g) => g.lastInspectionGrade === 'A',
  reach_middle: (g) => g.tier >= 2,
  reach_high: (g) => g.tier >= 3,
  spotless: (g) => g.cleanliness >= 100 && g.students >= BALANCE.spotlessMinStudents,
  happy_school: (g) => g.happiness >= 85,
  full_house: (g) => {
    const cap = computeStaffing(g).capacity;
    return cap >= 60 && g.students === cap;
  },
};

// Returns the same objects when nothing new is achieved.
export function checkAchievements(game, ledger) {
  let g = null;
  let L = ledger;
  for (const id in ACHIEVEMENTS) {
    if (game.achievements[id]) continue;
    const check = ACHIEVEMENT_CHECKS[id];
    if (!check || !check(game)) continue;
    if (!g) g = { ...game, achievements: { ...game.achievements } };
    g.achievements[id] = true;
    const a = ACHIEVEMENTS[id];
    const before = L;
    L = credit(L, `ach:${id}`, a.apples, a.cosmetic ? [a.cosmetic] : null);
    const reward = L !== before ? ` (+${a.apples} 🍎)` : '';
    pushLog(g, `Achievement: ${a.name}${reward}`, 'good', BALANCE.logSize);
  }
  return g ? { game: g, ledger: L } : { game, ledger };
}

