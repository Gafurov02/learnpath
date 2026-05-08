'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

const ITEMS = [
    {
        href: '/dashboard',
        label: 'Home',
        icon: '🏠',
    },
    {
        href: '/schools',
        label: 'Schools',
        icon: '🏫',
    },
    {
        href: '/pricing',
        label: 'Pro',
        icon: '💎',
    },
    {
        href: '/profile',
        label: 'Profile',
        icon: '👤',
    },
];

export function MobileDock() {
    const pathname = usePathname();
    const locale = useLocale();

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 16,
                left: 16,
                right: 16,
                zIndex: 999,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(15,15,18,0.72)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 999,
                    padding: '10px',
                    boxShadow:
                        '0 10px 40px rgba(0,0,0,0.35)',
                    pointerEvents: 'auto',
                }}
            >
                {ITEMS.map((item) => {
                    const active = pathname.includes(
                        item.href
                    );

                    return (
                        <Link
                            key={item.href}
                            href={`/${locale}${item.href}`}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                textDecoration: 'none',
                                minWidth: 64,
                                padding: '10px 12px',
                                borderRadius: 999,
                                transition: 'all 0.2s ease',
                                background: active
                                    ? 'rgba(107,92,231,0.18)'
                                    : 'transparent',
                                color: active
                                    ? '#fff'
                                    : 'rgba(255,255,255,0.7)',
                            }}
                        >
              <span
                  style={{
                      fontSize: 18,
                  }}
              >
                {item.icon}
              </span>

                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                }}
                            >
                {item.label}
              </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}