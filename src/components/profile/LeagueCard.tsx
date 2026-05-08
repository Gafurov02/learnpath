'use client';

type Props = {
    name: string;
    icon: string;
    color: string;
    xp: number;
};

export function LeagueCard({
                               name,
                               icon,
                               color,
                               xp,
                           }: Props) {
    return (
        <div
            style={{
                background:
                    `linear-gradient(135deg, ${color}22, ${color}10)`,
                border: `1px solid ${color}55`,
                borderRadius: 24,
                padding: 24,
                color: 'hsl(var(--foreground))',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                }}
            >
                <div
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: 20,
                        background: `${color}22`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 34,
                    }}
                >
                    {icon}
                </div>

                <div>
                    <div
                        style={{
                            fontSize: 13,
                            color:
                                'hsl(var(--muted-foreground))',
                            marginBottom: 4,
                        }}
                    >
                        Current League
                    </div>

                    <div
                        style={{
                            fontSize: 28,
                            fontWeight: 800,
                            color,
                        }}
                    >
                        {name}
                    </div>

                    <div
                        style={{
                            fontSize: 13,
                            marginTop: 4,
                        }}
                    >
                        {xp.toLocaleString()} XP
                    </div>
                </div>
            </div>
        </div>
    );
}