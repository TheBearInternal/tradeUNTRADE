// Real-money purchase flow: parental gate -> confirm -> store.purchase -> applyReceipt -> save -> finish.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { actions } from '../../engine/index.js';
import { saveRoot } from '../../platform/storage.js';
import iap from '../../platform/store/index.js';
import { PRODUCT_LIST } from '../catalog.js';

const productMeta = (id) => PRODUCT_LIST.find((p) => p.id === id) || null;

export function usePurchases({ store, ready, dialogs, toast }) {
  const [products, setProducts] = useState([]);
  const [mockOutcome, setMockOutcomeState] = useState(iap.mockOutcome ?? null);
  const busy = useRef(false);
  const inFlight = useRef(new Set());

  useEffect(() => {
    let alive = true;
    iap.init()
      .then(() => iap.getProducts())
      .then((list) => alive && setProducts(list || []))
      .catch(() => alive && setProducts([]));
    return () => { alive = false; };
  }, []);

  /** Applies a receipt, persists the ledger, then finishes the transaction. Returns true if it changed state. */
  const deliver = useCallback(async (receipt, { quiet = false } = {}) => {
    if (!receipt || !receipt.txId || inFlight.current.has(receipt.txId)) return false;
    inFlight.current.add(receipt.txId);
    try {
      const before = store.getState();
      const after = store.dispatch(actions.applyReceipt(receipt));
      await saveRoot(after);
      await iap.finishTransaction(receipt.txId);
      const changed = after !== before;
      if (!quiet && changed) {
        const gained = after.ledger.apples - before.ledger.apples;
        const name = productMeta(receipt.productId)?.title || 'Your purchase';
        toast.show(`Thank you! ${name} delivered${gained > 0 ? ` (+${gained} 🍎)` : ''}.`, 'good');
      }
      return changed;
    } catch (e) {
      // Not finished, so the store will redeliver it later.
      if (!quiet) toast.show("Couldn't save your purchase yet. We'll try again automatically.", 'bad');
      return false;
    } finally {
      inFlight.current.delete(receipt.txId);
    }
  }, [store, toast]);

  // Pending, deferred and unfinished purchases arrive here and go through the same path.
  useEffect(() => {
    if (!ready) return undefined;
    return iap.onReceipt((receipt) => { deliver(receipt); });
  }, [ready, deliver]);

  const buyProduct = useCallback(async (productId) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      const root = store.getState();
      if (root.ledger.ageGate === 'under13') {
        const passed = await dialogs.parentalGate();
        if (!passed) return;
      }
      const meta = productMeta(productId);
      const after = meta && meta.apples
        ? `\nApples after purchase: 🍎 ${(root.ledger.apples + meta.apples).toLocaleString()}` : '';
      const ok = await dialogs.confirm({
        title: `Buy ${product.title}?`,
        message: `${product.description}\n\nPrice: ${product.price}\nYour Apples now: 🍎 ${root.ledger.apples}${after}`,
        confirmLabel: `Buy for ${product.price}`,
      });
      if (!ok) return;
      const res = await iap.purchase(productId);
      if (res.status === 'success' && res.receipt) await deliver(res.receipt);
      else if (res.status === 'pending') toast.show('Purchase pending approval. It will arrive automatically.', 'info');
      else if (res.status === 'cancelled') toast.show('Purchase cancelled. You were not charged.', 'info');
      else toast.show('Purchase failed. You were not charged.', 'bad');
    } catch (e) {
      toast.show('Purchase failed. You were not charged.', 'bad');
    } finally {
      busy.current = false;
    }
  }, [products, store, dialogs, toast, deliver]);

  const restorePurchases = useCallback(async () => {
    try {
      const receipts = await iap.restorePurchases();
      let restored = 0;
      for (const r of receipts || []) {
        if (await deliver(r, { quiet: true })) restored += 1;
      }
      if (!receipts || receipts.length === 0) toast.show('No purchases to restore.', 'info');
      else if (restored > 0) toast.show(`Restored ${restored} purchase${restored > 1 ? 's' : ''}.`, 'good');
      else toast.show('Everything is already restored.', 'info');
    } catch (e) {
      toast.show("Couldn't reach the store. Please try again.", 'bad');
    }
  }, [deliver, toast]);

  const setMockOutcome = useCallback((o) => {
    if (typeof iap.setMockOutcome !== 'function') return;
    iap.setMockOutcome(o);
    setMockOutcomeState(iap.mockOutcome);
  }, []);

  return useMemo(() => ({
    products,
    buyProduct,
    restorePurchases,
    mockOutcome,
    setMockOutcome,
    hasMockStore: typeof iap.setMockOutcome === 'function',
  }), [products, buyProduct, restorePurchases, mockOutcome, setMockOutcome]);
}
