'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getLevelByXp } from '@/lib/levels';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

type School = { id: string; name: string; invite_code: string; owner_id: string };
type Member = { user_id: string; role: string; display_name: string; avatar_url: string | null; xp: number; total: number; correct: number };
type SchoolMembersResponse = {
  school: School;
  currentUserId: string;
  isTeacher: boolean;
  members: Member[];
};

export default function SchoolDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = useLocale();
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userId, setUserId] = useState('');
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolId, setSchoolId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    params.then((value) => setSchoolId(value.id));
  }, [params]);

  const loadSchoolDashboard = useCallback(async (silent = false) => {
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
      setSchool(payload.school);
      setUserId(payload.currentUserId);
      setIsTeacher(payload.isTeacher);
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
    void loadSchoolDashboard();
  }, [loadSchoolDashboard]);

  useLiveRefresh({
    enabled: !!schoolId && !!userId,
    intervalMs: 12000,
    onRefresh: async () => loadSchoolDashboard(true),
  });

  if (loading) {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
  }

  if (!school) {
    return null;
  }

  const students = members.filter((member) => member.role === 'student');
  const totalQuestions = members.reduce((sum, member) => sum + member.total, 0);
  const avgAccuracy = students.length > 0 ? Math.round(students.reduce((sum, member) => sum + (member.total > 0 ? Math.round((member.correct / member.total) * 100) : 0), 0) / students.length) : 0;
  const avgXp = students.length > 0 ? Math.round(students.reduce((sum, member) => sum + member.xp, 0) / students.length) : 0;
  const medals = ['🥇', '🥈', '🥉'];

  function copyCode() {
    if (!school) {
      return;
    }

    navigator.clipboard.writeText(school.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
        <AppNavbar />
        <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <Link href={`/${locale}/school`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none', display: 'block', marginBottom: 8 }}>
                ← {locale === 'ru' ? 'Все школы' : 'All schools'}
              </Link>
              <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, letterSpacing: '-0.5px', marginBottom: 8 }}>{school.name}</h1>
              {isTeacher && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flexWrap: 'wrap' }}>
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                    🔑 {locale === 'ru' ? 'Код приглашения:' : 'Invite code:'}
                  </span>
                  <code style={{ background: 'hsl(var(--muted))', padding: '3px 10px', borderRadius: 6, fontSize: 14, fontWeight: 700, letterSpacing: '0.05em' }}>
                    {school.invite_code}
                  </code>
                  <button onClick={copyCode} style={{ background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: copied ? '#22C07A' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void loadSchoolDashboard(true)}
                disabled={refreshing}
                style={{ background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: refreshing ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {refreshing ? (locale === 'ru' ? 'Обновляю...' : 'Refreshing...') : (locale === 'ru' ? 'Обновить' : 'Refresh')}
              </button>
              {isTeacher && (
                <Link href={`/${locale}/school/${schoolId}/questions`} style={{ border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'hsl(var(--foreground))', textDecoration: 'none' }}>
                  📝 {locale === 'ru' ? 'Вопросы' : 'Questions'}
                </Link>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { label: locale === 'ru' ? 'Студентов' : 'Students', value: students.length.toString(), color: '#6B5CE7' },
              { label: locale === 'ru' ? 'Вопросов' : 'Questions', value: totalQuestions.toLocaleString(), color: '#6B5CE7' },
              { label: locale === 'ru' ? 'Средн. точность' : 'Avg accuracy', value: students.length > 0 ? `${avgAccuracy}%` : '—', color: avgAccuracy >= 70 ? '#22C07A' : '#EF9F27' },
              { label: locale === 'ru' ? 'Средний XP' : 'Avg XP', value: avgXp.toLocaleString(), color: '#6B5CE7' },
            ].map((stat) => (
              <div key={stat.label} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 14 }}>
            🏆 {locale === 'ru' ? 'Рейтинг группы' : 'Group leaderboard'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {students.map((student, index) => {
              const level = getLevelByXp(student.xp);
              const accuracy = student.total > 0 ? Math.round((student.correct / student.total) * 100) : 0;
              const isMe = student.user_id === userId;

              return (
                  <div key={student.user_id} style={{ background: isMe ? 'rgba(107,92,231,0.08)' : 'hsl(var(--card))', border: `1px solid ${isMe ? '#6B5CE7' : 'hsl(var(--border))'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ width: 32, textAlign: 'center', fontSize: index < 3 ? 20 : 13, fontWeight: 600, color: index >= 3 ? 'hsl(var(--muted-foreground))' : undefined, flexShrink: 0 }}>
                      {index < 3 ? medals[index] : `#${index + 1}`}
                    </div>
                    <UserAvatar
                      avatarUrl={student.avatar_url}
                      name={student.display_name}
                      id={student.user_id}
                      size={36}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {student.display_name}
                        {isMe && <span style={{ fontSize: 11, color: '#6B5CE7', marginLeft: 6 }}>({locale === 'ru' ? 'вы' : 'you'})</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{level.icon} {level.name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#6B5CE7' }}>{student.xp}</div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>XP</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: accuracy >= 70 ? '#22C07A' : '#EF9F27' }}>{student.total > 0 ? `${accuracy}%` : '—'}</div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'точность' : 'accuracy'}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{student.total}</div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'вопр.' : 'q'}</div>
                      </div>
                    </div>
                  </div>
              );
            })}
            {students.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--muted-foreground))' }}>
                {locale === 'ru' ? 'Студентов пока нет. Поделись кодом!' : 'No students yet. Share the invite code!'}
              </div>
            )}
          </div>
        </main>
      </div>
  );
}
