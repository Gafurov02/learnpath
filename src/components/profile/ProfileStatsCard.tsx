'use client';

import React from 'react';

type Props = {
    label: string;
    value: string;
    hint?: string;
    color?: string;
    icon?: React.ReactNode;
};

export function ProfileStatsCard({
                                     label,
                                     value,
                                     hint,
                                     color = '#6B5CE7',
                                     icon,
                                 }: Props) {
    return (
        <div
            style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 24,
                padding: 22,
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'blur(14px)',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                        'radial-gradient(circle at top right, rgba(107,92,231,0.12), transparent 40%)',
                    pointerEvents: 'none',
                }}
            />

            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            fontSize: 13,
                            color: 'hsl(var(--muted-foreground))',
                            fontWeight: 500,
                        }}
                    >
                        {label}
                    </div>

                    {icon}
                </div>

                <div
                    style={{
                        fontSize: 34,
                        fontWeight: 700,
                        letterSpacing: '-1px',
                        color,
                        marginBottom: 6,
                    }}
                >
                    {value}
                </div>

                {hint && (
                    <div
                        style={{
                            fontSize: 12,
                            color: 'hsl(var(--muted-foreground))',
                        }}
                    >
                        {hint}
                    </div>
                )}
            </div>
        </div>
    );
}