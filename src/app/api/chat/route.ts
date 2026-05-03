import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { hasProAccess } from '@/lib/subscription';
import { getServerEnv } from '@/lib/env/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/server-supabase';

export async function POST(req: NextRequest) {
    const env = getServerEnv();
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    // Check Pro
    const admin = createServiceRoleClient();
    const { data: sub } = await admin.from('subscriptions').select('plan, status').eq('user_id', user.id).single();
    if (!hasProAccess(sub)) return new Response('Pro required', { status: 403 });

    const { messages, exam, locale } = await req.json();

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const system = `You are an expert ${exam || 'exam'} tutor. Help students understand concepts, explain mistakes, and prepare for their exams.
${locale === 'ru' ? 'Отвечай на русском языке, если пользователь пишет по-русски.' : ''}
Be concise but thorough. Use examples. If explaining a concept, structure your answer clearly.
For grammar/vocabulary questions, always give examples.
Keep responses focused and educational.`;

    const stream = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system,
        messages,
        stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    controller.enqueue(encoder.encode(event.delta.text));
                }
            }
            controller.close();
        },
    });

    return new Response(readable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' },
    });
}
