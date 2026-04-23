import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
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

  const { exam, topic, correct, difficulty } = await req.json();
  const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Save quiz attempt
  await admin.from('quiz_attempts').insert({
    user_id: user.id, exam, topic,
    correct: correct ?? false,
    difficulty: difficulty ?? 'medium',
  });

  // Update weekly scores for all schools user is in
  const { data: memberships } = await admin
      .from('school_members')
      .select('school_id')
      .eq('user_id', user.id);

  if (memberships && memberships.length > 0) {
    const week_start = getWeekStart();
    const xp = correct ? 10 : 2;

    for (const m of memberships) {
      const { data: existing } = await admin
          .from('weekly_scores')
          .select('id, xp_gained, questions, correct')
          .eq('school_id', m.school_id)
          .eq('user_id', user.id)
          .eq('week_start', week_start)
          .single();

      if (existing) {
        await admin.from('weekly_scores').update({
          xp_gained: existing.xp_gained + xp,
          questions: existing.questions + 1,
          correct: existing.correct + (correct ? 1 : 0),
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await admin.from('weekly_scores').insert({
          school_id: m.school_id, user_id: user.id, week_start,
          xp_gained: xp, questions: 1,
          correct: correct ? 1 : 0, streak_days: 0,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}