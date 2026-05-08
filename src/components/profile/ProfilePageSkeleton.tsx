'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function ProfilePageSkeleton() {
    return (
        <div
            style={{
                maxWidth: 860,
                margin: '0 auto',
                padding: '20px 16px 80px',
            }}
        >
            {/* Hero */}
            <div
                style={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 28,
                    padding: 28,
                    marginBottom: 16,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        gap: 18,
                        alignItems: 'center',
                    }}
                >
                    <Skeleton
                        width={84}
                        height={84}
                        radius={999}
                    />

                    <div style={{ flex: 1 }}>
                        <Skeleton
                            width="38%"
                            height={24}
                        />

                        <div style={{ height: 10 }} />

                        <Skeleton
                            width="55%"
                            height={14}
                        />

                        <div style={{ height: 18 }} />

                        <Skeleton
                            width="100%"
                            height={8}
                        />
                    </div>
                </div>
            </div>

            {/* Overview */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(auto-fit,minmax(160px,1fr))',
                    gap: 12,
                    marginBottom: 16,
                }}
            >
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        style={{
                            background: 'hsl(var(--card))',
                            border:
                                '1px solid hsl(var(--border))',
                            borderRadius: 20,
                            padding: 20,
                        }}
                    >
                        <Skeleton
                            width="40%"
                            height={12}
                        />

                        <div style={{ height: 14 }} />

                        <Skeleton
                            width="60%"
                            height={30}
                        />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div
                style={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 20,
                    padding: 24,
                    marginBottom: 16,
                }}
            >
                <Skeleton
                    width="30%"
                    height={18}
                />

                <div style={{ height: 28 }} />

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 10,
                        height: 120,
                    }}
                >
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <Skeleton
                            key={i}
                            width="100%"
                            height={Math.random() * 80 + 30}
                            radius={10}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}