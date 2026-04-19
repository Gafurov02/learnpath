'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { getLevelByXp } from '@/lib/levels';
import { hasProAccess } from '@/lib/subscription';
import { LangSwitcher } from './LangSwitcher';

export function AppNavbar() {
  const locale = useLocale();
  const t = useTranslations('app');
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUser(session.user);
      const { data: sub } = await supabase.from('subscriptions').select('xp, plan, status').eq('user_id', session.user.id).single();
      setXp(sub?.xp ?? 0);
      setIsPro(hasProAccess(sub));
      const { data: attempts } = await supabase.from('quiz_attempts').select('created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(60);
      if (attempts) {
        const dates = [...new Set(attempts.map((a: any) => new Date(a.created_at).toDateString()))];
        let s = 0;
        const today = new Date();
        for (let i = 0; i < dates.length; i++) {
          const d = new Date(today); d.setDate(d.getDate() - i);
          if (dates.includes(d.toDateString())) s++; else break;
        }
        setStreak(s);
      }
    });
  }, []);

  const level = getLevelByXp(xp);
  const tabs = [
    { href: `/${locale}/home`, label: t('home') },
    { href: `/${locale}/quiz`, label: t('practice') },
    { href: `/${locale}/leaderboard`, label: t('leaderboard') },
    { href: `/${locale}/profile`, label: t('profile') },
    { href: `/${locale}/school`, label: locale === 'ru' ? 'Школа' : 'School' },
  ];
  const isActive = (href: string) => pathname.startsWith(href.split('?')[0]);
  const initial = user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 58 }}>
          <Link href={`/${locale}/home`} style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 20, color: 'hsl(var(--foreground))', textDecoration: 'none', flexShrink: 0 }}>
            Learn<span style={{ color: '#6B5CE7' }}>Path</span>
          </Link>
          <div style={{ display: 'flex', gap: 2 }}>
            {tabs.map(tab => (
                <Link key={tab.href} href={tab.href} style={{ padding: '6px 13px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', background: isActive(tab.href) ? '#6B5CE7' : 'transparent', color: isActive(tab.href) ? '#fff' : 'hsl(var(--muted-foreground))', transition: 'all 0.15s' }}>
                  {tab.label}
                </Link>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {streak > 0 && <div style={{ fontSize: 13, fontWeight: 500, color: '#EF9F27' }}>🔥 {streak}</div>}
            <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{level.icon} {xp} XP</div>
            <LangSwitcher />
            {mounted && (
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: 5, display: 'flex', alignItems: 'center' }}>
                  {theme === 'dark' ? <Sun style={{ width: 15, height: 15 }} /> : <Moon style={{ width: 15, height: 15 }} />}
                </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isPro && <span style={{ background: 'linear-gradient(135deg, #6B5CE7, #9B8DFF)', color: '#fff', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>⭐ PRO</span>}
              <Link href={`/${locale}/profile`} style={{ width: 30, height: 30, borderRadius: '50%', background: isPro ? '#6B5CE7' : '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isPro ? '#fff' : '#6B5CE7', textDecoration: 'none', flexShrink: 0 }}>
                {initial}
              </Link>
            </div>
          </div>
        </div>
      </nav>
  );
}
