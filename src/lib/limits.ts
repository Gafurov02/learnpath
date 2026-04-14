import type { SupabaseClient } from '@supabase/supabase-js';

// Freemium limits

export const FREE_LIMITS = {
    questionsPerDay: 10,
    maxExams: 2,
    aiExplanationLevel: 'basic',   // 'basic' | 'detailed'
};

export const PRO_LIMITS = {
    questionsPerDay: Infinity,
    maxExams: Infinity,
    aiExplanationLevel: 'detailed',
};

export function getLimits(isPro: boolean) {
    return isPro ? PRO_LIMITS : FREE_LIMITS;
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