import { useTranslations } from 'next-intl';
import { Navbar } from '@/components/layout/Navbar';
import { PricingCards } from '@/components/pricing/PricingCards';

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
        <PricingCards locale={locale} />
      </section>
  );
}
