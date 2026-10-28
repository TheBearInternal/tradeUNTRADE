// Toasts: a stable `show` API context and a separate list context for the renderer.
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastApi = createContext({ show: () => {} });
const ToastList = createContext([]);

const TOAST_MS = 3200;
const MAX_TOASTS = 3;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const show = useCallback((text, kind = 'info') => {
    if (!text) return;
    seq.current += 1;
    const id = seq.current;
    setToasts((list) => [...list, { id, text, kind }].slice(-MAX_TOASTS));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), TOAST_MS);
  }, []);

  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastApi.Provider value={api}>
      <ToastList.Provider value={toasts}>{children}</ToastList.Provider>
    </ToastApi.Provider>
  );
}

/** @returns {{ show(text: string, kind?: 'info'|'good'|'bad'): void }} */
export function useToast() {
  return useContext(ToastApi);
}

export function useToastList() {
  return useContext(ToastList);
}
