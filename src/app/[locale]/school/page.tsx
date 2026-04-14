'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';

type School = { id: string; name: string; slug: string; invite_code: string; max_students: number; created_at: string };
type Membership = { school_id: string; role: string; schools: School };

export default function SchoolPage() {
    const locale = useLocale();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [ownedSchool, setOwnedSchool] = useState<School | null>(null);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [loading, setLoading] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState('');

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) { router.push(`/${locale}/auth/login`); return; }
            setUser(session.user);

            const [owned, member] = await Promise.all([
                supabase.from('schools').select('*').eq('owner_id', session.user.id).single(),
                supabase.from('school_members').select('*, schools(*)').eq('user_id', session.user.id),
            ]);

            setOwnedSchool(owned.data);
            setMemberships(member.data ?? []);
            setLoading(false);
        });
    }, []);

    async function handleJoin(e: React.FormEvent) {
        e.preventDefault();
        setJoining(true);
        setJoinError('');
        const supabase = createClient();
        const { data: school } = await supabase.from('schools').select('id').eq('invite_code', joinCode.trim()).single();
        if (!school) { setJoinError(locale === 'ru' ? 'Неверный код' : 'Invalid code'); setJoining(false); return; }
        const { error } = await supabase.from('school_members').insert({ school_id: school.id, user_id: user.id, role: 'student' });
        if (error) { setJoinError(locale === 'ru' ? 'Уже в этой школе' : 'Already a member'); setJoining(false); return; }
        router.push(`/${locale}/school/${school.id}`);
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 32, fontWeight: 400, letterSpacing: '-1px', marginBottom: 4 }}>
                            {locale === 'ru' ? 'Школы и курсы' : 'Schools & Courses'}
                        </h1>
                        <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
                            {locale === 'ru' ? 'Управляй студентами и отслеживай прогресс группы' : 'Manage students and track group progress'}
                        </p>
                    </div>
                    {!ownedSchool && (
                        <Link href={`/${locale}/school/create`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                            + {locale === 'ru' ? 'Создать школу' : 'Create school'}
                        </Link>
                    )}
                </div>

                {/* Owned school */}
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

                {/* Memberships */}
                {memberships.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 14 }}>{locale === 'ru' ? 'Вы участник' : 'You\'re a member of'}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {memberships.map(m => (
                                <Link key={m.school_id} href={`/${locale}/school/${m.school_id}`} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '16px 20px', textDecoration: 'none', color: 'hsl(var(--foreground))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 500 }}>{m.schools?.name}</div>
                                        <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 2, textTransform: 'capitalize' }}>{m.role}</div>
                                    </div>
                                    <span style={{ fontSize: 13, color: '#6B5CE7' }}>→</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Join school */}
                <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{locale === 'ru' ? 'Вступить в школу' : 'Join a school'}</h3>
                    <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 16 }}>
                        {locale === 'ru' ? 'Введи код приглашения от преподавателя' : 'Enter the invite code from your teacher'}
                    </p>
                    <form onSubmit={handleJoin} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <input
                            value={joinCode} onChange={e => setJoinCode(e.target.value)}
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