// Staff catalog (DESIGN §3). Every role has `grades`; janitor and nurse have a single
// 'standard' grade whose fields are also mirrored on the role for convenience.
export const STAFF = {
  teacher: {
    id: 'teacher', role: 'teacher', name: 'Teacher', emoji: '👩‍🏫',
    desc: 'Staffs one seat room (best teacher goes to the best room).',
    grades: {
      rookie: { id: 'rookie', name: 'Rookie Teacher', skill: 1, salary: 50, level: 1, tier: 1 },
      veteran: { id: 'veteran', name: 'Veteran Teacher', skill: 3, salary: 90, level: 5, tier: 1 },
      expert: { id: 'expert', name: 'Expert Teacher', skill: 5, salary: 140, level: 9, tier: 1 },
    },
  },
  janitor: {
    id: 'janitor', role: 'janitor', name: 'Janitor', emoji: '🧹',
    desc: '+12 cleanliness per day.',
    skill: 0, salary: 30, level: 1, tier: 1,
    grades: { standard: { id: 'standard', name: 'Janitor', skill: 0, salary: 30, level: 1, tier: 1 } },
  },
  nurse: {
    id: 'nurse', role: 'nurse', name: 'Nurse', emoji: '🧑‍⚕️',
    desc: "Works in the Nurse's Office: flu lasts 1 day instead of 3.",
    skill: 0, salary: 50, level: 1, tier: 2,
    grades: { standard: { id: 'standard', name: 'Nurse', skill: 0, salary: 50, level: 1, tier: 2 } },
  },
  counselor: {
    id: 'counselor', role: 'counselor', name: 'Counselor', emoji: '🧑‍💼',
    desc: "Works in the Counselor's Office: half as many students leave.",
    skill: 0, salary: 60, level: 1, tier: 2,
    grades: { standard: { id: 'standard', name: 'Counselor', skill: 0, salary: 60, level: 1, tier: 2 } },
  },
};

export const STAFF_ROLES = ['teacher', 'janitor', 'nurse', 'counselor'];
export const TEACHER_GRADES = ['rookie', 'veteran', 'expert'];

export const STAFF_NAMES = [
  'Ms. Lopez', 'Mr. Chen', 'Mrs. Patel', 'Mr. Okafor', 'Ms. Novak', 'Mr. Silva', 'Mrs. Kim',
  'Mr. Brooks', 'Ms. Haddad', 'Mr. Jensen', 'Mrs. Rossi', 'Mr. Tanaka', 'Ms. Dubois',
  'Mr. Mensah', 'Mrs. Ivanova', 'Mr. Garcia', 'Ms. Byrne', 'Mr. Sato', 'Mrs. Adeyemi',
  'Mr. Larsen', 'Ms. Moreau', 'Mr. Kowalski', 'Mrs. Nguyen', 'Mr. Fischer',
];
