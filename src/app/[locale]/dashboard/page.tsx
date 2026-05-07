'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
// import { ManageSubscriptionButton } from '@/components/ui/StripeButtons';
import { calculateDailyStreak } from '@/lib/progress';
import { getSubscriptionTier, hasProAccess, type SubscriptionTier } from '@/lib/subscription';
import { getUserDisplayName } from '@/lib/user-profile';

type AttemptRow = {
  created_at: string;
  exam: string;
  correct: boolean;
};

type Stats = { total: number; correct: number; accuracy: number; attempts: AttemptRow[] };

type SubscriptionRow = {
  plan: string | null;
  status: string | null;
  xp: number | null;
};

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, correct: 0, accuracy: 0, attempts: [] });
  const [isPro, setIsPro] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [examStats, setExamStats] = useState<Record<string, { total: number; correct: number }>>({});

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (!session) {
        router.push(`/${locale}/home`);
        return;
      }

      setUser(session.user);

      const [progressResponse, subscriptionResponse] = await Promise.all([
        fetch('/api/progress'),
        supabase
          .from('subscriptions')
          .select('plan, status, xp')
          .eq('user_id', session.user.id)
          .maybeSingle()
      ]);

      if (progressResponse.ok) {
        const data = (await progressResponse.json()) as Stats;

        if (!isActive) {
          return;
        }

        setStats(data);
        setStreak(calculateDailyStreak(data.attempts));

        const byExam: Record<string, { total: number; correct: number }> = {};
        data.attempts.forEach((attempt) => {
          if (!byExam[attempt.exam]) {
            byExam[attempt.exam] = { total: 0, correct: 0 };
          }

          byExam[attempt.exam].total += 1;
          if (attempt.correct) {
            byExam[attempt.exam].correct += 1;
          }
        });
        setExamStats(byExam);
      }

      const subscription = subscriptionResponse.data as SubscriptionRow | null;
      setXp(subscription?.xp ?? 0);
      setIsPro(hasProAccess(subscription));
      setTier(getSubscriptionTier(subscription));
      setLoading(false);
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [locale, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'hsl(var(--background))' }}>
        <div style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const statCards = [
    { label: t('xp'), value: xp.toLocaleString(), color: '#6B5CE7', sub: 'total points' },
    { label: t('streak'), value: streak.toString(), color: '#EF9F27', sub: streak === 1 ? 'day' : 'days' },
    { label: t('accuracy'), value: stats.total > 0 ? `${stats.accuracy}%` : '—', color: '#22C07A', sub: `${stats.correct}/${stats.total}` },
  ];

  const exams = [
    { name: 'IELTS', sub: 'English' },
    { name: 'SAT', sub: 'Math & Verbal' },
    { name: 'ЕГЭ', sub: 'Russian' },
    { name: 'TOEFL', sub: 'English' },
    { name: 'GMAT', sub: 'Business' },
    { name: 'GRE', sub: 'Graduate' },
  ];
  const isMax = tier === 'max';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <Navbar />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>

        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>{t('welcome')}</div>
          <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 400, letterSpacing: '-0.5px' }}>
            {getUserDisplayName(user)} 👋
          </h1>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
          {statCards.map(s => (
            <div key={s.label} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 30, fontWeight: 500, color: s.color, marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Per-exam stats */}
        {Object.keys(examStats).length > 0 && (
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: 24, marginBottom: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Progress by exam</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(examStats).map(([exam, s]) => {
                const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                return (
                  <div key={exam}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
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
          </div>
        )}

        {/* Upgrade or manage */}
        {isPro ? (
          <div style={{ background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.2)', borderRadius: 16, padding: '16px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>✓ {isMax ? 'Max' : 'Pro'} plan active</div>
              <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                {isMax ? 'Unlimited questions · AI Tutor · Day-by-day plan' : '50 questions / 3 days · All exams · Full AI explanations'}
              </div>
            </div>
            <ManageSubscriptionButton label="Manage subscription" />
          </div>
        ) : (
          <div style={{ background: 'rgba(107,92,231,0.08)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 16, padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{t('upgrade')}</div>
              <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>{t('upgradeDesc')}</div>
            </div>
            <Link href={`/${locale}/pricing`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Upgrade →
            </Link>
          </div>
        )}

        {/* Choose exam */}
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 14 }}>Choose an exam</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {exams.map(exam => {
            const s = examStats[exam.name];
            const pct = s ? Math.round((s.correct / s.total) * 100) : null;
            return (
              <Link key={exam.name} href={`/${locale}/quiz?exam=${exam.name}`} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '18px 16px', textAlign: 'center', textDecoration: 'none', color: 'hsl(var(--foreground))', display: 'block' }}>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{exam.name}</div>
                <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: pct !== null ? 8 : 0 }}>{exam.sub}</div>
                {pct !== null && (
                  <div style={{ height: 3, background: 'hsl(var(--border))', borderRadius: 2 }}>
                    <div style={{ height: 3, background: '#6B5CE7', borderRadius: 2, width: `${pct}%` }} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
