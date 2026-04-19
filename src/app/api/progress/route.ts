import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function isMissingSessionIdColumn(message?: string | null) {
  return message?.includes('session_id') ?? false;
}

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { exam, topic, correct, difficulty, sessionId } = await req.json();

  const baseAttempt = {
    user_id: user.id,
    exam,
    topic,
    correct,
    difficulty,
  };

  let { error } = await supabase.from('quiz_attempts').insert({
    ...baseAttempt,
    session_id: sessionId ?? null,
  });

  if (error && isMissingSessionIdColumn(error.message)) {
    ({ error } = await supabase.from('quiz_attempts').insert(baseAttempt));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const exam = searchParams.get('exam');

  let query = supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (exam) query = query.eq('exam', exam);

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = data?.length ?? 0;
  const correct = data?.filter(r => r.correct).length ?? 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return NextResponse.json({ total, correct, accuracy, attempts: data });
}
