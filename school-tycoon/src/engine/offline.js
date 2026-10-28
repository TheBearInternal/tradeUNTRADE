// Offline progress on resume: BALANCE.offlineTicksPerMinute ticks per whole real minute away,
// capped at BALANCE.offlineMaxTicks (72 ticks = 3 game days). Negative / clock-back -> nothing.
import { BALANCE } from './config/index.js';
import { reduce } from './reducer.js';
import { actions } from './actions.js';

export function offlineTicksFor(elapsedMs) {
  const ms = Math.max(0, Number(elapsedMs) || 0);
  return Math.min(Math.floor(ms / 60000) * BALANCE.offlineTicksPerMinute, BALANCE.offlineMaxTicks);
}

export function simulateOffline(root, elapsedMs) {
  let ticks = offlineTicksFor(elapsedMs);
  const start = root;
  let r = root;
  while (ticks > 0) {
    const n = Math.min(ticks, BALANCE.maxTickBatch);
    r = reduce(r, actions.tick(n));
    ticks -= n;
  }
  return {
    root: r,
    summary: {
      days: r.game.day - start.game.day,
      cashDelta: r.game.cash - start.game.cash,
      studentsDelta: r.game.students - start.game.students,
    },
  };
}
