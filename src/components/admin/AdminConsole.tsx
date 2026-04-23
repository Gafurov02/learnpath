'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

export type AdminOverview = {
  totalUsers: number;
  adminUsers: number;
  proUsers: number;
  totalAttempts: number;
  attemptsToday: number;
  activeLearnersToday: number;
  schools: number;
  schoolMembers: number;
  customQuestions: number;
};

export type AdminUserRow = {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  lastSignInAt: string | null;
  provider: string | null;
  isAdmin: boolean;
  plan: string | null;
  status: string | null;
  hasPro: boolean;
  xp: number;
  level: string | null;
  schoolCount: number;
  recentAttempts: number;
  lastAttemptAt: string | null;
};

export type AdminSchoolRow = {
  id: string;
  name: string;
  inviteCode: string;
  ownerEmail: string;
  createdAt: string;
  memberCount: number;
  teacherCount: number;
  studentCount: number;
};

export type AdminActivityRow = {
  id: string;
  email: string;
  exam: string;
  correct: boolean;
  createdAt: string;
};

type Props = {
  locale: string;
  currentUserEmail: string;
  generatedAt: string;
  overview: AdminOverview;
  users: AdminUserRow[];
  schools: AdminSchoolRow[];
  activities: AdminActivityRow[];
};

type TabKey = 'overview' | 'users' | 'schools';
type UserFilterKey = 'all' | 'pro' | 'free' | 'admins' | 'school' | 'inactive';
type SchoolFilterKey = 'all' | 'active' | 'empty' | 'single_teacher';

function formatDate(locale: string, value: string | null) {
  if (!value) {
    return locale === 'ru' ? 'Нет данных' : 'No data';
  }

  return new Date(value).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatCard({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint: string;
  color: string;
}) {
  return (
    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: '18px 20px' }}>
      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 600, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{hint}</div>
    </div>
  );
}

export function AdminConsole({ locale, currentUserEmail, generatedAt, overview, users, schools, activities }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [query, setQuery] = useState('');
  const [usersState, setUsersState] = useState(users);
  const [pendingUserId, setPendingUserId] = useState('');
  const [actionError, setActionError] = useState('');
  const [copiedSchoolId, setCopiedSchoolId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilterKey>('all');
  const [schoolFilter, setSchoolFilter] = useState<SchoolFilterKey>('all');
  const [isRefreshing, startRefreshTransition] = useTransition();

  useEffect(() => {
    setUsersState(users);
  }, [users]);

  useEffect(() => {
    if (selectedUserId && !usersState.some((user) => user.id === selectedUserId)) {
      setSelectedUserId('');
    }
  }, [selectedUserId, usersState]);

  useEffect(() => {
    if (selectedSchoolId && !schools.some((school) => school.id === selectedSchoolId)) {
      setSelectedSchoolId('');
    }
  }, [schools, selectedSchoolId]);

  const refreshConsole = () => {
    startRefreshTransition(() => {
      router.refresh();
    });
  };

  useLiveRefresh({
    enabled: pendingUserId === '',
    intervalMs: 20000,
    onRefresh: refreshConsole,
  });

  const normalizedQuery = query.trim().toLowerCase();

  const filteredUsers = useMemo(() => (
    usersState.filter((user) => {
      const matchesQuery = normalizedQuery === '' || (
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.fullName.toLowerCase().includes(normalizedQuery) ||
        user.id.toLowerCase().includes(normalizedQuery)
      );

      if (!matchesQuery) {
        return false;
      }

      switch (userFilter) {
        case 'pro':
          return user.hasPro;
        case 'free':
          return !user.hasPro;
        case 'admins':
          return user.isAdmin;
        case 'school':
          return user.schoolCount > 0;
        case 'inactive':
          return user.lastAttemptAt === null;
        default:
          return true;
      }
    })
  ), [normalizedQuery, userFilter, usersState]);

  const filteredSchools = useMemo(() => (
    schools.filter((school) => {
      const matchesQuery = normalizedQuery === '' || (
        school.name.toLowerCase().includes(normalizedQuery) ||
        school.ownerEmail.toLowerCase().includes(normalizedQuery) ||
        school.inviteCode.toLowerCase().includes(normalizedQuery)
      );

      if (!matchesQuery) {
        return false;
      }

      switch (schoolFilter) {
        case 'active':
          return school.studentCount > 0;
        case 'empty':
          return school.memberCount === 0;
        case 'single_teacher':
          return school.teacherCount === 1;
        default:
          return true;
      }
    })
  ), [normalizedQuery, schoolFilter, schools]);

  const recentUsers = [...usersState]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6);

  const selectedUser = usersState.find((user) => user.id === selectedUserId) ?? null;
  const selectedSchool = schools.find((school) => school.id === selectedSchoolId) ?? null;

  async function updateUserAccess(userId: string, access: 'pro' | 'free') {
    setPendingUserId(userId);
    setActionError('');

    try {
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access }),
      });

      const payload = (await response.json()) as {
        error?: string;
        subscription?: { plan: string | null; status: string | null; xp?: number | null; level?: string | null };
        hasProAccess?: boolean;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update access');
      }

      setUsersState((currentUsers) => currentUsers.map((user) => (
        user.id === userId
          ? {
            ...user,
            plan: payload.subscription?.plan ?? user.plan,
            status: payload.subscription?.status ?? user.status,
            hasPro: payload.hasProAccess ?? user.hasPro,
            xp: payload.subscription?.xp ?? user.xp,
            level: payload.subscription?.level ?? user.level,
          }
          : user
      )));
      refreshConsole();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update access';
      setActionError(message);
    } finally {
      setPendingUserId('');
    }
  }

  async function copyInviteCode(schoolId: string, inviteCode: string) {
    await navigator.clipboard.writeText(inviteCode);
    setCopiedSchoolId(schoolId);
    setTimeout(() => setCopiedSchoolId(''), 2000);
  }

  const tabStyle = (tab: TabKey): React.CSSProperties => ({
    flex: 1,
    padding: '9px 14px',
    borderRadius: 10,
    border: 'none',
    background: activeTab === tab ? 'hsl(var(--background))' : 'transparent',
    color: activeTab === tab ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
  });

  const filterChipStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(107,92,231,0.12)' : 'transparent',
    color: active ? '#6B5CE7' : 'hsl(var(--muted-foreground))',
    border: `1px solid ${active ? 'rgba(107,92,231,0.18)' : 'hsl(var(--border))'}`,
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  });

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 12, color: '#6B5CE7', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            {locale === 'ru' ? 'Platform Admin' : 'Platform Admin'}
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(30px, 4vw, 42px)', fontWeight: 400, letterSpacing: '-1px', margin: 0 }}>
            {locale === 'ru' ? 'Операционная панель' : 'Operations Console'}
          </h1>
          <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginTop: 10, marginBottom: 6, maxWidth: 720 }}>
            {locale === 'ru'
              ? 'Следи за пользователями, подписками, школами и общей активностью платформы из одной панели.'
              : 'Monitor users, subscriptions, schools, and platform activity from one operational dashboard.'}
          </p>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
            {locale === 'ru' ? 'Последняя синхронизация' : 'Last sync'}: {formatDate(locale, generatedAt)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '14px 16px', minWidth: 240 }}>
            <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>
              {locale === 'ru' ? 'Текущий админ' : 'Signed in as'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{currentUserEmail}</div>
          </div>
          <button
            type="button"
            onClick={refreshConsole}
            disabled={isRefreshing}
            style={{ background: '#6B5CE7', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {isRefreshing ? (locale === 'ru' ? 'Обновляю...' : 'Refreshing...') : (locale === 'ru' ? 'Обновить данные' : 'Refresh data')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard
          label={locale === 'ru' ? 'Пользователи' : 'Users'}
          value={overview.totalUsers.toLocaleString()}
          hint={locale === 'ru' ? `${overview.adminUsers} админов` : `${overview.adminUsers} admins`}
          color="#6B5CE7"
        />
        <StatCard
          label={locale === 'ru' ? 'Pro доступ' : 'Pro access'}
          value={overview.proUsers.toLocaleString()}
          hint={locale === 'ru' ? 'активных доступов' : 'active unlocked accounts'}
          color="#22C07A"
        />
        <StatCard
          label={locale === 'ru' ? 'Попытки сегодня' : 'Attempts today'}
          value={overview.attemptsToday.toLocaleString()}
          hint={locale === 'ru' ? `${overview.activeLearnersToday} активных учеников` : `${overview.activeLearnersToday} active learners`}
          color="#EF9F27"
        />
        <StatCard
          label={locale === 'ru' ? 'Школы' : 'Schools'}
          value={overview.schools.toLocaleString()}
          hint={locale === 'ru' ? `${overview.schoolMembers} участников` : `${overview.schoolMembers} memberships`}
          color="#378ADD"
        />
        <StatCard
          label={locale === 'ru' ? 'Всего попыток' : 'Total attempts'}
          value={overview.totalAttempts.toLocaleString()}
          hint={locale === 'ru' ? `${overview.customQuestions} кастомных вопросов` : `${overview.customQuestions} custom questions`}
          color="#BA7517"
        />
      </div>

      <div style={{ display: 'flex', gap: 4, background: 'hsl(var(--muted))', borderRadius: 12, padding: 4, marginBottom: 18 }}>
        <button type="button" onClick={() => setActiveTab('overview')} style={tabStyle('overview')}>
          {locale === 'ru' ? 'Обзор' : 'Overview'}
        </button>
        <button type="button" onClick={() => setActiveTab('users')} style={tabStyle('users')}>
          {locale === 'ru' ? 'Пользователи' : 'Users'}
        </button>
        <button type="button" onClick={() => setActiveTab('schools')} style={tabStyle('schools')}>
          {locale === 'ru' ? 'Школы' : 'Schools'}
        </button>
      </div>

      <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === 'ru' ? 'Поиск по email, имени, user id, школе или invite code' : 'Search by email, name, user id, school, or invite code'}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'hsl(var(--foreground))', fontSize: 14, fontFamily: 'inherit' }}
        />
      </div>

      {activeTab === 'users' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { key: 'all', label: locale === 'ru' ? 'Все' : 'All' },
            { key: 'pro', label: 'Pro' },
            { key: 'free', label: 'Free' },
            { key: 'admins', label: 'Admins' },
            { key: 'school', label: locale === 'ru' ? 'Со школами' : 'In schools' },
            { key: 'inactive', label: locale === 'ru' ? 'Без попыток' : 'No attempts' },
          ].map((filter) => (
            <button key={filter.key} type="button" onClick={() => setUserFilter(filter.key as UserFilterKey)} style={filterChipStyle(userFilter === filter.key)}>
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'schools' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { key: 'all', label: locale === 'ru' ? 'Все' : 'All' },
            { key: 'active', label: locale === 'ru' ? 'Есть студенты' : 'With students' },
            { key: 'empty', label: locale === 'ru' ? 'Пустые' : 'Empty' },
            { key: 'single_teacher', label: locale === 'ru' ? '1 учитель' : 'Single teacher' },
          ].map((filter) => (
            <button key={filter.key} type="button" onClick={() => setSchoolFilter(filter.key as SchoolFilterKey)} style={filterChipStyle(schoolFilter === filter.key)}>
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {actionError && (
        <div style={{ marginBottom: 16, background: 'rgba(232,64,64,0.08)', border: '1px solid rgba(232,64,64,0.25)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#E84040' }}>
          {actionError}
        </div>
      )}

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 18, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {locale === 'ru' ? 'Новые пользователи' : 'Recent users'}
                </div>
                <button type="button" onClick={() => { setActiveTab('users'); setUserFilter('pro'); }} style={filterChipStyle(false)}>
                  {locale === 'ru' ? 'Открыть Pro-пользователей' : 'Open Pro users'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentUsers.map((user) => (
                  <button key={user.id} type="button" onClick={() => { setSelectedUserId(user.id); setActiveTab('users'); }} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: '1px solid hsl(var(--border))', background: 'transparent', borderLeft: 'none', borderRight: 'none', borderTop: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{user.fullName}</div>
                      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{user.email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: user.hasPro ? '#22C07A' : 'hsl(var(--foreground))' }}>
                        {user.hasPro ? 'Pro' : 'Free'}
                      </div>
                      <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{formatDate(locale, user.createdAt)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 18, padding: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
                {locale === 'ru' ? 'Свежая активность' : 'Recent activity'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activities.map((activity) => (
                  <div key={activity.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'hsl(var(--background))' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{activity.email}</div>
                      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{activity.exam}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: activity.correct ? '#22C07A' : '#E84040' }}>
                        {activity.correct ? (locale === 'ru' ? 'Верно' : 'Correct') : (locale === 'ru' ? 'Ошибка' : 'Wrong')}
                      </div>
                      <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{formatDate(locale, activity.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={{ background: 'linear-gradient(135deg, #101828 0%, #243b6b 100%)', borderRadius: 18, padding: 22, color: '#fff' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                {locale === 'ru' ? 'Операционная заметка' : 'Ops note'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 10 }}>
                {locale === 'ru' ? 'Панель уже живёт, а не просто показывает снапшот' : 'The console is now live, not just a snapshot'}
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
                {locale === 'ru'
                  ? 'Проверяй overview, быстро фильтруй пользователей и школы, а затем открывай нужный объект в один клик. Автообновление держит картину свежей даже без ручного reload.'
                  : 'Use overview to spot changes, filter users and schools quickly, and jump into the exact object you need. Auto-refresh keeps the operational picture fresh without manual reloads.'}
              </p>
            </section>

            <section style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 18, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {locale === 'ru' ? 'Школы под наблюдением' : 'Schools snapshot'}
                </div>
                <button type="button" onClick={() => { setActiveTab('schools'); setSchoolFilter('active'); }} style={filterChipStyle(false)}>
                  {locale === 'ru' ? 'Открыть активные школы' : 'Open active schools'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {schools.slice(0, 6).map((school) => (
                  <button key={school.id} type="button" onClick={() => { setSelectedSchoolId(school.id); setActiveTab('schools'); }} style={{ padding: '12px 14px', borderRadius: 12, background: 'hsl(var(--background))', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{school.name}</div>
                        <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{school.ownerEmail}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{school.memberCount}</div>
                        <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                          {locale === 'ru' ? 'участников' : 'members'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selectedUser && (
            <section style={{ background: 'linear-gradient(135deg, rgba(107,92,231,0.08), rgba(55,138,221,0.08))', border: '1px solid rgba(107,92,231,0.18)', borderRadius: 20, padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6B5CE7', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    {locale === 'ru' ? 'Фокус на пользователе' : 'Focused user'}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>{selectedUser.fullName}</div>
                  <div style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>{selectedUser.email}</div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>id: <code style={{ fontSize: 11 }}>{selectedUser.id}</code></span>
                    <span>{locale === 'ru' ? 'провайдер' : 'provider'}: {selectedUser.provider ?? 'unknown'}</span>
                    <span>{locale === 'ru' ? 'последний вход' : 'last sign-in'}: {formatDate(locale, selectedUser.lastSignInAt)}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(88px, 1fr))', gap: 10, minWidth: 320 }}>
                  {[
                    { label: 'XP', value: selectedUser.xp.toLocaleString(), color: '#6B5CE7' },
                    { label: locale === 'ru' ? 'уровень' : 'level', value: selectedUser.level ?? '—', color: '#378ADD' },
                    { label: locale === 'ru' ? 'школы' : 'schools', value: selectedUser.schoolCount.toString(), color: '#BA7517' },
                    { label: locale === 'ru' ? 'попытки' : 'attempts', value: selectedUser.recentAttempts.toString(), color: '#22C07A' },
                  ].map((item) => (
                    <div key={item.label} style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 12, padding: '12px' }}>
                      <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                  {locale === 'ru' ? 'подписка' : 'subscription'}: <strong style={{ color: 'hsl(var(--foreground))' }}>{selectedUser.plan ?? 'free'}</strong> · {locale === 'ru' ? 'статус' : 'status'}: <strong style={{ color: 'hsl(var(--foreground))' }}>{selectedUser.status ?? 'free'}</strong> · {locale === 'ru' ? 'последняя активность' : 'last activity'}: <strong style={{ color: 'hsl(var(--foreground))' }}>{formatDate(locale, selectedUser.lastAttemptAt)}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={pendingUserId === selectedUser.id || selectedUser.hasPro}
                    onClick={() => updateUserAccess(selectedUser.id, 'pro')}
                    style={{ background: selectedUser.hasPro ? 'rgba(34,192,122,0.12)' : '#6B5CE7', color: selectedUser.hasPro ? '#22C07A' : '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: selectedUser.hasPro ? 'default' : 'pointer', fontFamily: 'inherit' }}
                  >
                    {pendingUserId === selectedUser.id ? '...' : (locale === 'ru' ? 'Выдать Pro' : 'Grant Pro')}
                  </button>
                  <button
                    type="button"
                    disabled={pendingUserId === selectedUser.id || !selectedUser.hasPro}
                    onClick={() => updateUserAccess(selectedUser.id, 'free')}
                    style={{ background: 'transparent', color: selectedUser.hasPro ? '#E84040' : 'hsl(var(--muted-foreground))', border: '1px solid rgba(232,64,64,0.2)', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: selectedUser.hasPro ? 'pointer' : 'default', fontFamily: 'inherit' }}
                  >
                    {pendingUserId === selectedUser.id ? '...' : (locale === 'ru' ? 'Снять Pro' : 'Revoke Pro')}
                  </button>
                </div>
              </div>
            </section>
          )}

          {filteredUsers.map((user) => {
            const isPending = pendingUserId === user.id;
            const isSelected = selectedUserId === user.id;

            return (
              <section key={user.id} style={{ background: 'hsl(var(--card))', border: `1px solid ${isSelected ? '#6B5CE7' : 'hsl(var(--border))'}`, borderRadius: 18, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{user.fullName}</div>
                      {user.hasPro && <span style={{ fontSize: 11, background: 'rgba(34,192,122,0.12)', color: '#22C07A', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>PRO</span>}
                      {user.isAdmin && <span style={{ fontSize: 11, background: 'rgba(107,92,231,0.12)', color: '#6B5CE7', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>ADMIN</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>{user.email}</div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>id: <code style={{ fontSize: 11 }}>{user.id.slice(0, 12)}...</code></span>
                      <span>{locale === 'ru' ? 'провайдер' : 'provider'}: {user.provider ?? 'unknown'}</span>
                      <span>{locale === 'ru' ? 'регистрация' : 'joined'}: {formatDate(locale, user.createdAt)}</span>
                      <span>{locale === 'ru' ? 'последний вход' : 'last sign-in'}: {formatDate(locale, user.lastSignInAt)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(92px, 1fr))', gap: 10, minWidth: 320, flex: 1 }}>
                    {[
                      { label: 'XP', value: user.xp.toLocaleString(), color: '#6B5CE7' },
                      { label: locale === 'ru' ? 'уровень' : 'level', value: user.level ?? '—', color: '#378ADD' },
                      { label: locale === 'ru' ? 'школы' : 'schools', value: user.schoolCount.toString(), color: '#BA7517' },
                      { label: locale === 'ru' ? 'последние попытки' : 'recent attempts', value: user.recentAttempts.toString(), color: '#22C07A' },
                    ].map((item) => (
                      <div key={item.label} style={{ background: 'hsl(var(--background))', borderRadius: 12, padding: '12px 12px' }}>
                        <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                    {locale === 'ru' ? 'подписка' : 'subscription'}: <strong style={{ color: 'hsl(var(--foreground))' }}>{user.plan ?? 'free'}</strong> · {locale === 'ru' ? 'статус' : 'status'}: <strong style={{ color: 'hsl(var(--foreground))' }}>{user.status ?? 'free'}</strong> · {locale === 'ru' ? 'последняя активность' : 'last activity'}: <strong style={{ color: 'hsl(var(--foreground))' }}>{formatDate(locale, user.lastAttemptAt)}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => setSelectedUserId(user.id)} style={filterChipStyle(isSelected)}>
                      {locale === 'ru' ? 'Фокус' : 'Focus'}
                    </button>
                    <button
                      type="button"
                      disabled={isPending || user.hasPro}
                      onClick={() => updateUserAccess(user.id, 'pro')}
                      style={{ background: user.hasPro ? 'rgba(34,192,122,0.12)' : '#6B5CE7', color: user.hasPro ? '#22C07A' : '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: user.hasPro ? 'default' : 'pointer', fontFamily: 'inherit' }}
                    >
                      {isPending ? '...' : (locale === 'ru' ? 'Выдать Pro' : 'Grant Pro')}
                    </button>
                    <button
                      type="button"
                      disabled={isPending || !user.hasPro}
                      onClick={() => updateUserAccess(user.id, 'free')}
                      style={{ background: 'transparent', color: user.hasPro ? '#E84040' : 'hsl(var(--muted-foreground))', border: '1px solid rgba(232,64,64,0.2)', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: user.hasPro ? 'pointer' : 'default', fontFamily: 'inherit' }}
                    >
                      {isPending ? '...' : (locale === 'ru' ? 'Снять Pro' : 'Revoke Pro')}
                    </button>
                  </div>
                </div>
              </section>
            );
          })}

          {filteredUsers.length === 0 && (
            <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 18, padding: '36px 24px', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              {locale === 'ru' ? 'Пользователи по такому запросу не найдены.' : 'No users matched your search.'}
            </div>
          )}
        </div>
      )}

      {activeTab === 'schools' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selectedSchool && (
            <section style={{ background: 'linear-gradient(135deg, rgba(34,192,122,0.08), rgba(107,92,231,0.08))', border: '1px solid rgba(34,192,122,0.18)', borderRadius: 20, padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#22C07A', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    {locale === 'ru' ? 'Фокус на школе' : 'Focused school'}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>{selectedSchool.name}</div>
                  <div style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>{selectedSchool.ownerEmail}</div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>{locale === 'ru' ? 'создана' : 'created'}: {formatDate(locale, selectedSchool.createdAt)}</span>
                    <span>id: <code style={{ fontSize: 11 }}>{selectedSchool.id}</code></span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(88px, 1fr))', gap: 10, minWidth: 280 }}>
                  {[
                    { label: locale === 'ru' ? 'участники' : 'members', value: selectedSchool.memberCount.toString(), color: '#6B5CE7' },
                    { label: locale === 'ru' ? 'учителя' : 'teachers', value: selectedSchool.teacherCount.toString(), color: '#378ADD' },
                    { label: locale === 'ru' ? 'студенты' : 'students', value: selectedSchool.studentCount.toString(), color: '#22C07A' },
                  ].map((item) => (
                    <div key={item.label} style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 12, padding: '12px' }}>
                      <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                  invite code: <code style={{ fontSize: 12, color: 'hsl(var(--foreground))' }}>{selectedSchool.inviteCode}</code>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => copyInviteCode(selectedSchool.id, selectedSchool.inviteCode)} style={{ background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '9px 14px', fontSize: 13, color: copiedSchoolId === selectedSchool.id ? '#22C07A' : 'hsl(var(--foreground))', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {copiedSchoolId === selectedSchool.id
                      ? (locale === 'ru' ? 'Скопировано' : 'Copied')
                      : (locale === 'ru' ? 'Копировать код' : 'Copy code')}
                  </button>
                  <Link href={`/${locale}/school/${selectedSchool.id}`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    {locale === 'ru' ? 'Открыть школу' : 'Open school'}
                  </Link>
                </div>
              </div>
            </section>
          )}

          {filteredSchools.map((school) => {
            const isSelected = selectedSchoolId === school.id;

            return (
              <section key={school.id} style={{ background: 'hsl(var(--card))', border: `1px solid ${isSelected ? '#22C07A' : 'hsl(var(--border))'}`, borderRadius: 18, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{school.name}</div>
                    <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>{school.ownerEmail}</div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>{locale === 'ru' ? 'создана' : 'created'}: {formatDate(locale, school.createdAt)}</span>
                      <span>id: <code style={{ fontSize: 11 }}>{school.id.slice(0, 12)}...</code></span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(90px, 1fr))', gap: 10, minWidth: 290 }}>
                    {[
                      { label: locale === 'ru' ? 'участники' : 'members', value: school.memberCount.toString(), color: '#6B5CE7' },
                      { label: locale === 'ru' ? 'учителя' : 'teachers', value: school.teacherCount.toString(), color: '#378ADD' },
                      { label: locale === 'ru' ? 'студенты' : 'students', value: school.studentCount.toString(), color: '#22C07A' },
                    ].map((item) => (
                      <div key={item.label} style={{ background: 'hsl(var(--background))', borderRadius: 12, padding: '12px 12px' }}>
                        <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                    invite code: <code style={{ fontSize: 12, color: 'hsl(var(--foreground))' }}>{school.inviteCode}</code>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => setSelectedSchoolId(school.id)} style={filterChipStyle(isSelected)}>
                      {locale === 'ru' ? 'Фокус' : 'Focus'}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyInviteCode(school.id, school.inviteCode)}
                      style={{ background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '9px 14px', fontSize: 13, color: copiedSchoolId === school.id ? '#22C07A' : 'hsl(var(--foreground))', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {copiedSchoolId === school.id
                        ? (locale === 'ru' ? 'Скопировано' : 'Copied')
                        : (locale === 'ru' ? 'Копировать код' : 'Copy code')}
                    </button>
                    <Link
                      href={`/${locale}/school/${school.id}`}
                      style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                    >
                      {locale === 'ru' ? 'Открыть школу' : 'Open school'}
                    </Link>
                  </div>
                </div>
              </section>
            );
          })}

          {filteredSchools.length === 0 && (
            <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 18, padding: '36px 24px', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              {locale === 'ru' ? 'Школы по такому запросу не найдены.' : 'No schools matched your search.'}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
