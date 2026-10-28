// Game loop, debounced autosave and AppState handling.
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { actions } from '../../engine/index.js';
import { saveRoot } from '../../platform/storage.js';

const TICK_MS = 1000;
const AUTOSAVE_MIN_GAP_MS = 5000;
const RESUME_MIN_MS = 2000;

/**
 * @param {{ store, ready: boolean, speed: 0|1|2|4, onResume: (elapsedMs: number) => void }} p
 */
export function useGameLoop({ store, ready, speed, onResume }) {
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const resumeRef = useRef(onResume);
  resumeRef.current = onResume;

  // 1. Tick loop: one tick(speed) per real second, unless paused/backgrounded/age gate pending.
  useEffect(() => {
    if (!ready || !foreground || !speed) return undefined;
    const id = setInterval(() => {
      const root = store.getState();
      if (!root || !root.ledger.ageGate) return;
      store.dispatch(actions.tick(speed));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [store, ready, foreground, speed]);

  // 2. Autosave: when game.day (or the ledger) changes, at most once per 5 s.
  useEffect(() => {
    if (!ready) return undefined;
    const start = store.getState();
    let lastDay = start.game.day;
    let lastLedger = start.ledger;
    let lastSaveAt = Date.now();
    let timer = null;
    const flush = () => {
      timer = null;
      lastSaveAt = Date.now();
      saveRoot(store.getState()).catch(() => {});
    };
    const unsub = store.subscribe(() => {
      const root = store.getState();
      if (root.game.day === lastDay && root.ledger === lastLedger) return;
      lastDay = root.game.day;
      lastLedger = root.ledger;
      if (timer) return;
      timer = setTimeout(flush, Math.max(0, AUTOSAVE_MIN_GAP_MS - (Date.now() - lastSaveAt)));
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [store, ready]);

  // 3. Background: pause + save. Foreground: offline catch-up via onResume.
  useEffect(() => {
    if (!ready) return undefined;
    let backgroundAt = null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        if (backgroundAt == null) backgroundAt = Date.now();
        setForeground(false);
        saveRoot(store.getState()).catch(() => {});
      } else if (state === 'active') {
        if (backgroundAt != null) {
          const elapsed = Date.now() - backgroundAt;
          backgroundAt = null;
          if (elapsed >= RESUME_MIN_MS) resumeRef.current(elapsed);
        }
        setForeground(true);
      }
    });
    return () => sub.remove();
  }, [store, ready]);
}
