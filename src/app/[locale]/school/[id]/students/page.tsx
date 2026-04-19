'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { getLevelByXp } from '@/lib/levels';

type Member = { user_id: string; role: string; joined_at: string; xp: number; total: number; correct: number };

export default function StudentsPage({ params }: { params: Promise<{ id: string }> }) {
    const locale = useLocale();
    const router = useRouter();
    const [members, setMembers] = useState<Member[]>([]);
    const [schoolId, setSchoolId] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { params.then(p => setSchoolId(p.id)); }, [params]);

    useEffect(() => {
        if (!schoolId) return;
        const supabase = createClient();
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) { router.push(`/${locale}/auth/login`); return; }

            const { data: school } = await supabase.from('schools').select('name').eq('id', schoolId).single();
            setSchoolName(school?.name ?? '');

            const { data: memberData } = await supabase.from('school_members').select('user_id, role, joined_at').eq('school_id', schoolId);

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

                setMembers(memberData.map((m: any) => ({
                    user_id: m.user_id,
                    role: m.role,
                    joined_at: m.joined_at,
                    xp: subMap[m.user_id] ?? 0,
                    total: attemptMap[m.user_id]?.total ?? 0,
                    correct: attemptMap[m.user_id]?.correct ?? 0,
                })).sort((a: Member, b: Member) => b.xp - a.xp));
            }
            setLoading(false);
        });
    }, [schoolId]);

    async function removeStudent(userId: string) {
        const supabase = createClient();
        await supabase.from('school_members').delete().eq('school_id', schoolId).eq('user_id', userId);
        setMembers(prev => prev.filter(m => m.user_id !== userId));
    }

    if (loading) return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
            <AppNavbar />
            <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
                <Link href={`/${locale}/school/${schoolId}`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none', display: 'block', marginBottom: 8 }}>
                    ← {locale === 'ru' ? 'Панель' : 'Dashboard'}
                </Link>
                <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, letterSpacing: '-0.5px', marginBottom: 6 }}>
                    {locale === 'ru' ? 'Студенты' : 'Students'}
                </h1>
                <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 24 }}>{schoolName} · {members.length} {locale === 'ru' ? 'участников' : 'members'}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {members.map((m, i) => {
                        const level = getLevelByXp(m.xp);
                        const accuracy = m.total > 0 ? Math.round((m.correct / m.total) * 100) : 0;
                        return (
                            <div key={m.user_id} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#6B5CE7', flexShrink: 0 }}>
                                    {i + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span>{m.user_id.slice(0, 12)}...</span>
                                        <span style={{ fontSize: 11, background: m.role === 'teacher' ? 'rgba(107,92,231,0.1)' : 'hsl(var(--muted))', color: m.role === 'teacher' ? '#6B5CE7' : 'hsl(var(--muted-foreground))', borderRadius: 10, padding: '1px 8px', textTransform: 'capitalize' }}>{m.role}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                                        {level.icon} {level.name} · {locale === 'ru' ? 'присоединился' : 'joined'} {new Date(m.joined_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 20 }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 15, fontWeight: 600, color: '#6B5CE7' }}>{m.xp}</div>
                                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>XP</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 15, fontWeight: 600, color: accuracy >= 70 ? '#22C07A' : '#EF9F27' }}>{m.total > 0 ? `${accuracy}%` : '—'}</div>
                                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'точность' : 'accuracy'}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 15, fontWeight: 600 }}>{m.total}</div>
                                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'вопр.' : 'q'}</div>
                                    </div>
                                </div>
                                {m.role === 'student' && (
                                    <button onClick={() => removeStudent(m.user_id)} style={{ background: 'transparent', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#E84040', cursor: 'pointer', fontFamily: 'inherit' }}>
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