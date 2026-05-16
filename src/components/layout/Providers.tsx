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
            {/*
        forcedTheme="dark" — always dark, no system override, no toggle needed.
        Keeps next-themes so CSS vars still resolve correctly.
      */}
            <ThemeProvider attribute="class" forcedTheme="dark">
                <TonConnectUIProvider manifestUrl="https://gafurov.cc/tonconnect-manifest.json">
                    {children}

                    <CommandMenu />

                    <Toaster
                        position="top-right"
                        richColors
                        closeButton
                        toastOptions={{
                            style: {
                                borderRadius: 16,
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(20,20,28,0.95)',
                                color: '#fff',
                                backdropFilter: 'blur(16px)',
                            },
                        }}
                    />
                </TonConnectUIProvider>
            </ThemeProvider>
        </NextIntlClientProvider>
    );
}