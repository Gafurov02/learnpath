import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SubscribeButton } from '@/components/ui/StripeButtons';

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))' }}>
        <Navbar />
        <PricingContent locale={locale} />
      </div>
  );
}

function PricingContent({ locale }: { locale: string }) {
  const t = useTranslations('pricing');
  return (
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', color: '#6B5CE7', textTransform: 'uppercase', marginBottom: '16px' }}>{t('tag')}</div>
          <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 400, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '16px', whiteSpace: 'pre-line' }}>{t('title')}</h1>
          <p style={{ fontSize: '17px', color: 'hsl(var(--muted-foreground))', fontWeight: 300 }}>{t('sub')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '20px', padding: '32px' }}>
            <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>{t('free.name')}</div>
            <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: '52px', letterSpacing: '-2px', marginBottom: '4px' }}>$0</div>
            <div style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginBottom: '28px' }}>{t('free.period')}</div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {(t.raw('free.features') as string[]).map((f: string) => <li key={f} style={{ display: 'flex', gap: '8px', fontSize: '14px' }}><span style={{ color: '#22C07A', fontWeight: 700 }}>✓</span>{f}</li>)}
              {(t.raw('free.missing') as string[]).map((f: string) => <li key={f} style={{ display: 'flex', gap: '8px', fontSize: '14px', color: 'hsl(var(--muted-foreground))' }}><span>×</span>{f}</li>)}
            </ul>
            <Link href={`/${locale}/auth/signup`} style={{ display: 'block', padding: '13px', borderRadius: '10px', border: '1.5px solid hsl(var(--border))', textAlign: 'center', fontSize: '14px', fontWeight: 500, textDecoration: 'none', color: 'hsl(var(--foreground))' }}>{t('free.cta')}</Link>
          </div>
          <div style={{ background: 'hsl(var(--card))', border: '2px solid #6B5CE7', borderRadius: '20px', padding: '32px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#6B5CE7', color: '#fff', padding: '4px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('pro.badge')}</div>
            <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>{t('pro.name')}</div>
            <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: '52px', letterSpacing: '-2px', marginBottom: '4px' }}>$10</div>
            <div style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginBottom: '28px' }}>{t('pro.period')}</div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {(t.raw('pro.features') as string[]).map((f: string) => <li key={f} style={{ display: 'flex', gap: '8px', fontSize: '14px' }}><span style={{ color: '#22C07A', fontWeight: 700 }}>✓</span>{f}</li>)}
            </ul>
            <SubscribeButton label={t('pro.cta')} />
          </div>
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '20px', padding: '32px' }}>
            <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>{t('teams.name')}</div>
            <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: '52px', letterSpacing: '-2px', marginBottom: '4px' }}>B2B</div>
            <div style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginBottom: '28px' }}>{t('teams.period')}</div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {(t.raw('teams.features') as string[]).map((f: string) => <li key={f} style={{ display: 'flex', gap: '8px', fontSize: '14px' }}><span style={{ color: '#22C07A', fontWeight: 700 }}>✓</span>{f}</li>)}
            </ul>
            <a href="mailto:boburbek@gafurov.cc" style={{ display: 'block', padding: '13px', borderRadius: '10px', border: '1.5px solid hsl(var(--border))', textAlign: 'center', fontSize: '14px', fontWeight: 500, textDecoration: 'none', color: 'hsl(var(--foreground))' }}>{t('teams.cta')}</a>
          </div>
        </div>
      </section>
  );
}