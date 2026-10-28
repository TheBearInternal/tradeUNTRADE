// External store around the pure engine reducer, consumed via useSyncExternalStore.
import { reduce } from '../../engine/index.js';

/**
 * @param {object|null} initialRoot
 * @returns {{ getState(): object, dispatch(action): object, replace(root): void, subscribe(fn): () => void }}
 */
export function createGameStore(initialRoot = null) {
  let root = initialRoot;
  const listeners = new Set();

  const notify = () => listeners.forEach((l) => l());

  return {
    getState: () => root,
    /** Applies an engine action. Returns the new root (identity if the action was a no-op). */
    dispatch(action) {
      if (!root || !action) return root;
      let next = root;
      try {
        next = reduce(root, action);
      } catch (e) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('reduce threw', action && action.type, e);
        next = root;
      }
      if (next && next !== root) {
        root = next;
        notify();
      }
      return root;
    },
    /** Replaces the whole root (after load / offline simulation). */
    replace(next) {
      if (next === root) return;
      root = next;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
