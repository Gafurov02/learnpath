'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { LangSwitcher } from './LangSwitcher';

export function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) =>
        setUser(session?.user ?? null)
    );
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) =>
        setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  const linkStyle: React.CSSProperties = {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textDecoration: 'none',
    transition: 'color 0.15s',
  };

  const iconBtn: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.55)',
    padding: 7,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'inherit',
  };

  return (
      <nav
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backgroundColor: 'rgba(7,7,10,0.80)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
      >
        <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              height: 64,
            }}
        >
          <Link
              href={`/${locale}`}
              style={{
                fontFamily: 'var(--font-serif), Georgia, serif',
                fontSize: 22,
                color: '#fff',
                textDecoration: 'none',
              }}
          >
            Learn<span style={{ color: '#8B7CFF' }}>Path</span>
          </Link>

          {/* Desktop links */}
          <div className="lp-hide-mobile" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <Link href={`/${locale}/#features`} style={linkStyle}>{t('features')}</Link>
            <Link href={`/${locale}/#quiz`} style={linkStyle}>{t('tryNow')}</Link>
            <Link href={`/${locale}/#pricing`} style={linkStyle}>{t('pricing')}</Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LangSwitcher />

            {mounted && (
                <div className="lp-hide-mobile">
                  {user ? (
                      <Link
                          href={`/${locale}/home`}
                          style={{
                            background: '#6B5CE7',
                            color: '#fff',
                            borderRadius: 8,
                            padding: '8px 18px',
                            fontSize: 14,
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                      >
                        {t('dashboard')}
                      </Link>
                  ) : (
                      <Link
                          href={`/${locale}/auth/signup`}
                          style={{
                            background: '#6B5CE7',
                            color: '#fff',
                            borderRadius: 8,
                            padding: '8px 18px',
                            fontSize: 14,
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                      >
                        {t('start')}
                      </Link>
                  )}
                </div>
            )}

            <button
                style={{ ...iconBtn, padding: 8 }}
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lp-show-mobile"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                  <X style={{ width: 20, height: 20 }} />
              ) : (
                  <Menu style={{ width: 20, height: 20 }} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
            <div
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  backgroundColor: 'rgba(7,7,10,0.95)',
                  padding: '16px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
            >
              <Link href={`/${locale}/#features`} style={linkStyle} onClick={() => setMobileOpen(false)}>
                {t('features')}
              </Link>
              <Link href={`/${locale}/#quiz`} style={linkStyle} onClick={() => setMobileOpen(false)}>
                {t('tryNow')}
              </Link>
              <Link href={`/${locale}/#pricing`} style={linkStyle} onClick={() => setMobileOpen(false)}>
                {t('pricing')}
              </Link>
              {user ? (
                  <Link
                      href={`/${locale}/home`}
                      style={{
                        background: '#6B5CE7',
                        color: '#fff',
                        borderRadius: 8,
                        padding: '12px 18px',
                        fontSize: 14,
                        fontWeight: 500,
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                  >
                    {t('dashboard')}
                  </Link>
              ) : (
                  <Link
                      href={`/${locale}/auth/signup`}
                      style={{
                        background: '#6B5CE7',
                        color: '#fff',
                        borderRadius: 8,
                        padding: '12px 18px',
                        fontSize: 14,
                        fontWeight: 500,
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                  >
                    {t('start')}
                  </Link>
              )}
            </div>
        )}

        <style>{`
        @media (max-width: 768px)  { .lp-hide-mobile { display: none !important; } }
        @media (min-width: 769px)  { .lp-show-mobile { display: none !important; } }
      `}</style>
      </nav>
  );
}