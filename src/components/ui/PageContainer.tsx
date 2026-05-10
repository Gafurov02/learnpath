type Props = {
    children: React.ReactNode;
};

export function PageContainer({
                                  children,
                              }: Props) {
    return (
        <main
            style={{
                width: '100%',
                maxWidth: 860,
                margin: '0 auto',
                padding: '32px 16px 220px',
            }}
        >
            {children}
        </main>
    );
}