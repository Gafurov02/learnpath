import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const EXAMS = ['IELTS', 'SAT', 'TOEFL', 'GMAT', 'GRE', 'ЕГЭ'];

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: sub } = await admin.from('subscriptions').select('plan').eq('user_id', user.id).single();
    if (sub?.plan !== 'pro') return NextResponse.json({ error: 'Pro required' }, { status: 403 });

    const { exam = 'IELTS', count = 20 } = await req.json();
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `Generate ${count} multiple-choice questions for ${exam} exam practice.
Mix of easy, medium, and hard difficulties. Vary the topics.
Return ONLY a JSON array:
[
  {
    "question": "question text",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "brief explanation",
    "topic": "topic name",
    "exam": "${exam}",
    "difficulty": "medium"
  }
]`;

    try {
        const message = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
        });
        const text = message.content[0].type === 'text' ? message.content[0].text : '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('No JSON array');
        const questions = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ questions });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}