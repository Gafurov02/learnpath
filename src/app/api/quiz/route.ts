import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getDailyCount, getSelectedExams, FREE_LIMITS } from '@/lib/limits';
import { getServerEnv } from '@/lib/env/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/server-supabase';
import { createAnswerToken } from '@/lib/answer-token';
import { hasProAccess } from '@/lib/subscription';

const EXAM_CONFIGS: Record<string, { subject: string; description: string }> = {
  IELTS:  { subject: 'IELTS Academic Reading and Grammar', description: 'academic English, vocabulary, reading comprehension, grammar' },
  SAT:    { subject: 'SAT Math and Evidence-Based Reading', description: 'algebra, geometry, reading comprehension, grammar' },
  TOEFL:  { subject: 'TOEFL Reading and Grammar', description: 'academic English, reading passages, structure' },
  GMAT:   { subject: 'GMAT Verbal and Quantitative', description: 'critical reasoning, sentence correction, problem solving' },
  GRE:    { subject: 'GRE Verbal and Quantitative', description: 'vocabulary in context, reading comprehension, math' },
  ЕГЭ:   { subject: 'ЕГЭ по русскому языку', description: 'орфография, пунктуация, грамматика, лексика' },
};

type CustomQuestionRow = {
  question: string;
  options: unknown;
  correct_index: number;
  explanation: string | null;
  topic: string | null;
  difficulty: string | null;
};

function normalizeOptions(value: unknown) {
  return Array.isArray(value)
    ? value.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
    : [];
}

function buildQuestionResponse(params: {
  userId: string;
  secret: string;
  exam: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  source: 'ai' | 'custom';
}) {
  const answerToken = createAnswerToken(params.secret, {
    userId: params.userId,
    exam: params.exam,
    topic: params.topic,
    difficulty: params.difficulty,
    correctIndex: params.correctIndex,
    optionCount: params.options.length,
    explanation: params.explanation,
    source: params.source,
  });

  return {
    question: params.question,
    options: params.options,
    topic: params.topic || 'General',
    difficulty: params.difficulty || 'medium',
    answerToken,
  };
}

export async function POST(req: NextRequest) {
  try {
    const env = getServerEnv();
    const supabase = await createServerSupabaseClient();

    const { exam, difficulty = 'medium', locale = 'en', topic } = await req.json();
    const config = EXAM_CONFIGS[exam];
    if (!config) return NextResponse.json({ error: 'Unknown exam' }, { status: 400 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
    }

    const admin = createServiceRoleClient();
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

    const { data: memberships } = await admin
      .from('school_members')
      .select('school_id')
      .eq('user_id', user.id);
    const schoolIds = [...new Set((memberships ?? []).map((membership) => membership.school_id))];

    if (schoolIds.length > 0) {
      const { data: customQs } = await admin
        .from('custom_questions')
        .select('question, options, correct_index, explanation, topic, difficulty')
        .in('school_id', schoolIds)
        .eq('active', true)
        .eq('exam', exam)
        .limit(50);

      const usableQuestions = ((customQs ?? []) as CustomQuestionRow[])
        .map((question) => ({ ...question, options: normalizeOptions(question.options) }))
        .filter((question) => (
          question.options.length >= 2 &&
          question.correct_index >= 0 &&
          question.correct_index < question.options.length
        ));

      if (usableQuestions.length > 0) {
        const q = usableQuestions[Math.floor(Math.random() * usableQuestions.length)];
        const question = buildQuestionResponse({
          userId: user.id,
          secret: env.SUPABASE_SERVICE_ROLE_KEY,
          exam,
          question: q.question,
          options: q.options,
          correctIndex: q.correct_index,
          explanation: q.explanation,
          topic: q.topic,
          difficulty: q.difficulty,
          source: 'custom',
        });
        return NextResponse.json({ question, exam, isPro, source: 'custom' });
      }
    }

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
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
    const generated = JSON.parse(jsonMatch[0]);
    const options = normalizeOptions(generated.options);
    const correctIndex = Number(generated.correctIndex);

    if (
      !generated.question ||
      options.length < 2 ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= options.length
    ) {
      throw new Error('Invalid question generated');
    }

    const question = buildQuestionResponse({
      userId: user.id,
      secret: env.SUPABASE_SERVICE_ROLE_KEY,
      exam,
      question: generated.question,
      options,
      correctIndex,
      explanation: generated.explanation,
      topic: generated.topic,
      difficulty: generated.difficulty || difficulty,
      source: 'ai',
    });

    return NextResponse.json({ question, exam, isPro });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate question';
    console.error('Quiz API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
