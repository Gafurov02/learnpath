'use client';

type Quest = {
    title: string;
    progress: number;
    target: number;
    reward: number;
};

export function DailyQuests({
                                quests,
                            }: {
    quests: Quest[];
}) {
    return (
        <div
            style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 24,
                padding: 24,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 20,
                }}
            >
                <div
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        background:
                            'rgba(107,92,231,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                    }}
                >
                    🎯
                </div>

                <div>
                    <div
                        style={{
                            fontSize: 16,
                            fontWeight: 700,
                        }}
                    >
                        Daily Quests
                    </div>

                    <div
                        style={{
                            fontSize: 12,
                            color:
                                'hsl(var(--muted-foreground))',
                        }}
                    >
                        Complete quests to earn XP
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                }}
            >
                {quests.map((quest, index) => {
                    const progress =
                        Math.min(
                            (quest.progress / quest.target) * 100,
                            100
                        );

                    const completed =
                        quest.progress >= quest.target;

                    return (
                        <div
                            key={index}
                            style={{
                                background:
                                    completed
                                        ? 'rgba(34,192,122,0.08)'
                                        : 'hsl(var(--background))',
                                border:
                                    completed
                                        ? '1px solid rgba(34,192,122,0.25)'
                                        : '1px solid hsl(var(--border))',
                                borderRadius: 18,
                                padding: 16,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent:
                                        'space-between',
                                    alignItems: 'center',
                                    marginBottom: 10,
                                    gap: 12,
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {quest.title}
                                    </div>

                                    <div
                                        style={{
                                            fontSize: 11,
                                            color:
                                                'hsl(var(--muted-foreground))',
                                            marginTop: 3,
                                        }}
                                    >
                                        {quest.progress}/
                                        {quest.target}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: completed
                                            ? '#22C07A'
                                            : '#6B5CE7',
                                    }}
                                >
                                    +{quest.reward} XP
                                </div>
                            </div>

                            <div
                                style={{
                                    height: 8,
                                    background:
                                        'hsl(var(--border))',
                                    borderRadius: 999,
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        borderRadius: 999,
                                        background: completed
                                            ? '#22C07A'
                                            : '#6B5CE7',
                                        transition:
                                            'width 0.4s ease',
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}