// Interior furniture (DESIGN_V2 §2). Stat furniture costs Coins (never Apples).
// Fields: { id, name, emoji, w, h, cost, tier, level, rooms, color, seats?, stalls?, required?,
//           wall?, shelf?, skinPart?, stats: { F?, Cf?, Hy?, rep? }, clean? }
//  - F (focus) -> learning in seat rooms / library bonus; Cf (comfort) -> happiness;
//    Hy (hygiene) -> school-wide dirt rate; rep -> reputation/day (school cap +3).
//  - clean: cleanliness change per day (negative = makes a mess).
//  - wall: must touch the back walls (top row cy = 0 or left column cx = 0).
//  - Items with seats / stalls / required / shelf only count when reachable from the door.
const SEAT = ['classroom', 'sciencelab', 'computerlab', 'artroom', 'musicroom', 'workshop', 'roboticslab'];

const it = (id, name, emoji, w, h, cost, rooms, color, extra) => ({
  id, name, emoji, w, h, cost, tier: 1, level: 1, rooms, color, stats: {}, ...extra,
});

const LIST = [
  // shared seat-room items
  it('teacher_desk', "Teacher's Desk", '🧑‍🏫', 2, 1, 0, SEAT, '#a47148', { required: true, skinPart: 'desk' }),
  it('chalkboard', 'Chalkboard', '🟩', 3, 1, 0, SEAT, '#2f5d50', { wall: true }),
  it('smartboard', 'Smartboard', '🖥️', 3, 1, 900, SEAT, '#3a86ff', { wall: true, tier: 2, level: 6, stats: { F: 10 } }),
  // classroom
  it('desk_pair', 'Desk Pair', '🪑', 2, 1, 0, ['classroom'], '#c89f73', { seats: 2, skinPart: 'desk' }),
  it('ergo_desk', 'Ergonomic Desk Pair', '💺', 2, 1, 120, ['classroom'], '#d9b48f', { seats: 2, level: 3, skinPart: 'desk', stats: { F: 1, Cf: 1 } }),
  it('bookshelf', 'Bookshelf', '📚', 1, 2, 150, ['classroom'], '#8d6e4f', { skinPart: 'shelf', stats: { F: 4 } }),
  it('beanbag', 'Beanbag Corner', '🛋️', 2, 2, 250, ['classroom', 'library'], '#ff9f1c', { level: 2, stats: { Cf: 5 } }),
  it('pet_tank', 'Class Pet Tank', '🐠', 1, 1, 200, ['classroom'], '#4cc9f0', { level: 2, clean: -1, stats: { Cf: 4 } }),
  it('globe', 'Globe', '🌍', 1, 1, 80, ['classroom', 'library'], '#2a9d8f', { stats: { F: 1, Cf: 1 } }),
  // cafeteria
  it('serving_counter', 'Serving Counter', '🍲', 3, 1, 0, ['cafeteria'], '#adb5bd', { required: true }),
  it('lunch_table', 'Lunch Table', '🍽️', 3, 2, 0, ['cafeteria'], '#b98b5e', { seats: 10, skinPart: 'table' }),
  it('trash_bin', 'Trash Bin', '🗑️', 1, 1, 0, ['cafeteria', 'restroom', 'classroom'], '#6c757d', { stats: { Hy: 2 } }),
  it('round_table', 'Round Table', '⭕', 2, 2, 180, ['cafeteria'], '#c9a26b', { seats: 6, level: 2, skinPart: 'table', stats: { Cf: 2 } }),
  it('recycling', 'Recycling Station', '♻️', 2, 1, 250, ['cafeteria'], '#52b788', { level: 3, stats: { Hy: 5 } }),
  it('salad_bar', 'Salad Bar', '🥗', 2, 1, 600, ['cafeteria'], '#95d5b2', { level: 4, stats: { Cf: 6 } }),
  it('pizza_oven', 'Pizza Oven', '🍕', 2, 2, 1200, ['cafeteria'], '#e76f51', { level: 6, stats: { Cf: 12 } }),
  // restroom
  it('stall', 'Stall', '🚪', 1, 2, 0, ['restroom'], '#9fb7c9', { stalls: 1, skinPart: 'stall' }),
  it('sink', 'Sink', '🚰', 1, 1, 0, ['restroom'], '#e0fbfc', { required: true }),
  it('mirror', 'Mirror', '🪞', 1, 1, 0, ['restroom'], '#caf0f8', { wall: true, stats: { Cf: 1 } }),
  it('air_freshener', 'Air Freshener', '🌸', 1, 1, 60, ['restroom'], '#ffafcc', { wall: true, stats: { Cf: 2 } }),
  it('hand_dryer', 'Hand Dryer', '💨', 1, 1, 100, ['restroom'], '#ced4da', { wall: true, level: 2, stats: { Hy: 3 } }),
  it('touchless', 'Touchless Fixtures', '✋', 1, 1, 400, ['restroom'], '#90e0ef', { level: 4, stats: { Hy: 6 } }),
  // library
  it('shelf', 'Shelf', '📕', 1, 2, 0, ['library'], '#8d6e4f', { shelf: true, skinPart: 'shelf' }),
  it('reading_table', 'Reading Table', '📖', 2, 2, 0, ['library'], '#b98b5e', { skinPart: 'table' }),
  it('carrels', 'Study Carrels', '🗂️', 2, 1, 250, ['library'], '#a98467', { tier: 2, stats: { F: 4 } }),
  it('reading_nook', 'Reading Nook', '🛋️', 2, 2, 300, ['library'], '#f4a261', { tier: 2, stats: { Cf: 5 } }),
  it('rare_books', 'Rare Book Case', '📜', 1, 2, 700, ['library'], '#6f1d1b', { tier: 2, level: 8, stats: { F: 8 } }),
  // science lab
  it('lab_bench', 'Lab Bench', '🧪', 3, 1, 0, ['sciencelab'], '#dee2e6', { seats: 3, skinPart: 'desk' }),
  it('microscopes', 'Microscope Set', '🔬', 1, 1, 300, ['sciencelab'], '#577590', { tier: 2, stats: { F: 3 } }),
  it('fume_hood', 'Fume Hood', '🌬️', 1, 1, 500, ['sciencelab'], '#adb5bd', { tier: 2, wall: true, stats: { F: 5, Hy: 1 } }),
  it('safety_station', 'Safety Station', '🦺', 1, 1, 150, ['sciencelab', 'workshop', 'roboticslab'], '#ffb703', { tier: 2, stats: { Hy: 2 } }),
  // computer lab
  it('computer_desk', 'Computer Desk', '💻', 2, 1, 0, ['computerlab'], '#c89f73', { seats: 2, skinPart: 'desk' }),
  it('server_rack', 'Server Rack', '🗄️', 1, 2, 1500, ['computerlab', 'roboticslab'], '#343a40', { tier: 3, stats: { F: 8 } }),
  it('gaming_chairs', 'Comfy Chairs', '🪑', 2, 1, 400, ['computerlab'], '#e63946', { tier: 3, stats: { Cf: 4 } }),
  // art room
  it('easel_table', 'Easel Table', '🖌️', 3, 1, 0, ['artroom'], '#e9c46a', { seats: 3, skinPart: 'table' }),
  it('kiln', 'Pottery Kiln', '🏺', 2, 2, 800, ['artroom'], '#bc6c25', { level: 6, stats: { F: 3, Cf: 4 } }),
  it('gallery_wall', 'Gallery Wall', '🖼️', 3, 1, 300, ['artroom', 'office'], '#ffcad4', { wall: true, level: 5, stats: { Cf: 4 } }),
  // music room
  it('music_row', 'Music Stand Row', '🎼', 3, 1, 0, ['musicroom'], '#cdb4db', { seats: 3, skinPart: 'desk' }),
  it('piano', 'Grand Piano', '🎹', 2, 2, 1200, ['musicroom'], '#212529', { tier: 2, level: 8, stats: { F: 4, Cf: 6 } }),
  it('drum_kit', 'Drum Kit', '🥁', 2, 2, 600, ['musicroom'], '#d62828', { tier: 2, stats: { Cf: 5 } }),
  // workshop
  it('workbench', 'Workbench', '🪚', 3, 1, 0, ['workshop'], '#a47148', { seats: 3, skinPart: 'desk' }),
  it('tool_wall', 'Tool Wall', '🧰', 3, 1, 500, ['workshop'], '#6c757d', { tier: 3, wall: true, stats: { F: 5 } }),
  it('lathe', 'Lathe', '⚙️', 2, 2, 1200, ['workshop'], '#495057', { tier: 3, level: 14, stats: { F: 7 } }),
  // robotics lab
  it('robot_bench', 'Robot Bench', '🦾', 3, 1, 0, ['roboticslab'], '#adb5bd', { seats: 3, skinPart: 'desk' }),
  it('printer_3d', '3D Printer', '🖨️', 1, 1, 1500, ['roboticslab'], '#4361ee', { tier: 3, stats: { F: 8 } }),
  it('robot_arena', 'Robot Arena', '🏟️', 3, 3, 2500, ['roboticslab'], '#7209b7', { tier: 3, level: 18, stats: { F: 6, Cf: 6 } }),
  // staff room
  it('staff_table', 'Staff Table', '☕', 2, 2, 0, ['staffroom'], '#b98b5e', { skinPart: 'table' }),
  it('coffee_machine', 'Coffee Machine', '☕', 1, 1, 200, ['staffroom'], '#6f4e37', { level: 4, stats: { Cf: 4 } }),
  it('massage_chair', 'Massage Chair', '💆', 1, 1, 600, ['staffroom'], '#9d4edd', { level: 7, stats: { Cf: 8 } }),
  // nurse
  it('cot', 'Cot', '🛏️', 1, 2, 0, ['nurse'], '#f8f9fa', {}),
  it('med_cabinet', 'Medicine Cabinet', '💊', 1, 1, 300, ['nurse'], '#e5383b', { tier: 2, wall: true, stats: { Hy: 4 } }),
  // gym
  it('hoop', 'Basketball Hoop', '🏀', 1, 1, 0, ['gym'], '#f77f00', { wall: true }),
  it('bleachers', 'Bleachers', '🏟️', 3, 1, 800, ['gym'], '#adb5bd', { tier: 2, stats: { Cf: 5 } }),
  it('team_banner', 'Team Banner', '🚩', 2, 1, 1000, ['gym', 'sportsfield'], '#d00000', { tier: 2, wall: true, stats: { rep: 1 } }),
  // auditorium
  it('stage', 'Stage', '🎭', 3, 2, 0, ['auditorium'], '#7f5539', {}),
  it('spotlight', 'Spotlight', '🔦', 1, 1, 700, ['auditorium'], '#ffd60a', { tier: 3, stats: { rep: 1 } }),
  it('velvet_seats', 'Velvet Seats', '🎟️', 3, 1, 900, ['auditorium'], '#9d0208', { tier: 3, stats: { Cf: 5 } }),
  // counselor
  it('sofa', 'Sofa', '🛋️', 2, 1, 0, ['counselor'], '#84a59d', {}),
  it('aquarium', 'Aquarium', '🐟', 2, 1, 500, ['counselor', 'office'], '#00b4d8', { tier: 2, clean: -1, stats: { Cf: 6 } }),
  // office
  it('reception_desk', 'Reception Desk', '🛎️', 3, 1, 0, ['office'], '#a47148', { skinPart: 'desk' }),
  it('trophy_shelf', 'Trophy Shelf', '🥇', 1, 2, 800, ['office'], '#e9c46a', { level: 5, stats: { rep: 1 } }),
  it('portrait', "Founder's Portrait", '🖼️', 1, 1, 400, ['office'], '#bc6c25', { wall: true, level: 3, stats: { Cf: 2 } }),
  // outdoor & misc
  it('slide', 'Slide', '🛝', 2, 2, 0, ['playground'], '#ff595e', {}),
  it('swings', 'Swing Set', '🎠', 3, 1, 400, ['playground'], '#1982c4', { level: 3, stats: { Cf: 5 } }),
  it('flower_bed', 'Flower Bed', '🌷', 2, 1, 0, ['garden'], '#ff8fab', {}),
  it('fountain', 'Fountain', '⛲', 2, 2, 900, ['garden'], '#90e0ef', { level: 5, stats: { Cf: 6 } }),
  it('vending_machine', 'Vending Machine', '🥤', 1, 1, 0, ['vending'], '#ef6f6c', {}),
  it('bus_bench', 'Bus Bench', '🪑', 2, 1, 0, ['busstop'], '#b08968', { skinPart: 'desk' }),
  it('goal_posts', 'Goal Posts', '🥅', 1, 3, 0, ['sportsfield'], '#f8f9fa', {}),
  it('lane_rope', 'Lane Rope', '🏊', 3, 1, 0, ['pool'], '#4cc9f0', {}),
  it('diving_board', 'Diving Board', '🤿', 1, 2, 1000, ['pool'], '#ffd166', { tier: 3, stats: { rep: 1 } }),
];

export const ITEMS = {};
for (const item of LIST) ITEMS[item.id] = item;
export const ITEM_ORDER = LIST.map((i) => i.id);
