import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-supabase';

export async function POST() {
    try {
        const supabase = await createServerSupabaseClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const yesterdayStr = yesterday
            .toISOString()
            .split('T')[0];

        const { data: existing } = await supabase
            .from('user_streaks')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!existing) {
            await supabase
                .from('user_streaks')
                .insert({
                    user_id: user.id,
                    streak_count: 1,
                    best_streak: 1,
                    last_activity_date: todayStr,
                });

            return NextResponse.json({
                streak: 1,
                best: 1,
            });
        }

        // already active today
        if (existing.last_activity_date === todayStr) {
            return NextResponse.json({
                streak: existing.streak_count,
                best: existing.best_streak,
            });
        }

        let newStreak = 1;

        // continued streak
        if (existing.last_activity_date === yesterdayStr) {
            newStreak = existing.streak_count + 1;
        }

        const bestStreak = Math.max(
            existing.best_streak,
            newStreak
        );

        await supabase
            .from('user_streaks')
            .update({
                streak_count: newStreak,
                best_streak: bestStreak,
                last_activity_date: todayStr,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);

        return NextResponse.json({
            streak: newStreak,
            best: bestStreak,
        });
    } catch (err) {
        console.error(err);

        return NextResponse.json(
            { error: 'Failed to update streak' },
            { status: 500 }
        );
    }
}