type Props = {
    title: string;
    subtitle?: string;
};

export function SectionTitle({
                                 title,
                                 subtitle,
                             }: Props) {
    return (
        <div style={{ marginBottom: 18 }}>
            <h2
                style={{
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: '-0.04em',
                    marginBottom: 6,
                }}
            >
                {title}
            </h2>

            {subtitle && (
                <p
                    style={{
                        color:
                            'hsl(var(--muted-foreground))',
                        fontSize: 14,
                    }}
                >
                    {subtitle}
                </p>
            )}
        </div>
    );
}