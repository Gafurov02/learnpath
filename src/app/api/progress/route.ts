import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/server-supabase';
import { getXpForAction } from '@/lib/levels';
import { hashAnswerToken, openAnswerToken } from '@/lib/answer-token';
import { FREE_LIMITS, PRO_LIMITS, getWindowCount } from '@/lib/limits';
import { getSubscriptionTier } from '@/lib/subscription';

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

// ─── GET /api/progress ────────────────────────────────────────────────────────
// Returns the authenticated user's quiz stats for the dashboard.
// Was previously missing — dashboard got 405 on every load.
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceRoleClient();

  const { data: attempts, error } = await admin
      .from('quiz_attempts')
      .select('created_at, exam, correct')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const safe = attempts ?? [];
  const total = safe.length;
  const correct = safe.filter((a) => a.correct).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return NextResponse.json({ total, correct, accuracy, attempts: safe });
}

// ─── POST /api/progress ───────────────────────────────────────────────────────
// Records a quiz answer, validates the answer token, enforces limits,
// and updates weekly school scores.
export async function POST(req: NextRequest) {
  const env = getServerEnv();
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { answerToken, selectedIndex } = await req.json();
  const selected = Number(selectedIndex);

  if (typeof answerToken !== 'string' || !Number.isInteger(selected) || selected < 0) {
    return NextResponse.json({ error: 'invalid_answer_payload' }, { status: 400 });
  }

  let payload: ReturnType<typeof openAnswerToken>;
  try {
    payload = openAnswerToken(env.SUPABASE_SERVICE_ROLE_KEY, answerToken);
  } catch (error) {
    return NextResponse.json(
        { error: error instanceof Error ? error.message : 'invalid_answer_token' },
        { status: 400 }
    );
  }

  if (payload.userId !== user.id || selected >= payload.optionCount) {
    return NextResponse.json({ error: 'invalid_answer_token' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: sub } = await admin
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .maybeSingle();
  const tier = getSubscriptionTier(sub);

  if (tier !== 'max') {
    const limit = tier === 'pro' ? PRO_LIMITS.questionsPerWindow : FREE_LIMITS.questionsPerDay;
    const windowDays = tier === 'pro' ? PRO_LIMITS.windowDays : FREE_LIMITS.windowDays;
    const windowCount = await getWindowCount(admin, user.id, windowDays);
    if (windowCount >= limit) {
      return NextResponse.json(
          { error: 'question_limit_reached', limit, used: windowCount, windowDays },
          { status: 403 }
      );
    }
  }

  const correct = selected === payload.correctIndex;
  const tokenHash = hashAnswerToken(answerToken);

  const { error: insertError } = await admin.from('quiz_attempts').insert({
    user_id: user.id,
    exam: payload.exam,
    topic: payload.topic,
    correct,
    difficulty: payload.difficulty,
    question_token_hash: tokenHash,
  });

  if (insertError?.code === '23505') {
    return NextResponse.json({ error: 'answer_already_recorded' }, { status: 409 });
  }
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update weekly school scores
  const { data: memberships } = await admin
      .from('school_members')
      .select('school_id')
      .eq('user_id', user.id);

  if (memberships && memberships.length > 0) {
    const week_start = getWeekStart();
    const xp = getXpForAction(correct ? 'correct' : 'incorrect');

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
          school_id: m.school_id,
          user_id: user.id,
          week_start,
          xp_gained: xp,
          questions: 1,
          correct: correct ? 1 : 0,
          streak_days: 0,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    correct,
    correctIndex: payload.correctIndex,
    explanation: payload.explanation,
    exam: payload.exam,
    topic: payload.topic,
    difficulty: payload.difficulty,
  });
}