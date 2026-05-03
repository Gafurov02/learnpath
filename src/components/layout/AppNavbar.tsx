'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon, Home, Zap, Trophy, User, School, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { getLevelByXp } from '@/lib/levels';
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
    });
  }, []);

  const level = getLevelByXp(xp);
  const initial = user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  const tabs = [
    { href: `/${locale}/home`, label: t('home'), icon: Home },
    { href: `/${locale}/quiz`, label: t('practice'), icon: Zap },
    { href: `/${locale}/chat`, label: locale === 'ru' ? 'Тьютор' : 'Tutor', icon: MessageCircle },
    { href: `/${locale}/leaderboard`, label: t('leaderboard'), icon: Trophy },
    { href: `/${locale}/school`, label: locale === 'ru' ? 'Школа' : 'School', icon: School },
    { href: `/${locale}/profile`, label: t('profile'), icon: User },
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
                <Link href={`/${locale}/profile`} style={{ width: 30, height: 30, borderRadius: '50%', background: isPro ? '#6B5CE7' : '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isPro ? '#fff' : '#6B5CE7', textDecoration: 'none', flexShrink: 0 }}>
                  {initial}
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
                <Link key={tab.href} href={tab.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px 2px', textDecoration: 'none', color: active ? '#6B5CE7' : 'hsl(var(--muted-foreground))', gap: 2 }}>
                  <Icon style={{ width: 18, height: 18, strokeWidth: active ? 2.5 : 1.8 }} />
                  <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, letterSpacing: '-0.01em' }}>{tab.label}</span>
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