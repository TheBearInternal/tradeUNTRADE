// The app-wide StoreService instance. Swap MockStore for a real billing adapter later.
import { MockStore } from './MockStore.js';

export { StoreService } from './StoreService.js';
export { MOCK_OUTCOMES } from './MockStore.js';

export const store = new MockStore();
export default store;
