import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/server-supabase';
import { getUserAvatarUrl, getUserDisplayName } from '@/lib/user-profile';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type SchoolRow = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
};

type SchoolMemberRow = {
  user_id: string;
  role: string;
  joined_at: string;
};

type MemberProfile = {
  display_name: string;
  avatar_url: string | null;
};

type SubscriptionRow = {
  user_id: string;
  xp: number | null;
};

type AttemptRow = {
  user_id: string;
  correct: boolean;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();
  const admin = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: school, error: schoolError } = await admin
    .from('schools')
    .select('id, name, invite_code, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (schoolError) {
    return NextResponse.json({ error: schoolError.message }, { status: 500 });
  }

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  const { data: viewerMembership, error: viewerMembershipError } = await admin
    .from('school_members')
    .select('role')
    .eq('school_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (viewerMembershipError) {
    return NextResponse.json({ error: viewerMembershipError.message }, { status: 500 });
  }

  const isOwner = school.owner_id === user.id;
  if (!isOwner && !viewerMembership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: memberRows, error: memberRowsError } = await admin
    .from('school_members')
    .select('user_id, role, joined_at')
    .eq('school_id', id)
    .order('joined_at', { ascending: false });

  if (memberRowsError) {
    return NextResponse.json({ error: memberRowsError.message }, { status: 500 });
  }

  const members = (memberRows ?? []) as SchoolMemberRow[];
  const userIds = [...new Set(members.map((member) => member.user_id))];

  let subscriptionRows: SubscriptionRow[] = [];
  let attemptRows: AttemptRow[] = [];

  if (userIds.length > 0) {
    const [subscriptionsResponse, attemptsResponse] = await Promise.all([
      admin.from('subscriptions').select('user_id, xp').in('user_id', userIds),
      admin.from('quiz_attempts').select('user_id, correct').in('user_id', userIds),
    ]);

    if (subscriptionsResponse.error) {
      return NextResponse.json({ error: subscriptionsResponse.error.message }, { status: 500 });
    }

    if (attemptsResponse.error) {
      return NextResponse.json({ error: attemptsResponse.error.message }, { status: 500 });
    }

    subscriptionRows = (subscriptionsResponse.data ?? []) as SubscriptionRow[];
    attemptRows = (attemptsResponse.data ?? []) as AttemptRow[];
  }

  const xpByUser = new Map(subscriptionRows.map((row) => [row.user_id, row.xp ?? 0]));
  const attemptsByUser = new Map<string, { total: number; correct: number }>();
  const profileEntries = await Promise.all(userIds.map(async (userId) => {
    const { data, error } = await admin.auth.admin.getUserById(userId);

    if (error || !data.user) {
      return [userId, {
        display_name: `User ${userId.slice(0, 8)}`,
        avatar_url: null,
      } satisfies MemberProfile] as const;
    }

    return [userId, {
      display_name: getUserDisplayName(data.user),
      avatar_url: getUserAvatarUrl(data.user),
    } satisfies MemberProfile] as const;
  }));
  const profileByUser = new Map(profileEntries);

  for (const attempt of attemptRows) {
    const current = attemptsByUser.get(attempt.user_id) ?? { total: 0, correct: 0 };
    current.total += 1;
    if (attempt.correct) {
      current.correct += 1;
    }
    attemptsByUser.set(attempt.user_id, current);
  }

  const enrichedMembers = members
    .map((member) => ({
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      display_name: profileByUser.get(member.user_id)?.display_name ?? `User ${member.user_id.slice(0, 8)}`,
      avatar_url: profileByUser.get(member.user_id)?.avatar_url ?? null,
      xp: xpByUser.get(member.user_id) ?? 0,
      total: attemptsByUser.get(member.user_id)?.total ?? 0,
      correct: attemptsByUser.get(member.user_id)?.correct ?? 0,
    }))
    .sort((left, right) => right.xp - left.xp);

  return NextResponse.json({
    school: school as SchoolRow,
    currentUserId: user.id,
    isTeacher: isOwner || viewerMembership?.role === 'teacher',
    members: enrichedMembers,
  });
}

export async function DELETE(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();
  const admin = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({})) as { userId?: unknown };
  const targetUserId = typeof payload.userId === 'string' ? payload.userId : '';

  if (!targetUserId) {
    return NextResponse.json({ error: 'user_id_required' }, { status: 400 });
  }

  const { data: school, error: schoolError } = await admin
    .from('schools')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (schoolError) {
    return NextResponse.json({ error: schoolError.message }, { status: 500 });
  }

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  const { data: viewerMembership, error: viewerMembershipError } = await admin
    .from('school_members')
    .select('role')
    .eq('school_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (viewerMembershipError) {
    return NextResponse.json({ error: viewerMembershipError.message }, { status: 500 });
  }

  const isManager = school.owner_id === user.id || viewerMembership?.role === 'teacher';
  if (!isManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (targetUserId === school.owner_id) {
    return NextResponse.json({ error: 'cannot_remove_owner' }, { status: 400 });
  }

  const { data: targetMembership, error: targetMembershipError } = await admin
    .from('school_members')
    .select('role')
    .eq('school_id', id)
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (targetMembershipError) {
    return NextResponse.json({ error: targetMembershipError.message }, { status: 500 });
  }

  if (!targetMembership) {
    return NextResponse.json({ error: 'member_not_found' }, { status: 404 });
  }

  if (targetMembership.role !== 'student' && school.owner_id !== user.id) {
    return NextResponse.json({ error: 'owner_required' }, { status: 403 });
  }

  const { error: deleteError } = await admin
    .from('school_members')
    .delete()
    .eq('school_id', id)
    .eq('user_id', targetUserId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
