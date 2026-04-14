'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

export default function SuccessPage() {
  const locale = useLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'hsl(var(--background))', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 480, opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.5s ease' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,192,122,0.15)', border: '2px solid #22C07A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32 }}>
          ✓
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 36, fontWeight: 400, letterSpacing: '-1px', marginBottom: 12, color: 'hsl(var(--foreground))' }}>
          You&apos;re Pro now!
        </h1>
        <p style={{ fontSize: 16, color: 'hsl(var(--muted-foreground))', lineHeight: 1.7, marginBottom: 32, fontWeight: 300 }}>
          Unlimited questions, all 12 exams, detailed AI explanations and personal study plan — all unlocked.
        </p>
        <Link href={`/${locale}/dashboard`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '13px 32px', fontSize: 15, fontWeight: 500, textDecoration: 'none', display: 'inline-block' }}>
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
}
