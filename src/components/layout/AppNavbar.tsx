'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon, Home, Zap, Trophy, User, School, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { getLevelByXp } from '@/lib/levels';
import { hasProAccess } from '@/lib/subscription';
import { LangSwitcher } from './LangSwitcher';
import WalletButton from "@/components/TonConnectButton";

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
    { href: `/${locale}/schools`, label: locale === 'ru' ? 'Школы' : 'Schools', icon: School },
    { href: `/${locale}/profile`, label: t('profile'), icon: User },
  ];

  const isActive = (href: string) => pathname.startsWith(href.split('?')[0]);

  return (
      <>
        {/* Desktop top navbar */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid hsl(var(--border))', backgroundColor: theme === 'dark' ? 'rgba(15,15,20,0.72)' : 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }} className="lp-desktop-nav">
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 54 }}>
            <Link href={`/${locale}/home`} style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 20, color: 'hsl(var(--foreground))', textDecoration: 'none', flexShrink: 0 }}>
              Learn<span style={{ color: '#6B5CE7' }}>Path</span>
            </Link>

            <div style={{ display: 'flex', gap: 2 }}>
              {tabs.map(tab => (
                  <Link key={tab.href} href={tab.href} style={{ padding: '6px 13px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', background: isActive(tab.href) ? 'rgba(107,92,231,0.14)' : 'transparent', color: isActive(tab.href) ? '#8B7CFF' : 'hsl(var(--muted-foreground))', transition: 'all 0.15s' }}>
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
            <WalletButton />
          </div>
        </nav>

          {/* Mobile Header */}
          <nav
              className="lp-mobile-nav"
              style={{
                  position: 'sticky',
                  top: 0,

                  zIndex: 60,

                  paddingTop: 'env(safe-area-inset-top)',

                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',

                  background:
                      theme === 'dark'
                          ? 'rgba(15,15,20,0.72)'
                          : 'rgba(255,255,255,0.72)',

                  borderBottom:
                      theme === 'dark'
                          ? '1px solid rgba(255,255,255,0.06)'
                          : '1px solid rgba(0,0,0,0.05)',
              }}
          >
              <div
                  style={{
                      height: 58,

                      padding: '0 16px',

                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                  }}
              >
                  <Link
                      href={`/${locale}/home`}
                      style={{
                          textDecoration: 'none',

                          fontSize: 20,
                          fontWeight: 800,

                          letterSpacing: '-0.04em',

                          color: 'hsl(var(--foreground))',
                      }}
                  >
                      Learn
                      <span style={{ color: '#8B7CFF' }}>
        Path
      </span>
                  </Link>

                  <div
                      style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                      }}
                  >
                      {streak > 0 && (
                          <div
                              style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: '#EF9F27',
                              }}
                          >
                              🔥 {streak}
                          </div>
                      )}

                      <div
                          style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color:
                                  'hsl(var(--muted-foreground))',
                          }}
                      >
                          {level.icon} {xp}
                      </div>

                      {mounted && (
                          <button
                              onClick={() =>
                                  setTheme(
                                      theme === 'dark'
                                          ? 'light'
                                          : 'dark'
                                  )
                              }
                              style={{
                                  width: 34,
                                  height: 34,

                                  borderRadius: 12,

                                  border: 'none',

                                  background:
                                      theme === 'dark'
                                          ? 'rgba(255,255,255,0.06)'
                                          : 'rgba(0,0,0,0.04)',

                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',

                                  cursor: 'pointer',

                                  color:
                                      'hsl(var(--foreground))',
                              }}
                          >
                              {theme === 'dark' ? (
                                  <Sun
                                      style={{
                                          width: 16,
                                          height: 16,
                                      }}
                                  />
                              ) : (
                                  <Moon
                                      style={{
                                          width: 16,
                                          height: 16,
                                      }}
                                  />
                              )}
                          </button>
                      )}
                  </div>
              </div>
          </nav>

        {/* Premium Mobile Dock */}
        <div
            className="lp-mobile-bottom"
            style={{
              position: 'fixed',

              left: 12,
              right: 12,
              bottom: 12,

              height: 64,

              zIndex: 100,

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',

              borderRadius: 24,

              background:
                theme === 'dark'
                  ? 'rgba(15,15,20,0.78)'
                  : 'rgba(255,255,255,0.75)',

              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',

              border:
                theme === 'dark'
                  ? '1px solid rgba(255,255,255,0.08)'
                  : '1px solid rgba(0,0,0,0.06)',

              boxShadow:
                  theme === 'dark'
                    ? '0 10px 40px rgba(0,0,0,0.35)'
                    : '0 10px 30px rgba(0,0,0,0.08)',

              paddingBottom: 'env(safe-area-inset-bottom)',
              transition: 'all 0.22s ease',
          }}
        >
          {tabs.map(tab => {
            const active = isActive(tab.href);
            const Icon = tab.icon;

            return (
                <Link
                    key={tab.href}
                    href={tab.href}
                    style={{
                      flex: 1,

                      height: '100%',

                      display: 'flex',
                      flexDirection: 'column',

                      alignItems: 'center',
                      justifyContent: 'center',

                      gap: 4,

                      textDecoration: 'none',
                      color: active
                          ? '#8B7CFF'
                          : 'hsl(var(--muted-foreground))',

                      transition: 'all 0.2s ease',

                      transform:
                        active
                          ? 'translateY(-3px) scale(1.02)'
                          : 'translateY(0)',
                    }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,

                      borderRadius: 12,

                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',

                      background: active
                        ? 'rgba(139,124,255,0.14)'
                        : 'transparent',

                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Icon
                        style={{
                          width: 18,
                          height: 18,
                          strokeWidth: active ? 2.6 : 2,
                        }}
                    />
                  </div>

                  <span
                      style={{
                        fontSize: 10,
                        fontWeight: active ? 700 : 500,
                        letterSpacing: '-0.02em',
                      }}
                  >
                    {tab.label}
                  </span>
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
          .lp-mobile-bottom-pad { height: 95px; }
          .lp-mobile-nav { display: block !important; }
        }

        .profile-card {
          transition: all 0.2s ease;
        }

        .profile-card:hover {
          transform: translateY(-2px);
          border-color: rgba(107,92,231,0.25) !important;
          box-shadow: 0 10px 24px rgba(107,92,231,0.06);
        }

        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .profile-card {
            padding: 20px !important;
            border-radius: 20px !important;
          }

          .profile-section {
            gap: 18px !important;
          }
        }
      `}</style>
      </>
  );
}
