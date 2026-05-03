'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { getLevelByXp } from '@/lib/levels';

type Entry = { user_id: string; xp_gained: number; questions: number; correct: number; score: number; week_start: string };
type School = { id: string; name: string; owner_id: string };

function getWeekStart(): string {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
}

function getWeekLabel(dateStr: string, locale: string): string {
    const d = new Date(dateStr);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const fmt = (dt: Date) => dt.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
    return `${fmt(d)} – ${fmt(end)}`;
}

export default function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
    const locale = useLocale();
    const router = useRouter();
    const [schoolId, setSchoolId] = useState('');
    const [school, setSchool] = useState<School | null>(null);
    const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
    const [history, setHistory] = useState<Entry[]>([]);
    const [userId, setUserId] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeWeek, setActiveWeek] = useState(getWeekStart());
    const [subMap, setSubMap] = useState<Record<string, number>>({});

    useEffect(() => { params.then(p => setSchoolId(p.id)); }, [params]);

    async function loadLeaderboard(week: string) {
        setLoading(true);
        const res = await fetch(`/api/school/competition?school_id=${schoolId}&week=${week}`);
        const data = await res.json();
        setLeaderboard(data.leaderboard ?? []);
        setHistory(data.history ?? []);

        // Get XP for each user
        const supabase = createClient();
        const userIds = (data.leaderboard ?? []).map((e: Entry) => e.user_id);
        if (userIds.length > 0) {
            const { data: subs } = await supabase.from('subscriptions').select('user_id, xp').in('user_id', userIds);
            const m: Record<string, number> = {};
            (subs ?? []).forEach((s: any) => { m[s.user_id] = s.xp ?? 0; });
            setSubMap(m);
        }
        setLoading(false);
    }

    useEffect(() => {
        if (!schoolId) return;
        const supabase = createClient();
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) { router.push(`/${locale}/auth/login`); return; }
            setUserId(session.user.id);

            const { data: s } = await supabase.from('schools').select('id, name, owner_id').eq('id', schoolId).single();
            setSchool(s);

            await loadLeaderboard(activeWeek);
        });
    }, [schoolId]);

    // Get unique weeks from history
    const weeks = [...new Set(history.map(h => h.week_start))].sort((a, b) => b.localeCompare(a)).slice(0, 5);
    const currentWeek = getWeekStart();
    const medals = ['🥇', '🥈', '🥉'];
    const myEntry = leaderboard.find(e => e.user_id === userId);
    const myRank = leaderboard.findIndex(e => e.user_id === userId) + 1;
    const daysLeft = 7 - ((new Date().getDay() + 6) % 7);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
            <AppNavbar />
            <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 80px' }}>

                {/* Header */}
                <Link href={`/${locale}/school/${schoolId}`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none', display: 'block', marginBottom: 16 }}>
                    ← {locale === 'ru' ? 'Панель' : 'Dashboard'}
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, letterSpacing: '-0.5px', marginBottom: 4 }}>
                            🏆 {locale === 'ru' ? 'Соревнование' : 'Competition'}
                        </h1>
                        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>{school?.name}</p>
                    </div>
                    {activeWeek === currentWeek && (
                        <div style={{ background: 'rgba(107,92,231,0.08)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 10, padding: '10px 16px', textAlign: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 600, color: '#6B5CE7' }}>{daysLeft}</div>
                            <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'дней до конца' : 'days left'}</div>
                        </div>
                    )}
                </div>

                {/* My position card */}
                {myEntry && (
                    <div style={{ background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', borderRadius: 16, padding: '18px 22px', marginBottom: 20 }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                            {locale === 'ru' ? 'Твоя позиция' : 'Your position'} · {getWeekLabel(activeWeek, locale)}
                        </div>
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontSize: 32, fontWeight: 600, color: '#fff' }}>#{myRank}</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{locale === 'ru' ? 'место' : 'place'}</div>
                            </div>
                            {[
                                { label: locale === 'ru' ? 'Очки' : 'Score', value: myEntry.score },
                                { label: 'XP', value: myEntry.xp_gained },
                                { label: locale === 'ru' ? 'Вопросов' : 'Questions', value: myEntry.questions },
                                { label: locale === 'ru' ? 'Правильных' : 'Correct', value: myEntry.correct },
                            ].map(s => (
                                <div key={s.label}>
                                    <div style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{s.value}</div>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Week selector */}
                {weeks.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                        {weeks.map(w => (
                            <button key={w} onClick={() => { setActiveWeek(w); loadLeaderboard(w); }} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: `1px solid ${activeWeek === w ? '#6B5CE7' : 'hsl(var(--border))'}`, background: activeWeek === w ? '#6B5CE7' : 'transparent', color: activeWeek === w ? '#fff' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit' }}>
                                {w === currentWeek ? (locale === 'ru' ? 'Эта неделя' : 'This week') : getWeekLabel(w, locale)}
                            </button>
                        ))}
                    </div>
                )}

                {/* Score formula */}
                <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: 'hsl(var(--muted-foreground))', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 500, color: 'hsl(var(--foreground))' }}>
            {locale === 'ru' ? 'Формула очков:' : 'Score formula:'}
          </span>
                    <span>XP + правильных × 5 + дней серии × 20</span>
                </div>

                {/* Leaderboard */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ width: 28, height: 28, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'hsl(var(--muted-foreground))' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                        <p style={{ fontSize: 15, marginBottom: 8 }}>{locale === 'ru' ? 'Соревнование ещё не началось' : 'No scores yet this week'}</p>
                        <p style={{ fontSize: 13 }}>{locale === 'ru' ? 'Отвечай на вопросы чтобы набрать очки!' : 'Answer questions to earn points!'}</p>
                        <Link href={`/${locale}/quiz`} style={{ display: 'inline-block', marginTop: 16, background: '#6B5CE7', color: '#fff', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                            {locale === 'ru' ? 'Начать практику →' : 'Start practicing →'}
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {leaderboard.map((entry, i) => {
                            const isMe = entry.user_id === userId;
                            const level = getLevelByXp(subMap[entry.user_id] ?? 0);
                            const accuracy = entry.questions > 0 ? Math.round((entry.correct / entry.questions) * 100) : 0;
                            return (
                                <div key={entry.user_id} style={{ background: isMe ? 'rgba(107,92,231,0.08)' : 'hsl(var(--card))', border: `1px solid ${isMe ? '#6B5CE7' : 'hsl(var(--border))'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <div style={{ width: 34, textAlign: 'center', fontSize: i < 3 ? 22 : 13, fontWeight: 600, color: i >= 3 ? 'hsl(var(--muted-foreground))' : undefined, flexShrink: 0 }}>
                                        {i < 3 ? medals[i] : `#${i + 1}`}
                                    </div>
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: isMe ? '#6B5CE7' : '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: isMe ? '#fff' : '#6B5CE7', flexShrink: 0 }}>
                                        {entry.user_id.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 500 }}>
                                            {isMe ? (locale === 'ru' ? 'Вы' : 'You') : `${entry.user_id.slice(0, 8)}...`}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{level.icon} {level.name}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 18, fontWeight: 600, color: '#6B5CE7' }}>{entry.score}</div>
                                            <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'очки' : 'score'}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 16, fontWeight: 500 }}>{entry.xp_gained}</div>
                                            <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>XP</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 16, fontWeight: 500, color: accuracy >= 70 ? '#22C07A' : '#EF9F27' }}>{entry.questions > 0 ? `${accuracy}%` : '—'}</div>
                                            <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'точн.' : 'acc.'}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 16, fontWeight: 500 }}>{entry.questions}</div>
                                            <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'вопр.' : 'q'}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* CTA */}
                {activeWeek === currentWeek && (
                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                        <Link href={`/${locale}/quiz`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                            {locale === 'ru' ? '⚡ Зарабатывать очки →' : '⚡ Earn points →'}
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}