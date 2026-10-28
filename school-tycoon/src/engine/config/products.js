// IAP products (DESIGN §7). Real prices are only ever displayed from StoreService.getProducts();
// usdReference is for the "~$" hint and minutes-saved estimates only.
export const PRODUCTS = {
  apples_120: { id: 'apples_120', name: 'Basket of Apples', type: 'consumable', apples: 120, grants: [], usdReference: 0.99 },
  apples_650: { id: 'apples_650', name: 'Crate of Apples', type: 'consumable', apples: 650, grants: [], usdReference: 4.99 },
  apples_1400: { id: 'apples_1400', name: 'Barrel of Apples', type: 'consumable', apples: 1400, grants: [], usdReference: 9.99 },
  apples_3000: { id: 'apples_3000', name: 'Orchard of Apples', type: 'consumable', apples: 3000, grants: [], usdReference: 19.99 },
  starter_pack: {
    id: 'starter_pack', name: 'Starter Pack', type: 'nonconsumable', apples: 500,
    grants: ['mascot_hoot'], usdReference: 2.99, desc: '500 Apples + Professor Hoot mascot',
  },
  supporter_pack: {
    id: 'supporter_pack', name: 'Supporter Pack', type: 'nonconsumable', apples: 0,
    grants: ['skin_founder'], perks: ['gold_crest', 'double_login'], loginMultiplier: 2,
    usdReference: 4.99, desc: "Founder's Gold skin + Gold Crest + 2x daily login Apples",
  },
};
