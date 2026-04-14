import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/layout/HeroSection';
import { QuizSection } from '@/components/quiz/QuizSection';

export default async function HomePage({
                                           params,
                                       }: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    return (
        <main style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
            <Navbar />
            <HeroSection />
            <StatsSection />
            <FeaturesSection />
            <QuizSection />
            <PricingSection locale={locale} />
            <Footer locale={locale} />
        </main>
    );
}


function StatsSection() {
    const t = useTranslations('stats');
    const stats = [
        { num: '50K+', label: t('students') },
        { num: '12', label: t('exams') },
        { num: '94%', label: t('passRate') },
        { num: '$10', label: t('price') },
    ];
    return (
        <div style={{ borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '32px 64px', padding: '40px 24px' }}>
                {stats.map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 36, letterSpacing: '-1px', color: 'hsl(var(--foreground))' }}>{s.num}</div>
                        <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>{s.label}</div>
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
        { key: 'offline', icon: '⬡' },
    ] as const;
    return (
        <section id="features" style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#6B5CE7', textTransform: 'uppercase', marginBottom: 14 }}>{t('tag')}</div>
            <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 14, fontWeight: 400, whiteSpace: 'pre-line', color: 'hsl(var(--foreground))' }}>
                {t('title')}
            </h2>
            <p style={{ fontSize: 16, color: 'hsl(var(--muted-foreground))', lineHeight: 1.7, maxWidth: 520, marginBottom: 48, fontWeight: 300 }}>{t('sub')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                {features.map(f => (
                    <div key={f.key} style={{
                        background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
                        borderRadius: 16, padding: 24,
                    }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(107,92,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#6B5CE7', marginBottom: 16 }}>
                            {f.icon}
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: 'hsl(var(--foreground))' }}>{t(`${f.key}.title`)}</h3>
                        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, fontWeight: 300, margin: 0 }}>{t(`${f.key}.desc`)}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function PricingSection({ locale }: { locale: string }) {
    const t = useTranslations('pricing');
    return (
        <section id="pricing" style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#6B5CE7', textTransform: 'uppercase', marginBottom: 14 }}>{t('tag')}</div>
            <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-1px', marginBottom: 14, fontWeight: 400, whiteSpace: 'pre-line', color: 'hsl(var(--foreground))' }}>
                {t('title')}
            </h2>
            <p style={{ fontSize: 16, color: 'hsl(var(--muted-foreground))', marginBottom: 48, fontWeight: 300 }}>{t('sub')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16 }}>
                {/* Free */}
                <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 20, padding: 28 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'hsl(var(--foreground))' }}>{t('free.name')}</div>
                    <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 52, letterSpacing: '-2px', marginBottom: 4, color: 'hsl(var(--foreground))' }}>$0</div>
                    <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 28 }}>{t('free.period')}</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(t.raw('free.features') as string[]).map((f: string) => (
                            <li key={f} style={{ display: 'flex', gap: 8, fontSize: 14, color: 'hsl(var(--foreground))' }}><span style={{ color: '#22C07A', fontWeight: 700 }}>✓</span>{f}</li>
                        ))}
                        {(t.raw('free.missing') as string[]).map((f: string) => (
                            <li key={f} style={{ display: 'flex', gap: 8, fontSize: 14, color: 'hsl(var(--muted-foreground))' }}><span>×</span>{f}</li>
                        ))}
                    </ul>
                    <Link href={`/${locale}/auth/signup`} style={{ display: 'block', textAlign: 'center', border: '1.5px solid hsl(var(--border))', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 500, color: 'hsl(var(--foreground))', textDecoration: 'none' }}>
                        {t('free.cta')}
                    </Link>
                </div>
                {/* Pro */}
                <div style={{ background: 'hsl(var(--card))', border: '2px solid #6B5CE7', borderRadius: 20, padding: 28, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#6B5CE7', color: '#fff', borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {t('pro.badge')}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'hsl(var(--foreground))' }}>{t('pro.name')}</div>
                    <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 52, letterSpacing: '-2px', marginBottom: 4, color: 'hsl(var(--foreground))' }}>$10</div>
                    <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 28 }}>{t('pro.period')}</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(t.raw('pro.features') as string[]).map((f: string) => (
                            <li key={f} style={{ display: 'flex', gap: 8, fontSize: 14, color: 'hsl(var(--foreground))' }}><span style={{ color: '#22C07A', fontWeight: 700 }}>✓</span>{f}</li>
                        ))}
                    </ul>
                    <Link href={`/${locale}/auth/signup`} style={{ display: 'block', textAlign: 'center', background: '#6B5CE7', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 500, color: '#fff', textDecoration: 'none' }}>
                        {t('pro.cta')}
                    </Link>
                </div>
                {/* Teams */}
                <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 20, padding: 28 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'hsl(var(--foreground))' }}>{t('teams.name')}</div>
                    <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 52, letterSpacing: '-2px', marginBottom: 4, color: 'hsl(var(--foreground))' }}>B2B</div>
                    <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 28 }}>{t('teams.period')}</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(t.raw('teams.features') as string[]).map((f: string) => (
                            <li key={f} style={{ display: 'flex', gap: 8, fontSize: 14, color: 'hsl(var(--foreground))' }}><span style={{ color: '#22C07A', fontWeight: 700 }}>✓</span>{f}</li>
                        ))}
                    </ul>
                    <a href="mailto:hello@learnpath.app" style={{ display: 'block', textAlign: 'center', border: '1.5px solid hsl(var(--border))', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 500, color: 'hsl(var(--foreground))', textDecoration: 'none' }}>
                        {t('teams.cta')}
                    </a>
                </div>
            </div>
        </section>
    );
}

function Footer({ locale }: { locale: string }) {
    const t = useTranslations('footer');
    return (
        <footer style={{ borderTop: '1px solid hsl(var(--border))', padding: '32px 24px' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 18, color: 'hsl(var(--foreground))' }}>
                    Learn<span style={{ color: '#6B5CE7' }}>Path</span>
                </div>
                <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{t('copy')}</p>
                <div style={{ display: 'flex', gap: 24 }}>
                    <Link href={`/${locale}/terms`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none' }}>{t('terms')}</Link>
                    <Link href={`/${locale}/privacy`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none' }}>{t('privacy')}</Link>
                    <a href="mailto:hello@learnpath.app" style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none' }}>{t('contact')}</a>
                </div>
            </div>
        </footer>
    );
}