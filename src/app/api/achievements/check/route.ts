import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/server-supabase';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const {
            userId,
            correctAnswers,
            streak,
            xp,
        } = body;

        const supabase = createServiceRoleClient();

        const unlocked: string[] = [];

        async function unlock(id: string) {
            const { error } = await supabase
                .from('user_achievements')
                .insert({
                    user_id: userId,
                    achievement_id: id,
                });

            if (!error) unlocked.push(id);
        }

        if (correctAnswers >= 1) {
            await unlock('first_correct');
        }

        if (correctAnswers >= 100) {
            await unlock('correct_100');
        }

        if (streak >= 7) {
            await unlock('streak_7');
        }

        if (xp >= 1000) {
            await unlock('xp_1000');
        }

        return NextResponse.json({
            unlocked,
        });
    } catch (err) {
        console.error(err);

        return NextResponse.json(
            { error: 'Failed' },
            { status: 500 }
        );
    }
}