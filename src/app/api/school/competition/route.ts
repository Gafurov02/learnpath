import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env/server';
import { createServerSupabaseClient } from '@/lib/server-supabase';

function getWeekStart(): string {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
}

// Update score after quiz attempt
export async function POST(req: NextRequest) {
    const env = getServerEnv();
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { school_id, xp_gained, correct, questions } = await req.json();
    const week_start = getWeekStart();

    const admin = createAdminClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
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

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const env = getServerEnv();
    const admin = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: school, error: schoolError } = await admin
        .from('schools')
        .select('owner_id')
        .eq('id', school_id)
        .maybeSingle();

    if (schoolError) return NextResponse.json({ error: schoolError.message }, { status: 500 });
    if (!school) return NextResponse.json({ error: 'school_not_found' }, { status: 404 });

    if (school.owner_id !== user.id) {
        const { data: membership, error: membershipError } = await admin
            .from('school_members')
            .select('role')
            .eq('school_id', school_id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 });
        if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

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