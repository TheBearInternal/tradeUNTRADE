// Normalizes the engine PRODUCTS config into a flat, predictable list.
import { PRODUCTS } from '../../engine/index.js';

function list(coll) {
  if (!coll) return [];
  if (Array.isArray(coll)) return coll.filter(Boolean);
  return Object.keys(coll).map((id) => ({ id, ...coll[id] }));
}

function titleFromId(id) {
  const m = /^apples_(\d+)$/.exec(id);
  if (m) return `${m[1].replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Apples`;
  return id.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function isConsumableType(p) {
  const t = String(p.type || '').toLowerCase().replace(/[^a-z]/g, '');
  if (t === 'consumable') return true;
  if (t.startsWith('non')) return false;
  return /^apples_/.test(p.id);
}

function describe(p) {
  if (p.description || p.desc) return p.description || p.desc;
  const parts = [];
  if (p.apples) parts.push(`${p.apples} 🍎`);
  const grants = Array.isArray(p.grants) ? p.grants : p.grants ? Object.keys(p.grants) : [];
  if (grants.length) parts.push(`plus ${grants.length} bonus item${grants.length > 1 ? 's' : ''}`);
  return parts.join(' ') || 'Bonus items';
}

/**
 * @returns {{id:string,title:string,description:string,usd:number,consumable:boolean,apples:number,grants:any}[]}
 */
export function productCatalog() {
  return list(PRODUCTS).map((p) => ({
    id: p.id,
    title: p.title || p.name || titleFromId(p.id),
    description: describe(p),
    usd: Number(p.usdReference ?? p.usd ?? p.price ?? 0),
    consumable: isConsumableType(p),
    apples: Number(p.apples || 0),
    grants: p.grants || null,
  }));
}

/** Localized price string for a USD amount; falls back if Intl is unavailable. */
export function formatUsd(usd) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(usd);
  } catch (e) {
    return `$${Number(usd).toFixed(2)}`;
  }
}
