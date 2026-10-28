// Premium-currency ledger. Every credit carries a unique key; duplicate keys are no-ops.
import { PRODUCTS, COSMETICS, BALANCE, DEFAULT_EQUIPPED } from './config/index.js';
import { own } from './util.js';

export const LEDGER_VERSION = 2;

export function createInitialLedger() {
  return {
    version: LEDGER_VERSION,
    apples: 0,
    credited: {},
    owned: {},
    equipped: { ...DEFAULT_EQUIPPED },
    login: { lastDayKey: null, streakIndex: 0 },
    ageGate: null,
    medals: {},
    schools: 1,
  };
}

// Idempotent credit. Returns the same ledger object if `key` was already credited.
export function credit(ledger, key, amount, grants) {
  if (typeof key !== 'string' || !key || ledger.credited[key]) return ledger;
  const amt = Math.max(0, Math.round(Number(amount) || 0));
  const next = { ...ledger, apples: ledger.apples + amt, credited: { ...ledger.credited, [key]: true } };
  if (grants && grants.length) {
    const owned = { ...ledger.owned };
    for (const g of grants) owned[g] = true;
    next.owned = owned;
  }
  return next;
}

// Returns a new ledger or null when the balance is insufficient.
export function debit(ledger, amount) {
  const amt = Math.round(amount);
  if (!(amt >= 0) || ledger.apples < amt) return null;
  return { ...ledger, apples: ledger.apples - amt };
}

// receipt: { txId, productId }. Idempotent by txId; a non-consumable is granted at most once.
export function applyReceipt(ledger, receipt) {
  if (!receipt || typeof receipt !== 'object') return ledger;
  const { txId, productId } = receipt;
  const product = own(PRODUCTS, productId) ? PRODUCTS[productId] : null;
  if (!product || (typeof txId !== 'string' && typeof txId !== 'number') || txId === '') return ledger;
  const key = `tx:${txId}`;
  if (ledger.credited[key]) return ledger;
  if (product.type === 'nonconsumable' && ledger.owned[productId]) return ledger;
  const grants = product.type === 'nonconsumable' ? [productId, ...product.grants] : product.grants;
  return credit(ledger, key, product.apples, grants);
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function loginReward(ledger, dayKey) {
  const cycle = BALANCE.loginCycle;
  const streakIndex = ledger.login.streakIndex % cycle.length;
  const mult = ledger.owned.supporter_pack ? (PRODUCTS.supporter_pack.loginMultiplier || 2) : 1;
  const amount = cycle[streakIndex] * mult;
  const last = ledger.login.lastDayKey;
  const claimable = typeof dayKey === 'string' && DAY_KEY.test(dayKey)
    && !ledger.credited[`login:${dayKey}`] && (last === null || dayKey > last);
  return { claimable, amount, streakIndex };
}

// Missed days pause the streak (index simply continues); it never resets.
export function claimLogin(ledger, dayKey) {
  const r = loginReward(ledger, dayKey);
  if (!r.claimable) return ledger;
  const next = credit(ledger, `login:${dayKey}`, r.amount);
  return {
    ...next,
    login: { lastDayKey: dayKey, streakIndex: (r.streakIndex + 1) % BALANCE.loginCycle.length },
  };
}

export function isOwned(ledger, cosmeticId) {
  const c = COSMETICS[cosmeticId];
  return !!c && (c.currency === 'free' || !!ledger.owned[cosmeticId]);
}
