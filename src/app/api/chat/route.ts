import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { hasProAccess } from '@/lib/subscription';

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    // Check Pro
    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: sub } = await admin.from('subscriptions').select('plan, status').eq('user_id', user.id).single();
    if (!hasProAccess(sub)) return new Response('Pro required', { status: 403 });

    const { messages, exam, locale } = await req.json();

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
