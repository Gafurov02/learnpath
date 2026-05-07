import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import Providers from '@/components/layout/Providers';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';
import '../globals.css';

export const metadata: Metadata = {
    title: 'LearnPath — AI Exam Prep',
    description: 'Ace your exams 10× faster with your personal AI tutor.',
    manifest: '/manifest.json',
    icons: {
        icon: [
            { url: '/favicon.svg', type: 'image/svg+xml' },
            { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
        ],
        apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
    },
    appleWebApp: { capable: true, statusBarStyle: 'default', title: 'LearnPath' },
};

export const viewport: Viewport = {
    themeColor: '#6B5CE7',
};

const locales = ['en', 'ru'];

export default async function LocaleLayout({
                                               children,
                                               params,
                                           }: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    if (!locales.includes(locale)) notFound();

    const messages = await getMessages({ locale });

    return (
        <html lang={locale} suppressHydrationWarning data-scroll-behavior="smooth">
        <body style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0 }}>
        <Providers
            locale={locale}
            messages={messages}
        >
            <ServiceWorkerRegister />
            {children}
        </Providers>
        </body>
        </html>
    );
}