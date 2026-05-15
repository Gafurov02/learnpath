'use client';

import { UserAvatar } from '@/components/ui/UserAvatar';
import { AnimatedXP } from '@/components/profile/AnimatedXP';

type Props = {
    name: string;
    email?: string;
    avatarUrl?: string | null;
    xp: number;
    level: string;
    streak: number;
    progress: number;
    isPro: boolean;
};

export function ProfileHero({
                                name,
                                email,
                                avatarUrl,
                                xp,
                                level,
                                streak,
                                progress,
                                isPro,
                            }: Props) {
    return (
        <div
            style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 32,
                padding: 'clamp(20px, 4vw, 32px)',
                border: '1px solid rgba(107,92,231,0.18)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                // Fixed: removed trailing comma that made the gradient invalid
                background:
                    'radial-gradient(circle at top left, rgba(107,92,231,0.24), transparent 40%)',
                // Fixed: was 'ease-in out' — now 'ease-in-out'
                animation: 'pulseGlow 6s ease-in-out infinite',
            }}
        >
            {/* Overlay gradient */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)),
            radial-gradient(circle at top right, rgba(107,92,231,0.22), transparent 35%),
            rgba(17,17,20,0.72)
          `,
                    pointerEvents: 'none',
                }}
            />

            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 24,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                {/* Left: avatar + info */}
                <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                    <UserAvatar
                        avatarUrl={avatarUrl}
                        name={name}
                        email={email}
                        size={74}
                        accent={isPro ? 'pro' : 'default'}
                    />

                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                flexWrap: 'wrap',
                                marginBottom: 6,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 'clamp(20px, 4vw, 28px)',
                                    fontWeight: 700,
                                    letterSpacing: '-0.5px',
                                }}
                            >
                                {name}
                            </div>

                            {isPro && (
                                <div
                                    style={{
                                        background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)',
                                        color: '#fff',
                                        borderRadius: 999,
                                        padding: '4px 10px',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        flexShrink: 0,
                                    }}
                                >
                                    PRO
                                </div>
                            )}
                        </div>

                        {email && (
                            <div
                                style={{
                                    color: 'hsl(var(--muted-foreground))',
                                    fontSize: 13,
                                    marginBottom: 12,
                                }}
                            >
                                {email}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {(
                                [
                                    { icon: '⚡', label: <><AnimatedXP value={xp} /> XP</> },
                                    { icon: '🔥', label: `${streak} day streak` },
                                    { icon: '🏆', label: level },
                                ] as const
                            ).map(({ icon, label }, i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        borderRadius: 999,
                                        padding: '5px 11px',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {icon} {label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: progress bar */}
                <div style={{ minWidth: 140, flex: '0 1 200px' }}>
                    <div
                        style={{
                            fontSize: 12,
                            color: 'hsl(var(--muted-foreground))',
                            marginBottom: 8,
                        }}
                    >
                        Level progress
                    </div>

                    <div
                        style={{
                            height: 10,
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.08)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                width: `${progress}%`,
                                borderRadius: 999,
                                background: 'linear-gradient(90deg,#6B5CE7,#9B8DFF)',
                                transition: 'width 0.5s ease',
                            }}
                        />
                    </div>

                    <div
                        style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: 'hsl(var(--muted-foreground))',
                        }}
                    >
                        {progress}% completed
                    </div>
                </div>
            </div>
        </div>
    );
}