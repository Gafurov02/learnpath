type Props = {
    label: string;
    value: string;
    icon?: string;
};

export function StatsCard({
                              label,
                              value,
                              icon,
                          }: Props) {
    return (
        <GlassCard
            style={{
                padding: 18,
                flex: 1,
                minWidth: 140,
            }}
        >
            <div
                style={{
                    fontSize: 13,
                    marginBottom: 8,
                    color:
                        'hsl(var(--muted-foreground))',
                }}
            >
                {icon} {label}
            </div>

            <div
                style={{
                    fontSize: 26,
                    fontWeight: 700,
                }}
            >
                {value}
            </div>
        </GlassCard>
    );
}