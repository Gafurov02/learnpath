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

// FIX: was using window.innerWidth directly in gridTemplateColumns — SSR crash
// and hydration mismatch. Replaced with CSS auto-fill which handles all breakpoints.
export function ProfileAchievements({ achievements }: Props) {
    return (
        <>
            <div className="achievements-grid">
                {achievements.map((a) => (
                    <div
                        key={a.code}
                        style={{
                            background: a.earned
                                ? 'linear-gradient(135deg,rgba(107,92,231,0.12),rgba(155,141,255,0.08))'
                                : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${a.earned ? 'rgba(107,92,231,0.28)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: 18,
                            minHeight: 110,
                            padding: 14,
                            opacity: a.earned ? 1 : 0.4,
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
                                        'radial-gradient(circle at top right,rgba(107,92,231,0.18),transparent 40%)',
                                    pointerEvents: 'none',
                                }}
                            />
                        )}

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div
                                style={{
                                    fontSize: 32,
                                    marginBottom: 10,
                                    filter: a.earned
                                        ? 'drop-shadow(0 0 10px rgba(107,92,231,0.4))'
                                        : 'grayscale(1)',
                                }}
                            >
                                {a.icon}
                            </div>

                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                                {a.name}
                            </div>

                            <div
                                style={{
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    color: 'rgba(255,255,255,0.5)',
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

            <style>{`
        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
        }
        @media (max-width: 480px) {
          .achievements-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
        </>
    );
}