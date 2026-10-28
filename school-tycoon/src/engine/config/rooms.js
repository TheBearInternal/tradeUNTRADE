// Room catalog (DESIGN §2). kind: 'hall' | 'room' | 'decor' | 'office'.
export const ROOMS = {
  hall: {
    id: 'hall', name: 'Hallway', emoji: '⬜', w: 1, h: 1, cost: 10, tier: 1, level: 1,
    kind: 'hall', color: '#d8d2c4', desc: 'Connects rooms to the Front Office. Unconnected rooms do nothing.',
  },
  office: {
    id: 'office', name: 'Front Office', emoji: '🏫', w: 3, h: 2, cost: 0, tier: 1, level: 1,
    kind: 'office', color: '#8e7cc3', desc: 'The heart of your school. Every hallway starts here.',
    buildable: false,
  },
  classroom: {
    id: 'classroom', name: 'Classroom', emoji: '📚', w: 3, h: 3, cost: 500, tier: 1, level: 1,
    kind: 'room', color: '#f6c26b', desc: '20 seats. Needs 1 teacher.',
    seats: 20, needsTeacher: true, learnBonus: 1,
  },
  restroom: {
    id: 'restroom', name: 'Restroom', emoji: '🚽', w: 2, h: 2, cost: 300, tier: 1, level: 1,
    kind: 'room', color: '#7fc8f8', desc: 'Serves 40 students. Keep it close to classrooms.',
    facility: 'restroom', serves: 40,
  },
  cafeteria: {
    id: 'cafeteria', name: 'Cafeteria', emoji: '🍔', w: 4, h: 3, cost: 1200, tier: 1, level: 2,
    kind: 'room', color: '#f49d6e', desc: 'Feeds 60 students. Keep it close to classrooms.',
    facility: 'cafeteria', serves: 60,
  },
  playground: {
    id: 'playground', name: 'Playground', emoji: '🛝', w: 4, h: 4, cost: 600, tier: 1, level: 3,
    kind: 'room', color: '#9ad17b', desc: '+10 happiness (only one counts).',
    happiness: 10,
  },
  staffroom: {
    id: 'staffroom', name: 'Staff Room', emoji: '☕', w: 2, h: 2, cost: 400, tier: 1, level: 4,
    kind: 'room', color: '#c9a37a', desc: 'Without one, teacher skill is -1.',
    staffRoom: true,
  },
  plant: {
    id: 'plant', name: 'Potted Plant', emoji: '🪴', w: 1, h: 1, cost: 25, tier: 1, level: 1,
    kind: 'decor', color: '#6fbf73', desc: 'Decor: +1 happiness (decor total capped at +15).',
    decor: 1,
  },
  bench: {
    id: 'bench', name: 'Bench', emoji: '🪑', w: 1, h: 1, cost: 40, tier: 1, level: 2,
    kind: 'decor', color: '#b08968', desc: 'Decor: +2 happiness (decor total capped at +15).',
    decor: 2,
  },
  lockers: {
    id: 'lockers', name: 'Lockers', emoji: '🗄️', w: 1, h: 1, cost: 50, tier: 1, level: 3,
    kind: 'decor', color: '#8fa3bf', desc: 'Decor: +2 happiness (decor total capped at +15).',
    decor: 2,
  },
  library: {
    id: 'library', name: 'Library', emoji: '📖', w: 3, h: 3, cost: 900, tier: 2, level: 6,
    kind: 'room', color: '#b48ead', desc: '+10% learning school-wide.',
    schoolLearnBonus: 0.1,
  },
  nurse: {
    id: 'nurse', name: "Nurse's Office", emoji: '🩺', w: 2, h: 2, cost: 700, tier: 2, level: 6,
    kind: 'room', color: '#f7a1b5', desc: 'With a Nurse on staff, flu lasts 1 day instead of 3.',
    fluCare: true,
  },
  sciencelab: {
    id: 'sciencelab', name: 'Science Lab', emoji: '🔬', w: 3, h: 3, cost: 1500, tier: 2, level: 8,
    kind: 'room', color: '#5fd3bc', desc: '15 seats, +25% learning. Needs a teacher.',
    seats: 15, needsTeacher: true, learnBonus: 1.25,
  },
  gym: {
    id: 'gym', name: 'Gym', emoji: '🏀', w: 5, h: 4, cost: 2500, tier: 2, level: 10,
    kind: 'room', color: '#e07a5f', desc: '+10 happiness.',
    happiness: 10,
  },
  computerlab: {
    id: 'computerlab', name: 'Computer Lab', emoji: '💻', w: 3, h: 3, cost: 2000, tier: 3, level: 12,
    kind: 'room', color: '#6c8ebf', desc: '20 seats, +30% learning, +1 reputation/day. Needs a teacher.',
    seats: 20, needsTeacher: true, learnBonus: 1.3, repPerDay: 1,
  },
  auditorium: {
    id: 'auditorium', name: 'Auditorium', emoji: '🎭', w: 6, h: 4, cost: 5000, tier: 3, level: 15,
    kind: 'room', color: '#d4a5a5', desc: '+2 reputation/day, +5 inspection score.',
    repPerDay: 2, inspectionBonus: 5,
  },
};

// Build-menu order (office excluded: not buildable).
export const ROOM_ORDER = [
  'hall', 'classroom', 'restroom', 'cafeteria', 'playground', 'staffroom',
  'plant', 'bench', 'lockers', 'library', 'nurse', 'sciencelab', 'gym',
  'computerlab', 'auditorium',
];

export const FACILITY_KINDS = ['restroom', 'cafeteria'];
