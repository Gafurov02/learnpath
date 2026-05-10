type Props = {
    children: React.ReactNode;
    style?: React.CSSProperties;
};

export function GlassCard({ children, style }: Props) {
    return (
        <div
            style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 24,
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow:
                    '0 20px 60px rgba(0,0,0,0.08)',
                ...style,
            }}
        >
            {children}
        </div>
    );
}