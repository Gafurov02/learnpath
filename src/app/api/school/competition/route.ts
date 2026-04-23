import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getWeekStart(): string {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
}

// Update score after quiz attempt
export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { school_id, xp_gained, correct, questions } = await req.json();
    const week_start = getWeekStart();

    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upsert weekly score
    const { data: existing } = await admin
        .from('weekly_scores')
        .select('*')
        .eq('school_id', school_id)
        .eq('user_id', user.id)
        .eq('week_start', week_start)
        .single();

    if (existing) {
        await admin.from('weekly_scores').update({
            xp_gained: existing.xp_gained + (xp_gained || 0),
            questions: existing.questions + (questions || 0),
            correct: existing.correct + (correct ? 1 : 0),
            updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
    } else {
        await admin.from('weekly_scores').insert({
            school_id, user_id: user.id, week_start,
            xp_gained: xp_gained || 0,
            questions: questions || 0,
            correct: correct ? 1 : 0,
            streak_days: 0,
        });
    }

    return NextResponse.json({ ok: true });
}

// Get leaderboard for school
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const school_id = searchParams.get('school_id');
    const week = searchParams.get('week') || getWeekStart();

    if (!school_id) return NextResponse.json({ error: 'school_id required' }, { status: 400 });

    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data } = await admin
        .from('weekly_scores')
        .select('user_id, xp_gained, questions, correct, streak_days, score, week_start')
        .eq('school_id', school_id)
        .eq('week_start', week)
        .order('score', { ascending: false });

    // Get past weeks for history
    const { data: history } = await admin
        .from('weekly_scores')
        .select('user_id, score, week_start, xp_gained, questions, correct')
        .eq('school_id', school_id)
        .order('week_start', { ascending: false })
        .limit(50);

    return NextResponse.json({ leaderboard: data ?? [], history: history ?? [], week });
}