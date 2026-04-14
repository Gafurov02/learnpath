'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${locale}/auth/update-password`,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    border: '1px solid hsl(var(--border))', borderRadius: 10,
    fontSize: 14, background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'hsl(var(--background))', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Link href={`/${locale}`} style={{ display: 'block', fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 24, color: 'hsl(var(--foreground))', textDecoration: 'none', textAlign: 'center', marginBottom: 40 }}>
          Learn<span style={{ color: '#6B5CE7' }}>Path</span>
        </Link>

        <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 20, padding: 32 }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
              <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 24, fontWeight: 400, marginBottom: 12, color: 'hsl(var(--foreground))' }}>
                {locale === 'ru' ? 'Письмо отправлено' : 'Email sent'}
              </h2>
              <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: 24 }}>
                {locale === 'ru'
                  ? `Мы отправили ссылку для сброса пароля на ${email}`
                  : `We sent a password reset link to ${email}`}
              </p>
              <Link href={`/${locale}/auth/login`} style={{ color: '#6B5CE7', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
                {locale === 'ru' ? '← Вернуться к входу' : '← Back to login'}
              </Link>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, marginBottom: 6, textAlign: 'center', color: 'hsl(var(--foreground))' }}>
                {locale === 'ru' ? 'Сброс пароля' : 'Reset password'}
              </h1>
              <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', textAlign: 'center', marginBottom: 24 }}>
                {locale === 'ru'
                  ? 'Введи email — пришлём ссылку для сброса'
                  : 'Enter your email and we\'ll send a reset link'}
              </p>

              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={t('email')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />

                {error && (
                  <div style={{ background: 'rgba(232,64,64,0.08)', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#E84040' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ background: loading ? '#9B8DFF' : '#6B5CE7', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}
                >
                  {loading ? '...' : (locale === 'ru' ? 'Отправить ссылку' : 'Send reset link')}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'hsl(var(--muted-foreground))', marginTop: 20 }}>
                <Link href={`/${locale}/auth/login`} style={{ color: '#6B5CE7', textDecoration: 'none', fontWeight: 500 }}>
                  {locale === 'ru' ? '← Вернуться к входу' : '← Back to login'}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
