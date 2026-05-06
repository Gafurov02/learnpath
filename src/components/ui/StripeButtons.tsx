'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function SubscribeButton({ label = 'Start Pro for $10/mo', tier = 'pro' }: { label?: string; tier?: 'pro' | 'max' }) {
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push(`/${locale}/auth/signup`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, tier }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      alert(message);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        display: 'block', width: '100%', textAlign: 'center',
        background: loading ? '#9B8DFF' : '#6B5CE7',
        borderRadius: 10, padding: 12, fontSize: 14,
        fontWeight: 500, color: '#fff', border: 'none',
        cursor: loading ? 'default' : 'pointer',
        fontFamily: 'inherit', transition: 'opacity 0.15s',
      }}
    >
      {loading ? 'Redirecting...' : label}
    </button>
  );
}

export function ManageSubscriptionButton({ label = 'Manage subscription' }: { label?: string }) {
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      alert(message);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        border: '1px solid hsl(var(--border))', borderRadius: 10,
        padding: '10px 20px', fontSize: 14, fontWeight: 500,
        background: 'transparent', color: 'hsl(var(--foreground))',
        cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
      }}
    >
      {loading ? '...' : label}
    </button>
  );
}
