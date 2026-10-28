// AsyncStorage persistence for the engine root state.
// Keys: 'st:game', 'st:ledger', 'st:game.bak' (previous game save), 'st:savedAt' (ms epoch).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { serialize, deserialize, createInitialState } from '../engine/index.js';

export const KEYS = {
  game: 'st:game',
  ledger: 'st:ledger',
  backup: 'st:game.bak',
  savedAt: 'st:savedAt',
};

let savedAtCache = null;
let saveChain = Promise.resolve();

function newSeed() {
  return (Date.now() % 2147483647) | 0 || 12345;
}

function tryDeserialize(game, ledger) {
  try {
    return deserialize({ game, ledger });
  } catch (e) {
    return null;
  }
}

/**
 * Loads the saved root.
 * Order: main save -> game backup -> salvage ledger onto a fresh school -> fresh game.
 * @returns {Promise<{ root: object, savedAt: number|null, fresh: boolean, recovered: null|'backup'|'ledgerOnly' }>}
 */
export async function loadRoot() {
  let pairs = [];
  try {
    pairs = await AsyncStorage.multiGet([KEYS.game, KEYS.ledger, KEYS.backup, KEYS.savedAt]);
  } catch (e) {
    pairs = [];
  }
  const map = Object.fromEntries(pairs);
  const game = map[KEYS.game] ?? null;
  const ledger = map[KEYS.ledger] ?? null;
  const backup = map[KEYS.backup] ?? null;
  const savedAt = Number(map[KEYS.savedAt]) || null;
  savedAtCache = savedAt;

  if (!game && !ledger) {
    return { root: createInitialState(newSeed()), savedAt: null, fresh: true, recovered: null };
  }
  const fresh = serialize(createInitialState(newSeed()));

  if (game && ledger) {
    const root = tryDeserialize(game, ledger);
    if (root) return { root, savedAt, fresh: false, recovered: null };
  }
  if (backup) {
    const root = tryDeserialize(backup, ledger ?? fresh.ledger);
    if (root) return { root, savedAt, fresh: false, recovered: 'backup' };
  }
  if (ledger) {
    // Keep purchases and cosmetics even if the school itself can't be read.
    // game: null makes the engine start a fresh school with schoolNo = ledger.schools + 1,
    // so its weekly-goal credit keys can't collide with ones the ledger already holds.
    const root = tryDeserialize(null, ledger);
    if (root) return { root, savedAt: null, fresh: false, recovered: 'ledgerOnly' };
  }
  if (game) {
    const root = tryDeserialize(game, fresh.ledger);
    if (root) return { root, savedAt, fresh: false, recovered: null };
  }
  return { root: createInitialState(newSeed()), savedAt: null, fresh: true, recovered: null };
}

async function writeRoot(root) {
  const { game, ledger } = serialize(root);
  let previous = null;
  try {
    previous = await AsyncStorage.getItem(KEYS.game);
  } catch (e) {
    previous = null;
  }
  const now = Date.now();
  const pairs = [
    [KEYS.game, game],
    [KEYS.ledger, ledger],
    [KEYS.savedAt, String(now)],
  ];
  if (previous && previous !== game) pairs.unshift([KEYS.backup, previous]);
  await AsyncStorage.multiSet(pairs);
  savedAtCache = now;
  return now;
}

/**
 * Saves the root. Rotates the previous game save into 'st:game.bak'.
 * Saves are serialized so two writes never interleave.
 * @returns {Promise<number>} the savedAt timestamp
 */
export function saveRoot(root) {
  const run = saveChain.then(() => writeRoot(root));
  saveChain = run.catch(() => {});
  return run;
}

/** Timestamp (ms) of the last successful save or load, or null. */
export function getSavedAt() {
  return savedAtCache;
}
