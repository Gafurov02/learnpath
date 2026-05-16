'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Zap, Trophy, User, School, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { getLevelByXp } from '@/lib/levels';
import { hasProAccess } from '@/lib/subscription';
import { LangSwitcher } from './LangSwitcher';
import WalletButton from '@/components/TonConnectButton';

export function AppNavbar() {
    const locale = useLocale();
    const t = useTranslations('app');
    const pathname = usePathname();

    const [user, setUser] = useState<any>(null);
    const [xp, setXp] = useState(0);
    const [streak, setStreak] = useState(0);
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        const supabase = createClient();

        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) return;
            setUser(session.user);

            const [subRes, streakRes] = await Promise.all([
                supabase
                    .from('subscriptions')
                    .select('xp, plan, status')
                    .eq('user_id', session.user.id)
                    .single(),
                // Use the dedicated user_streaks table instead of computing from attempts
                supabase
                    .from('user_streaks')
                    .select('streak_count')
                    .eq('user_id', session.user.id)
                    .single(),
            ]);

            setXp(subRes.data?.xp ?? 0);
            setIsPro(hasProAccess(subRes.data));
            setStreak(streakRes.data?.streak_count ?? 0);
        });
    }, []);

    const level = getLevelByXp(xp);
    const initial =
        user?.user_metadata?.full_name?.[0]?.toUpperCase() ||
        user?.email?.[0]?.toUpperCase() ||
        'U';

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
            {/* ── Desktop nav ───────────────────────────────────────────────────── */}
            <nav
                className="lp-desktop-nav"
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    backgroundColor: 'rgba(7,7,10,0.80)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            >
                <div
                    style={{
                        maxWidth: 1100,
                        margin: '0 auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 20px',
                        height: 54,
                        gap: 12,
                    }}
                >
                    {/* Logo */}
                    <Link
                        href={`/${locale}/home`}
                        style={{
                            fontFamily: 'var(--font-serif), Georgia, serif',
                            fontSize: 20,
                            color: '#fff',
                            textDecoration: 'none',
                            flexShrink: 0,
                        }}
                    >
                        Learn<span style={{ color: '#8B7CFF' }}>Path</span>
                    </Link>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 2, flex: 1, justifyContent: 'center' }}>
                        {tabs.map((tab) => (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                style={{
                                    padding: '6px 13px',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 500,
                                    textDecoration: 'none',
                                    background: isActive(tab.href) ? 'rgba(139,124,255,0.14)' : 'transparent',
                                    color: isActive(tab.href) ? '#8B7CFF' : 'rgba(255,255,255,0.55)',
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {tab.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right side */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {streak > 0 && (
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#EF9F27' }}>
                                🔥 {streak}
                            </div>
                        )}
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                            {level.icon} {xp} XP
                        </div>
                        <LangSwitcher />
                        {isPro && (
                            <span
                                style={{
                                    background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)',
                                    color: '#fff',
                                    borderRadius: 20,
                                    padding: '2px 9px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                }}
                            >
                ⭐ PRO
              </span>
                        )}
                        <Link
                            href={`/${locale}/profile`}
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                background: isPro ? '#6B5CE7' : 'rgba(139,124,255,0.18)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#fff',
                                textDecoration: 'none',
                                flexShrink: 0,
                            }}
                        >
                            {initial}
                        </Link>
                        <WalletButton />
                    </div>
                </div>
            </nav>

            {/* ── Mobile top bar ────────────────────────────────────────────────── */}
            <nav
                className="lp-mobile-nav"
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 60,
                    paddingTop: 'env(safe-area-inset-top)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    background: 'rgba(7,7,10,0.82)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                <div
                    style={{
                        height: 54,
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
                            fontSize: 19,
                            fontWeight: 800,
                            letterSpacing: '-0.04em',
                            color: '#fff',
                        }}
                    >
                        Learn<span style={{ color: '#8B7CFF' }}>Path</span>
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {streak > 0 && (
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#EF9F27' }}>
                                🔥 {streak}
                            </div>
                        )}
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
                            {level.icon} {xp}
                        </div>
                        <LangSwitcher />
                    </div>
                </div>
            </nav>

            {/* ── Mobile bottom dock ────────────────────────────────────────────── */}
            <div
                className="lp-mobile-bottom"
                style={{
                    position: 'fixed',
                    left: 12,
                    right: 12,
                    bottom: 12,
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    borderRadius: 24,
                    background: 'rgba(15,15,20,0.88)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
                    // Safe area on bottom — apply to inner items, not container padding
                    height: 64,
                }}
            >
                {tabs.map((tab) => {
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
                                gap: 3,
                                textDecoration: 'none',
                                color: active ? '#8B7CFF' : 'rgba(255,255,255,0.38)',
                                transition: 'all 0.2s ease',
                                transform: active ? 'translateY(-2px)' : 'translateY(0)',
                                // Fixed: safe-area on each item so content shifts, not container
                                paddingBottom: 'env(safe-area-inset-bottom)',
                            }}
                        >
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 11,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: active ? 'rgba(139,124,255,0.16)' : 'transparent',
                                    transition: 'background 0.2s ease',
                                }}
                            >
                                <Icon style={{ width: 18, height: 18, strokeWidth: active ? 2.5 : 2 }} />
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

            {/* Bottom pad so content doesn't hide behind dock */}
            <div className="lp-mobile-bottom-pad" />

            <style>{`
        @media (min-width: 769px) {
          .lp-mobile-nav    { display: none !important; }
          .lp-mobile-bottom { display: none !important; }
          .lp-mobile-bottom-pad { display: none !important; }
        }
        @media (max-width: 768px) {
          .lp-desktop-nav       { display: none !important; }
          .lp-mobile-nav        { display: block !important; }
          .lp-mobile-bottom-pad { height: 88px; }
        }
      `}</style>
        </>
    );
}