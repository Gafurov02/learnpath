type Props = {
    value: number;
};

export function ProgressBar({
                                value,
                            }: Props) {
    return (
        <div
            style={{
                height: 10,
                borderRadius: 999,
                overflow: 'hidden',
                background:
                    'rgba(255,255,255,0.06)',
            }}
        >
            <div
                style={{
                    width: `${value}%`,
                    height: '100%',
                    borderRadius: 999,
                    background:
                        'linear-gradient(90deg,#6B5CE7,#8B7CFF)',
                }}
            />
        </div>
    );
}