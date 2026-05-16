'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

const NAV_ITEMS = [
    { label: 'Home',        path: '/home',        icon: '🏠' },
    { label: 'Practice',    path: '/quiz',         icon: '⚡' },
    { label: 'Tutor',       path: '/chat',         icon: '💬' },
    { label: 'Leaderboard', path: '/leaderboard',  icon: '👑' },
    // FIX: was '/Schools' (capital S) — caused a 404 on navigation
    { label: 'Schools',     path: '/schools',      icon: '🏫' },
    { label: 'Profile',     path: '/profile',      icon: '👤' },
    { label: 'Pricing',     path: '/pricing',      icon: '💳' },
];

export function CommandMenu() {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();
    const locale = useLocale();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const navigate = (path: string) => {
        router.push(`/${locale}${path}`);
        setOpen(false);
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                aria-label="Open command menu"
                style={{
                    position: 'fixed',
                    bottom: 20,
                    right: 20,
                    zIndex: 1000,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(20,20,28,0.9)',
                    color: 'rgba(255,255,255,0.55)',
                    borderRadius: 12,
                    padding: '8px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}
            >
                <span style={{ fontSize: 14 }}>⌘</span> K
            </button>
        );
    }

    return (
        <div
            onClick={() => setOpen(false)}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '12vh',
            }}
        >
            <Command
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 580,
                    margin: '0 16px',
                    background: 'rgba(16,16,22,0.98)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '16px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        gap: 10,
                    }}
                >
                    <span style={{ fontSize: 16, opacity: 0.4 }}>🔍</span>
                    <Command.Input
                        autoFocus
                        placeholder="Search pages..."
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            fontSize: 15,
                            background: 'transparent',
                            color: '#fff',
                            fontFamily: 'inherit',
                        }}
                    />
                    <kbd
                        style={{
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.3)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 6,
                            padding: '2px 6px',
                        }}
                    >
                        ESC
                    </kbd>
                </div>

                <Command.List style={{ padding: '8px 8px 12px', maxHeight: 380, overflowY: 'auto' }}>
                    <Command.Empty
                        style={{
                            padding: '20px 14px',
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.35)',
                            textAlign: 'center',
                        }}
                    >
                        No results found.
                    </Command.Empty>

                    <Command.Group
                        heading="Navigation"
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            color: 'rgba(255,255,255,0.3)',
                            padding: '8px 8px 4px',
                            textTransform: 'uppercase',
                        }}
                    >
                        {NAV_ITEMS.map((item) => (
                            <Command.Item
                                key={item.path}
                                onSelect={() => navigate(item.path)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 12px',
                                    borderRadius: 12,
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    color: '#fff',
                                    transition: 'background 0.1s',
                                }}
                                // cmdk adds [data-selected] on hover/focus
                            >
                <span
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        background: 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        flexShrink: 0,
                    }}
                >
                  {item.icon}
                </span>
                                {item.label}
                            </Command.Item>
                        ))}
                    </Command.Group>
                </Command.List>
            </Command>

            {/* Highlight selected item */}
            <style>{`
        [cmdk-item][data-selected="true"] {
          background: rgba(107,92,231,0.18) !important;
        }
        [cmdk-group-heading] {
          font-size: 11px !important;
          font-weight: 600 !important;
          letter-spacing: 0.06em !important;
          color: rgba(255,255,255,0.3) !important;
          padding: 8px 8px 4px !important;
          text-transform: uppercase !important;
        }
      `}</style>
        </div>
    );
}