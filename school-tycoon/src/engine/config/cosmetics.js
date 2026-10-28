// Cosmetics (DESIGN §7). Owned in the ledger; never affect simulation or rating.
// currency: 'free' | 'apples' | 'coins' | 'achievement' | 'product'
export const COSMETIC_SLOTS = ['wall', 'floor', 'mascot', 'uniform', 'skin', 'furniture'];

export const DEFAULT_EQUIPPED = {
  wall: 'wall_default', floor: 'floor_default', mascot: 'mascot_none',
  uniform: 'uniform_navy', skin: 'skin_default', furniture: 'furniture_default',
};

const c = (id, slot, name, currency, price, extra) => ({ id, slot, name, currency, price, ...extra });

export const COSMETICS = {
  wall_default: c('wall_default', 'wall', 'Classic Cream', 'free', 0, { colors: ['#f3ead8', '#e2d6bd'] }),
  floor_default: c('floor_default', 'floor', 'Plain Linoleum', 'free', 0, { colors: ['#e9e4da', '#d9d2c3'] }),
  mascot_none: c('mascot_none', 'mascot', 'No Mascot', 'free', 0, { emoji: '' }),
  uniform_navy: c('uniform_navy', 'uniform', 'Navy Blue', 'free', 0, { colors: ['#22356f'] }),
  skin_default: c('skin_default', 'skin', 'Schoolhouse', 'free', 0, { colors: ['#c8553d', '#f2e8cf'] }),

  wall_rainbow: c('wall_rainbow', 'wall', 'Rainbow Mural', 'apples', 150, { colors: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'] }),
  wall_space: c('wall_space', 'wall', 'Space Explorer', 'apples', 200, { colors: ['#0b132b', '#3a506b', '#5bc0be'] }),
  wall_mint: c('wall_mint', 'wall', 'Mint Paint', 'coins', 800, { colors: ['#bdf2d5', '#9ee6c2'] }),
  floor_checker: c('floor_checker', 'floor', 'Checkerboard Tile', 'apples', 100, { colors: ['#ffffff', '#222222'] }),
  floor_hardwood: c('floor_hardwood', 'floor', 'Polished Hardwood', 'apples', 120, { colors: ['#b5835a', '#9c6b43'] }),
  floor_terrazzo: c('floor_terrazzo', 'floor', 'Terrazzo', 'coins', 600, { colors: ['#e8e1d9', '#c9bfb4'] }),
  mascot_hoot: c('mascot_hoot', 'mascot', 'Professor Hoot', 'apples', 300, { emoji: '🦉', product: 'starter_pack' }),
  mascot_dragon: c('mascot_dragon', 'mascot', 'Sparky the Dragon', 'apples', 400, { emoji: '🐉' }),
  mascot_robot: c('mascot_robot', 'mascot', 'Bolt the Robot', 'apples', 400, { emoji: '🤖' }),
  mascot_bear: c('mascot_bear', 'mascot', 'Bruno the Bear', 'achievement', 0, { emoji: '🐻', achievement: 'stars_5' }),
  uniform_crimson: c('uniform_crimson', 'uniform', 'Crimson', 'apples', 150, { colors: ['#9b1d20'] }),
  uniform_varsity: c('uniform_varsity', 'uniform', 'Varsity Jacket', 'apples', 250, { colors: ['#14213d', '#fca311'] }),
  uniform_forest: c('uniform_forest', 'uniform', 'Forest Green', 'achievement', 0, { colors: ['#2d6a4f'], achievement: 'reach_middle' }),
  skin_brick: c('skin_brick', 'skin', 'Red-Brick Victorian', 'apples', 500, { colors: ['#8d2c1f', '#e9d8a6'] }),
  skin_glass: c('skin_glass', 'skin', 'Glass Modern', 'apples', 500, { colors: ['#a9d6e5', '#2c7da0'] }),
  skin_founder: c('skin_founder', 'skin', "Founder's Gold", 'product', 0, { colors: ['#d4af37', '#fff3c4'], product: 'supporter_pack' }),
  // Furniture skin sets (DESIGN_V2 §2): recolor items by `skinPart`; stats never change.
  furniture_default: c('furniture_default', 'furniture', 'Classic Wood', 'free', 0, {
    colors: { desk: '#c89f73', table: '#b98b5e', stall: '#9fb7c9', shelf: '#8d6e4f', lockers: '#8fa3bf' },
  }),
  furniture_gold: c('furniture_gold', 'furniture', 'Gold Set', 'apples', 350, {
    colors: { desk: '#e2b13c', table: '#d4a017', stall: '#f1d27a', shelf: '#b8860b', lockers: '#e6be5a' },
    product: 'designer_bundle_gold',
  }),
  furniture_neon: c('furniture_neon', 'furniture', 'Neon Set', 'apples', 300, {
    colors: { desk: '#39ff14', table: '#ff2bd6', stall: '#00e5ff', shelf: '#ffea00', lockers: '#ff6f00' },
  }),
  skin_sunset: c('skin_sunset', 'skin', 'Sunset Stucco', 'achievement', 0, { colors: ['#f4a261', '#e76f51'], achievement: 'inspection_a' }),
};
