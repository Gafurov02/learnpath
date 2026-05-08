'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export function CommandMenu() {
    const [open, setOpen] = React.useState(false);

    const router = useRouter();
    const locale = useLocale();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (
                (e.metaKey || e.ctrlKey) &&
                e.key.toLowerCase() === 'k'
            ) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);

        return () =>
            document.removeEventListener(
                'keydown',
                down
            );
    }, []);

    const navigate = (path: string) => {
        router.push(`/${locale}${path}`);
        setOpen(false);
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: 20,
                    right: 20,
                    zIndex: 1000,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--foreground))',
                    borderRadius: 14,
                    padding: '10px 14px',
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow:
                        '0 10px 30px rgba(0,0,0,0.15)',
                    backdropFilter: 'blur(20px)',
                }}
            >
                ⌘K
            </button>

            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        paddingTop: '10vh',
                    }}
                >
                    <Command
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: 620,
                            background: 'hsl(var(--card))',
                            border:
                                '1px solid hsl(var(--border))',
                            borderRadius: 24,
                            overflow: 'hidden',
                            boxShadow:
                                '0 30px 80px rgba(0,0,0,0.35)',
                        }}
                    >
                        <Command.Input
                            placeholder="Search..."
                            style={{
                                width: '100%',
                                border: 'none',
                                outline: 'none',
                                padding: '20px 24px',
                                fontSize: 16,
                                background: 'transparent',
                                color: 'hsl(var(--foreground))',
                            }}
                        />

                        <Command.List
                            style={{
                                padding: 10,
                                maxHeight: 420,
                                overflow: 'auto',
                            }}
                        >
                            <Command.Empty
                                style={{
                                    padding: 20,
                                    color:
                                        'hsl(var(--muted-foreground))',
                                }}
                            >
                                No results found.
                            </Command.Empty>

                            <Command.Group heading="Navigation">
                                {[
                                    {
                                        label: 'Dashboard',
                                        path: '/dashboard',
                                        icon: '🏠',
                                    },
                                    {
                                        label: 'Profile',
                                        path: '/profile',
                                        icon: '👤',
                                    },
                                    {
                                        label: 'Pricing',
                                        path: '/pricing',
                                        icon: '💎',
                                    },
                                    {
                                        label: 'Schools',
                                        path: '/schools',
                                        icon: '🏫',
                                    },
                                    {
                                        label: 'Admin',
                                        path: '/admin',
                                        icon: '⚡',
                                    },
                                ].map((item) => (
                                    <Command.Item
                                        key={item.path}
                                        onSelect={() =>
                                            navigate(item.path)
                                        }
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: '12px 14px',
                                            borderRadius: 14,
                                            cursor: 'pointer',
                                            fontSize: 14,
                                        }}
                                    >
                                        <span>{item.icon}</span>
                                        {item.label}
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        </Command.List>
                    </Command>
                </div>
            )}
        </>
    );
}