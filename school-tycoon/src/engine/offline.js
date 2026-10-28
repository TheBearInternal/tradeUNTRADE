// Offline progress on resume: 1 real second = 1 tick (1x speed), capped at 8 hours.
import { BALANCE } from './config/index.js';
import { reduce } from './reducer.js';
import { actions } from './actions.js';

export function simulateOffline(root, elapsedMs) {
  const ms = Math.min(Math.max(0, Number(elapsedMs) || 0), BALANCE.offlineCapMs);
  let ticks = Math.floor(ms / BALANCE.msPerTickOffline);
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
