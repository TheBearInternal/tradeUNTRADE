// MockStore — a StoreService that simulates a payment provider. No real money moves.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoreService } from './StoreService.js';
import { productCatalog, formatUsd } from './products.js';

/** Persisted "server side" record of non-consumable purchases, so Restore works. */
const OWNED_KEY = 'st:mock:owned';
const PENDING_DELAY_MS = 3000;
const STORE_UI_DELAY_MS = 500;

export const MOCK_OUTCOMES = ['success', 'cancel', 'fail', 'pending'];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class MockStore extends StoreService {
  constructor() {
    super();
    /** 'success' | 'cancel' | 'fail' | 'pending' — settable from the Settings panel. */
    this.mockOutcome = 'success';
    this._catalog = productCatalog();
    this._listeners = new Set();
    this._unfinished = new Map(); // txId -> receipt (delivered but not finished)
    this._owned = {}; // productId -> receipt (non-consumables)
    this._seq = 0;
    this._ready = null;
  }

  setMockOutcome(outcome) {
    if (MOCK_OUTCOMES.includes(outcome)) this.mockOutcome = outcome;
  }

  init() {
    if (!this._ready) {
      this._ready = AsyncStorage.getItem(OWNED_KEY)
        .then((raw) => {
          const parsed = raw ? JSON.parse(raw) : null;
          if (parsed && typeof parsed === 'object') this._owned = parsed;
        })
        .catch(() => {});
    }
    return this._ready;
  }

  async getProducts() {
    await this.init();
    return this._catalog.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price: formatUsd(p.usd),
    }));
  }

  _newTxId() {
    this._seq += 1;
    const rand = Math.floor(Math.random() * 1e9).toString(36);
    return `mock_${Date.now().toString(36)}_${this._seq}_${rand}`;
  }

  async _createReceipt(product) {
    const receipt = { txId: this._newTxId(), productId: product.id };
    if (!product.consumable) {
      this._owned[product.id] = receipt;
      await AsyncStorage.setItem(OWNED_KEY, JSON.stringify(this._owned)).catch(() => {});
    }
    this._unfinished.set(receipt.txId, receipt);
    return receipt;
  }

  _emit(receipt) {
    this._listeners.forEach((cb) => {
      try {
        cb(receipt);
      } catch (e) {
        // listener errors must not break the store
      }
    });
  }

  async purchase(productId) {
    await this.init();
    const product = this._catalog.find((p) => p.id === productId);
    if (!product) return { status: 'failed', error: 'unknown_product' };
    await wait(STORE_UI_DELAY_MS);

    if (!product.consumable && this._owned[productId]) {
      // Already owned: hand back the original receipt (applying it again is a no-op).
      return { status: 'success', receipt: this._owned[productId] };
    }
    switch (this.mockOutcome) {
      case 'cancel':
        return { status: 'cancelled' };
      case 'fail':
        return { status: 'failed', error: 'mock_failure' };
      case 'pending':
        setTimeout(async () => {
          const receipt = await this._createReceipt(product);
          this._emit(receipt);
        }, PENDING_DELAY_MS);
        return { status: 'pending' };
      default: {
        const receipt = await this._createReceipt(product);
        return { status: 'success', receipt };
      }
    }
  }

  async restorePurchases() {
    await this.init();
    await wait(STORE_UI_DELAY_MS);
    return Object.values(this._owned);
  }

  async finishTransaction(txId) {
    this._unfinished.delete(txId);
  }

  onReceipt(cb) {
    this._listeners.add(cb);
    // Like a real store, redeliver anything not yet finished to a new listener.
    const backlog = Array.from(this._unfinished.values());
    if (backlog.length) {
      setTimeout(() => backlog.forEach((r) => this._listeners.has(cb) && cb(r)), 0);
    }
    return () => this._listeners.delete(cb);
  }
}
