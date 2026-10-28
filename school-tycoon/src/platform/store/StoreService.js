/**
 * StoreService — the in-app purchase interface the UI codes against.
 *
 * A real implementation (StoreKit / Play Billing) and MockStore both extend this class.
 * Rules the UI relies on:
 *  - Prices are only ever displayed from getProducts() (already localized).
 *  - Every receipt carries a unique txId. The UI dispatches the engine's applyReceipt,
 *    persists the ledger, and only then calls finishTransaction(txId).
 *  - Pending / deferred purchases (e.g. "Ask to Buy") arrive later through onReceipt.
 *
 * @typedef {{ id: string, title: string, description: string, price: string }} Product
 * @typedef {{ txId: string, productId: string }} Receipt
 * @typedef {'success'|'cancelled'|'failed'|'pending'} PurchaseStatus
 * @typedef {{ status: PurchaseStatus, receipt?: Receipt, error?: string }} PurchaseResult
 */
export class StoreService {
  /**
   * Connects to the store. Safe to call more than once.
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error('StoreService.init not implemented');
  }

  /**
   * Lists purchasable products with localized price strings.
   * @returns {Promise<Product[]>}
   */
  async getProducts() {
    throw new Error('StoreService.getProducts not implemented');
  }

  /**
   * Starts a purchase. Resolves when the store UI closes.
   * 'pending' means the receipt will arrive later via onReceipt.
   * @param {string} productId
   * @returns {Promise<PurchaseResult>}
   */
  async purchase(productId) {
    throw new Error('StoreService.purchase not implemented');
  }

  /**
   * Returns receipts for non-consumables the user owns (original txIds, so re-applying is a no-op).
   * @returns {Promise<Receipt[]>}
   */
  async restorePurchases() {
    throw new Error('StoreService.restorePurchases not implemented');
  }

  /**
   * Acknowledges a delivered receipt. Call only after the ledger has been saved.
   * @param {string} txId
   * @returns {Promise<void>}
   */
  async finishTransaction(txId) {
    throw new Error('StoreService.finishTransaction not implemented');
  }

  /**
   * Subscribes to receipts delivered outside purchase() (pending, deferred, unfinished).
   * @param {(receipt: Receipt) => void} cb
   * @returns {() => void} unsubscribe
   */
  onReceipt(cb) {
    throw new Error('StoreService.onReceipt not implemented');
  }
}
