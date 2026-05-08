'use client';

import Link from 'next/link';

type Attempt = {
    exam: string;
    topic: string;
    correct: boolean;
    difficulty: string;
    created_at: string;
};

type Props = {
    locale: string;
    isPro: boolean;
    examStats: Record<
        string,
        {
            total: number;
            correct: number;
        }
    >;
    diffStats: {
        easy: { total: number; correct: number };
        medium: { total: number; correct: number };
        hard: { total: number; correct: number };
    };
    weakTopics: {
        topic: string;
        exam: string;
        accuracy: number;
        total: number;
    }[];
    strongTopics: {
        topic: string;
        exam: string;
        accuracy: number;
        total: number;
    }[];
};

export function ProfileStatsTab({
                                    locale,
                                    isPro,
                                    examStats,
                                    diffStats,
                                    weakTopics,
                                    strongTopics,
                                }: Props) {
    if (!isPro) {
        return (
            <div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        marginBottom: 20,
                    }}
                >
                    {Object.entries(examStats).map(([exam, s]) => {
                        const pct = Math.round(
                            (s.correct / s.total) * 100
                        );

                        return (
                            <div key={exam}>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: 5,
                                        fontSize: 13,
                                    }}
                                >
                  <span
                      style={{
                          fontWeight: 500,
                      }}
                  >
                    {exam}
                  </span>

                                    <span
                                        style={{
                                            color:
                                                'hsl(var(--muted-foreground))',
                                        }}
                                    >
                    {pct}% · {s.correct}/{s.total}
                  </span>
                                </div>

                                <div
                                    style={{
                                        height: 5,
                                        background:
                                            'hsl(var(--border))',
                                        borderRadius: 2,
                                    }}
                                >
                                    <div
                                        style={{
                                            height: 5,
                                            background:
                                                pct >= 70
                                                    ? '#22C07A'
                                                    : '#6B5CE7',
                                            borderRadius: 2,
                                            width: `${pct}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div
                    style={{
                        background:
                            'rgba(107,92,231,0.06)',
                        border:
                            '1px solid rgba(107,92,231,0.2)',
                        borderRadius: 20,
                        padding: 28,
                        textAlign: 'center',
                    }}
                >
                    <div
                        style={{
                            fontSize: 38,
                            marginBottom: 14,
                        }}
                    >
                        📊
                    </div>

                    <div
                        style={{
                            fontSize: 16,
                            fontWeight: 600,
                            marginBottom: 10,
                        }}
                    >
                        {locale === 'ru'
                            ? 'Полная аналитика доступна в PRO'
                            : 'Full analytics available in PRO'}
                    </div>

                    <p
                        style={{
                            fontSize: 13,
                            lineHeight: 1.7,
                            color:
                                'hsl(var(--muted-foreground))',
                            marginBottom: 22,
                        }}
                    >
                        {locale === 'ru'
                            ? 'Графики активности, слабые темы, аналитика сложности и персональные инсайты.'
                            : 'Activity charts, weak topics, difficulty analytics and personalized insights.'}
                    </p>

                    <Link
                        href={`/${locale}/pricing`}
                        style={{
                            background: '#6B5CE7',
                            color: '#fff',
                            borderRadius: 12,
                            padding: '12px 28px',
                            fontSize: 14,
                            fontWeight: 600,
                            textDecoration: 'none',
                        }}
                    >
                        {locale === 'ru'
                            ? 'Перейти на PRO'
                            : 'Upgrade to PRO'}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
            }}
        >
            {/* Exam stats */}
            <div
                style={{
                    background: 'hsl(var(--card))',
                    border:
                        '1px solid hsl(var(--border))',
                    borderRadius: 20,
                    padding: 24,
                }}
            >
                <div
                    style={{
                        fontSize: 15,
                        fontWeight: 600,
                        marginBottom: 18,
                    }}
                >
                    📚 {locale === 'ru'
                    ? 'По экзаменам'
                    : 'By exam'}
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                    }}
                >
                    {Object.entries(examStats).map(
                        ([exam, s]) => {
                            const pct = Math.round(
                                (s.correct / s.total) * 100
                            );

                            return (
                                <div key={exam}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent:
                                                'space-between',
                                            marginBottom: 5,
                                            fontSize: 13,
                                        }}
                                    >
                    <span
                        style={{
                            fontWeight: 600,
                        }}
                    >
                      {exam}
                    </span>

                                        <span
                                            style={{
                                                color:
                                                    'hsl(var(--muted-foreground))',
                                            }}
                                        >
                      {pct}% · {s.correct}/
                                            {s.total}
                    </span>
                                    </div>

                                    <div
                                        style={{
                                            height: 6,
                                            background:
                                                'hsl(var(--border))',
                                            borderRadius: 999,
                                        }}
                                    >
                                        <div
                                            style={{
                                                height: 6,
                                                width: `${pct}%`,
                                                borderRadius: 999,
                                                background:
                                                    pct >= 70
                                                        ? '#22C07A'
                                                        : pct >= 40
                                                            ? '#EF9F27'
                                                            : '#E84040',
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        }
                    )}
                </div>
            </div>

            {/* Weak/Strong */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(auto-fit,minmax(300px,1fr))',
                    gap: 16,
                }}
            >
                <div
                    style={{
                        background: 'hsl(var(--card))',
                        border:
                            '1px solid hsl(var(--border))',
                        borderRadius: 20,
                        padding: 24,
                    }}
                >
                    <div
                        style={{
                            fontSize: 15,
                            fontWeight: 600,
                            marginBottom: 16,
                        }}
                    >
                        ⚠️ {locale === 'ru'
                        ? 'Слабые темы'
                        : 'Weak topics'}
                    </div>

                    {weakTopics.map((t) => (
                        <div
                            key={t.topic}
                            style={{
                                display: 'flex',
                                justifyContent:
                                    'space-between',
                                alignItems: 'center',
                                marginBottom: 12,
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                    }}
                                >
                                    {t.topic}
                                </div>

                                <div
                                    style={{
                                        fontSize: 11,
                                        color:
                                            'hsl(var(--muted-foreground))',
                                    }}
                                >
                                    {t.exam}
                                </div>
                            </div>

                            <div
                                style={{
                                    color: '#E84040',
                                    fontWeight: 700,
                                }}
                            >
                                {t.accuracy}%
                            </div>
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        background: 'hsl(var(--card))',
                        border:
                            '1px solid hsl(var(--border))',
                        borderRadius: 20,
                        padding: 24,
                    }}
                >
                    <div
                        style={{
                            fontSize: 15,
                            fontWeight: 600,
                            marginBottom: 16,
                        }}
                    >
                        💪 {locale === 'ru'
                        ? 'Сильные темы'
                        : 'Strong topics'}
                    </div>

                    {strongTopics.map((t) => (
                        <div
                            key={t.topic}
                            style={{
                                display: 'flex',
                                justifyContent:
                                    'space-between',
                                alignItems: 'center',
                                marginBottom: 12,
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                    }}
                                >
                                    {t.topic}
                                </div>

                                <div
                                    style={{
                                        fontSize: 11,
                                        color:
                                            'hsl(var(--muted-foreground))',
                                    }}
                                >
                                    {t.exam}
                                </div>
                            </div>

                            <div
                                style={{
                                    color: '#22C07A',
                                    fontWeight: 700,
                                }}
                            >
                                {t.accuracy}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}