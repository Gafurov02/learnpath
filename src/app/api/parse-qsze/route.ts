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
    const data = inflateSync(compressed);

    // From binary analysis: questions start at byte 92
    // Each question: separator(4, only between questions) + qLen(4) + qText + unknown(8) + optCount(4) + correctIdx(4) + [optLen(4) + optText + unknown(8)]
    let pos = 92;

    function readInt(): number {
      const v = data.readUInt32LE(pos);
      pos += 4;
      return v;
    }

    function readStr(): string {
      const len = readInt();
      const str = data.subarray(pos, pos + len).toString('utf8');
      pos += len;
      return str;
    }

    const questions = [];

    for (let qi = 0; qi < 500; qi++) {
      if (pos + 8 >= data.length) break;
      try {
        // 4-byte separator between questions (value = 0)
        if (qi > 0) {
          const sep = data.readUInt32LE(pos);
          if (sep === 0) pos += 4;
        }

        // Read question text
        const qLen = data.readUInt32LE(pos);
        if (qLen === 0 || qLen > 5000 || pos + 4 + qLen > data.length) break;
        const question = readStr();
        pos += 8; // unknown bytes

        // Read options
        const optCount = readInt();
        if (optCount < 2 || optCount > 8) break;
        const correctIndex = readInt();
        const options: string[] = [];

        for (let oi = 0; oi < optCount; oi++) {
          const oLen = data.readUInt32LE(pos);
          if (oLen === 0 || oLen > 2000 || pos + 4 + oLen > data.length) break;
          options.push(readStr());
          pos += 8; // unknown bytes
        }

        if (options.length < 2) break;

        questions.push({
          question,
          option_a: options[0] || '',
          option_b: options[1] || '',
          option_c: options[2] || '',
          option_d: options[3] || '',
          correct_index: correctIndex,
          explanation: `Правильный ответ: ${options[correctIndex] || options[0]}`,
          topic: 'General',
          difficulty: 'medium',
          exam: 'ЕГЭ',
          valid: true,
        });
      } catch {
        break;
      }
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions found in file' }, { status: 400 });
    }

    return NextResponse.json({ questions, count: questions.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}