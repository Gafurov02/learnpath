import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/server-supabase';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const admin = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { inviteCode } = await req.json();
  const normalizedCode = typeof inviteCode === 'string' ? inviteCode.trim().toLowerCase() : '';

  if (!normalizedCode) {
    return NextResponse.json({ error: 'invite_code_required' }, { status: 400 });
  }

  const { data: school, error: schoolError } = await admin
    .from('schools')
    .select('id, owner_id, max_students')
    .eq('invite_code', normalizedCode)
    .maybeSingle();

  if (schoolError) {
    return NextResponse.json({ error: schoolError.message }, { status: 500 });
  }

  if (!school) {
    return NextResponse.json({ error: 'invalid_invite_code' }, { status: 404 });
  }

  if (school.owner_id === user.id) {
    return NextResponse.json({ schoolId: school.id, alreadyMember: true, role: 'teacher' });
  }

  const { data: existingMembership, error: membershipError } = await admin
    .from('school_members')
    .select('school_id, role')
    .eq('school_id', school.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  if (existingMembership) {
    return NextResponse.json({
      schoolId: existingMembership.school_id,
      alreadyMember: true,
      role: existingMembership.role,
    });
  }

  const { count: studentCount, error: countError } = await admin
    .from('school_members')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', school.id)
    .eq('role', 'student');

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((studentCount ?? 0) >= school.max_students) {
    return NextResponse.json({ error: 'school_full' }, { status: 403 });
  }

  const { error: insertError } = await admin
    .from('school_members')
    .insert({ school_id: school.id, user_id: user.id, role: 'student' });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ schoolId: school.id, role: 'student' });
}
