'use client';

import React from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { CommandMenu } from '@/components/layout/CommandMenu';

export default function Providers({
                                      children,
                                      locale,
                                      messages,
                                  }: {
    children: React.ReactNode;
    locale: string;
    messages: Record<string, unknown>;
}) {
    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                <TonConnectUIProvider manifestUrl="https://gafurov.cc/tonconnect-manifest.json">
                    {children}

                    {/* Global command palette — was imported but never rendered */}
                    <CommandMenu />

                    <Toaster
                        position="top-right"
                        richColors
                        closeButton
                        toastOptions={{
                            style: {
                                borderRadius: 16,
                                border: '1px solid hsl(var(--border))', // was '1xp' — typo fixed
                                background: 'hsl(var(--card))',
                                color: 'hsl(var(--foreground))',
                            },
                        }}
                    />
                </TonConnectUIProvider>
            </ThemeProvider>
        </NextIntlClientProvider>
    );
}