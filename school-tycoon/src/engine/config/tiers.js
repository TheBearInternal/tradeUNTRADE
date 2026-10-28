// School tiers (DESIGN §4). Earned only, never purchasable.
export const TIERS = {
  1: { tier: 1, id: 'elementary', name: 'Elementary School', size: 16, tuitionBase: 10, requirements: null },
  2: {
    tier: 2, id: 'middle', name: 'Middle School', size: 20, tuitionBase: 15,
    requirements: { stars: 3, students: 60, reputation: 150, inspection: null },
  },
  3: {
    tier: 3, id: 'high', name: 'High School', size: 24, tuitionBase: 22,
    requirements: { stars: 4, students: 120, reputation: 400, inspection: 'B' },
  },
};
