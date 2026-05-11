import { ReactNode, CSSProperties } from "react";

type Props = {
    children: React.ReactNode;
    style?: React.CSSProperties;
};

export function PageContainer({
                                  children,
    style,
                              }: Props) {
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
            <div style={style}></div>
            {children}
        </main>
    );
}