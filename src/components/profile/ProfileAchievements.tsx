'use client';

type Achievement = {
    code: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    earned_at?: string;
};

type Props = {
    achievements: Achievement[];
};

export function ProfileAchievements({
                                        achievements,
                                    }: Props) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns:
                    window.innerWidth < 640
                        ? '1fr'
                        : window.innerWidth < 1024
                            ? 'repeat(2,1fr)'
                            : 'repeat(3,1fr)',
                gap: 12,
            }}
        >
            {achievements.map((a) => (
                <div
                    key={a.code}
                    style={{
                        background: a.earned
                            ? 'linear-gradient(135deg, rgba(107,92,231,0.12), rgba(155,141,255,0.08))'
                            : 'hsl(var(--card))',
                        border: `1px solid ${
                            a.earned
                                ? 'rgba(107,92,231,0.28)'
                                : 'hsl(var(--border))'
                        }`,
                        borderRadius: 18,
                        minHeight: 110,
                        padding: 14,
                        opacity: a.earned ? 1 : 0.45,
                        transition: 'all 0.25s ease',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {a.earned && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background:
                                    'radial-gradient(circle at top right, rgba(107,92,231,0.18), transparent 40%)',
                                pointerEvents: 'none',
                            }}
                        />
                    )}

                    <div
                        style={{
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 34,
                                marginBottom: 10,
                                filter: a.earned
                                    ? 'drop-shadow(0 0 12px rgba(107,92,231,0.35))'
                                    : 'grayscale(1)',
                            }}
                        >
                            {a.icon}
                        </div>

                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 5,
                            }}
                        >
                            {a.name}
                        </div>

                        <div
                            style={{
                                fontSize: 12,
                                lineHeight: 1.5,
                                color: 'hsl(var(--muted-foreground))',
                            }}
                        >
                            {a.description}
                        </div>

                        {a.earned && a.earned_at && (
                            <div
                                style={{
                                    marginTop: 10,
                                    fontSize: 11,
                                    color: '#6B5CE7',
                                    fontWeight: 600,
                                }}
                            >
                                ✓ {new Date(a.earned_at).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}