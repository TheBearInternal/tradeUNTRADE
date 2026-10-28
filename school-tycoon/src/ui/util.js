// Small pure helpers shared by UI components (no React imports).

/** Formats integer dollars: 1234 -> "$1,234", -50 -> "-$50". */
export function formatMoney(n) {
  const v = Math.round(Number(n) || 0);
  const abs = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return v < 0 ? `-$${abs}` : `$${abs}`;
}

/** Signed money: "+$120" / "-$40". */
export function formatSignedMoney(n) {
  const v = Math.round(Number(n) || 0);
  return v >= 0 ? `+${formatMoney(v)}` : formatMoney(v);
}

/** Device-local calendar date as 'YYYY-MM-DD'. */
export function localDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 0..99 in English words, e.g. 47 -> "forty-seven". */
export function numberToWords(n) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  return n % 10 === 0 ? t : `${t}-${ONES[n % 10]}`;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Shallow equality for primitives, arrays and plain objects. */
export function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k])) return false;
  }
  return true;
}

/** Structural equality for small JSON-like values (selector results). */
export function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k) || !deepEqual(a[k], b[k])) return false;
  }
  return true;
}

/** Turns a config collection (array, or object keyed by id) into an array with ids. */
export function toList(coll) {
  if (!coll) return [];
  if (Array.isArray(coll)) return coll.filter(Boolean);
  return Object.keys(coll).map((id) => {
    const v = coll[id];
    return v && typeof v === 'object' ? { id, ...v } : null;
  }).filter(Boolean);
}

export function pct(v) {
  return `${Math.round((Number(v) || 0) * 100)}%`;
}
