'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/${locale}/home`,
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled in Supabase — user is logged in immediately
    if (data.session) {
      router.push(`/${locale}/home`);
      return;
    }

    // Email confirmation required
    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/${locale}/home` },
    });
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
            {success ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
                  <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 24, fontWeight: 400, marginBottom: 12, color: 'hsl(var(--foreground))' }}>
                    Check your email
                  </h2>
                  <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: 20 }}>
                    We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
                  </p>
                  <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                    Or{' '}
                    <button onClick={() => setSuccess(false)} style={{ color: '#6B5CE7', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                      try again
                    </button>
                  </p>
                </div>
            ) : (
                <>
                  <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, marginBottom: 6, textAlign: 'center', color: 'hsl(var(--foreground))' }}>
                    {t('signUp')}
                  </h1>
                  <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', textAlign: 'center', marginBottom: 24 }}>
                    Free forever · no credit card
                  </p>

                  <button onClick={handleGoogle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: '1px solid hsl(var(--border))', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 500, background: 'transparent', color: 'hsl(var(--foreground))', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    {t('continueGoogle')}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ flex: 1, height: 1, background: 'hsl(var(--border))' }} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{t('or')}</span>
                    <div style={{ flex: 1, height: 1, background: 'hsl(var(--border))' }} />
                  </div>

                  <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input
                        type="email" autoComplete="email" placeholder={t('email')} value={email}
                        onChange={e => setEmail(e.target.value)} required style={inputStyle}
                    />
                    <div>
                      <input
                          type="password" autoComplete="new-password" placeholder={`${t('password')} (min. 6 characters)`}
                          value={password} onChange={e => setPassword(e.target.value)}
                          required minLength={6} style={inputStyle}
                      />
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(232,64,64,0.08)', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#E84040' }}>
                          {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} style={{ background: loading ? '#9B8DFF' : '#6B5CE7', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
                      {loading ? '...' : t('signUp')}
                    </button>
                  </form>

                  <p style={{ textAlign: 'center', fontSize: 13, color: 'hsl(var(--muted-foreground))', marginTop: 20 }}>
                    {t('haveAccount')}{' '}
                    <Link href={`/${locale}/auth/login`} style={{ color: '#6B5CE7', textDecoration: 'none', fontWeight: 500 }}>{t('signIn')}</Link>
                  </p>
                </>
            )}
          </div>
        </div>
      </div>
  );
}