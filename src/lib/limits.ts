import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionTier } from '@/lib/subscription';

// Freemium limits

export const FREE_LIMITS = {
    questionsPerDay: 10,
    windowDays: 1,
    maxExams: 2,
    aiExplanationLevel: 'basic',   // 'basic' | 'detailed'
};

export const PRO_LIMITS = {
    questionsPerWindow: 50,
    windowDays: 3,
    maxExams: Infinity,
    aiExplanationLevel: 'detailed',
};

export const MAX_LIMITS = {
    questionsPerDay: Infinity,
    questionsPerWindow: Infinity,
    windowDays: 1,
    maxExams: Infinity,
    aiExplanationLevel: 'detailed',
};

export function getLimits(tier: SubscriptionTier) {
    if (tier === 'max') return MAX_LIMITS;
    if (tier === 'pro') return PRO_LIMITS;
    return FREE_LIMITS;
}

type QueryClient = Pick<SupabaseClient, 'from'>;

// Check if user has reached daily question limit
export async function getDailyCount(supabase: QueryClient, userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today.toISOString());

    return count ?? 0;
}

export async function getWindowCount(supabase: QueryClient, userId: string, windowDays: number): Promise<number> {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() - Math.max(windowDays - 1, 0));
    startsAt.setHours(0, 0, 0, 0);

    const { count } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startsAt.toISOString());

    return count ?? 0;
}

// Get selected exams for free user
export async function getSelectedExams(supabase: QueryClient, userId: string): Promise<string[]> {
    const { data } = await supabase
        .from('user_exam_selection')
        .select('exams')
        .eq('user_id', userId)
        .single();

    return data?.exams ?? [];
}

export const ALL_EXAMS = ['IELTS', 'SAT', 'TOEFL', 'GMAT', 'GRE', 'ЕГЭ'];
