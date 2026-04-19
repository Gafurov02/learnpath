'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { getLevelByXp, LEVELS, ROADMAP } from '@/lib/levels';
import { hasProAccess } from '@/lib/subscription';
import { StudyPlan } from '@/components/home/StudyPlan';

export default function HomePage() {
  const locale = useLocale();
  const t = useTranslations('app');
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState('IELTS');
  const [topicProgress, setTopicProgress] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'roadmap' | 'plan'>('roadmap');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push(`/${locale}/auth/login`); return; }
      setUser(session.user);
      const { data: sub } = await supabase.from('subscriptions').select('xp, plan, status').eq('user_id', session.user.id).single();
      setXp(sub?.xp ?? 0);
      setIsPro(hasProAccess(sub));
      const { data: attempts } = await supabase.from('quiz_attempts').select('created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(60);
      if (attempts) {
        const dates = [...new Set(attempts.map((a: any) => new Date(a.created_at).toDateString()))];
        let s = 0; const today = new Date();
        for (let i = 0; i < dates.length; i++) { const d = new Date(today); d.setDate(d.getDate() - i); if (dates.includes(d.toDateString())) s++; else break; }
        setStreak(s);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase.from('quiz_attempts').select('topic, correct').eq('user_id', user.id).eq('exam', selectedExam).then(({ data }) => {
      const prog: Record<string, number> = {};
      data?.forEach((a: any) => { if (a.correct) prog[a.topic] = (prog[a.topic] || 0) + 1; });
      setTopicProgress(prog);
    });
  }, [selectedExam, user]);

  if (loading) return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
  );

  const level = getLevelByXp(xp);
  const nextLevel = LEVELS[LEVELS.findIndex(l => l.name === level.name) + 1];
  const progress = nextLevel ? Math.round(((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100) : 100;
  const roadmap = ROADMAP[selectedExam] ?? [];
  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0];

  return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
        <AppNavbar />
        <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

          {/* Hero card */}
          {isPro ? (
              <div style={{ background: 'linear-gradient(135deg, #6B5CE7 0%, #9B8DFF 100%)', borderRadius: 20, padding: '24px 28px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>⭐ {t('proMember')}</div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: '#fff', marginBottom: 10 }}>{level.icon} {level.name} · {xp} XP</div>
                    <div style={{ height: 7, background: 'rgba(255,255,255,0.25)', borderRadius: 4, width: 240, maxWidth: '100%' }}>
                      <div style={{ height: 7, background: '#fff', borderRadius: 4, width: `${progress}%`, transition: 'width 0.8s ease' }} />
                    </div>
                    {nextLevel && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 5 }}>{nextLevel.minXp - xp} {t('xpTo')} {nextLevel.name}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 36 }}>🔥</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{streak}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{t('dayStreak')}</div>
                  </div>
                </div>
                <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
                  {[
                    { label: t('questions'), val: t('unlimited') },
                    { label: t('aiExplanations'), val: t('detailed') },
                    { label: t('examsAccess'), val: t('all12') },
                    { label: t('studyPlan'), val: t('personal') },
                  ].map(f => (
                      <div key={f.label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>{f.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{f.val}</div>
                      </div>
                  ))}
                </div>
              </div>
          ) : (
              <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 20, padding: '24px 28px', marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(107,92,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{level.icon}</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}>{t('welcomeBack')}, <strong>{name}</strong></div>
                  <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 8 }}>{level.name} · {xp} XP {nextLevel && <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', fontWeight: 400 }}>→ {nextLevel.minXp} XP</span>}</div>
                  <div style={{ height: 8, background: 'hsl(var(--border))', borderRadius: 4 }}>
                    <div style={{ height: 8, background: '#6B5CE7', borderRadius: 4, width: `${progress}%`, transition: 'width 0.8s ease' }} />
                  </div>
                  {nextLevel && <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>{nextLevel.minXp - xp} {t('xpTo')} {nextLevel.name}</div>}
                </div>
                <Link href={`/${locale}/quiz`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('continueBtn')}</Link>
              </div>
          )}

          {/* Upgrade banner */}
          {!isPro && (
              <div style={{ background: 'rgba(107,92,231,0.06)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{t('upgradePro')}</div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{t('upgradeDesc')}</div>
                </div>
                <Link href={`/${locale}/pricing`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>{t('upgradeBtn')}</Link>
              </div>
          )}

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'hsl(var(--muted))', borderRadius: 10, padding: 4 }}>
            <button
                onClick={() => setActiveTab('roadmap')}
                style={{ flex: 1, padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500, border: 'none', background: activeTab === 'roadmap' ? 'hsl(var(--background))' : 'transparent', color: activeTab === 'roadmap' ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit', boxShadow: activeTab === 'roadmap' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}
            >
              🗺 {locale === 'ru' ? 'Роадмап' : 'Roadmap'}
            </button>
            <button
                onClick={() => setActiveTab('plan')}
                style={{ flex: 1, padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500, border: 'none', background: activeTab === 'plan' ? 'hsl(var(--background))' : 'transparent', color: activeTab === 'plan' ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit', boxShadow: activeTab === 'plan' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              📅 {locale === 'ru' ? 'План на день' : 'Daily Plan'}
              {isPro && <span style={{ fontSize: 10, background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontWeight: 700 }}>PRO</span>}
            </button>
          </div>

          {/* Study Plan tab */}
          {activeTab === 'plan' && (
              isPro ? (
                  <StudyPlan locale={locale} />
              ) : (
                  <div style={{ textAlign: 'center', padding: '60px 24px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16 }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
                    <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{locale === 'ru' ? 'Ежедневный план — Pro фича' : 'Daily Plan is a Pro feature'}</h3>
                    <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 24, lineHeight: 1.6 }}>
                      {locale === 'ru' ? 'AI анализирует слабые темы и составляет персональный план каждый день.' : 'AI analyzes your weak topics and builds a personalized plan every day.'}
                    </p>
                    <Link href={`/${locale}/pricing`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '11px 28px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                      {locale === 'ru' ? 'Перейти на Pro →' : 'Upgrade to Pro →'}
                    </Link>
                  </div>
              )
          )}

          {/* Roadmap tab */}
          {activeTab === 'roadmap' && (
              <>
                {/* Exam tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {Object.keys(ROADMAP).map(e => (
                      <button key={e} onClick={() => setSelectedExam(e)} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, border: `1px solid ${selectedExam === e ? '#6B5CE7' : 'hsl(var(--border))'}`, background: selectedExam === e ? '#6B5CE7' : 'transparent', color: selectedExam === e ? '#fff' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                        {e}
                      </button>
                  ))}
                </div>

                <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                  {t('roadmap')} · {selectedExam}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {roadmap.map((node, i) => {
                    const done = topicProgress[node.topic] || 0;
                    const pct = Math.min(Math.round((done / node.total) * 100), 100);
                    const isComplete = pct >= 80;
                    const isActive = !isComplete && (i === 0 || Math.min(Math.round(((topicProgress[roadmap[i-1]?.topic] || 0) / roadmap[i-1]?.total) * 100), 100) >= 80);
                    const isLocked = !isComplete && !isActive;
                    const isLast = i === roadmap.length - 1;
                    return (
                        <div key={node.topic} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, background: isComplete ? '#1D9E75' : isActive ? '#6B5CE7' : 'hsl(var(--muted))', color: (isComplete || isActive) ? '#fff' : 'hsl(var(--muted-foreground))', boxShadow: isActive ? '0 0 0 4px rgba(107,92,231,0.2)' : 'none', zIndex: 1 }}>
                              {isComplete ? '✓' : isLocked ? '🔒' : i + 1}
                            </div>
                            {!isLast && <div style={{ width: 2, height: 32, background: isComplete ? '#1D9E75' : 'hsl(var(--border))', marginTop: 2 }} />}
                          </div>
                          <div style={{ flex: 1, paddingBottom: isLast ? 0 : 12, paddingTop: 8, opacity: isLocked ? 0.5 : 1 }}>
                            <div style={{ background: 'hsl(var(--card))', border: `1px solid ${isActive ? '#6B5CE7' : 'hsl(var(--border))'}`, borderRadius: 14, padding: '14px 18px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isLocked ? 0 : 8 }}>
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 500 }}>{node.topic}</div>
                                  <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                                    {isLocked ? `Complete "${roadmap[i-1]?.topic}" first` : `${done}/${node.total}`}
                                  </div>
                                </div>
                                {!isLocked && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontSize: 13, fontWeight: 600, color: isComplete ? '#1D9E75' : '#6B5CE7' }}>{pct}%</span>
                                      {!isComplete && (
                                          <Link href={`/${locale}/quiz?exam=${selectedExam}&topic=${encodeURIComponent(node.topic)}`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>
                                            {done > 0 ? t('continueLabel') : t('startLabel')}
                                          </Link>
                                      )}
                                    </div>
                                )}
                              </div>
                              {!isLocked && (
                                  <div style={{ height: 4, background: 'hsl(var(--border))', borderRadius: 2 }}>
                                    <div style={{ height: 4, background: isComplete ? '#1D9E75' : '#6B5CE7', borderRadius: 2, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                                  </div>
                              )}
                            </div>
                          </div>
                        </div>
                    );
                  })}
                </div>
              </>
          )}
        </main>
      </div>
  );
}
