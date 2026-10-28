// Promise-based dialogs (confirm / alert / parental gate), rendered by ModalHost.
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const DialogApi = createContext(null);
const DialogState = createContext({ current: null, close: () => {} });

export function DialogProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const queueRef = useRef([]);
  const seq = useRef(0);

  const setBoth = (next) => {
    queueRef.current = next;
    setQueue(next);
  };

  const open = useCallback((dialog) => new Promise((resolve) => {
    seq.current += 1;
    setBoth([...queueRef.current, { ...dialog, id: seq.current, resolve }]);
  }), []);

  const close = useCallback((id, value) => {
    const d = queueRef.current.find((x) => x.id === id);
    if (!d) return;
    setBoth(queueRef.current.filter((x) => x.id !== id));
    d.resolve(value);
  }, []);

  const api = useMemo(() => ({
    /** @returns {Promise<boolean>} */
    confirm: (opts) => open({ kind: 'confirm', ...opts }),
    /** @returns {Promise<void>} */
    alert: (opts) => open({ kind: 'alert', ...opts }),
    /** Grown-up check: type a number shown in words. @returns {Promise<boolean>} */
    parentalGate: () => open({ kind: 'parental' }),
  }), [open]);

  const state = useMemo(() => ({ current: queue[0] || null, close }), [queue, close]);

  return (
    <DialogApi.Provider value={api}>
      <DialogState.Provider value={state}>{children}</DialogState.Provider>
    </DialogApi.Provider>
  );
}

/** @returns {{ confirm(o): Promise<boolean>, alert(o): Promise<void>, parentalGate(): Promise<boolean> }} */
export function useDialogs() {
  return useContext(DialogApi);
}

export function useDialogState() {
  return useContext(DialogState);
}
