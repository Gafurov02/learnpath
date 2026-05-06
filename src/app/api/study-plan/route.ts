import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { hasMaxAccess } from '@/lib/subscription';
import { getServerEnv } from '@/lib/env/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/server-supabase';

export async function GET(req: NextRequest) {
    const env = getServerEnv();
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createServiceRoleClient();

    const { data: sub } = await admin.from('subscriptions').select('plan, status').eq('user_id', user.id).single();
    if (!hasMaxAccess(sub)) return NextResponse.json({ error: 'Max required' }, { status: 403 });

    // Get last 50 attempts
    const { data: attempts } = await admin
        .from('quiz_attempts')
        .select('exam, topic, correct, difficulty, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

    if (!attempts || attempts.length === 0) {
        return NextResponse.json({ plan: defaultPlan() });
    }

    // Analyze weak topics
    const topicStats: Record<string, { correct: number; total: number; exam: string }> = {};
    attempts.forEach((a: any) => {
        const key = `${a.exam}::${a.topic}`;
        if (!topicStats[key]) topicStats[key] = { correct: 0, total: 0, exam: a.exam };
        topicStats[key].total++;
        if (a.correct) topicStats[key].correct++;
    });

    const weakTopics = Object.entries(topicStats)
        .map(([key, s]) => ({ topic: key.split('::')[1], exam: s.exam, accuracy: Math.round((s.correct / s.total) * 100), total: s.total }))
        .filter(t => t.accuracy < 70)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 5);

    const totalQuestions = attempts.length;
    const correctTotal = attempts.filter((a: any) => a.correct).length;
    const overallAccuracy = Math.round((correctTotal / totalQuestions) * 100);

    // Generate plan with Claude
    const prompt = `You are a personalized study plan AI for exam preparation.

Student stats:
- Total questions answered: ${totalQuestions}
- Overall accuracy: ${overallAccuracy}%
- Weak topics needing work: ${weakTopics.map(t => `${t.exam} / ${t.topic} (${t.accuracy}% accuracy)`).join(', ') || 'none yet'}

Create a focused daily study plan for today. Return ONLY valid JSON:
{
  "greeting": "Short motivational greeting (1 sentence)",
  "focus_exam": "Main exam to focus on today",
  "tasks": [
    {
      "id": "1",
      "title": "Task title",
      "description": "What to do and why",
      "exam": "IELTS",
      "topic": "Topic name",
      "questions": 10,
      "difficulty": "medium",
      "priority": "high",
      "estimated_minutes": 15
    }
  ],
  "daily_goal": 30,
  "tip": "One practical study tip for today"
}
Include 3-4 tasks. Prioritize weak topics. Keep tasks focused and achievable.`;

    try {
        const message = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = message.content[0].type === 'text' ? message.content[0].text : '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON');
        const plan = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ plan });
    } catch (err) {
        console.error('Study plan error:', err);
        return NextResponse.json({ plan: defaultPlan() });
    }
}

function defaultPlan() {
    return {
        greeting: "Ready to level up today? Let's go!",
        focus_exam: 'IELTS',
        tasks: [
            { id: '1', title: 'Vocabulary Practice', description: 'Build your academic word bank', exam: 'IELTS', topic: 'Vocabulary Basics', questions: 10, difficulty: 'medium', priority: 'high', estimated_minutes: 15 },
            { id: '2', title: 'Reading Comprehension', description: 'Practice extracting key information', exam: 'IELTS', topic: 'Reading Comprehension', questions: 10, difficulty: 'medium', priority: 'medium', estimated_minutes: 15 },
        ],
        daily_goal: 20,
        tip: 'Consistency beats intensity. 20 minutes daily is better than 2 hours once a week.',
    };
}
