import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getDailyCount, getSelectedExams, FREE_LIMITS } from '@/lib/limits';
import { getServerEnv } from '@/lib/env/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/server-supabase';

const EXAM_CONFIGS: Record<string, { subject: string; description: string }> = {
  IELTS:  { subject: 'IELTS Academic Reading and Grammar', description: 'academic English, vocabulary, reading comprehension, grammar' },
  SAT:    { subject: 'SAT Math and Evidence-Based Reading', description: 'algebra, geometry, reading comprehension, grammar' },
  TOEFL:  { subject: 'TOEFL Reading and Grammar', description: 'academic English, reading passages, structure' },
  GMAT:   { subject: 'GMAT Verbal and Quantitative', description: 'critical reasoning, sentence correction, problem solving' },
  GRE:    { subject: 'GRE Verbal and Quantitative', description: 'vocabulary in context, reading comprehension, math' },
  ЕГЭ:   { subject: 'ЕГЭ по русскому языку', description: 'орфография, пунктуация, грамматика, лексика' },
};

export async function POST(req: NextRequest) {
  try {
    const env = getServerEnv();
    const supabase = await createServerSupabaseClient();

    const { exam, difficulty = 'medium', locale = 'en', topic } = await req.json();
    const config = EXAM_CONFIGS[exam];
    if (!config) return NextResponse.json({ error: 'Unknown exam' }, { status: 400 });

    // Check auth & limits
    const { data: { user } } = await supabase.auth.getUser();
    let isPro = false;

    if (user) {
      const admin = createServiceRoleClient();
      const { data: sub } = await admin.from('subscriptions').select('plan').eq('user_id', user.id).single();
      isPro = sub?.plan === 'pro';

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

      // Check if user is in a school with custom questions
      const { data: membership } = await admin
          .from('school_members')
          .select('school_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

      if (membership?.school_id) {
        // Get random custom question from school
        const { data: customQs } = await admin
            .from('custom_questions')
            .select('*')
            .eq('school_id', membership.school_id)
            .eq('active', true)
            .eq('exam', exam);

        if (customQs && customQs.length > 0) {
          // Pick random question
          const q = customQs[Math.floor(Math.random() * customQs.length)];
          const question = {
            question: q.question,
            options: q.options,
            correctIndex: q.correct_index,
            explanation: q.explanation || '',
            topic: q.topic,
            difficulty: q.difficulty,
          };
          return NextResponse.json({ question, exam, isPro, source: 'custom' });
        }
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
    const question = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ question, exam, isPro });
  } catch (err: any) {
    console.error('Quiz API error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Failed to generate question' }, { status: 500 });
  }
}