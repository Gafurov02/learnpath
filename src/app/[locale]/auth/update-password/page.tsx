'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

export default function UpdatePasswordPage() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const expired = searchParams.get('error_code') === 'otp_expired' || searchParams.get('error') === 'access_denied';

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    border: '1px solid hsl(var(--border))', borderRadius: 10,
    fontSize: 14, background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  };

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(locale === 'ru' ? 'Пароли не совпадают' : 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError(locale === 'ru' ? 'Минимум 6 символов' : 'Minimum 6 characters');
      return;
    }
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.push(`/${locale}/home`), 2000);
  }

  return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'hsl(var(--background))', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <Link href={`/${locale}`} style={{ display: 'block', fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 24, color: 'hsl(var(--foreground))', textDecoration: 'none', textAlign: 'center', marginBottom: 40 }}>
            Learn<span style={{ color: '#6B5CE7' }}>Path</span>
          </Link>

          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 20, padding: 32 }}>
            {expired ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>⏰</div>
                  <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 24, fontWeight: 400, marginBottom: 12, color: 'hsl(var(--foreground))' }}>
                    {locale === 'ru' ? 'Ссылка устарела' : 'Link expired'}
                  </h2>
                  <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: 24 }}>
                    {locale === 'ru'
                        ? 'Ссылка для сброса пароля действует 1 час. Запроси новую.'
                        : 'The reset link is only valid for 1 hour. Please request a new one.'}
                  </p>
                  <Link href={`/${locale}/auth/reset-password`} style={{ display: 'block', background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 500, textDecoration: 'none', textAlign: 'center', marginBottom: 12 }}>
                    {locale === 'ru' ? 'Запросить новую ссылку' : 'Request new link'}
                  </Link>
                  <Link href={`/${locale}/auth/login`} style={{ fontSize: 13, color: '#6B5CE7', textDecoration: 'none' }}>
                    {locale === 'ru' ? '← Вернуться к входу' : '← Back to login'}
                  </Link>
                </div>
            ) : done ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
                  <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 24, fontWeight: 400, marginBottom: 12, color: 'hsl(var(--foreground))' }}>
                    {locale === 'ru' ? 'Пароль обновлён!' : 'Password updated!'}
                  </h2>
                  <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
                    {locale === 'ru' ? 'Перенаправляем...' : 'Redirecting...'}
                  </p>
                </div>
            ) : (
                <>
                  <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, marginBottom: 6, textAlign: 'center', color: 'hsl(var(--foreground))' }}>
                    {locale === 'ru' ? 'Новый пароль' : 'New password'}
                  </h1>
                  <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', textAlign: 'center', marginBottom: 24 }}>
                    {locale === 'ru' ? 'Введи новый пароль для аккаунта' : 'Enter a new password for your account'}
                  </p>

                  <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input type="password" autoComplete="new-password" placeholder={locale === 'ru' ? 'Новый пароль' : 'New password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={inputStyle} />
                    <input type="password" autoComplete="new-password" placeholder={locale === 'ru' ? 'Повтори пароль' : 'Confirm password'} value={confirm} onChange={e => setConfirm(e.target.value)} required style={inputStyle} />

                    {error && (
                        <div style={{ background: 'rgba(232,64,64,0.08)', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#E84040' }}>
                          {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} style={{ background: loading ? '#9B8DFF' : '#6B5CE7', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
                      {loading ? '...' : (locale === 'ru' ? 'Сохранить пароль' : 'Save password')}
                    </button>
                  </form>
                </>
            )}
          </div>
        </div>
      </div>
  );
}
