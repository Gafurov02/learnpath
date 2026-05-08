import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/layout/HeroSection';
import { QuizSection } from '@/components/quiz/QuizSection';
import { PricingCards } from '@/components/pricing/PricingCards';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return (
        <main style={{
            minHeight: '100vh',
            backgroundColor: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px'
        }}>
            <Navbar />
            <HeroSection />
            <StatsSection />
            <FeaturesSection />
            <QuizSection />
            <PricingSection locale={locale} />
            <Footer locale={locale} />
            <style>{`
        .feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(107,92,231,0.35) !important;
          box-shadow: 0 10px 30px rgba(107,92,231,0.08);
        }

        .stats-wrapper {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .section-heading {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 42px;
        }

        .section-subtitle {
          max-width: 560px;
        }

        @media (max-width: 600px) {
          .stats-grid {
            gap: 18px 24px !important;
            padding: 28px 18px !important;
          }

          .features-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }

          .pricing-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .feature-card {
            padding: 18px !important;
            border-radius: 18px !important;
          }

          .feature-icon {
            width: 34px !important;
            height: 34px !important;
            font-size: 15px !important;
            margin-bottom: 12px !important;
          }

          .feature-title {
            font-size: 14px !important;
          }

          .feature-desc {
            font-size: 12px !important;
            line-height: 1.6 !important;
          }
        }
      `}</style>
        </main>
    );
}

function StatsSection() {
    const t = useTranslations('stats');
    const stats = [
        { num: '50K+', label: t('students') },
        { num: '12', label: t('exams') },
        { num: '94%', label: t('passRate') },
        { num: '0.3 TON+', label: t('price') },
    ];
    return (
        <div className="stats-wrapper" style={{
            borderTop: '1px solid hsl(var(--border))',
            borderBottom: '1px solid hsl(var(--border))',
            margin: '0 20px',
            borderRadius: 20,
            background: 'rgba(255,255,255,0.02)'
        }}>
            <div className="stats-grid" style={{
                maxWidth: 900,
                margin: '0 auto',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '32px 64px',
                padding: '42px 28px'
            }}>
                {stats.map(s => (
                    <div key={s.label} style={{ textAlign: 'center', minWidth: 60 }}>
                        <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(24px,5vw,38px)', letterSpacing: '-1px', color: 'hsl(var(--foreground))' }}>{s.num}</div>
                        <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>{s.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function FeaturesSection() {
    const t = useTranslations('features');
    const features = [
        { key: 'ai', icon: '✦' },
        { key: 'adaptive', icon: '◎' },
        { key: 'plan', icon: '▣' },
        { key: 'stats', icon: '△' },
        { key: 'exams', icon: '◈' },
        { key: 'school', icon: '⬡' },
    ] as const;
    return (
        <section id="features" style={{
            maxWidth: 1000,
            margin: '0 auto',
            padding: 'clamp(56px,8vw,92px) 20px'
        }}>
            <div className="section-heading">
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#6B5CE7', textTransform: 'uppercase' }}>{t('tag')}</div>
                <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(26px,4vw,44px)', letterSpacing: '-1px', lineHeight: 1.15, margin: 0, fontWeight: 400, color: 'hsl(var(--foreground))' }}>
                    {t('title')}
                </h2>
                <p className="section-subtitle" style={{ fontSize: 15, color: 'hsl(var(--muted-foreground))', lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{t('sub')}</p>
            </div>
            <div className="features-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 18,
                alignItems: 'stretch'
            }}>
                {features.map(f => (
                    <div key={f.key} className="feature-card" style={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 20,
                        padding: 24,
                        minHeight: 180,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        transition: 'all 0.2s ease',
                        cursor: 'default',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}>
                        <div className="feature-icon" style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(107,92,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: '#6B5CE7', marginBottom: 14 }}>
                            {f.icon}
                        </div>
                        <h3 className="feature-title" style={{ fontSize: 14, fontWeight: 600, marginBottom: 7, color: 'hsl(var(--foreground))' }}>{t(`${f.key}.title`)}</h3>
                        <p className="feature-desc" style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.55, fontWeight: 300, margin: 0 }}>{t(`${f.key}.desc`)}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function PricingSection({ locale }: { locale: string }) {
    const t = useTranslations('pricing');
    return (
        <section id="pricing" style={{
            maxWidth: 1000,
            margin: '0 auto',
            padding: 'clamp(56px,8vw,92px) 20px'
        }}>
            <div className="section-heading">
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#6B5CE7', textTransform: 'uppercase' }}>{t('tag')}</div>
                <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(26px,4vw,44px)', letterSpacing: '-1px', margin: 0, fontWeight: 400, color: 'hsl(var(--foreground))' }}>
                    {t('title')}
                </h2>
                <p className="section-subtitle" style={{ fontSize: 15, color: 'hsl(var(--muted-foreground))', margin: 0, lineHeight: 1.7, fontWeight: 300 }}>{t('sub')}</p>
            </div>
            <PricingCards
                locale={locale}
                currentPlan="free"
            />
        </section>
    );
}

function Footer({ locale }: { locale: string }) {
    const t = useTranslations('footer');
    return (
        <footer style={{
            borderTop: '1px solid hsl(var(--border))',
            padding: '36px 20px 28px',
            marginTop: 24
        }}>
            <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 17, color: 'hsl(var(--foreground))' }}>
                    Learn<span style={{ color: '#6B5CE7' }}>Path</span>
                </div>
                <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{t('copy')}</p>
                <div style={{ display: 'flex', gap: 20 }}>
                    <Link href={`/${locale}/terms`} style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', textDecoration: 'none' }}>{t('terms')}</Link>
                    <Link href={`/${locale}/privacy`} style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', textDecoration: 'none' }}>{t('privacy')}</Link>
                    <a href="mailto:boburbek@gafurov.cc" style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', textDecoration: 'none' }}>{t('contact')}</a>
                </div>
            </div>
        </footer>
    );
}
