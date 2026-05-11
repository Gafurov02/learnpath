'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getLevelByXp, LEVELS, ROADMAP } from '@/lib/levels';
import { StudyPlan } from '@/components/home/StudyPlan';
import { getSubscriptionTier, hasProAccess, type SubscriptionTier } from '@/lib/subscription';
import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatsCard } from "@/components/ui/StatsCard";
import { motion } from "framer-motion";
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';

export default function HomePage() {
  const locale = useLocale();
  const t = useTranslations('app');
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier>('free');
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
      setTier(getSubscriptionTier(sub));
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

    supabase
        .from('quiz_attempts')
        .select('topic, correct')
        .eq('user_id', user.id)
        .eq('exam', selectedExam)
        .then(({ data }) => {

            const stats: Record<
                string,
                {
                    total: number;
                    correct: number;
                }
                > = {};

      data?.forEach((a: any) => {
          if(!stats[a.topic]) {
              stats[a.topic] = {
                  total: 0,
                  correct: 0,
              };
          }

          stats[a.topic].total += 1;

          if (a.correct) {
              stats[a.topic].correct += 1;
          }
      });

      const progressMap: Record<string, number> = {};

      Object.keys(stats).forEach(topic => {
          const item = stats[topic];

          progressMap[topic] = Math.round(
              (item.correct / item.total) * 100
          );
      });

      setTopicProgress(progressMap);
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
  const isMax = tier === 'max';

  return (
      <AppShell>

          <GlassCard
            style={{
              padding: '32px',
              marginBottom: 24,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',

                background: `

radial-gradient(

circle at top right,

rgba(107,92,231,0.18),

transparent 35%

),

rgba(17,17,20,0.72)

`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 24,
                flexWrap: 'wrap',
              }}
            >
              {/*LEFT*/}
              <div style={{ flex: 1, minWidth: 280 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: 'hsl(var(--muted-foreground))',
                    marginBottom: 10,
                  }}
                >
                  👋🏼 {t('welcomeBack')}, {name}
                </div>

                <h1
                  style={{
                    fontSize: 'clamp(36px,5vw,58px)',
                    lineHeight: 0.95,
                    letterSpacing: '-0.06em',
                    fontWeight: 800,
                    marginBottom: 18,
                  }}
                >
                  Learn
                  <br />
                  smarter.
                </h1>

                <p
                  style={{
                    maxWidth: 520,
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: 'hsl(var(--muted-foreground))',
                    marginBottom: 24,
                  }}
                >
                  Build streaks, earn XP,
                  complete roadmap topics
                  and improve every day.
                </p>

                <Link
                  href={`/${locale}/quiz`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '14px 22px',
                    borderRadius: 18,
                    background:
                      'linear-gradient(135deg,#6B5CE7,#8B7CFF)',
                    color: '#fff',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: 14,
                    boxShadow:
                      '0 12px 30px rgba(107,92,231,0.28)',
                  }}
                >
                  {t('continueBtn')}
                </Link>
              </div>

              {/*RIGHT*/}
              <div

                  style={{

                    width: '100%',

                    maxWidth: 340,

                  }}

              >

                <GlassCard

                    style={{

                      padding: 20,

                      background: 'rgba(255,255,255,0.04)',

                    }}

                >

                  <div

                      style={{

                        display: 'flex',

                        justifyContent: 'space-between',

                        alignItems: 'center',

                        marginBottom: 16,

                      }}

                  >

                    <div>

                      <div

                          style={{

                            fontSize: 13,

                            color:

                                'hsl(var(--muted-foreground))',

                            marginBottom: 4,

                          }}

                      >

                        Level

                      </div>

                      <div

                          style={{

                            fontSize: 34,

                            fontWeight: 800,

                          }}

                      >

                        {level.name}

                      </div>

                    </div>

                    <div

                        style={{

                          fontSize: 15,

                          color: '#6B5CE7',

                          fontWeight: 700,

                        }}

                    >

                      {xp} XP

                    </div>

                  </div>

                  <ProgressBar value={progress} />

                  <div

                      style={{

                        marginTop: 12,

                        fontSize: 13,

                        color:

                            'hsl(var(--muted-foreground))',

                      }}

                  >

                    {nextLevel

                        ? `${nextLevel.minXp - xp} XP to ${nextLevel.name}`

                        : 'Max level reached'}

                  </div>

                  <div

                      style={{

                        marginTop: 20,

                        display: 'grid',

                        gridTemplateColumns: '1fr 1fr',

                        gap: 10,

                      }}

                  >

                    <StatsCard

                        label="Streak"

                        value={`🔥 ${streak}`}

                    />

                    <StatsCard

                        label="Plan"

                        value={isMax ? 'MAX' : tier.toUpperCase()}

                    />
            </div>
          </GlassCard>
              </div>
            </div>
          </GlassCard>

          {/* Upgrade banner */}
          {!isMax && (
              <div style={{ background: 'rgba(107,92,231,0.06)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{isPro ? (locale === 'ru' ? 'Открой Max' : 'Unlock Max') : t('upgradePro')}</div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                    {isPro
                      ? (locale === 'ru' ? 'AI тьютор, персональный план по дням и безлимитные вопросы.' : 'AI tutor, day-by-day study plan, and unlimited questions.')
                      : t('upgradeDesc')}
                  </div>
                </div>
                <Link href={`/${locale}/pricing`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                  {isPro ? (locale === 'ru' ? 'Перейти на Max' : 'Upgrade to Max') : t('upgradeBtn')}
                </Link>
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
              {isMax && <span style={{ fontSize: 10, background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontWeight: 700 }}>MAX</span>}
            </button>
          </div>

          {/* Study Plan tab */}
          {activeTab === 'plan' && (
              isMax ? (
                  <StudyPlan locale={locale} />
              ) : (
                  <div style={{ textAlign: 'center', padding: '60px 24px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16 }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
                    <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{locale === 'ru' ? 'Ежедневный план — Max фича' : 'Daily Plan is a Max feature'}</h3>
                    <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 24, lineHeight: 1.6 }}>
                      {locale === 'ru' ? 'AI анализирует слабые темы и составляет персональный план каждый день.' : 'AI analyzes your weak topics and builds a personalized plan every day.'}
                    </p>
                    <Link href={`/${locale}/pricing`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '11px 28px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                      {locale === 'ru' ? 'Перейти на Max →' : 'Upgrade to Max →'}
                    </Link>
                  </div>
              )
          )}

          {/* Roadmap tab */}
            <GlassCard
                style={{
                    padding: 28,
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 28,
                    background: 'rgba(17,17,20,0.72)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}
            >

                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: `
            radial-gradient(
                circle at bottom left,
                rgba(107,92,231,0.14),
                transparent 35%
            )
        `,
                        pointerEvents: 'none',
                    }}
                />

                <PageHeader
                    eyebrow="Progress roadmap"
                    title="Your learning path"
                    description="Complete roadmap topics and improve your skills step by step."
                    right={
                      <div
                        style={{
                            fontSize: 13,
                            color: '#6B5CE7',
                            fontWeight: 600,
                        }}
                    >
                        {selectedExam}
                    </div>
                    }
                />
          {activeTab === 'roadmap' && (
              <>
                {/* Exam tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {Object.keys(ROADMAP).map(e => (
                      <button key={e} onClick={() => setSelectedExam(e)} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, border: `1px solid ${selectedExam === e ? '#6B5CE7' : 'hsl(var(--border))'}`, background: selectedExam === e ? '#6B5CE7' : 'transparent', color: selectedExam === e ? '#fff' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', backdropFilter: 'blur(10px)', }}>
                        {e}
                      </button>
                  ))}
                </div>

                <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                  {t('roadmap')} · {selectedExam}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {roadmap.map((node, i) => {
                    const pct = topicProgress[node.topic] || 0;
                    const done = Math.round((pct / 100) * node.total);
                    const isComplete = pct >= 70;
                    const isActive = !isComplete && (i === 0 || Math.min(Math.round(((topicProgress[roadmap[i-1]?.topic] || 0) / roadmap[i-1]?.total) * 100), 100) >= 80);
                    const isLocked = !isComplete && !isActive;
                    const isLast = i === roadmap.length - 1;
                    return (
                        <motion.div
                            whileHover={{
                                scale: 1.01,
                                y: -2,
                            }}
                            key={node.topic}
                            initial={{
                                opacity: 0,
                                y: 12,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                            }}
                            transition={{
                                delay: i * 0.05,
                            }}
                            style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, background: isComplete ? '#1D9E75' : isActive ? '#6B5CE7' : 'hsl(var(--muted))', color: (isComplete || isActive) ? '#fff' : 'hsl(var(--muted-foreground))', boxShadow: isActive ? '0 10px 30px rgba(107,92,231,0.18), 0 0 0 1px rgba(107,92,231,0.22)' : '0 4px 18px rgba(0,0,0,0.18)', transform: isActive ? 'scale(1.08)' : 'scale(1)', transition: 'all 0.25s ease', cursor: isLocked ? 'default' : 'pointer', zIndex: 1 }}>
                              {isComplete ? '✓' : isLocked ? '🔒' : i + 1}
                            </div>
                            {!isLast && <div style={{ width: 2, height: 32, background: isComplete ? '#1D9E75' : 'hsl(var(--border))', marginTop: 2 }} />}
                          </div>
                          <div style={{ flex: 1, paddingBottom: isLast ? 0 : 12, paddingTop: 8, opacity: isLocked ? 0.5 : 1 }}>
                            <div style={{ background: isActive ? `linear-gradient(180deg, rgba(107,92,231,0.12), rgba(17,17,20,0.72))` : 'rgba(17,17,20,0.72)', backdropFilter: 'blur(18px)', boxShadow: isActive ? '0 10px 30px rgba(107,92,231,0.18)' : 'none', border: `1px solid ${isActive ? '#6B5CE7' : 'hsl(var(--border))'}`, borderRadius: 14, padding: '18px 20px' }}>
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
                                          <Link href={`/${locale}/quiz?exam=${selectedExam}&topic=${encodeURIComponent(node.topic)}`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '10px 16px', fontSize: 12, fontWeight: 600, textDecoration: 'none', boxShadow: '0 8px 24px rgba(107,92,231,0.28)', }}>
                                            {done > 0 ? t('continueLabel') : t('startLabel')}
                                          </Link>
                                      )}
                                    </div>
                                )}
                              </div>
                              {!isLocked && (
                                  <div style={{ height: 6, background: 'hsl(var(--border))', borderRadius: 999, overflow: 'hidden', }}>
                                    <div style={{ height: 6, background: isComplete ? '#1D9E75' : '#6B5CE7', borderRadius: 999, width: `${pct}%`, transition: 'width 0.6s ease', boxShadow: pct > 0 ? '0 0 18px rgba(107,92,231,0.45)' : 'none', }} />
                                  </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                    );
                  })}
                </div>
              </>
          )}
            </GlassCard>
      </AppShell>
  );
}
