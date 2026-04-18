import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getLevelByXp } from '@/lib/levels';

export async function POST(req: NextRequest) {
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

  const { xpGained, correct, totalAnswered, streak, sessionCorrect, sessionTotal, examsUsed } = await req.json();

  // Get current XP
  const { data: sub } = await admin
      .from('subscriptions')
      .select('xp')
      .eq('user_id', user.id)
      .single();

  const currentXp = sub?.xp ?? 0;
  const newXp = currentXp + (xpGained || 0);
  const newLevel = getLevelByXp(newXp).name.toLowerCase();

  // Update XP + level
  await admin.from('subscriptions').upsert({
    user_id: user.id,
    xp: newXp,
    level: newLevel,
    status: 'free',
    plan: 'free',
  });

  // Check & award achievements
  const newAchievements: string[] = [];
  const { data: existing } = await admin
      .from('user_achievements')
      .select('achievement')
      .eq('user_id', user.id);
  const earned = new Set(existing?.map((a: any) => a.achievement) ?? []);

  const checks: [string, boolean][] = [
    ['first_answer',    totalAnswered >= 1],
    ['streak_3',        streak >= 3],
    ['streak_7',        streak >= 7],
    ['streak_30',       streak >= 30],
    ['correct_10',      (sessionCorrect ?? 0) >= 10],
    ['correct_100',     correct >= 100],
    ['perfect_session', sessionTotal >= 10 && sessionCorrect === sessionTotal],
    ['all_exams',       (examsUsed ?? []).length >= 6],
    ['xp_500',          newXp >= 500],
    ['xp_1500',         newXp >= 1500],
    ['xp_3000',         newXp >= 3000],
  ];

  for (const [code, condition] of checks) {
    if (condition && !earned.has(code)) {
      await admin.from('user_achievements').insert({ user_id: user.id, achievement: code });
      newAchievements.push(code);
    }
  }

  return NextResponse.json({ newXp, newLevel, newAchievements });
}