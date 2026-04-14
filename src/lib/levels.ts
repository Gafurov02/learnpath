export type Level = {
  name: string;
  icon: string;
  minXp: number;
  maxXp: number;
  color: string;
};

export const LEVELS: Level[] = [
  { name: 'Beginner',     icon: '🌱', minXp: 0,    maxXp: 100,  color: '#888780' },
  { name: 'Elementary',   icon: '📗', minXp: 100,  maxXp: 300,  color: '#1D9E75' },
  { name: 'Intermediate', icon: '📘', minXp: 300,  maxXp: 700,  color: '#378ADD' },
  { name: 'Advanced',     icon: '💜', minXp: 700,  maxXp: 1500, color: '#7F77DD' },
  { name: 'Expert',       icon: '🏆', minXp: 1500, maxXp: 3000, color: '#BA7517' },
  { name: 'Master',       icon: '👑', minXp: 3000, maxXp: 9999, color: '#6B5CE7' },
];

export function getLevelByXp(xp: number): Level {
  return LEVELS.slice().reverse().find(l => xp >= l.minXp) ?? LEVELS[0];
}

export function getXpForAction(action: 'correct' | 'incorrect' | 'streak_7' | 'streak_30' | 'perfect_10'): number {
  const map = { correct: 10, incorrect: 2, streak_7: 50, streak_30: 100, perfect_10: 25 };
  return map[action] ?? 0;
}

export const ROADMAP: Record<string, { topic: string; total: number }[]> = {
  IELTS: [
    { topic: 'Vocabulary Basics', total: 20 },
    { topic: 'Reading Comprehension', total: 20 },
    { topic: 'Grammar & Tenses', total: 20 },
    { topic: 'Academic Writing', total: 20 },
    { topic: 'Listening Skills', total: 20 },
  ],
  SAT: [
    { topic: 'Algebra Fundamentals', total: 20 },
    { topic: 'Geometry', total: 20 },
    { topic: 'Reading Evidence', total: 20 },
    { topic: 'Writing & Grammar', total: 20 },
    { topic: 'Advanced Math', total: 20 },
  ],
  TOEFL: [
    { topic: 'Reading Basics', total: 20 },
    { topic: 'Vocabulary in Context', total: 20 },
    { topic: 'Integrated Skills', total: 20 },
    { topic: 'Academic Language', total: 20 },
  ],
  GMAT: [
    { topic: 'Critical Reasoning', total: 20 },
    { topic: 'Sentence Correction', total: 20 },
    { topic: 'Problem Solving', total: 20 },
    { topic: 'Data Sufficiency', total: 20 },
  ],
  GRE: [
    { topic: 'Vocabulary', total: 20 },
    { topic: 'Reading Comprehension', total: 20 },
    { topic: 'Quantitative', total: 20 },
    { topic: 'Analytical Writing', total: 20 },
  ],
  ЕГЭ: [
    { topic: 'Орфография', total: 20 },
    { topic: 'Пунктуация', total: 20 },
    { topic: 'Грамматика', total: 20 },
    { topic: 'Лексика', total: 20 },
    { topic: 'Сочинение', total: 20 },
  ],
};
