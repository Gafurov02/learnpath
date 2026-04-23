'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon, Home, Zap, Trophy, User, School } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { getLevelByXp } from '@/lib/levels';
import { LangSwitcher } from './LangSwitcher';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getUserAvatarUrl, getUserDisplayName } from '@/lib/user-profile';

export function AppNavbar() {
  const locale = useLocale();
  const t = useTranslations('app');
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);
      const { data: sub } = await supabase.from('subscriptions').select('xp, plan').eq('user_id', session.user.id).single();
      setXp(sub?.xp ?? 0);
      setIsPro(sub?.plan === 'pro');
      const { data: attempts } = await supabase.from('quiz_attempts').select('created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(60);
      if (attempts) {
        const dates = [...new Set(attempts.map((a: any) => new Date(a.created_at).toDateString()))];
        let s = 0; const today = new Date();
        for (let i = 0; i < dates.length; i++) { const d = new Date(today); d.setDate(d.getDate() - i); if (dates.includes(d.toDateString())) s++; else break; }
        setStreak(s);
      }
    };

    void loadUser();
    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const level = getLevelByXp(xp);
  const displayName = getUserDisplayName(user);
  const avatarUrl = getUserAvatarUrl(user);

  const tabs = [
    { href: `/${locale}/home`, label: t('home'), icon: Home },
    { href: `/${locale}/quiz`, label: t('practice'), icon: Zap },
    { href: `/${locale}/leaderboard`, label: t('leaderboard'), icon: Trophy },
    { href: `/${locale}/profile`, label: t('profile'), icon: User },
    { href: `/${locale}/school`, label: locale === 'ru' ? 'Школа' : 'School', icon: School },
  ];

  const isActive = (href: string) => pathname.startsWith(href.split('?')[0]);

  return (
      <>
        {/* Desktop top navbar */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', backdropFilter: 'blur(12px)' }} className="lp-desktop-nav">
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
                {isPro && <span style={{ background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', color: '#fff', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>⭐ PRO</span>}
                <Link href={`/${locale}/profile`} aria-label={displayName} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <UserAvatar
                    avatarUrl={avatarUrl}
                    email={user?.email}
                    name={displayName}
                    id={user?.id}
                    size={30}
                    accent={isPro ? 'pro' : 'default'}
                  />
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile top bar */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }} className="lp-mobile-nav">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 52 }}>
            <Link href={`/${locale}/home`} style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 18, color: 'hsl(var(--foreground))', textDecoration: 'none' }}>
              Learn<span style={{ color: '#6B5CE7' }}>Path</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {streak > 0 && <span style={{ fontSize: 13, color: '#EF9F27', fontWeight: 600 }}>🔥{streak}</span>}
              <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{level.icon}{xp}</span>
              <LangSwitcher />
              {mounted && (
                  <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: 4, display: 'flex' }}>
                    {theme === 'dark' ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
                  </button>
              )}
              {isPro && <span style={{ background: '#6B5CE7', color: '#fff', borderRadius: 20, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>PRO</span>}
            </div>
          </div>
        </nav>

        {/* Mobile bottom navigation */}
        <div className="lp-mobile-bottom" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, borderTop: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {tabs.map(tab => {
            const active = isActive(tab.href);
            const Icon = tab.icon;
            return (
                <Link key={tab.href} href={tab.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', textDecoration: 'none', color: active ? '#6B5CE7' : 'hsl(var(--muted-foreground))', gap: 3 }}>
                  <Icon style={{ width: 20, height: 20, strokeWidth: active ? 2.5 : 1.8 }} />
                  <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: '-0.01em' }}>{tab.label}</span>
                </Link>
            );
          })}
        </div>

        {/* Bottom padding for mobile content */}
        <div className="lp-mobile-bottom-pad" />

        <style>{`
        @media (min-width: 769px) {
          .lp-mobile-nav { display: none !important; }
          .lp-mobile-bottom { display: none !important; }
          .lp-mobile-bottom-pad { display: none !important; }
        }
        @media (max-width: 768px) {
          .lp-desktop-nav { display: none !important; }
          .lp-mobile-bottom-pad { height: 65px; }
        }
      `}</style>
      </>
  );
}
