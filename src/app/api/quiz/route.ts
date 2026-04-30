import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getDailyCount, getSelectedExams, FREE_LIMITS } from '@/lib/limits';
import { hasProAccess } from '@/lib/subscription';

const EXAM_CONFIGS: Record<string, { subject: string; description: string }> = {
  IELTS:  { subject: 'IELTS Academic Reading and Grammar', description: 'academic English, vocabulary, reading comprehension, grammar' },
  SAT:    { subject: 'SAT Math and Evidence-Based Reading', description: 'algebra, geometry, reading comprehension, grammar' },
  TOEFL:  { subject: 'TOEFL Reading and Grammar', description: 'academic English, reading passages, structure' },
  GMAT:   { subject: 'GMAT Verbal and Quantitative', description: 'critical reasoning, sentence correction, problem solving' },
  GRE:    { subject: 'GRE Verbal and Quantitative', description: 'vocabulary in context, reading comprehension, math' },
  ЕГЭ:   { subject: 'ЕГЭ по русскому языку', description: 'орфография, пунктуация, грамматика, лексика' },
};

type SchoolMembershipRow = {
  school_id: string;
};

type CustomQuestionRow = {
  question: string;
  options: unknown;
  correct_index: number;
  explanation: string | null;
  topic: string | null;
  difficulty: string | null;
};

function normalizeCustomQuestion(row: CustomQuestionRow) {
  const options = Array.isArray(row.options)
    ? row.options.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
    : [];

  if (options.length < 2 || row.correct_index < 0 || row.correct_index >= options.length) {
    return null;
  }

  return {
    question: row.question,
    options,
    correctIndex: row.correct_index,
    explanation: row.explanation || `Правильный ответ: ${options[row.correct_index]}`,
    topic: row.topic || 'General',
    difficulty: row.difficulty || 'medium',
  };
}

async function getSchoolQuestion(
  admin: SupabaseClient,
  userId: string,
  exam: string,
  difficulty: string,
  topic?: string
) {
  const { data: memberships, error: membershipsError } = await admin
    .from('school_members')
    .select('school_id')
    .eq('user_id', userId);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const schoolIds = [...new Set(((memberships ?? []) as SchoolMembershipRow[]).map((membership) => membership.school_id))];

  if (schoolIds.length === 0) {
    return null;
  }

  let query = admin
    .from('custom_questions')
    .select('question, options, correct_index, explanation, topic, difficulty')
    .in('school_id', schoolIds)
    .eq('active', true)
    .eq('exam', exam)
    .eq('difficulty', difficulty)
    .limit(50);

  if (topic) {
    query = query.ilike('topic', topic);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const questions = ((data ?? []) as CustomQuestionRow[])
    .map(normalizeCustomQuestion)
    .filter((question): question is NonNullable<ReturnType<typeof normalizeCustomQuestion>> => question !== null);

  if (questions.length === 0) {
    return null;
  }

  return questions[Math.floor(Math.random() * questions.length)];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 });

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { exam, difficulty = 'medium', locale = 'en', topic } = await req.json();
    const config = EXAM_CONFIGS[exam];
    if (!config) return NextResponse.json({ error: 'Unknown exam' }, { status: 400 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
    }

    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: sub } = await admin
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .maybeSingle();
    const isPro = hasProAccess(sub);

    if (!isPro) {
      const [dailyCount, selectedExams] = await Promise.all([
        getDailyCount(supabase, user.id),
        getSelectedExams(supabase, user.id),
      ]);

      if (dailyCount >= FREE_LIMITS.questionsPerDay) {
        return NextResponse.json({ error: 'daily_limit_reached', limit: FREE_LIMITS.questionsPerDay, used: dailyCount }, { status: 403 });
      }
      if (selectedExams.length > 0 && !selectedExams.includes(exam)) {
        return NextResponse.json({ error: 'exam_not_selected', selectedExams }, { status: 403 });
      }
    }

    const schoolQuestion = await getSchoolQuestion(admin, user.id, exam, difficulty, topic);
    if (schoolQuestion) {
      return NextResponse.json({ question: schoolQuestion, exam, isPro, source: 'school' });
    }

    const client = new Anthropic({ apiKey });
    const isRussian = exam === 'ЕГЭ' || locale === 'ru';

    const explanationInstruction = isPro
        ? `Return explanation as a JSON string: {"short":"1 sentence","why_correct":"2-3 sentences","why_wrong":"1 sentence","tip":"1 sentence"}`
        : `Return explanation as a plain string of 1 sentence.`;

    const prompt = `You are an expert ${config.subject} tutor. Generate ONE multiple-choice question for ${exam}. Difficulty: ${difficulty}. ${topic ? `Topic: ${topic}` : `Topics: ${config.description}`}. ${isRussian ? 'Write in Russian.' : 'Write in English.'} ${explanationInstruction}

Return ONLY valid JSON:
{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"...","topic":"...","difficulty":"${difficulty}"}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: isPro ? 800 : 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const question = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ question, exam, isPro });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate question';
    console.error('Quiz API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
