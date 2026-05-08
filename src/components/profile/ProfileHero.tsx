'use client';

import { UserAvatar } from '@/components/ui/UserAvatar';
import { AnimatedXP } from "@/components/profile/AnimatedXP";

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
                padding: 28,
                marginBottom: 20,
                background:
                    'linear-gradient(135deg, rgba(107,92,231,0.18), rgba(55,138,221,0.12))',
                border: '1px solid rgba(107,92,231,0.18)',
                backdropFilter: 'blur(20px)',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                        'radial-gradient(circle at top right, rgba(107,92,231,0.25), transparent 35%)',
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
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        gap: 18,
                        alignItems: 'center',
                    }}
                >
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
                                    fontSize: 28,
                                    fontWeight: 700,
                                    letterSpacing: '-1px',
                                }}
                            >
                                {name}
                            </div>

                            {isPro && (
                                <div
                                    style={{
                                        background:
                                            'linear-gradient(135deg,#6B5CE7,#9B8DFF)',
                                        color: '#fff',
                                        borderRadius: 999,
                                        padding: '4px 10px',
                                        fontSize: 11,
                                        fontWeight: 700,
                                    }}
                                >
                                    PRO
                                </div>
                            )}
                        </div>

                        <div
                            style={{
                                color: 'hsl(var(--muted-foreground))',
                                fontSize: 14,
                                marginBottom: 12,
                            }}
                        >
                            {email}
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                gap: 10,
                                flexWrap: 'wrap',
                            }}
                        >
                            <div
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    borderRadius: 999,
                                    padding: '6px 12px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}
                            >
                                ⚡ <AnimatedXP value={xp} /> XP
                            </div>

                            <div
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    borderRadius: 999,
                                    padding: '6px 12px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}
                            >
                                🔥 {streak} day streak
                            </div>

                            <div
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    borderRadius: 999,
                                    padding: '6px 12px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}
                            >
                                🏆 {level}
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        minWidth: 140,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                    }}
                >
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
                                background:
                                    'linear-gradient(90deg,#6B5CE7,#9B8DFF)',
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