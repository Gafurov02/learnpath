import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getLevelByXp } from '@/lib/levels';

const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const XP_PER_CORRECT = 10;
const XP_PER_INCORRECT = 2;

type AttemptRow = {
  correct: boolean;
  exam: string;
  created_at: string;
};

type SubscriptionRow = {
  plan: string | null;
  status: string | null;
};

type AchievementRow = {
  achievement: string;
};

function getUtcDayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function calculateDailyStreak(attempts: AttemptRow[]) {
  const uniqueDays = [...new Set(attempts.map((attempt) => getUtcDayKey(attempt.created_at)))];
  let streak = 0;
  const today = new Date();

  for (let index = 0; index < uniqueDays.length; index += 1) {
    const current = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    current.setUTCDate(current.getUTCDate() - index);

    if (uniqueDays.includes(current.toISOString().slice(0, 10))) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

function calculateCorrectStreak(attempts: AttemptRow[]) {
  let streak = 0;

  for (const attempt of attempts) {
    if (!attempt.correct) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function calculateRecentPerfectRun(attempts: AttemptRow[]) {
  if (attempts.length < 10) {
    return false;
  }

  return attempts.slice(0, 10).every((attempt) => attempt.correct);
}

function calculateWeeklyXp(attempts: AttemptRow[]) {
  const threshold = new Date();
  threshold.setUTCDate(threshold.getUTCDate() - 7);

  return attempts.reduce((sum, attempt) => {
    if (new Date(attempt.created_at) < threshold) {
      return sum;
    }

    return sum + (attempt.correct ? XP_PER_CORRECT : XP_PER_INCORRECT);
  }, 0);
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await req.text();

  const [{ data: sub, error: subscriptionError }, { data: attempts, error: attemptsError }, { data: existing, error: achievementsError }] =
      await Promise.all([
        admin
            .from('subscriptions')
            .select('plan, status')
            .eq('user_id', user.id)
            .maybeSingle(),
        admin
            .from('quiz_attempts')
            .select('correct, exam, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        admin
            .from('user_achievements')
            .select('achievement')
            .eq('user_id', user.id)
      ]);

  if (subscriptionError || attemptsError || achievementsError) {
    return NextResponse.json(
        {
          error:
              subscriptionError?.message ||
              attemptsError?.message ||
              achievementsError?.message ||
              'Failed to load progress state'
        },
        { status: 500 }
    );
  }

  const safeAttempts = (attempts ?? []) as AttemptRow[];
  const totalAnswered = safeAttempts.length;
  const correctAnswers = safeAttempts.filter((attempt) => attempt.correct).length;
  const incorrectAnswers = totalAnswered - correctAnswers;
  const dailyStreak = calculateDailyStreak(safeAttempts);
  const correctStreak = calculateCorrectStreak(safeAttempts);
  const usedExams = new Set(safeAttempts.map((attempt) => attempt.exam));
  const weeklyXp = calculateWeeklyXp(safeAttempts);
  const newXp = correctAnswers * XP_PER_CORRECT + incorrectAnswers * XP_PER_INCORRECT;
  const newLevel = getLevelByXp(newXp).name.toLowerCase();
  const subscription = sub as SubscriptionRow | null;
  const preservedPlan = subscription?.plan ?? 'free';
  const preservedStatus = subscription?.status ?? 'free';

  const { error: updateError } = await admin.from('subscriptions').upsert({
    user_id: user.id,
    xp: newXp,
    level: newLevel,
    plan: preservedPlan,
    status: preservedStatus,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const earnedRows = (existing ?? []) as AchievementRow[];
  const earned = new Set(earnedRows.map((row) => row.achievement));
  const recentTenAttempts = safeAttempts.slice(0, 10);

  const checks: [string, boolean][] = [
    ['first_answer', totalAnswered >= 1],
    ['streak_3', dailyStreak >= 3],
    ['streak_7', dailyStreak >= 7],
    ['streak_30', dailyStreak >= 30],
    ['correct_10', correctStreak >= 10],
    ['correct_100', correctAnswers >= 100],
    ['perfect_session', recentTenAttempts.length >= 10 && calculateRecentPerfectRun(recentTenAttempts)],
    ['all_exams', usedExams.size >= 6],
    ['xp_500', newXp >= 500],
    ['xp_1500', newXp >= 1500],
    ['xp_3000', newXp >= 3000],
    ['streak_rocket', weeklyXp >= 500],
  ];

  const newAchievements: string[] = [];

  for (const [code, condition] of checks) {
    if (!condition || earned.has(code)) {
      continue;
    }

    const { error } = await admin.from('user_achievements').insert({ user_id: user.id, achievement: code });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    earned.add(code);
    newAchievements.push(code);
  }

  return NextResponse.json({
    newXp,
    newLevel,
    newAchievements,
    summary: {
      totalAnswered,
      correctAnswers,
      dailyStreak,
      correctStreak,
      examsUsed: usedExams.size,
    },
  });
}