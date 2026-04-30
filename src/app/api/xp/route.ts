import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getLevelByXp, getXpForAction } from '@/lib/levels';
import { calculateDailyStreak, calculateLongestCorrectStreak, hasPerfectSession } from '@/lib/progress';
import { awardUserAchievements } from '@/lib/achievements';

type AttemptRow = {
  correct: boolean;
  exam: string;
  created_at: string;
  session_id: string | null;
};

function isMissingSessionIdColumn(message?: string | null) {
  return message?.includes('session_id') ?? false;
}

export async function POST() {
  const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const cookieStore = await cookies();
  const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [
    attemptsWithSession,
    { data: subscription, error: subscriptionError },
  ] = await Promise.all([
    admin
        .from('quiz_attempts')
        .select('correct, exam, created_at, session_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
    admin
        .from('subscriptions')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle(),
  ]);

  let attempts = attemptsWithSession.data;
  let attemptsError = attemptsWithSession.error;

  if (attemptsError && isMissingSessionIdColumn(attemptsError.message)) {
    const fallbackAttempts = await admin
      .from('quiz_attempts')
      .select('correct, exam, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    attempts = fallbackAttempts.data?.map((attempt) => ({ ...attempt, session_id: null })) ?? [];
    attemptsError = fallbackAttempts.error;
  }

  if (attemptsError) return NextResponse.json({ error: attemptsError.message }, { status: 500 });
  if (subscriptionError) return NextResponse.json({ error: subscriptionError.message }, { status: 500 });

  const safeAttempts = (attempts ?? []) as AttemptRow[];
  const totalAnswered = safeAttempts.length;
  const totalCorrect = safeAttempts.filter((attempt) => attempt.correct).length;
  const totalIncorrect = totalAnswered - totalCorrect;
  const streak = calculateDailyStreak(safeAttempts);
  const longestCorrectStreak = calculateLongestCorrectStreak(safeAttempts);
  const examsUsed = new Set(safeAttempts.map((attempt) => attempt.exam)).size;
  const newXp = (totalCorrect * getXpForAction('correct')) + (totalIncorrect * getXpForAction('incorrect'));
  const newLevel = getLevelByXp(newXp).name.toLowerCase();
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const weeklyXp = safeAttempts
    .filter((attempt) => new Date(attempt.created_at).getTime() >= weekAgo)
    .reduce((sum, attempt) => sum + getXpForAction(attempt.correct ? 'correct' : 'incorrect'), 0);

  const subscriptionPayload = {
    user_id: user.id,
    xp: newXp,
    level: newLevel,
  };

  const subscriptionWrite = subscription
    ? admin.from('subscriptions').update({ xp: newXp, level: newLevel }).eq('user_id', user.id)
    : admin.from('subscriptions').insert(subscriptionPayload);

  const { error: subscriptionWriteError } = await subscriptionWrite;
  if (subscriptionWriteError) {
    return NextResponse.json({ error: subscriptionWriteError.message }, { status: 500 });
  }

  const hasPerfectRun = hasPerfectSession(safeAttempts);

  const checks: [string, boolean][] = [
    ['first_answer',    totalAnswered >= 1],
    ['streak_3',        streak >= 3],
    ['streak_7',        streak >= 7],
    ['streak_30',       streak >= 30],
    ['correct_10',      longestCorrectStreak >= 10],
    ['correct_100',     totalCorrect >= 100],
    ['perfect_session', hasPerfectRun],
    ['all_exams',       examsUsed >= 6],
    ['xp_500',          newXp >= 500],
    ['xp_1500',         newXp >= 1500],
    ['xp_3000',         newXp >= 3000],
    ['streak_rocket',   weeklyXp >= 500],
  ];

  let newAchievements: string[];

  try {
    newAchievements = await awardUserAchievements(
      admin,
      user.id,
      checks.filter(([, condition]) => condition).map(([code]) => code)
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to award achievements' },
      { status: 500 }
    );
  }

  return NextResponse.json({ newXp, newLevel, newAchievements });
}
