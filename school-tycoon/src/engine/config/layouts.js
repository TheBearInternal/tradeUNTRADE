// Free starter layouts (DESIGN_V2 §2). They give zero stats and reproduce the v1 numbers exactly:
// classroom 20 seats, computer lab 20, other seat rooms 15, restroom 4 stalls (40) + sink,
// cafeteria 60 seats + counter, library 4 shelves. Placed on build, by autoArrange and by the
// v1 -> v2 save migration. Coordinates are interior cells; rot 1 swaps w/h.
const L = (itemType, cx, cy, rot) => ({ itemType, cx, cy, rot: rot || 0 });

// 9x9 seat room, door at (4,8): aisle in columns 3-4 (desks) / rows 2,4,6 empty.
const desks = (type) => [
  L('chalkboard', 3, 0), L('teacher_desk', 3, 1),
  L(type, 0, 3), L(type, 2, 3), L(type, 5, 3), L(type, 7, 3),
  L(type, 0, 5), L(type, 2, 5), L(type, 5, 5), L(type, 7, 5),
  L(type, 0, 7), L(type, 7, 7),
];
const benches = (type) => [
  L('chalkboard', 3, 0), L('teacher_desk', 3, 1),
  L(type, 0, 3), L(type, 5, 3), L(type, 0, 5), L(type, 5, 5), L(type, 0, 7),
];

export const LAYOUTS = {
  office: [L('reception_desk', 3, 2)],
  classroom: desks('desk_pair'),
  computerlab: desks('computer_desk'),
  sciencelab: benches('lab_bench'),
  artroom: benches('easel_table'),
  musicroom: benches('music_row'),
  workshop: benches('workbench'),
  roboticslab: benches('robot_bench'),
  restroom: [L('stall', 0, 0), L('stall', 1, 0), L('stall', 2, 0), L('stall', 3, 0), L('sink', 5, 0)],
  cafeteria: [
    L('serving_counter', 4, 0),
    L('lunch_table', 0, 2), L('lunch_table', 4, 2), L('lunch_table', 8, 2),
    L('lunch_table', 0, 5), L('lunch_table', 4, 5), L('lunch_table', 8, 5),
  ],
  library: [L('shelf', 0, 0), L('shelf', 2, 0), L('shelf', 6, 0), L('shelf', 8, 0), L('reading_table', 3, 4)],
  playground: [L('slide', 2, 2)],
  staffroom: [L('staff_table', 2, 1)],
  nurse: [L('cot', 0, 0), L('cot', 2, 0)],
  gym: [L('hoop', 7, 0)],
  auditorium: [L('stage', 7, 0)],
  garden: [L('flower_bed', 1, 1), L('flower_bed', 5, 1)],
  vending: [L('vending_machine', 0, 0)],
  busstop: [L('bus_bench', 0, 0)],
  counselor: [L('sofa', 1, 1)],
  sportsfield: [L('goal_posts', 0, 6), L('goal_posts', 17, 6)],
  pool: [L('lane_rope', 2, 2), L('lane_rope', 8, 2)],
};
