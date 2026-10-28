// GameProvider: owns the external game store, loading, offline catch-up, loop, autosave,
// daily login and the purchase flow. Components read state with useGameSelector().
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { actions, simulateOffline } from '../engine/index.js';
import { loadRoot, saveRoot } from '../platform/storage.js';
import { createGameStore } from './state/gameStore.js';
import { ToastProvider, useToast } from './state/ToastContext.js';
import { DialogProvider, useDialogs } from './state/DialogContext.js';
import { useGameLoop } from './state/useGameLoop.js';
import { usePurchases } from './state/usePurchases.js';
import { localDayKey, shallowEqual } from './util.js';
import { colors, font } from './theme.js';

const StoreCtx = createContext(null);
const ControlsCtx = createContext(null);

export const SPEEDS = [0, 1, 2, 4];

/** The external store: { getState, dispatch, subscribe, replace }. */
export function useGameStore() {
  return useContext(StoreCtx);
}

/** UI controls: speed, purchases, modals state, saveNow, etc. */
export function useControls() {
  return useContext(ControlsCtx);
}

/**
 * Subscribes to a slice of the root state. Re-renders only when `isEqual(prev, next)` is false.
 * Built on React 18 useSyncExternalStore; the snapshot is cached so selectors may return new objects.
 */
export function useGameSelector(selector, isEqual = shallowEqual) {
  const store = useContext(StoreCtx);
  const cache = useRef(null);
  const getSnapshot = () => {
    const root = store.getState();
    const c = cache.current;
    if (c && c.root === root && c.selector === selector) return c.value;
    const next = selector(root);
    if (c && isEqual(c.value, next)) {
      cache.current = { root, selector, value: c.value };
      return c.value;
    }
    cache.current = { root, selector, value: next };
    return next;
  };
  return useSyncExternalStore(store.subscribe, getSnapshot);
}

export function GameProvider({ children }) {
  return (
    <ToastProvider>
      <DialogProvider>
        <GameCore>{children}</GameCore>
      </DialogProvider>
    </ToastProvider>
  );
}

function GameCore({ children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) storeRef.current = createGameStore(null);
  const store = storeRef.current;
  const toast = useToast();
  const dialogs = useDialogs();

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [offlineSummary, setOfflineSummary] = useState(null);
  const [ageScreenForced, setAgeScreenForced] = useState(false);
  const [eventSnooze, setEventSnooze] = useState(null);

  const claimLogin = useCallback(() => {
    const before = store.getState();
    if (!before) return;
    const after = store.dispatch(actions.claimDailyLogin(localDayKey()));
    const gained = after.ledger.apples - before.ledger.apples;
    if (gained > 0) toast.show(`🍎 Daily visit gift: +${gained} Apples`, 'good');
  }, [store, toast]);

  const applyOffline = useCallback((elapsedMs) => {
    if (!(elapsedMs > 1000)) return;
    const res = simulateOffline(store.getState(), elapsedMs);
    if (!res || !res.root) return;
    store.replace(res.root);
    if (res.summary && res.summary.days > 0) setOfflineSummary(res.summary);
  }, [store]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await loadRoot();
        if (!alive) return;
        store.replace(res.root);
        if (res.savedAt) applyOffline(Date.now() - res.savedAt);
        if (res.recovered === 'backup') toast.show('Your school was restored from the backup save.', 'info');
        if (res.recovered === 'ledgerOnly') toast.show("Your school save couldn't be read. Apples and items are safe.", 'bad');
        claimLogin();
        setReady(true);
      } catch (e) {
        if (alive) setLoadError(String((e && e.message) || e));
      }
    })();
    return () => { alive = false; };
    // Load exactly once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onResume = useCallback((elapsed) => {
    applyOffline(elapsed);
    claimLogin();
  }, [applyOffline, claimLogin]);

  useGameLoop({ store, ready, speed, onResume });
  const purchases = usePurchases({ store, ready, dialogs, toast });

  const saveNow = useCallback(() => saveRoot(store.getState()).catch(() => {}), [store]);
  const requestAgeChange = useCallback(async () => {
    if (await dialogs.parentalGate()) setAgeScreenForced(true);
  }, [dialogs]);
  const dismissOffline = useCallback(() => setOfflineSummary(null), []);
  const finishAgeScreen = useCallback(() => setAgeScreenForced(false), []);

  const controls = useMemo(() => ({
    speed,
    setSpeed,
    saveNow,
    offlineSummary,
    dismissOffline,
    ageScreenForced,
    finishAgeScreen,
    requestAgeChange,
    eventSnooze,
    setEventSnooze,
    ...purchases,
  }), [speed, saveNow, offlineSummary, dismissOffline, ageScreenForced, finishAgeScreen,
    requestAgeChange, eventSnooze, purchases]);

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>😕 Couldn't open your school</Text>
        <Text style={styles.sub}>{loadError}</Text>
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={styles.center}>
        <Text style={styles.logo}>🏫</Text>
        <Text style={styles.title}>School Tycoon</Text>
        <ActivityIndicator size="large" color={colors.bus} style={{ marginTop: 16 }} />
        <Text style={styles.sub}>Unlocking the front doors…</Text>
      </View>
    );
  }
  return (
    <StoreCtx.Provider value={store}>
      <ControlsCtx.Provider value={controls}>{children}</ControlsCtx.Provider>
    </StoreCtx.Provider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chalk, padding: 24,
  },
  logo: { fontSize: 64 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.paper, marginTop: 8, textAlign: 'center' },
  sub: { fontSize: font.body, color: colors.chalkLight, marginTop: 12, textAlign: 'center' },
});
