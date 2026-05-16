import type { CSSProperties, ReactNode } from 'react';

type Props = {
    children: ReactNode;
    style?: CSSProperties;
};

// FIX: was rendering a duplicate empty <div style={style}></div> before children.
export function PageContainer({ children, style }: Props) {
    return (
        <main
            style={{
                width: '100%',
                maxWidth: 1100,
                margin: '0 auto',
                padding: '32px 16px 140px',
                ...style,
            }}
        >
            {children}
        </main>
    );
}