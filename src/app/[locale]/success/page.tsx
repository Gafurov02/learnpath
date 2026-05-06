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
          {locale === 'ru' ? 'Подписка активна!' : 'Your subscription is active!'}
        </h1>
        <p style={{ fontSize: 16, color: 'hsl(var(--muted-foreground))', lineHeight: 1.7, marginBottom: 32, fontWeight: 300 }}>
          {locale === 'ru'
            ? 'Pro Practice откроет 50 вопросов на 3 дня, а Max добавит безлимит, AI тьютора и план по дням.'
            : 'Pro Practice unlocks 50 questions every 3 days, while Max adds unlimited practice, AI Tutor, and the day-by-day plan.'}
        </p>
        <Link href={`/${locale}/dashboard`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '13px 32px', fontSize: 15, fontWeight: 500, textDecoration: 'none', display: 'inline-block' }}>
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
}
