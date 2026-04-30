import type { SupabaseClient } from '@supabase/supabase-js';

type AchievementDefinition = {
  code: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
};

type UserAchievementRow = {
  achievement: string;
};

export const ACHIEVEMENT_DEFINITIONS: Record<string, AchievementDefinition> = {
  first_answer: {
    code: 'first_answer',
    name: 'First Step',
    description: 'Answer your first question',
    icon: '🎯',
    xp_reward: 10,
  },
  streak_3: {
    code: 'streak_3',
    name: 'On a Roll',
    description: '3-day streak',
    icon: '🔥',
    xp_reward: 30,
  },
  streak_7: {
    code: 'streak_7',
    name: 'On Fire',
    description: '7-day streak',
    icon: '🔥',
    xp_reward: 50,
  },
  streak_30: {
    code: 'streak_30',
    name: 'Iron Will',
    description: '30-day streak',
    icon: '🏅',
    xp_reward: 200,
  },
  correct_10: {
    code: 'correct_10',
    name: 'Sharp Shooter',
    description: '10 correct in a row',
    icon: '⚡',
    xp_reward: 50,
  },
  correct_100: {
    code: 'correct_100',
    name: 'Bookworm',
    description: 'Answer 100 questions correctly',
    icon: '📚',
    xp_reward: 100,
  },
  perfect_session: {
    code: 'perfect_session',
    name: 'Perfectionist',
    description: '100% accuracy in a session with 10+ answers',
    icon: '🎯',
    xp_reward: 75,
  },
  all_exams: {
    code: 'all_exams',
    name: 'Globetrotter',
    description: 'Practice all 6 exams',
    icon: '🌍',
    xp_reward: 150,
  },
  xp_500: {
    code: 'xp_500',
    name: 'Rising Star',
    description: 'Earn 500 XP',
    icon: '⭐',
    xp_reward: 50,
  },
  xp_1500: {
    code: 'xp_1500',
    name: 'Advanced',
    description: 'Reach Advanced level',
    icon: '💜',
    xp_reward: 100,
  },
  xp_3000: {
    code: 'xp_3000',
    name: 'Master',
    description: 'Reach Master level',
    icon: '👑',
    xp_reward: 300,
  },
  streak_rocket: {
    code: 'streak_rocket',
    name: 'Rocket',
    description: 'Earn 500 XP in one week',
    icon: '🚀',
    xp_reward: 100,
  },
  question_importer: {
    code: 'question_importer',
    name: 'Question Importer',
    description: 'Import your first question batch',
    icon: '📦',
    xp_reward: 25,
  },
  question_bank_50: {
    code: 'question_bank_50',
    name: 'Question Curator',
    description: 'Build a school bank with 50 questions',
    icon: '🗂️',
    xp_reward: 75,
  },
  question_bank_200: {
    code: 'question_bank_200',
    name: 'Exam Architect',
    description: 'Build a school bank with 200 questions',
    icon: '🏗️',
    xp_reward: 200,
  },
};

function uniqueCodes(codes: string[]) {
  return [...new Set(codes.filter((code) => ACHIEVEMENT_DEFINITIONS[code]))];
}

export async function ensureAchievementDefinitions(admin: SupabaseClient, codes: string[]) {
  const definitions = uniqueCodes(codes).map((code) => ACHIEVEMENT_DEFINITIONS[code]);

  if (definitions.length === 0) {
    return;
  }

  const { error } = await admin
    .from('achievements')
    .upsert(definitions, { onConflict: 'code', ignoreDuplicates: true });

  if (error) {
    throw new Error(error.message);
  }
}

export async function awardUserAchievements(admin: SupabaseClient, userId: string, codes: string[]) {
  const requestedCodes = uniqueCodes(codes);

  if (requestedCodes.length === 0) {
    return [];
  }

  await ensureAchievementDefinitions(admin, requestedCodes);

  const { data: existingRows, error: existingError } = await admin
    .from('user_achievements')
    .select('achievement')
    .eq('user_id', userId)
    .in('achievement', requestedCodes);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = new Set(
    ((existingRows ?? []) as UserAchievementRow[]).map((row) => row.achievement)
  );
  const newCodes = requestedCodes.filter((code) => !existing.has(code));

  if (newCodes.length === 0) {
    return [];
  }

  const { error: insertError } = await admin
    .from('user_achievements')
    .upsert(
      newCodes.map((achievement) => ({ user_id: userId, achievement })),
      { onConflict: 'user_id,achievement', ignoreDuplicates: true }
    );

  if (insertError) {
    throw new Error(insertError.message);
  }

  return newCodes;
}
