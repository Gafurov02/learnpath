'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { getLevelByXp, LEVELS } from '@/lib/levels';

type Achievement = { code: string; name: string; description: string; icon: string; earned: boolean; earned_at?: string };
type Attempt = { exam: string; topic: string; correct: boolean; difficulty: string; created_at: string };

export default function ProfilePage() {
  const locale = useLocale();
  const t = useTranslations('app');
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements'>('stats');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push(`/${locale}/auth/login`); return; }
      const u = session.user;
      setUser(u);
      const [subRes, attemptsRes, achRes, allAchRes] = await Promise.all([
        supabase.from('subscriptions').select('xp, plan').eq('user_id', u.id).single(),
        supabase.from('quiz_attempts').select('exam, topic, correct, difficulty, created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('user_achievements').select('achievement, earned_at').eq('user_id', u.id),
        supabase.from('achievements').select('*'),
      ]);
      setXp(subRes.data?.xp ?? 0);
      setIsPro(subRes.data?.plan === 'pro');
      setAttempts(attemptsRes.data ?? []);

      // Streak
      const dates = [...new Set((attemptsRes.data ?? []).map((a: any) => new Date(a.created_at).toDateString()))];
      let s = 0; const today = new Date();
      for (let i = 0; i < dates.length; i++) { const d = new Date(today); d.setDate(d.getDate() - i); if (dates.includes(d.toDateString())) s++; else break; }
      setStreak(s);

      const earnedMap = new Map((achRes.data ?? []).map((a: any) => [a.achievement, a.earned_at]));
      setAchievements((allAchRes.data ?? []).map((a: any) => ({ code: a.code, name: a.name, description: a.description, icon: a.icon, earned: earnedMap.has(a.code), earned_at: earnedMap.get(a.code) })));
      setLoading(false);
    });
  }, []);

  if (loading) return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
  );

  const level = getLevelByXp(xp);
  const nextLevel = LEVELS[LEVELS.findIndex(l => l.name === level.name) + 1];
  const progress = nextLevel ? Math.round(((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100) : 100;
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0];
  const total = attempts.length;
  const correct = attempts.filter(a => a.correct).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Per-exam stats
  const examStats: Record<string, { total: number; correct: number }> = {};
  attempts.forEach(a => {
    if (!examStats[a.exam]) examStats[a.exam] = { total: 0, correct: 0 };
    examStats[a.exam].total++;
    if (a.correct) examStats[a.exam].correct++;
  });

  // Per-topic weak areas (Pro)
  const topicStats: Record<string, { total: number; correct: number; exam: string }> = {};
  attempts.forEach(a => {
    const key = `${a.exam}::${a.topic}`;
    if (!topicStats[key]) topicStats[key] = { total: 0, correct: 0, exam: a.exam };
    topicStats[key].total++;
    if (a.correct) topicStats[key].correct++;
  });
  const weakTopics = Object.entries(topicStats)
      .map(([key, s]) => ({ topic: key.split('::')[1], exam: s.exam, accuracy: Math.round((s.correct / s.total) * 100), total: s.total }))
      .filter(t => t.total >= 3)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

  const strongTopics = Object.entries(topicStats)
      .map(([key, s]) => ({ topic: key.split('::')[1], exam: s.exam, accuracy: Math.round((s.correct / s.total) * 100), total: s.total }))
      .filter(t => t.total >= 3)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);

  // Activity last 7 days
  const last7: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const count = attempts.filter(a => new Date(a.created_at).toDateString() === dateStr).length;
    last7.push({ date: d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' }), count });
  }
  const maxCount = Math.max(...last7.map(d => d.count), 1);

  // Difficulty breakdown
  const diffStats = { easy: { total: 0, correct: 0 }, medium: { total: 0, correct: 0 }, hard: { total: 0, correct: 0 } };
  attempts.forEach(a => {
    const d = a.difficulty as keyof typeof diffStats;
    if (diffStats[d]) { diffStats[d].total++; if (a.correct) diffStats[d].correct++; }
  });

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/${locale}`;
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500,
    border: 'none', background: active ? 'hsl(var(--background))' : 'transparent',
    color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s',
  });

  return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
        <AppNavbar />
        <main style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px 80px' }}>

          {/* Profile header */}
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 20, padding: '20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: isPro ? '#6B5CE7' : '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 600, color: isPro ? '#fff' : '#6B5CE7', overflow: 'hidden' }}>
                  {user?.user_metadata?.avatar_url
                      ? <img src={user.user_metadata.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : name?.[0]?.toUpperCase()}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {editingName ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveProfile(); if (e.key === 'Escape') setEditingName(false); }}
                          autoFocus
                          style={{ flex: 1, padding: '6px 10px', border: '1px solid #6B5CE7', borderRadius: 8, fontSize: 15, fontWeight: 500, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', outline: 'none', fontFamily: 'inherit' }}
                      />
                      <button onClick={saveProfile} disabled={savingProfile} style={{ background: '#6B5CE7', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                        {savingProfile ? '...' : '✓'}
                      </button>
                      <button onClick={() => setEditingName(false)} style={{ background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 7, padding: '6px 10px', fontSize: 12, color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>✕</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 17, fontWeight: 500 }}>{name}</span>
                      {isPro && <span style={{ background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px' }}>⭐ PRO</span>}
                      <button onClick={() => { setNewName(name || ''); setEditingName(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: '2px 4px', fontSize: 13, lineHeight: 1 }} title={locale === 'ru' ? 'Изменить имя' : 'Edit name'}>✎</button>
                    </div>
                )}
                <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{level.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                      <span style={{ fontWeight: 500 }}>{level.name} · {xp} XP</span>
                      {nextLevel && <span style={{ color: 'hsl(var(--muted-foreground))' }}>{nextLevel.minXp}</span>}
                    </div>
                    <div style={{ height: 5, background: 'hsl(var(--border))', borderRadius: 3 }}>
                      <div style={{ height: 5, background: '#6B5CE7', borderRadius: 3, width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!isPro && <Link href={`/${locale}/pricing`} style={{ flex: 1, background: '#6B5CE7', color: '#fff', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 500, textDecoration: 'none', textAlign: 'center' }}>{t('upgradePro')}</Link>}
              <button onClick={handleLogout} style={{ flex: isPro ? 1 : undefined, border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '9px 16px', fontSize: 13, background: 'transparent', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit' }}>{t('logOut')}</button>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginBottom: 16 }}>
            {[
              { label: t('questions'), value: total.toString(), color: '#6B5CE7' },
              { label: t('correct'), value: correct.toString(), color: '#22C07A' },
              { label: t('accuracy'), value: total > 0 ? `${accuracy}%` : '—', color: '#22C07A' },
              { label: t('streakLabel'), value: streak.toString(), color: '#EF9F27' },
              { label: 'XP', value: xp.toLocaleString(), color: '#6B5CE7' },
            ].map(s => (
                <div key={s.label} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
                </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'hsl(var(--muted))', borderRadius: 10, padding: 4 }}>
            <button onClick={() => setActiveTab('stats')} style={tabStyle(activeTab === 'stats')}>
              📊 {locale === 'ru' ? 'Статистика' : 'Statistics'}
              {isPro && <span style={{ marginLeft: 6, fontSize: 10, background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontWeight: 700 }}>PRO</span>}
            </button>
            <button onClick={() => setActiveTab('achievements')} style={tabStyle(activeTab === 'achievements')}>
              🏆 {t('achievements')} · {achievements.filter(a => a.earned).length}/{achievements.length}
            </button>
          </div>

          {/* ACHIEVEMENTS TAB */}
          {activeTab === 'achievements' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {achievements.map(a => (
                    <div key={a.code} style={{ background: 'hsl(var(--card))', border: `1px solid ${a.earned ? '#6B5CE7' : 'hsl(var(--border))'}`, borderRadius: 14, padding: 16, opacity: a.earned ? 1 : 0.4, transition: 'all 0.2s' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', lineHeight: 1.4 }}>{a.description}</div>
                      {a.earned && a.earned_at && <div style={{ fontSize: 10, color: '#6B5CE7', marginTop: 6 }}>✓ {new Date(a.earned_at).toLocaleDateString()}</div>}
                    </div>
                ))}
              </div>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && (
              isPro ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Activity chart */}
                    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
                        {locale === 'ru' ? '📈 Активность (7 дней)' : '📈 Activity (7 days)'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
                        {last7.map((d, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: '100%', background: d.count > 0 ? '#6B5CE7' : 'hsl(var(--border))', borderRadius: 4, height: `${Math.max((d.count / maxCount) * 60, d.count > 0 ? 8 : 4)}px`, transition: 'height 0.3s ease' }} />
                              <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{d.date}</div>
                              {d.count > 0 && <div style={{ fontSize: 10, color: '#6B5CE7', fontWeight: 600 }}>{d.count}</div>}
                            </div>
                        ))}
                      </div>
                    </div>

                    {/* Per-exam */}
                    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
                        {locale === 'ru' ? '📚 По экзаменам' : '📚 By exam'}
                      </div>
                      {Object.entries(examStats).length === 0 ? (
                          <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'Нет данных' : 'No data yet'}</p>
                      ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {Object.entries(examStats).map(([exam, s]) => {
                              const pct = Math.round((s.correct / s.total) * 100);
                              return (
                                  <div key={exam}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                                      <span style={{ fontWeight: 500 }}>{exam}</span>
                                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>{pct}% · {s.correct}/{s.total}</span>
                                    </div>
                                    <div style={{ height: 6, background: 'hsl(var(--border))', borderRadius: 3 }}>
                                      <div style={{ height: 6, background: pct >= 70 ? '#22C07A' : pct >= 40 ? '#EF9F27' : '#E84040', borderRadius: 3, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                                    </div>
                                  </div>
                              );
                            })}
                          </div>
                      )}
                    </div>

                    {/* Difficulty breakdown */}
                    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
                        {locale === 'ru' ? '🎯 По сложности' : '🎯 By difficulty'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                        {(['easy', 'medium', 'hard'] as const).map(d => {
                          const s = diffStats[d];
                          const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                          const color = d === 'easy' ? '#22C07A' : d === 'medium' ? '#6B5CE7' : '#E84040';
                          const label = locale === 'ru' ? { easy: 'Лёгкие', medium: 'Средние', hard: 'Сложные' }[d] : d;
                          return (
                              <div key={d} style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                                <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', textTransform: 'capitalize', marginBottom: 4 }}>{label}</div>
                                <div style={{ fontSize: 22, fontWeight: 600, color }}>{s.total > 0 ? `${pct}%` : '—'}</div>
                                <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>{s.total} {locale === 'ru' ? 'вопр.' : 'q'}</div>
                              </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Weak & Strong topics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
                      {/* Weak */}
                      <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: 24 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>
                          ⚠️ {locale === 'ru' ? 'Слабые темы' : 'Weak topics'}
                        </div>
                        {weakTopics.length === 0 ? (
                            <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'Нет данных' : 'No data yet'}</p>
                        ) : weakTopics.map(t => (
                            <div key={t.topic} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
                              <div>
                                <div style={{ fontWeight: 500 }}>{t.topic}</div>
                                <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{t.exam} · {t.total} {locale === 'ru' ? 'вопр.' : 'q'}</div>
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#E84040' }}>{t.accuracy}%</span>
                            </div>
                        ))}
                      </div>

                      {/* Strong */}
                      <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: 24 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>
                          💪 {locale === 'ru' ? 'Сильные темы' : 'Strong topics'}
                        </div>
                        {strongTopics.length === 0 ? (
                            <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'Нет данных' : 'No data yet'}</p>
                        ) : strongTopics.map(t => (
                            <div key={t.topic} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
                              <div>
                                <div style={{ fontWeight: 500 }}>{t.topic}</div>
                                <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{t.exam} · {t.total} {locale === 'ru' ? 'вопр.' : 'q'}</div>
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#22C07A' }}>{t.accuracy}%</span>
                            </div>
                        ))}
                      </div>
                    </div>

                  </div>
              ) : (
                  /* Free users — basic stats + upgrade */
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                      {Object.entries(examStats).map(([exam, s]) => {
                        const pct = Math.round((s.correct / s.total) * 100);
                        return (
                            <div key={exam}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                                <span style={{ fontWeight: 500 }}>{exam}</span>
                                <span style={{ color: 'hsl(var(--muted-foreground))' }}>{pct}% · {s.correct}/{s.total}</span>
                              </div>
                              <div style={{ height: 5, background: 'hsl(var(--border))', borderRadius: 2 }}>
                                <div style={{ height: 5, background: pct >= 70 ? '#22C07A' : '#6B5CE7', borderRadius: 2, width: `${pct}%` }} />
                              </div>
                            </div>
                        );
                      })}
                    </div>

                    <div style={{ background: 'rgba(107,92,231,0.06)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>{locale === 'ru' ? 'Полная статистика — Pro фича' : 'Full statistics is a Pro feature'}</div>
                      <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 20, lineHeight: 1.6 }}>
                        {locale === 'ru' ? 'График активности, слабые темы, разбивка по сложности и многое другое.' : 'Activity chart, weak topics, difficulty breakdown and more.'}
                      </p>
                      <Link href={`/${locale}/pricing`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '11px 28px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                        {locale === 'ru' ? 'Перейти на Pro →' : 'Upgrade to Pro →'}
                      </Link>
                    </div>
                  </div>
              )
          )}
        </main>
      </div>
  );
}