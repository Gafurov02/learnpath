'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function HeroSection() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Redirect logged-in users to /home
        router.replace(`/${locale}/home`);
      }
    });
  }, [locale, router]);

  // Show nothing while checking session

  return (
    <section style={{ maxWidth: 900, margin: '0 auto', padding: '90px 24px 70px', textAlign: 'center' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(107,92,231,0.1)', color: '#6B5CE7',
        border: '1px solid rgba(107,92,231,0.25)',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '5px 14px', borderRadius: 20, marginBottom: 28,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6B5CE7', display: 'inline-block' }} />
        {t('tag')}
      </div>
      <h1 style={{
        fontFamily: 'var(--font-serif), Georgia, serif',
        fontSize: 'clamp(42px, 7vw, 72px)',
        lineHeight: 1.08, letterSpacing: '-2px',
        color: 'hsl(var(--foreground))',
        marginBottom: 22, fontWeight: 400,
      }}>
        {t('title')}<br />
        <em style={{ color: '#6B5CE7', fontStyle: 'italic' }}>{t('titleEm')}</em>
      </h1>
      <p style={{ fontSize: 18, color: 'hsl(var(--muted-foreground))', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px', fontWeight: 300 }}>
        {t('sub')}
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href={`/${locale}/auth/signup`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
          {t('cta')}
        </Link>
        <Link href={`/${locale}/#quiz`} style={{ background: 'transparent', border: '1.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: 12, padding: '13px 28px', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
          {t('demo')}
        </Link>
      </div>
    </section>
  );
}
