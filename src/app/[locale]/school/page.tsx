'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

type School = {
  id: string;
  name: string;
  slug: string;
  invite_code: string;
  max_students: number;
  created_at: string;
};

type Membership = {
  school_id: string;
  role: string;
  schools: School | null;
};

export default function SchoolPage() {
  const locale = useLocale();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ownedSchool, setOwnedSchool] = useState<School | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const loadSchools = useCallback(async (silent = false) => {
    const supabase = createClient();

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      setUser(session.user);

      const [owned, member] = await Promise.all([
        supabase.from('schools').select('*').eq('owner_id', session.user.id).maybeSingle(),
        supabase.from('school_members').select('school_id, role, schools(*)').eq('user_id', session.user.id),
      ]);

      setOwnedSchool((owned.data as School | null) ?? null);
      setMemberships((member.data as Membership[] | null) ?? []);
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [locale, router]);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  useLiveRefresh({
    enabled: !!user && !joining,
    intervalMs: 12000,
    onRefresh: async () => loadSchools(true),
  });

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    setJoining(true);
    setJoinError('');

    try {
      const response = await fetch('/api/school/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinCode }),
      });
      const payload = (await response.json()) as {
        error?: string;
        schoolId?: string;
      };

      if (!response.ok || !payload.schoolId) {
        if (payload.error === 'invalid_invite_code') {
          setJoinError(locale === 'ru' ? 'Неверный код' : 'Invalid code');
        } else if (payload.error === 'school_full') {
          setJoinError(locale === 'ru' ? 'В этой школе уже нет мест' : 'This school is already full');
        } else if (response.status === 401) {
          router.push(`/${locale}/auth/login`);
        } else {
          setJoinError(locale === 'ru' ? 'Не получилось вступить в школу' : 'Could not join the school');
        }
        return;
      }

      setJoinCode('');
      await loadSchools(true);
      router.push(`/${locale}/school/${payload.schoolId}`);
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
  }

  return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
        <AppNavbar />
        <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 32, fontWeight: 400, letterSpacing: '-1px', marginBottom: 4 }}>
                {locale === 'ru' ? 'Школы и курсы' : 'Schools & Courses'}
              </h1>
              <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
                {locale === 'ru' ? 'Управляй студентами и отслеживай прогресс группы' : 'Manage students and track group progress'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void loadSchools(true)}
                disabled={refreshing}
                style={{ background: 'transparent', color: refreshing ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {refreshing ? (locale === 'ru' ? 'Обновляю...' : 'Refreshing...') : (locale === 'ru' ? 'Обновить' : 'Refresh')}
              </button>
              {!ownedSchool && (
                <Link href={`/${locale}/school/create`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                  + {locale === 'ru' ? 'Создать школу' : 'Create school'}
                </Link>
              )}
            </div>
          </div>

          {ownedSchool && (
            <div style={{ background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', borderRadius: 20, padding: '24px 28px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                👨‍🏫 {locale === 'ru' ? 'Ваша школа' : 'Your school'}
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 500, color: '#fff', marginBottom: 8 }}>{ownedSchool.name}</h2>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                  🔑 {locale === 'ru' ? 'Код приглашения:' : 'Invite code:'} <strong style={{ fontFamily: 'monospace', fontSize: 15 }}>{ownedSchool.invite_code}</strong>
                </span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                  👥 {locale === 'ru' ? `до ${ownedSchool.max_students} студентов` : `up to ${ownedSchool.max_students} students`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href={`/${locale}/school/${ownedSchool.id}`} style={{ background: '#fff', color: '#6B5CE7', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  {locale === 'ru' ? 'Панель управления →' : 'Dashboard →'}
                </Link>
                <Link href={`/${locale}/school/${ownedSchool.id}/students`} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                  {locale === 'ru' ? 'Студенты' : 'Students'}
                </Link>
                <Link href={`/${locale}/school/${ownedSchool.id}/questions`} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                  {locale === 'ru' ? 'Вопросы' : 'Questions'}
                </Link>
              </div>
            </div>
          )}

          {memberships.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 14 }}>{locale === 'ru' ? 'Вы участник' : 'You\'re a member of'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {memberships.map((membership) => (
                  <Link key={membership.school_id} href={`/${locale}/school/${membership.school_id}`} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '16px 20px', textDecoration: 'none', color: 'hsl(var(--foreground))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{membership.schools?.name ?? (locale === 'ru' ? 'Школа' : 'School')}</div>
                      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 2, textTransform: 'capitalize' }}>{membership.role}</div>
                    </div>
                    <span style={{ fontSize: 13, color: '#6B5CE7' }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{locale === 'ru' ? 'Вступить в школу' : 'Join a school'}</h3>
            <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 16 }}>
              {locale === 'ru' ? 'Введи код приглашения от преподавателя' : 'Enter the invite code from your teacher'}
            </p>
            <form onSubmit={handleJoin} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder={locale === 'ru' ? 'Код приглашения' : 'Invite code'}
                style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 14, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', fontFamily: 'monospace', outline: 'none' }}
              />
              <button type="submit" disabled={joining || !joinCode.trim()} style={{ background: '#6B5CE7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                {joining ? '...' : (locale === 'ru' ? 'Вступить' : 'Join')}
              </button>
            </form>
            {joinError && <p style={{ fontSize: 13, color: '#E84040', marginTop: 8 }}>{joinError}</p>}
          </div>
        </main>
      </div>
  );
}
