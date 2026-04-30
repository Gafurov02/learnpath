'use client';

import { ThemeProvider } from 'next-themes';
import { NextIntlClientProvider } from 'next-intl';

export function Providers({
                              children,
                              messages,
                              locale,
                          }: {
    children: React.ReactNode;
    messages: Record<string, unknown>;
    locale: string;
}) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            enableColorScheme={false}
            disableTransitionOnChange
        >
            <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
                {children}
            </NextIntlClientProvider>
        </ThemeProvider>
    );
}