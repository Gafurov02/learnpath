'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getLevelByXp } from '@/lib/levels';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

type Entry = { id: string; display_name: string; avatar_url: string; xp: number; level: string; rank: number };

export default function LeaderboardPage() {
  const locale = useLocale();
  const t = useTranslations('app');
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async (silent = false) => {
    const supabase = createClient();

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      setUserId(session.user.id);
      const { data } = await supabase
        .from('leaderboard')
        .select('*')
        .order('rank', { ascending: true })
        .limit(50);

      setEntries((data ?? []) as Entry[]);
      setLastUpdatedAt(new Date().toISOString());
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [locale, router]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  useLiveRefresh({
    enabled: !!userId,
    intervalMs: 12000,
    onRefresh: async () => loadLeaderboard(true),
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <AppNavbar />
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 32, fontWeight: 400, letterSpacing: '-1px', marginBottom: 6 }}>{t('leaderboard')}</h1>
            <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>{t('topStudents')}</p>
            <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
              {locale === 'ru' ? 'Автообновление каждые 12 секунд' : 'Auto-refreshes every 12 seconds'}
              {lastUpdatedAt && (
                <span> · {locale === 'ru' ? 'обновлено' : 'updated'} {new Date(lastUpdatedAt).toLocaleTimeString(locale === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadLeaderboard(true)}
            disabled={refreshing}
            style={{ background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '9px 14px', fontSize: 13, color: refreshing ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {refreshing ? (locale === 'ru' ? 'Обновляю...' : 'Refreshing...') : (locale === 'ru' ? 'Обновить' : 'Refresh')}
          </button>
        </div>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'hsl(var(--muted-foreground))' }}>{t('noEntries')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((entry, index) => {
              const isMe = entry.id === userId;
              const level = getLevelByXp(entry.xp);

              return (
                <div key={entry.id} style={{ background: isMe ? 'rgba(107,92,231,0.08)' : 'hsl(var(--card))', border: `1px solid ${isMe ? '#6B5CE7' : 'hsl(var(--border))'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 32, textAlign: 'center', fontSize: index < 3 ? 22 : 14, fontWeight: 600, color: index < 3 ? undefined : 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
                    {index < 3 ? medals[index] : `#${entry.rank}`}
                  </div>
                  <UserAvatar
                    avatarUrl={entry.avatar_url}
                    name={entry.display_name}
                    id={entry.id}
                    size={38}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {entry.display_name} {isMe && <span style={{ fontSize: 11, color: '#6B5CE7', fontWeight: 400 }}>({t('you')})</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{level.icon} {level.name}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: index === 0 ? '#EF9F27' : index === 1 ? '#888780' : index === 2 ? '#BA7517' : 'hsl(var(--foreground))' }}>
                    {entry.xp.toLocaleString()} XP
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
