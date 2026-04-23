'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { getLevelByXp } from '@/lib/levels';

type School = { id: string; name: string; invite_code: string; owner_id: string };
type Member = { user_id: string; role: string; xp: number; total: number; correct: number };

export default function SchoolDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = useLocale();
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userId, setUserId] = useState('');
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { params.then(p => setSchoolId(p.id)); }, [params]);

  useEffect(() => {
    if (!schoolId) return;
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push(`/${locale}/auth/login`); return; }
      setUserId(session.user.id);

      const { data: schoolData } = await supabase.from('schools').select('*').eq('id', schoolId).single();
      if (!schoolData) { router.push(`/${locale}/school`); return; }
      setSchool(schoolData);

      const teacher = schoolData.owner_id === session.user.id;
      setIsTeacher(teacher);

      // Get members
      const { data: memberData } = await supabase
          .from('school_members')
          .select('user_id, role')
          .eq('school_id', schoolId);

      if (memberData && memberData.length > 0) {
        const userIds = memberData.map((m: any) => m.user_id);

        const [subsRes, attemptsRes] = await Promise.all([
          supabase.from('subscriptions').select('user_id, xp').in('user_id', userIds),
          supabase.from('quiz_attempts').select('user_id, correct').in('user_id', userIds),
        ]);

        const subMap: Record<string, number> = {};
        (subsRes.data ?? []).forEach((s: any) => { subMap[s.user_id] = s.xp ?? 0; });

        const attemptMap: Record<string, { total: number; correct: number }> = {};
        (attemptsRes.data ?? []).forEach((a: any) => {
          if (!attemptMap[a.user_id]) attemptMap[a.user_id] = { total: 0, correct: 0 };
          attemptMap[a.user_id].total++;
          if (a.correct) attemptMap[a.user_id].correct++;
        });

        const enriched: Member[] = memberData.map((m: any) => ({
          user_id: m.user_id,
          role: m.role,
          xp: subMap[m.user_id] ?? 0,
          total: attemptMap[m.user_id]?.total ?? 0,
          correct: attemptMap[m.user_id]?.correct ?? 0,
        }));

        setMembers(enriched.sort((a, b) => b.xp - a.xp));
      }

      setLoading(false);
    });
  }, [schoolId]);

  if (loading) return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
  );

  if (!school) return null;

  const students = members.filter(m => m.role === 'student');
  const totalQ = members.reduce((s, m) => s + m.total, 0);
  const avgAcc = students.length > 0 ? Math.round(students.reduce((s, m) => s + (m.total > 0 ? Math.round((m.correct / m.total) * 100) : 0), 0) / students.length) : 0;
  const avgXp = students.length > 0 ? Math.round(students.reduce((s, m) => s + m.xp, 0) / students.length) : 0;
  const medals = ['🥇', '🥈', '🥉'];

  function copyCode() {
    navigator.clipboard.writeText(school!.invite_code);
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
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
            {isTeacher && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/${locale}/school/${schoolId}/competition`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                    🏆 {locale === 'ru' ? 'Соревнование' : 'Competition'}
                  </Link>
                  <Link href={`/${locale}/school/${schoolId}/questions`} style={{ border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'hsl(var(--foreground))', textDecoration: 'none' }}>
                    📝 {locale === 'ru' ? 'Вопросы' : 'Questions'}
                  </Link>
                  <Link href={`/${locale}/school/${schoolId}/import`} style={{ border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'hsl(var(--foreground))', textDecoration: 'none' }}>
                    📂 {locale === 'ru' ? 'Импорт' : 'Import'}
                  </Link>
                </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { label: locale === 'ru' ? 'Студентов' : 'Students', value: students.length.toString(), color: '#6B5CE7' },
              { label: locale === 'ru' ? 'Вопросов' : 'Questions', value: totalQ.toLocaleString(), color: '#6B5CE7' },
              { label: locale === 'ru' ? 'Средн. точность' : 'Avg accuracy', value: students.length > 0 ? `${avgAcc}%` : '—', color: avgAcc >= 70 ? '#22C07A' : '#EF9F27' },
              { label: locale === 'ru' ? 'Средний XP' : 'Avg XP', value: avgXp.toLocaleString(), color: '#6B5CE7' },
            ].map(s => (
                <div key={s.label} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
                </div>
            ))}
          </div>

          {/* Leaderboard */}
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 14 }}>
            🏆 {locale === 'ru' ? 'Рейтинг группы' : 'Group leaderboard'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {students.map((s, i) => {
              const level = getLevelByXp(s.xp);
              const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              const isMe = s.user_id === userId;
              return (
                  <div key={s.user_id} style={{ background: isMe ? 'rgba(107,92,231,0.08)' : 'hsl(var(--card))', border: `1px solid ${isMe ? '#6B5CE7' : 'hsl(var(--border))'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ width: 32, textAlign: 'center', fontSize: i < 3 ? 20 : 13, fontWeight: 600, color: i >= 3 ? 'hsl(var(--muted-foreground))' : undefined, flexShrink: 0 }}>
                      {i < 3 ? medals[i] : `#${i + 1}`}
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#6B5CE7', flexShrink: 0 }}>
                      {s.user_id.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        Student {s.user_id.slice(0, 8)}
                        {isMe && <span style={{ fontSize: 11, color: '#6B5CE7', marginLeft: 6 }}>({locale === 'ru' ? 'вы' : 'you'})</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{level.icon} {level.name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#6B5CE7' }}>{s.xp}</div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>XP</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: accuracy >= 70 ? '#22C07A' : '#EF9F27' }}>{s.total > 0 ? `${accuracy}%` : '—'}</div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'точность' : 'accuracy'}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{s.total}</div>
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