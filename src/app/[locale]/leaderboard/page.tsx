'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { getLevelByXp } from '@/lib/levels';

type Entry = { id: string; display_name: string; xp: number; level: string; rank: number };

export default function LeaderboardPage() {
  const locale = useLocale();
  const t = useTranslations('app');
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push(`/${locale}/auth/login`); return; }
      setUserId(session.user.id);
      const { data } = await supabase.from('leaderboard').select('*').limit(50);
      setEntries(data ?? []);
      setLoading(false);
    });
  }, [locale, router]);

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <AppNavbar />
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 32, fontWeight: 400, letterSpacing: '-1px', marginBottom: 6 }}>{t('leaderboard')}</h1>
        <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 28 }}>{t('topStudents')}</p>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'hsl(var(--muted-foreground))' }}>{t('noEntries')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((e, i) => {
              const isMe = e.id === userId;
              const level = getLevelByXp(e.xp);
              return (
                <div key={e.id} style={{ background: isMe ? 'rgba(107,92,231,0.08)' : 'hsl(var(--card))', border: `1px solid ${isMe ? '#6B5CE7' : 'hsl(var(--border))'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 32, textAlign: 'center', fontSize: i < 3 ? 22 : 14, fontWeight: 600, color: i < 3 ? undefined : 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
                    {i < 3 ? medals[i] : `#${e.rank}`}
                  </div>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: '#6B5CE7', flexShrink: 0 }}>
                    {e.display_name[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {e.display_name} {isMe && <span style={{ fontSize: 11, color: '#6B5CE7', fontWeight: 400 }}>({t('you')})</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{level.icon} {level.name}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: i === 0 ? '#EF9F27' : i === 1 ? '#888780' : i === 2 ? '#BA7517' : 'hsl(var(--foreground))' }}>
                    {e.xp.toLocaleString()} XP
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
