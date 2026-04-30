import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/server-supabase';
import { awardUserAchievements } from '@/lib/achievements';

const MAX_IMPORT_QUESTIONS = 500;
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

type RouteContext = {
  params: Promise<{ id: string }>;
};

type IncomingQuestion = {
  question?: unknown;
  options?: unknown;
  correct_index?: unknown;
  explanation?: unknown;
  topic?: unknown;
  difficulty?: unknown;
  exam?: unknown;
};

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeQuestion(question: IncomingQuestion, createdBy: string, schoolId: string) {
  const options = Array.isArray(question.options)
    ? question.options.map(asString).filter(Boolean)
    : [];
  const correctIndex = typeof question.correct_index === 'number' && Number.isInteger(question.correct_index)
    ? question.correct_index
    : Number(question.correct_index);
  const difficulty = asString(question.difficulty).toLowerCase();

  if (
    !asString(question.question) ||
    options.length < 2 ||
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex >= options.length
  ) {
    return null;
  }

  return {
    school_id: schoolId,
    created_by: createdBy,
    exam: asString(question.exam) || 'ЕГЭ',
    topic: asString(question.topic) || 'General',
    question: asString(question.question),
    options,
    correct_index: correctIndex,
    explanation: asString(question.explanation),
    difficulty: VALID_DIFFICULTIES.has(difficulty) ? difficulty : 'medium',
    active: true,
  };
}

async function canManageSchool(admin: ReturnType<typeof createServiceRoleClient>, schoolId: string, userId: string) {
  const { data: school, error: schoolError } = await admin
    .from('schools')
    .select('owner_id')
    .eq('id', schoolId)
    .maybeSingle();

  if (schoolError) {
    throw new Error(schoolError.message);
  }

  if (!school) {
    return { ok: false, status: 404, error: 'school_not_found' };
  }

  if (school.owner_id === userId) {
    return { ok: true };
  }

  const { data: membership, error: membershipError } = await admin
    .from('school_members')
    .select('role')
    .eq('school_id', schoolId)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (membership?.role === 'teacher') {
    return { ok: true };
  }

  return { ok: false, status: 403, error: 'forbidden' };
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id: schoolId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const admin = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const access = await canManageSchool(admin, schoolId, user.id);

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const payload = await req.json();
    const incomingQuestions: unknown[] = Array.isArray(payload?.questions) ? payload.questions : [];

    if (incomingQuestions.length === 0) {
      return NextResponse.json({ error: 'questions_required' }, { status: 400 });
    }

    if (incomingQuestions.length > MAX_IMPORT_QUESTIONS) {
      return NextResponse.json(
        { error: 'too_many_questions', limit: MAX_IMPORT_QUESTIONS },
        { status: 413 }
      );
    }

    const rows = incomingQuestions
      .map((question) => normalizeQuestion(question as IncomingQuestion, user.id, schoolId))
      .filter((question): question is NonNullable<ReturnType<typeof normalizeQuestion>> => question !== null);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'no_valid_questions' }, { status: 400 });
    }

    const { error: insertError } = await admin.from('custom_questions').insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { count, error: countError } = await admin
      .from('custom_questions')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const achievementChecks: string[] = ['question_importer'];
    if ((count ?? 0) >= 50) achievementChecks.push('question_bank_50');
    if ((count ?? 0) >= 200) achievementChecks.push('question_bank_200');

    const newAchievements = await awardUserAchievements(admin, user.id, achievementChecks);

    return NextResponse.json({
      imported: rows.length,
      skipped: incomingQuestions.length - rows.length,
      totalQuestions: count ?? rows.length,
      newAchievements,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
