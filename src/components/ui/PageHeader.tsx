type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  right,
}: Props) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 20,
        marginBottom: 28,
        flexWrap: 'wrap',
      }}
    >
      <div>
        {eyebrow && (
          <div
            style={{
              fontSize: 12,
              color: 'hsl(var(--muted-foreground))',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {eyebrow}
          </div>
        )}

        <h1
          style={{
            fontSize: 'clamp(32px,5vw,52px)',
            lineHeight: 0.95,
            letterSpacing: '-0.05em',
            fontWeight: 800,
            marginBottom: 10,
          }}
        >
          {title}
        </h1>

        {description && (
          <p
            style={{
              maxWidth: 560,
              color: 'hsl(var(--muted-foreground))',
              lineHeight: 1.7,
              fontSize: 15,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {right}
    </div>
  );
}