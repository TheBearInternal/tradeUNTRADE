// One-time achievements (DESIGN §6). Apples are credited via ledger key `ach:<id>`.
export const ACHIEVEMENTS = {
  first_classroom: { id: 'first_classroom', name: 'First Classroom', emoji: '📚', desc: 'Build your first classroom.', apples: 10 },
  students_25: { id: 'students_25', name: '25 Students', emoji: '🎒', desc: 'Enroll 25 students.', apples: 15 },
  students_100: { id: 'students_100', name: '100 Students', emoji: '🏫', desc: 'Enroll 100 students.', apples: 30 },
  first_hire: { id: 'first_hire', name: 'First Hire', emoji: '🤝', desc: 'Hire your first staff member.', apples: 10 },
  stars_3: { id: 'stars_3', name: '3 Stars', emoji: '⭐', desc: 'Reach a 3-star rating.', apples: 20 },
  stars_5: { id: 'stars_5', name: '5 Stars', emoji: '🌟', desc: 'Reach a 5-star rating.', apples: 50, cosmetic: 'mascot_bear' },
  inspection_a: { id: 'inspection_a', name: 'Inspection A', emoji: '🅰️', desc: 'Get an A from the inspector.', apples: 40, cosmetic: 'skin_sunset' },
  reach_middle: { id: 'reach_middle', name: 'Middle School', emoji: '🏅', desc: 'Grow into a Middle School.', apples: 30, cosmetic: 'uniform_forest' },
  reach_high: { id: 'reach_high', name: 'High School', emoji: '🏆', desc: 'Grow into a High School.', apples: 50 },
  spotless: { id: 'spotless', name: 'Spotless', emoji: '✨', desc: 'Cleanliness 100 with at least 30 students.', apples: 15 },
  happy_school: { id: 'happy_school', name: 'Happy School', emoji: '😊', desc: 'Reach 85 happiness.', apples: 25 },
  full_house: { id: 'full_house', name: 'Full House', emoji: '🪑', desc: 'Fill every seat (at least 60).', apples: 20 },
};
