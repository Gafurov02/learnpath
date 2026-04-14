'use client';

type ProExplanation = {
    short: string;
    why_correct: string;
    why_wrong: string;
    tip: string;
};

type Props = {
    explanation: string;
    isPro: boolean;
    locale: string;
    locale_link: string;
};

export function ExplanationBlock({ explanation, isPro, locale, locale_link }: Props) {
    if (!isPro) {
        // Free: simple one-liner + upgrade hint
        return (
            <div style={{ marginTop: 20, display: 'flex', gap: 10, background: 'rgba(107,92,231,0.08)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: 'hsl(var(--foreground))', lineHeight: 1.7 }}>
                <span style={{ color: '#6B5CE7', flexShrink: 0, marginTop: 2 }}>✦</span>
                <div>
                    {explanation}
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(107,92,231,0.15)', fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                        💡 {locale === 'ru' ? 'Подробный разбор ошибок и советы доступны в ' : 'Detailed breakdown and tips available in '}
                        <a href={`/${locale_link}/pricing`} style={{ color: '#6B5CE7', textDecoration: 'none', fontWeight: 600 }}>Pro</a>
                    </div>
                </div>
            </div>
        );
    }

    // Pro: try to parse structured explanation
    let parsed: ProExplanation | null = null;
    try {
        parsed = typeof explanation === 'string' ? JSON.parse(explanation) : explanation;
    } catch {
        // Fallback to plain text if not JSON
    }

    if (!parsed || typeof parsed !== 'object') {
        return (
            <div style={{ marginTop: 20, display: 'flex', gap: 10, background: 'rgba(107,92,231,0.08)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: 'hsl(var(--foreground))', lineHeight: 1.7 }}>
                <span style={{ color: '#6B5CE7', flexShrink: 0, marginTop: 2 }}>✦</span>
                {explanation}
            </div>
        );
    }

    const sections = [
        {
            icon: '✓',
            color: '#22C07A',
            bg: 'rgba(34,192,122,0.08)',
            border: 'rgba(34,192,122,0.2)',
            label: locale === 'ru' ? 'Правильный ответ' : 'Why it\'s correct',
            text: parsed.why_correct,
        },
        {
            icon: '✕',
            color: '#E84040',
            bg: 'rgba(232,64,64,0.06)',
            border: 'rgba(232,64,64,0.15)',
            label: locale === 'ru' ? 'Частая ошибка' : 'Common mistake',
            text: parsed.why_wrong,
        },
        {
            icon: '💡',
            color: '#BA7517',
            bg: 'rgba(186,117,23,0.08)',
            border: 'rgba(186,117,23,0.2)',
            label: locale === 'ru' ? 'Совет' : 'Study tip',
            text: parsed.tip,
        },
    ];

    return (
        <div style={{ marginTop: 20 }}>
            {/* Short summary */}
            <div style={{ display: 'flex', gap: 10, background: 'rgba(107,92,231,0.08)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'hsl(var(--foreground))', lineHeight: 1.6, marginBottom: 10 }}>
                <span style={{ color: '#6B5CE7', flexShrink: 0, fontWeight: 700 }}>✦</span>
                <span style={{ fontWeight: 500 }}>{parsed.short}</span>
            </div>

            {/* Detailed sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sections.map(s => (
                    <div key={s.label} style={{ display: 'flex', gap: 12, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '11px 14px', fontSize: 13, lineHeight: 1.6 }}>
                        <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
                            <div style={{ color: 'hsl(var(--foreground))' }}>{s.text}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pro badge */}
            <div style={{ marginTop: 10, textAlign: 'right' }}>
        <span style={{ fontSize: 11, background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>
          ⭐ Pro explanation
        </span>
            </div>
        </div>
    );
}