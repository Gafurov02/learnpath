import type { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { AdminConsole, type AdminActivityRow, type AdminOverview, type AdminSchoolRow, type AdminUserRow } from '@/components/admin/AdminConsole';
import { isAdminUser } from '@/lib/admin-access';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/server-supabase';
import { hasProAccess } from '@/lib/subscription';

type PageProps = {
  params: Promise<{ locale: string }>;
};

type SubscriptionRow = {
  user_id: string;
  plan: string | null;
  status: string | null;
  xp: number | null;
  level: string | null;
};

type SchoolRow = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
};

type SchoolMemberRow = {
  school_id: string;
  user_id: string;
  role: string;
};

type AttemptRow = {
  user_id: string;
  exam: string;
  correct: boolean;
  created_at: string;
};

function getDisplayName(user: User) {
  const fullName = user.user_metadata?.full_name;
  if (typeof fullName === 'string' && fullName.trim() !== '') {
    return fullName;
  }

  return user.email?.split('@')[0] ?? 'User';
}

function getProvider(user: User) {
  const provider = user.app_metadata?.provider;
  return typeof provider === 'string' ? provider : null;
}

async function getAdminPageData() {
  const userClient = await createServerSupabaseClient();
  const { data: { user } } = await userClient.auth.getUser();

  return { user };
}

export default async function AdminPage({ params }: PageProps) {
  const { locale } = await params;
  const { user } = await getAdminPageData();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  if (!isAdminUser(user)) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
        <AppNavbar />
        <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px' }}>
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 24, padding: '34px 32px' }}>
            <div style={{ fontSize: 12, color: '#6B5CE7', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              {locale === 'ru' ? 'Admin Access' : 'Admin Access'}
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400, letterSpacing: '-1px', margin: 0 }}>
              {locale === 'ru' ? 'Доступ к админке пока не выдан' : 'Admin access is not enabled yet'}
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'hsl(var(--muted-foreground))', marginTop: 14, marginBottom: 18 }}>
              {locale === 'ru'
                ? 'Сама панель уже готова, но для этой учётки нет platform-admin прав. Разрешить вход можно через переменную окружения `ADMIN_EMAILS` или через `app_metadata/user_metadata.role = admin`.'
                : 'The admin console is ready, but this account does not have platform-admin permissions yet. Access can be granted via the `ADMIN_EMAILS` environment variable or via `app_metadata/user_metadata.role = admin`.'}
            </p>
            <div style={{ background: 'hsl(var(--background))', borderRadius: 16, padding: '14px 16px', fontSize: 13 }}>
              <div style={{ color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>
                {locale === 'ru' ? 'Текущий email' : 'Signed in email'}
              </div>
              <div style={{ fontWeight: 600 }}>{user.email ?? 'unknown'}</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const admin = createServiceRoleClient();
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [
    usersResponse,
    subscriptionsResponse,
    schoolsResponse,
    schoolMembersResponse,
    recentAttemptsResponse,
    attemptsTodayRowsResponse,
    totalAttemptsResponse,
    attemptsTodayCountResponse,
    customQuestionsCountResponse,
  ] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    admin.from('subscriptions').select('user_id, plan, status, xp, level'),
    admin.from('schools').select('id, name, invite_code, owner_id, created_at').order('created_at', { ascending: false }),
    admin.from('school_members').select('school_id, user_id, role'),
    admin.from('quiz_attempts').select('user_id, exam, correct, created_at').order('created_at', { ascending: false }).limit(400),
    admin.from('quiz_attempts').select('user_id').gte('created_at', startOfToday.toISOString()).limit(5000),
    admin.from('quiz_attempts').select('*', { count: 'exact', head: true }),
    admin.from('quiz_attempts').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday.toISOString()),
    admin.from('custom_questions').select('*', { count: 'exact', head: true }),
  ]);

  const users = usersResponse.data?.users ?? [];
  const subscriptions = (subscriptionsResponse.data ?? []) as SubscriptionRow[];
  const schools = (schoolsResponse.data ?? []) as SchoolRow[];
  const schoolMembers = (schoolMembersResponse.data ?? []) as SchoolMemberRow[];
  const recentAttempts = (recentAttemptsResponse.data ?? []) as AttemptRow[];
  const attemptsTodayRows = (attemptsTodayRowsResponse.data ?? []) as Pick<AttemptRow, 'user_id'>[];

  const userMap = new Map(users.map((item) => [item.id, item]));
  const subscriptionMap = new Map(subscriptions.map((item) => [item.user_id, item]));

  const schoolCountByUser = new Map<string, number>();
  const schoolStatsBySchool = new Map<string, { members: number; teachers: number; students: number }>();
  for (const membership of schoolMembers) {
    schoolCountByUser.set(membership.user_id, (schoolCountByUser.get(membership.user_id) ?? 0) + 1);

    const current = schoolStatsBySchool.get(membership.school_id) ?? { members: 0, teachers: 0, students: 0 };
    current.members += 1;
    if (membership.role === 'teacher') {
      current.teachers += 1;
    }
    if (membership.role === 'student') {
      current.students += 1;
    }
    schoolStatsBySchool.set(membership.school_id, current);
  }

  const recentAttemptsCountByUser = new Map<string, number>();
  const lastAttemptByUser = new Map<string, string>();
  for (const attempt of recentAttempts) {
    recentAttemptsCountByUser.set(attempt.user_id, (recentAttemptsCountByUser.get(attempt.user_id) ?? 0) + 1);
    if (!lastAttemptByUser.has(attempt.user_id)) {
      lastAttemptByUser.set(attempt.user_id, attempt.created_at);
    }
  }

  const adminUsers: AdminUserRow[] = users
    .map((item) => {
      const subscription = subscriptionMap.get(item.id);
      return {
        id: item.id,
        email: item.email ?? 'unknown',
        fullName: getDisplayName(item),
        createdAt: item.created_at,
        lastSignInAt: item.last_sign_in_at ?? null,
        provider: getProvider(item),
        isAdmin: isAdminUser(item),
        plan: subscription?.plan ?? 'free',
        status: subscription?.status ?? 'free',
        hasPro: hasProAccess(subscription),
        xp: subscription?.xp ?? 0,
        level: subscription?.level ?? 'beginner',
        schoolCount: schoolCountByUser.get(item.id) ?? 0,
        recentAttempts: recentAttemptsCountByUser.get(item.id) ?? 0,
        lastAttemptAt: lastAttemptByUser.get(item.id) ?? null,
      };
    })
    .sort((left, right) => {
      if (left.hasPro !== right.hasPro) {
        return Number(right.hasPro) - Number(left.hasPro);
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  const adminSchools: AdminSchoolRow[] = schools.map((school) => {
    const owner = userMap.get(school.owner_id);
    const stats = schoolStatsBySchool.get(school.id) ?? { members: 0, teachers: 0, students: 0 };

    return {
      id: school.id,
      name: school.name,
      inviteCode: school.invite_code,
      ownerEmail: owner?.email ?? 'unknown',
      createdAt: school.created_at,
      memberCount: stats.members,
      teacherCount: stats.teachers,
      studentCount: stats.students,
    };
  });

  const activities: AdminActivityRow[] = recentAttempts.slice(0, 16).map((attempt, index) => ({
    id: `${attempt.user_id}-${attempt.created_at}-${index}`,
    email: userMap.get(attempt.user_id)?.email ?? 'unknown',
    exam: attempt.exam,
    correct: attempt.correct,
    createdAt: attempt.created_at,
  }));

  const uniqueActiveLearnersToday = new Set(attemptsTodayRows.map((row) => row.user_id)).size;

  const overview: AdminOverview = {
    totalUsers: users.length,
    adminUsers: adminUsers.filter((item) => item.isAdmin).length,
    proUsers: adminUsers.filter((item) => item.hasPro).length,
    totalAttempts: totalAttemptsResponse.count ?? 0,
    attemptsToday: attemptsTodayCountResponse.count ?? 0,
    activeLearnersToday: uniqueActiveLearnersToday,
    schools: adminSchools.length,
    schoolMembers: schoolMembers.length,
    customQuestions: customQuestionsCountResponse.count ?? 0,
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <AppNavbar />
      <AdminConsole
        locale={locale}
        currentUserEmail={user.email ?? 'unknown'}
        overview={overview}
        users={adminUsers}
        schools={adminSchools}
        activities={activities}
      />
    </div>
  );
}
