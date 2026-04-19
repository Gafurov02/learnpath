import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getLevelByXp, getXpForAction } from '@/lib/levels';
import { calculateDailyStreak, calculateLongestCorrectStreak, hasPerfectSession } from '@/lib/progress';

type AttemptRow = {
  correct: boolean;
  exam: string;
  created_at: string;
  session_id: string | null;
};

type AchievementRow = {
  achievement: string;
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
    { data: existingAchievements, error: achievementsError },
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
    admin
        .from('user_achievements')
        .select('achievement')
        .eq('user_id', user.id),
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
  if (achievementsError) return NextResponse.json({ error: achievementsError.message }, { status: 500 });

  const safeAttempts = (attempts ?? []) as AttemptRow[];
  const totalAnswered = safeAttempts.length;
  const totalCorrect = safeAttempts.filter((attempt) => attempt.correct).length;
  const totalIncorrect = totalAnswered - totalCorrect;
  const streak = calculateDailyStreak(safeAttempts);
  const longestCorrectStreak = calculateLongestCorrectStreak(safeAttempts);
  const examsUsed = new Set(safeAttempts.map((attempt) => attempt.exam)).size;
  const newXp = (totalCorrect * getXpForAction('correct')) + (totalIncorrect * getXpForAction('incorrect'));
  const newLevel = getLevelByXp(newXp).name.toLowerCase();

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

  const newAchievements: string[] = [];
  const earned = new Set((existingAchievements as AchievementRow[] | null)?.map((row) => row.achievement) ?? []);
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
  ];

  for (const [code, condition] of checks) {
    if (condition && !earned.has(code)) {
      newAchievements.push(code);
    }
  }

  if (newAchievements.length > 0) {
    const { error: insertAchievementsError } = await admin.from('user_achievements').upsert(
      newAchievements.map((achievement) => ({ user_id: user.id, achievement })),
      { onConflict: 'user_id,achievement', ignoreDuplicates: true }
    );

    if (insertAchievementsError) {
      return NextResponse.json({ error: insertAchievementsError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ newXp, newLevel, newAchievements });
}
