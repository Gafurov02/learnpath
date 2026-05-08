'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SubscribeButton } from '@/components/ui/StripeButtons';

type PlanKey = 'free' | 'pro' | 'max' | 'teams';

type Plan = {
  key: PlanKey;
  highlighted?: boolean;
  dark?: boolean;
  action: 'signup' | 'pro' | 'max' | 'contact';
};

const PLANS: Plan[] = [
  { key: 'free', action: 'signup' },
  { key: 'pro', highlighted: true, action: 'pro' },
  { key: 'max', dark: true, action: 'max' },
  { key: 'teams', action: 'contact' },
];

function getBorder(plan: Plan) {
  if (plan.dark) return '1px solid rgba(24,18,43,0.5)';
  if (plan.highlighted) return '2px solid #6B5CE7';
  return '1px solid hsl(var(--border))';
}

export function PricingCards({ locale, currentPlan, }: { locale: string, currentPlan: string; }) {
  const t = useTranslations('pricing');

  return (
    <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
      {PLANS.map((plan) => {
        const price = t(`${plan.key}.price`);
        const features = t.raw(`${plan.key}.features`) as string[];
        const missing = plan.key === 'free' || plan.key === 'pro' ? (t.raw(`${plan.key}.missing`) as string[]) : [];
        const cardBg = plan.dark ? 'linear-gradient(160deg,#18122B,#3D2E78)' : 'hsl(var(--card))';
        const textColor = plan.dark ? '#fff' : 'hsl(var(--foreground))';
        const mutedColor = plan.dark ? 'rgba(255,255,255,0.72)' : 'hsl(var(--muted-foreground))';

        return (
          <div key={plan.key} style={{ background: cardBg, border: getBorder(plan), borderRadius: 20, padding: 26, position: 'relative', color: textColor }}>
            {(plan.highlighted || plan.dark) && (
              <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: plan.dark ? '#22C07A' : '#6B5CE7', color: plan.dark ? '#081B13' : '#fff', borderRadius: 20, padding: '3px 14px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {t(`${plan.key}.badge`)}
              </div>
            )}
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{t(`${plan.key}.name`)}</div>
            <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 46, letterSpacing: '-2px', marginBottom: 4 }}>{price}</div>
            <div style={{ fontSize: 13, color: mutedColor, marginBottom: 24 }}>{t(`${plan.key}.period`)}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {features.map((feature) => (
                <li key={feature} style={{ display: 'flex', gap: 8, fontSize: 13, color: textColor }}>
                  <span style={{ color: '#22C07A', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {feature}
                </li>
              ))}
              {missing.map((feature) => (
                <li key={feature} style={{ display: 'flex', gap: 8, fontSize: 13, color: mutedColor }}>
                  <span style={{ flexShrink: 0 }}>×</span>
                  {feature}
                </li>
              ))}
            </ul>
            {plan.action === 'signup' && (
              <Link href={`/${locale}/auth/signup`} style={{ display: 'block', textAlign: 'center', border: '1.5px solid hsl(var(--border))', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 500, color: textColor, textDecoration: 'none' }}>
                {t(`${plan.key}.cta`)}
              </Link>
            )}
            {plan.action === 'pro' && <SubscribeButton tier="pro" currentPlan={currentPlan} label={t(`${plan.key}.cta`)} />}
            {plan.action === 'max' && <SubscribeButton tier="max" currentPlan={currentPlan} label={t(`${plan.key}.cta`)} />}
            {plan.action === 'contact' && (
              <a href="mailto:boburbek@gafurov.cc" style={{ display: 'block', textAlign: 'center', border: '1.5px solid hsl(var(--border))', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 500, color: textColor, textDecoration: 'none' }}>
                {t(`${plan.key}.cta`)}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
