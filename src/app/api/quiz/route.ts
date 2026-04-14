import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getDailyCount, getSelectedExams, FREE_LIMITS } from '@/lib/limits';

const EXAM_CONFIGS: Record<string, { subject: string; description: string }> = {
  IELTS:  { subject: 'IELTS Academic Reading and Grammar', description: 'academic English, vocabulary, reading comprehension, grammar' },
  SAT:    { subject: 'SAT Math and Evidence-Based Reading', description: 'algebra, geometry, reading comprehension, grammar' },
  TOEFL:  { subject: 'TOEFL Reading and Grammar', description: 'academic English, reading passages, structure' },
  GMAT:   { subject: 'GMAT Verbal and Quantitative', description: 'critical reasoning, sentence correction, problem solving' },
  GRE:    { subject: 'GRE Verbal and Quantitative', description: 'vocabulary in context, reading comprehension, math' },
  ЕГЭ:   { subject: 'ЕГЭ по русскому языку', description: 'орфография, пунктуация, грамматика, лексика' },
};

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

    // Check auth & limits for logged-in users
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get subscription plan
      const { data: sub } = await admin
          .from('subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .single();

      const isPro = sub?.plan === 'pro';

      if (!isPro) {
        // Check daily limit
        const dailyCount = await getDailyCount(supabase, user.id);
        if (dailyCount >= FREE_LIMITS.questionsPerDay) {
          return NextResponse.json({
            error: 'daily_limit_reached',
            limit: FREE_LIMITS.questionsPerDay,
            used: dailyCount,
          }, { status: 403 });
        }

        // Check exam access
        const selectedExams = await getSelectedExams(supabase, user.id);
        if (selectedExams.length > 0 && !selectedExams.includes(exam)) {
          return NextResponse.json({
            error: 'exam_not_selected',
            selectedExams,
          }, { status: 403 });
        }
      }
    }

    const client = new Anthropic({ apiKey });
    const isRussian = exam === 'ЕГЭ' || locale === 'ru';
    const isPro = user ? (await createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    ).from('subscriptions').select('plan').eq('user_id', user.id).single()).data?.plan === 'pro' : false;

    const explanationLevel = isPro
        ? `Write a detailed explanation with this exact JSON structure:
{
  "short": "One sentence — why the correct answer is right.",
  "why_correct": "2-3 sentences explaining the rule or concept behind the correct answer.",
  "why_wrong": "One sentence explaining the most common mistake (why people pick the wrong answer).",
  "tip": "A practical study tip or memory trick related to this question type."
}
Return the explanation field as a JSON string of this object.`
        : 'Write a brief 1-sentence explanation of why the correct answer is right. Return it as a plain string.';

    const prompt = `You are an expert ${config.subject} tutor.

Generate ONE multiple-choice question for a student preparing for ${exam}.
Difficulty: ${difficulty}
${topic ? `Topic focus: ${topic}` : `Topic: ${config.description}`}
${isRussian ? 'Write the question, options, and explanation in Russian.' : 'Write everything in English.'}
${explanationLevel}

Return ONLY valid JSON, no markdown:
{
  "question": "the question text",
  "options": ["option A", "option B", "option C", "option D"],
  "correctIndex": 0,
  "explanation": "explanation text",
  "topic": "specific topic name",
  "difficulty": "${difficulty}"
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const question = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ question, exam, isPro });
  } catch (err: any) {
    console.error('Quiz API error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Failed to generate question' }, { status: 500 });
  }
}