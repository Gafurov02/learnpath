'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getLevelByXp } from '@/lib/levels';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

type Member = { user_id: string; role: string; joined_at: string; display_name: string; avatar_url: string | null; xp: number; total: number; correct: number };
type SchoolMembersResponse = {
  school: { name: string };
  members: Member[];
};

export default function StudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = useLocale();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    params.then((value) => setSchoolId(value.id));
  }, [params]);

  const loadStudents = useCallback(async (silent = false) => {
    if (!schoolId) {
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/schools/${schoolId}/members`, { cache: 'no-store' });

      if (response.status === 401) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      if (response.status === 403 || response.status === 404) {
        router.push(`/${locale}/school`);
        return;
      }

      const payload = (await response.json()) as SchoolMembersResponse;
      setSchoolName(payload.school.name ?? '');
      setMembers(payload.members);
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [locale, router, schoolId]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useLiveRefresh({
    enabled: !!schoolId,
    intervalMs: 12000,
    onRefresh: async () => loadStudents(true),
  });

  async function removeStudent(userId: string) {
    const supabase = createClient();
    await supabase.from('school_members').delete().eq('school_id', schoolId).eq('user_id', userId);
    setMembers((currentMembers) => currentMembers.filter((member) => member.user_id !== userId));
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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            <div>
              <Link href={`/${locale}/school/${schoolId}`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none', display: 'block', marginBottom: 8 }}>
                ← {locale === 'ru' ? 'Панель' : 'Dashboard'}
              </Link>
              <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, letterSpacing: '-0.5px', marginBottom: 6 }}>
                {locale === 'ru' ? 'Студенты' : 'Students'}
              </h1>
              <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>{schoolName} · {members.length} {locale === 'ru' ? 'участников' : 'members'}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadStudents(true)}
              disabled={refreshing}
              style={{ background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: refreshing ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {refreshing ? (locale === 'ru' ? 'Обновляю...' : 'Refreshing...') : (locale === 'ru' ? 'Обновить' : 'Refresh')}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map((member) => {
              const level = getLevelByXp(member.xp);
              const accuracy = member.total > 0 ? Math.round((member.correct / member.total) * 100) : 0;

              return (
                  <div key={member.user_id} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ width: 36, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                      <UserAvatar
                        avatarUrl={member.avatar_url}
                        name={member.display_name}
                        id={member.user_id}
                        size={36}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{member.display_name}</span>
                        <span style={{ fontSize: 11, background: member.role === 'teacher' ? 'rgba(107,92,231,0.1)' : 'hsl(var(--muted))', color: member.role === 'teacher' ? '#6B5CE7' : 'hsl(var(--muted-foreground))', borderRadius: 10, padding: '1px 8px', textTransform: 'capitalize' }}>{member.role}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                        {level.icon} {level.name} · {locale === 'ru' ? 'присоединился' : 'joined'} {new Date(member.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#6B5CE7' }}>{member.xp}</div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>XP</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: accuracy >= 70 ? '#22C07A' : '#EF9F27' }}>{member.total > 0 ? `${accuracy}%` : '—'}</div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'точность' : 'accuracy'}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{member.total}</div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'вопр.' : 'q'}</div>
                      </div>
                    </div>
                    {member.role === 'student' && (
                      <button onClick={() => void removeStudent(member.user_id)} style={{ background: 'transparent', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#E84040', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {locale === 'ru' ? 'Удалить' : 'Remove'}
                      </button>
                    )}
                  </div>
              );
            })}
            {members.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'hsl(var(--muted-foreground))' }}>
                {locale === 'ru' ? 'Нет участников' : 'No members yet'}
              </div>
            )}
          </div>
        </main>
      </div>
  );
}
