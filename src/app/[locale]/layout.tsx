import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { Instrument_Serif, DM_Sans } from 'next/font/google';
import { Providers } from '@/components/layout/Providers';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';
import '../globals.css';

const instrumentSerif = Instrument_Serif({
    subsets: ['latin', 'latin-ext'],
    weight: ['400'],
    style: ['normal', 'italic'],
    variable: '--font-serif',
});

const dmSans = DM_Sans({
    subsets: ['latin', 'latin-ext'],
    weight: ['300', '400', '500', '600'],
    variable: '--font-sans',
});

export const metadata: Metadata = {
    title: 'LearnPath — AI Exam Prep',
    description: 'Ace your exams 10× faster with your personal AI tutor.',
    manifest: '/manifest.json',
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
        <body className={`${dmSans.variable} ${instrumentSerif.variable}`} style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif', margin: 0 }}>
        <Providers messages={messages as Record<string, unknown>} locale={locale}>
            <ServiceWorkerRegister />
            {children}
        </Providers>
        </body>
        </html>
    );
}