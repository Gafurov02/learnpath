import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { inflateSync } from 'zlib';

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const buf = await req.arrayBuffer();
        const compressed = Buffer.from(buf);

        // Decompress zlib
        const data = inflateSync(compressed);

        let pos = 0;
        const readInt = () => { const v = data.readUInt32LE(pos); pos += 4; return v; };
        const readStr = () => {
            const len = readInt();
            const str = data.subarray(pos, pos + len).toString('utf8');
            pos += len;
            return str;
        };

        // Skip header
        pos += 4; // version
        const titleLen = readInt(); pos += titleLen; // title
        pos += 4 + 4 + 8; // padding + unknown + timestamp
        const qCount = readInt();
        pos += 8; // padding

        const questions = [];
        for (let qi = 0; qi < qCount; qi++) {
            if (qi > 0) {
                const sep = data.readUInt32LE(pos);
                if (sep === 0) pos += 4;
            }
            const question = readStr();
            pos += 8; // unknown
            const optCount = readInt();
            const correctIndex = readInt();
            const options: string[] = [];
            for (let oi = 0; oi < optCount; oi++) {
                options.push(readStr());
                pos += 8; // unknown
            }
            questions.push({
                question,
                option_a: options[0] || '',
                option_b: options[1] || '',
                option_c: options[2] || '',
                option_d: options[3] || '',
                correct_index: correctIndex,
                explanation: `Правильный ответ: ${options[correctIndex] || ''}`,
                topic: 'General',
                difficulty: 'medium',
                exam: 'ЕГЭ',
                valid: !!(question && options.length >= 2),
            });
        }

        return NextResponse.json({ questions, count: questions.length });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}