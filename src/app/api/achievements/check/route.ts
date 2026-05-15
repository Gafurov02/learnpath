import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/server-supabase';
import { awardUserAchievements } from '@/lib/achievements';

/**
 * POST /api/achievements/check
 *
 * Called from the quiz page after each answer for real-time unlock feedback.
 *
 * FIXED:
 * - Was using `achievement_id` — DB column is `achievement`
 * - Was using wrong codes: `first_correct`, `xp_1000` — now uses real codes
 * - Was accepting `userId` from body with no auth — now uses session
 * - Was not using `awardUserAchievements` utility — now does
 */
export async function POST(req: Request) {
    try {
        // Always authenticate via session — never trust userId from the body
        const supabase = await createServerSupabaseClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const correctAnswers: number = Number(body.correctAnswers ?? 0);
        const streak: number = Number(body.streak ?? 0);
        const xp: number = Number(body.xp ?? 0);

        // Build the list of conditions using the real achievement codes from lib/achievements.ts
        const checks: [string, boolean][] = [
            ['first_answer',    correctAnswers >= 1],
            ['streak_3',        streak >= 3],
            ['streak_7',        streak >= 7],
            ['streak_30',       streak >= 30],
            ['correct_100',     correctAnswers >= 100],
            ['xp_500',          xp >= 500],
            ['xp_1500',         xp >= 1500],
            ['xp_3000',         xp >= 3000],
        ];

        const eligibleCodes = checks
            .filter(([, condition]) => condition)
            .map(([code]) => code);

        const admin = createServiceRoleClient();

        const unlocked = await awardUserAchievements(admin, user.id, eligibleCodes);

        return NextResponse.json({ unlocked });
    } catch (err) {
        console.error('[achievements/check]', err);
        return NextResponse.json({ error: 'Failed to check achievements' }, { status: 500 });
    }
}